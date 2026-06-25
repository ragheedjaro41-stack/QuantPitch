import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const COOLDOWN_SECONDS = 120;

type ApiFixture = {
  fixture: {
    id: number;
    date: string;
    venue: { name: string | null; city: string | null };
    status: { short: string; long: string };
  };
  league: {
    id: number;
    name: string;
    country: string;
    season: number;
    round: string;
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
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

function parseRound(round: string): number {
  const match = round.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

function normalizeStatus(short: string): string {
  switch (short) {
    case "FT":
    case "AET":
    case "PEN":
      return "completed";
    case "NS":
      return "scheduled";
    case "1H":
    case "2H":
    case "HT":
    case "ET":
    case "BT":
    case "P":
    case "LIVE":
      return "live";
    case "PST":
      return "postponed";
    case "CANC":
      return "cancelled";
    case "ABD":
      return "abandoned";
    case "SUSP":
      return "suspended";
    case "TBD":
      return "scheduled";
    default:
      return "unknown";
  }
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
      .eq("sync_type", "fixtures")
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

    // Create log entry
    const { data: logEntry, error: logErr } = await supabase
      .from("api_football_sync_log")
      .insert({ sync_type: "fixtures", status: "running" })
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
          "API_FOOTBALL_KEY secret not configured. No fixtures fetched. No fake data created.",
        synced_count: 0,
      });
      return jsonResponse({
        error:
          "API_FOOTBALL_KEY secret not configured. No fixtures were fetched and no fake data was created.",
        synced: 0,
        provider_status: "missing_key",
      });
    }

    // Parse body for league filter
    let body: { league?: number; season?: number } = {};
    try {
      body = await req.json();
    } catch {
      // no body
    }
    const leagueId = body.league || 39; // default: Premier League
    const season = body.season || 2025;

    await supabase
      .from("api_football_sync_log")
      .update({ league_filter: `league=${leagueId}&season=${season}` })
      .eq("id", logId);

    // Fetch fixtures
    const apiUrl = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}`;
    let fixtures: ApiFixture[];
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
      fixtures = json.response || [];

      // Store quota info
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

    if (!Array.isArray(fixtures) || fixtures.length === 0) {
      await finalizeLog("completed", { synced_count: 0, skipped_count: 0 });
      return jsonResponse({ message: "No fixtures returned", synced: 0 });
    }

    // Load existing matches by external_id for dedup
    const { data: existingMatches } = await supabase
      .from("matches")
      .select("id, external_id");
    const existingByExtId = new Map(
      (existingMatches || [])
        .filter((m: { external_id: string | null }) => m.external_id)
        .map((m: { id: string; external_id: string }) => [m.external_id, m.id])
    );

    // Load teams by external_id
    const { data: dbTeams } = await supabase
      .from("teams")
      .select("id, external_id, name");
    const teamsByExtId = new Map(
      (dbTeams || [])
        .filter((t: { external_id: string | null }) => t.external_id)
        .map((t: { id: string; external_id: string }) => [t.external_id, t.id])
    );
    const teamsByName = new Map(
      (dbTeams || []).map((t: { id: string; name: string }) => [
        t.name.toLowerCase(),
        t.id,
      ])
    );

    // Load leagues
    const { data: dbLeagues } = await supabase
      .from("leagues")
      .select("id, name");

    // Find matching league
    let dbLeagueId: string | null = null;
    if (fixtures.length > 0) {
      const apiLeagueName = fixtures[0].league.name.toLowerCase();
      const matched = (dbLeagues || []).find(
        (l: { name: string }) => l.name.toLowerCase().includes(apiLeagueName) ||
          apiLeagueName.includes(l.name.toLowerCase())
      );
      if (matched) dbLeagueId = (matched as { id: string }).id;
    }

    let syncedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const f of fixtures) {
      const extId = String(f.fixture.id);

      // Resolve home/away team IDs
      const homeExtId = String(f.teams.home.id);
      const awayExtId = String(f.teams.away.id);
      let homeTeamId = teamsByExtId.get(homeExtId) ||
        teamsByName.get(f.teams.home.name.toLowerCase());
      let awayTeamId = teamsByExtId.get(awayExtId) ||
        teamsByName.get(f.teams.away.name.toLowerCase());

      if (!homeTeamId || !awayTeamId) {
        skippedCount++;
        continue;
      }

      const status = normalizeStatus(f.fixture.status.short);
      const venue = f.fixture.venue.name
        ? `${f.fixture.venue.name}${f.fixture.venue.city ? `, ${f.fixture.venue.city}` : ""}`
        : "TBD";
      const round = parseRound(f.league.round);

      const matchRow: Record<string, unknown> = {
        external_id: extId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        match_date: f.fixture.date,
        venue,
        status,
        round,
        league_id: dbLeagueId,
        home_score: f.goals.home ?? 0,
        away_score: f.goals.away ?? 0,
      };

      if (existingByExtId.has(extId)) {
        // Update existing
        const { error: updErr } = await supabase
          .from("matches")
          .update(matchRow)
          .eq("id", existingByExtId.get(extId));
        if (updErr) {
          errors.push(`Update ${extId}: ${updErr.message}`);
        } else {
          syncedCount++;
        }
      } else {
        // Insert new
        const { data: inserted, error: insErr } = await supabase
          .from("matches")
          .insert(matchRow)
          .select("id")
          .single();
        if (insErr) {
          errors.push(`Insert ${extId}: ${insErr.message}`);
        } else {
          syncedCount++;
          existingByExtId.set(extId, inserted.id);
        }
      }
    }

    await finalizeLog("completed", {
      synced_count: syncedCount,
      skipped_count: skippedCount,
      error_count: errors.length,
      error_message: errors.length > 0 ? errors.join("; ").slice(0, 1000) : null,
    });

    return jsonResponse({
      message: `Synced ${syncedCount} fixtures, skipped ${skippedCount}.`,
      synced: syncedCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: `Unexpected error: ${message}` }, 500);
  }
});
