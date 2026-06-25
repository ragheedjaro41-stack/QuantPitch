import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const COOLDOWN_SECONDS = 120;

type ApiTeam = {
  team: {
    id: number;
    name: string;
    code: string | null;
    country: string;
    founded: number | null;
    logo: string | null;
  };
  venue: {
    name: string | null;
    city: string | null;
    capacity: number | null;
  };
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
        500
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Rate limit
    const { data: recentSync } = await supabase
      .from("api_football_sync_log")
      .select("id, started_at")
      .eq("sync_type", "teams")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentSync) {
      const elapsed =
        (Date.now() - new Date(recentSync.started_at).getTime()) / 1000;
      if (elapsed < COOLDOWN_SECONDS) {
        return jsonResponse({
          error: `Rate limited. Cooldown: ${Math.ceil(COOLDOWN_SECONDS - elapsed)}s remaining.`,
          synced: 0,
        });
      }
    }

    // Create log
    const { data: logEntry, error: logErr } = await supabase
      .from("api_football_sync_log")
      .insert({ sync_type: "teams", status: "running" })
      .select("id")
      .single();
    if (logErr) {
      return jsonResponse({ error: `Log creation failed: ${logErr.message}` }, 500);
    }
    const logId = logEntry.id;

    const finalizeLog = async (status: string, updates: Record<string, unknown>) => {
      await supabase
        .from("api_football_sync_log")
        .update({ status, finished_at: new Date().toISOString(), ...updates })
        .eq("id", logId);
    };

    // Check API key
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      await finalizeLog("failed", {
        error_message:
          "API_FOOTBALL_KEY secret not configured. No teams fetched. No fake data created.",
        synced_count: 0,
      });
      return jsonResponse({
        error:
          "API_FOOTBALL_KEY secret not configured. No teams were fetched and no fake data was created.",
        synced: 0,
        provider_status: "missing_key",
      });
    }

    // Parse body
    let body: { league?: number; season?: number } = {};
    try {
      body = await req.json();
    } catch {
      // no body
    }
    const leagueId = body.league || 39;
    const season = body.season || 2025;

    await supabase
      .from("api_football_sync_log")
      .update({ league_filter: `league=${leagueId}&season=${season}` })
      .eq("id", logId);

    // Fetch teams
    const apiUrl = `https://v3.football.api-sports.io/teams?league=${leagueId}&season=${season}`;
    let apiTeams: ApiTeam[];
    try {
      const apiRes = await fetch(apiUrl, {
        headers: { "x-apisports-key": apiKey },
      });
      if (!apiRes.ok) {
        const errText = await apiRes.text();
        await finalizeLog("failed", {
          error_message: `API returned ${apiRes.status}: ${errText.slice(0, 300)}`,
          synced_count: 0,
        });
        return jsonResponse(
          { error: `API returned ${apiRes.status}`, synced: 0 },
          502
        );
      }
      const json = await apiRes.json();
      apiTeams = json.response || [];

      const quotaRemaining = apiRes.headers.get("x-ratelimit-requests-remaining");
      if (quotaRemaining) {
        await supabase
          .from("api_football_sync_log")
          .update({ meta: { quota_remaining: parseInt(quotaRemaining, 10) } })
          .eq("id", logId);
      }
    } catch (fetchErr: unknown) {
      const message = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      await finalizeLog("failed", {
        error_message: `Fetch failed: ${message.slice(0, 300)}`,
        synced_count: 0,
      });
      return jsonResponse({ error: `Fetch failed: ${message}`, synced: 0 }, 502);
    }

    if (!Array.isArray(apiTeams) || apiTeams.length === 0) {
      await finalizeLog("completed", { synced_count: 0, skipped_count: 0 });
      return jsonResponse({ message: "No teams returned", synced: 0 });
    }

    // Load existing teams
    const { data: existingTeams } = await supabase
      .from("teams")
      .select("id, external_id, name");
    const byExtId = new Map(
      (existingTeams || [])
        .filter((t: { external_id: string | null }) => t.external_id)
        .map((t: { id: string; external_id: string }) => [t.external_id, t.id])
    );
    const byName = new Map(
      (existingTeams || []).map((t: { id: string; name: string }) => [
        t.name.toLowerCase(),
        t.id,
      ])
    );

    // Find matching DB league
    const { data: dbLeagues } = await supabase
      .from("leagues")
      .select("id, name");
    let dbLeagueId: string | null = null;
    if (apiTeams.length > 0) {
      const matched = (dbLeagues || []).find((l: { name: string }) => {
        const ln = l.name.toLowerCase();
        return ln.includes("premier") || ln.includes("epl");
      });
      if (matched) dbLeagueId = (matched as { id: string }).id;
    }

    let syncedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const t of apiTeams) {
      const extId = String(t.team.id);
      const existingId = byExtId.get(extId) || byName.get(t.team.name.toLowerCase());

      const teamRow: Record<string, unknown> = {
        external_id: extId,
        name: t.team.name,
        short_name: t.team.code || t.team.name.slice(0, 3).toUpperCase(),
        city: t.venue?.city || t.team.country || "Unknown",
        stadium: t.venue?.name || "TBD",
        founded: t.team.founded || 1900,
        country: t.team.country,
        logo_url: t.team.logo,
        league_id: dbLeagueId,
        active: true,
      };

      if (existingId) {
        const { error: updErr } = await supabase
          .from("teams")
          .update(teamRow)
          .eq("id", existingId);
        if (updErr) {
          errors.push(`Update ${t.team.name}: ${updErr.message}`);
        } else {
          syncedCount++;
        }

        // Create alias from API-Football source
        await supabase
          .from("team_aliases")
          .upsert(
            { team_id: existingId, alias: t.team.name, source: "api-football" },
            { onConflict: "alias,source" }
          );
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("teams")
          .insert(teamRow)
          .select("id")
          .single();
        if (insErr) {
          errors.push(`Insert ${t.team.name}: ${insErr.message}`);
        } else {
          syncedCount++;
          // Create alias
          await supabase
            .from("team_aliases")
            .upsert(
              { team_id: inserted.id, alias: t.team.name, source: "api-football" },
              { onConflict: "alias,source" }
            );
        }
      }
    }

    // Update league has_fixtures flag
    if (dbLeagueId) {
      await supabase
        .from("leagues")
        .update({ has_fixtures: true })
        .eq("id", dbLeagueId);
    }

    await finalizeLog("completed", {
      synced_count: syncedCount,
      skipped_count: skippedCount,
      error_count: errors.length,
      error_message: errors.length > 0 ? errors.join("; ").slice(0, 1000) : null,
    });

    return jsonResponse({
      message: `Synced ${syncedCount} teams.`,
      synced: syncedCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: `Unexpected error: ${message}` }, 500);
  }
});
