import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const COOLDOWN_SECONDS = 120;

type ApiStanding = {
  rank: number;
  team: { id: number; name: string; logo: string | null };
  points: number;
  goalsDiff: number;
  group: string;
  form: string | null;
  status: string | null;
  description: string | null;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
};

type ApiTeamStats = {
  team: { id: number; name: string };
  fixtures: {
    played: { home: number | null; away: number | null; total: number | null };
    wins: { home: number | null; away: number | null; total: number | null };
    draws: { home: number | null; away: number | null; total: number | null };
    loses: { home: number | null; away: number | null; total: number | null };
  };
  goals: {
    for: { total: { home: number | null; away: number | null; total: number | null } };
    against: { total: { home: number | null; away: number | null; total: number | null } };
  };
  clean_sheet: { home: number | null; away: number | null; total: number | null };
  failed_to_score: { home: number | null; away: number | null; total: number | null };
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
      .eq("sync_type", "standings")
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
      .insert({ sync_type: "standings", status: "running" })
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

    // Check API key (env secret first, then DB fallback)
    let apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      const { data: cfgRow } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "API_FOOTBALL_KEY")
        .maybeSingle();
      if (cfgRow?.value) apiKey = cfgRow.value;
    }
    if (!apiKey) {
      await finalizeLog("failed", {
        error_message:
          "API_FOOTBALL_KEY secret not configured. No standings fetched. No fake data created.",
        synced_count: 0,
      });
      return jsonResponse({
        error:
          "API_FOOTBALL_KEY secret not configured. No standings were fetched and no fake data was created.",
        synced: 0,
        provider_status: "missing_key",
      });
    }

    // Parse body
    let body: { league?: number; season?: number; include_stats?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // no body
    }
    const leagueId = body.league || 39;
    const season = body.season || 2025;
    const includeStats = body.include_stats ?? false;

    await supabase
      .from("api_football_sync_log")
      .update({
        league_filter: `league=${leagueId}&season=${season}${includeStats ? "&stats=true" : ""}`,
      })
      .eq("id", logId);

    // Load teams for ID mapping
    const { data: dbTeams } = await supabase
      .from("teams")
      .select("id, external_id, name");
    const teamsByExtId = new Map(
      (dbTeams || [])
        .filter((t: { external_id: string | null }) => t.external_id)
        .map((t: { id: string; external_id: string }) => [t.external_id, t.id])
    );

    // Map API-Football league IDs to DB league names
    const API_LEAGUE_NAMES: Record<number, string> = {
      39: "Premier League", 140: "La Liga", 135: "Serie A", 78: "Bundesliga",
      61: "Ligue 1", 94: "Primeira Liga", 88: "Eredivisie", 144: "Belgian Pro League",
      203: "Süper Lig", 235: "Russian Premier League", 253: "MLS", 262: "Liga MX",
    };
    const expectedName = API_LEAGUE_NAMES[leagueId];

    const { data: dbLeagues } = await supabase
      .from("leagues")
      .select("id, name")
      .eq("is_synthetic", false);
    let dbLeagueId: string | null = null;
    if (expectedName) {
      const exact = (dbLeagues || []).find(
        (l: { name: string }) => l.name === expectedName
      );
      if (exact) dbLeagueId = (exact as { id: string }).id;
    }

    let standingsSynced = 0;
    let statsSynced = 0;
    let missingCount = 0;
    const errors: string[] = [];

    // ── Fetch standings ──
    const standingsUrl = `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`;
    try {
      const apiRes = await fetch(standingsUrl, {
        headers: { "x-apisports-key": apiKey },
      });
      if (!apiRes.ok) {
        const errText = await apiRes.text();
        // Log as provider-missing
        await supabase.from("provider_missing_data").upsert(
          {
            provider: "api-football",
            entity_type: "standings",
            entity_ref: `league_${leagueId}`,
            league_id: dbLeagueId,
            reason: `API returned ${apiRes.status}: ${errText.slice(0, 200)}`,
            last_checked_at: new Date().toISOString(),
          },
          { onConflict: "provider,entity_type,entity_ref" }
        );
        missingCount++;
      } else {
        const json = await apiRes.json();
        const standings: ApiStanding[][] = (json.response || []).map(
          (r: { league: { standings: ApiStanding[][] } }) =>
            r.league?.standings?.[0] || []
        );
        const flatStandings = standings.flat();

        if (flatStandings.length === 0) {
          await supabase.from("provider_missing_data").upsert(
            {
              provider: "api-football",
              entity_type: "standings",
              entity_ref: `league_${leagueId}`,
              league_id: dbLeagueId,
              reason: "API responded but returned empty standings array",
              last_checked_at: new Date().toISOString(),
            },
            { onConflict: "provider,entity_type,entity_ref" }
          );
          missingCount++;
        } else {
          // Mark as resolved if it was previously missing
          await supabase
            .from("provider_missing_data")
            .update({ resolved: true, last_checked_at: new Date().toISOString() })
            .eq("provider", "api-football")
            .eq("entity_type", "standings")
            .eq("entity_ref", `league_${leagueId}`);

          // Upsert standings into data_coverage
          for (const s of flatStandings) {
            const teamId = teamsByExtId.get(String(s.team.id));
            if (!teamId) continue;

            await supabase.from("data_coverage").upsert(
              {
                entity_type: "team",
                entity_id: teamId,
                entity_name: s.team.name,
                standings_coverage: 100,
                provider_flags: {
                  standings_rank: s.rank,
                  standings_points: s.points,
                  standings_played: s.all.played,
                  standings_won: s.all.win,
                  standings_drawn: s.all.draw,
                  standings_lost: s.all.lose,
                  standings_gf: s.all.goals.for,
                  standings_ga: s.all.goals.against,
                  standings_gd: s.goalsDiff,
                  standings_form: s.form,
                },
                last_audited_at: new Date().toISOString(),
              },
              { onConflict: "entity_type,entity_id" }
            );
            standingsSynced++;
          }

          // Update league flag
          if (dbLeagueId) {
            await supabase
              .from("leagues")
              .update({ has_standings: true })
              .eq("id", dbLeagueId);
          }
        }
      }
    } catch (fetchErr: unknown) {
      const message = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      errors.push(`Standings fetch: ${message.slice(0, 200)}`);
    }

    // ── Optionally fetch team stats ──
    if (includeStats) {
      const teamExtIds = [...teamsByExtId.keys()].slice(0, 20);
      for (const extId of teamExtIds) {
        const teamId = teamsByExtId.get(extId);
        if (!teamId) continue;

        const statsUrl = `https://v3.football.api-sports.io/teams/statistics?league=${leagueId}&season=${season}&team=${extId}`;
        try {
          const apiRes = await fetch(statsUrl, {
            headers: { "x-apisports-key": apiKey },
          });
          if (!apiRes.ok) {
            await supabase.from("provider_missing_data").upsert(
              {
                provider: "api-football",
                entity_type: "stats",
                entity_ref: `team_${extId}`,
                league_id: dbLeagueId,
                reason: `API returned ${apiRes.status}`,
                last_checked_at: new Date().toISOString(),
              },
              { onConflict: "provider,entity_type,entity_ref" }
            );
            missingCount++;
            continue;
          }

          const json = await apiRes.json();
          const stats: ApiTeamStats | null = json.response || null;
          if (!stats || !stats.fixtures) {
            await supabase.from("provider_missing_data").upsert(
              {
                provider: "api-football",
                entity_type: "stats",
                entity_ref: `team_${extId}`,
                league_id: dbLeagueId,
                reason: "API returned empty stats object",
                last_checked_at: new Date().toISOString(),
              },
              { onConflict: "provider,entity_type,entity_ref" }
            );
            missingCount++;
            continue;
          }

          // Mark resolved
          await supabase
            .from("provider_missing_data")
            .update({ resolved: true, last_checked_at: new Date().toISOString() })
            .eq("provider", "api-football")
            .eq("entity_type", "stats")
            .eq("entity_ref", `team_${extId}`);

          // Upsert into data_coverage
          await supabase.from("data_coverage").upsert(
            {
              entity_type: "team",
              entity_id: teamId,
              entity_name: stats.team.name,
              team_stats_coverage: 100,
              provider_flags: {
                stats_played: stats.fixtures.played.total,
                stats_wins: stats.fixtures.wins.total,
                stats_draws: stats.fixtures.draws.total,
                stats_losses: stats.fixtures.loses.total,
                stats_goals_for: stats.goals.for.total.total,
                stats_goals_against: stats.goals.against.total.total,
                stats_clean_sheets: stats.clean_sheet.total,
                stats_failed_to_score: stats.failed_to_score.total,
              },
              last_audited_at: new Date().toISOString(),
            },
            { onConflict: "entity_type,entity_id" }
          );
          statsSynced++;
        } catch (fetchErr: unknown) {
          const message = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
          errors.push(`Stats ${extId}: ${message.slice(0, 100)}`);
        }
      }

      // Update league flag
      if (dbLeagueId && statsSynced > 0) {
        await supabase
          .from("leagues")
          .update({ has_team_stats: true })
          .eq("id", dbLeagueId);
      }
    }

    await finalizeLog("completed", {
      synced_count: standingsSynced + statsSynced,
      skipped_count: missingCount,
      error_count: errors.length,
      error_message: errors.length > 0 ? errors.join("; ").slice(0, 1000) : null,
      meta: { standings_synced: standingsSynced, stats_synced: statsSynced, missing_flagged: missingCount },
    });

    return jsonResponse({
      message: `Standings: ${standingsSynced}, Stats: ${statsSynced}, Missing flagged: ${missingCount}.`,
      standings_synced: standingsSynced,
      stats_synced: statsSynced,
      missing_flagged: missingCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: `Unexpected error: ${message}` }, 500);
  }
});
