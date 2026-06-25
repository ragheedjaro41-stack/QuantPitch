import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const COOLDOWN_SECONDS = 120;
const API_BASE = "https://v3.football.api-sports.io";

// API-Football league ID -> DB league name mapping (must match sync-teams/sync-fixtures)
const API_LEAGUE_NAMES: Record<number, string> = {
  39: "Premier League", 140: "La Liga", 135: "Serie A", 78: "Bundesliga",
  61: "Ligue 1", 94: "Primeira Liga", 88: "Eredivisie", 144: "Belgian Pro League",
  203: "Süper Lig", 235: "Russian Premier League", 253: "MLS", 262: "Liga MX",
};

type ApiPlayerEntry = {
  player: {
    id: number;
    name: string;
    firstname: string | null;
    lastname: string | null;
    age: number | null;
    birth: { date: string | null; place: string | null; country: string | null };
    nationality: string | null;
    height: string | null;
    weight: string | null;
    injured: boolean;
    photo: string | null;
  };
  statistics: Array<{
    team: { id: number; name: string };
    league: { id: number; name: string; season: number };
    games: {
      appearences: number | null; // API typo is intentional
      minutes: number | null;
      position: string | null;
      number: number | null;
      rating: string | null;
    };
    goals: { total: number | null; assists: number | null };
    cards: { yellow: number | null; red: number | null };
    penalty: { scored: number | null; missed: number | null };
  }>;
};

type ApiResponse = {
  response: ApiPlayerEntry[];
  paging: { current: number; total: number };
  errors: Record<string, string> | unknown[];
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseHeight(h: string | null): number | null {
  if (!h) return null;
  const m = h.match(/(\d+)/);
  return m ? parseInt(m[1]) : null;
}

function parseWeight(w: string | null): number | null {
  if (!w) return null;
  const m = w.match(/(\d+)/);
  return m ? parseInt(m[1]) : null;
}

function mapPosition(pos: string | null): string {
  if (!pos) return "SUB";
  const p = pos.toLowerCase();
  if (p.includes("goalkeeper")) return "GK";
  if (p.includes("defender")) return "DEF";
  if (p.includes("midfielder")) return "MID";
  if (p.includes("attacker") || p.includes("forward")) return "FWD";
  return "SUB";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Rate limit
    const { data: recentSync } = await supabase
      .from("api_football_sync_log")
      .select("id, started_at")
      .eq("sync_type", "players")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentSync) {
      const elapsed = (Date.now() - new Date(recentSync.started_at).getTime()) / 1000;
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
      .insert({ sync_type: "players", status: "running" })
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
        error_message: "API_FOOTBALL_KEY secret not configured. No players fetched. No fake data created.",
        synced_count: 0,
      });
      return jsonResponse({
        error: "API_FOOTBALL_KEY secret not configured. No players were fetched and no fake data was created.",
        synced: 0,
      });
    }

    // Parse body
    let body: { league?: number; season?: number; team_external_id?: number } = {};
    try { body = await req.json(); } catch { /* no body */ }
    const leagueId = body.league || 39;
    const season = body.season || 2025;
    const singleTeamExtId = body.team_external_id || null;

    await supabase
      .from("api_football_sync_log")
      .update({ details: { league: leagueId, season, single_team: singleTeamExtId } })
      .eq("id", logId);

    // Resolve DB league
    const expectedName = API_LEAGUE_NAMES[leagueId];
    const { data: dbLeagues } = await supabase
      .from("leagues")
      .select("id, name")
      .eq("is_synthetic", false);

    let dbLeagueId: string | null = null;
    if (expectedName) {
      const exact = (dbLeagues || []).find((l: { name: string }) => l.name === expectedName);
      if (exact) dbLeagueId = (exact as { id: string }).id;
    }

    // Load synced teams (only real PL teams with external_id)
    let teamQuery = supabase
      .from("teams")
      .select("id, external_id, name, league_id")
      .not("external_id", "is", null);

    if (dbLeagueId) {
      teamQuery = teamQuery.eq("league_id", dbLeagueId);
    }

    const { data: dbTeams, error: teamErr } = await teamQuery;
    if (teamErr || !dbTeams || dbTeams.length === 0) {
      await finalizeLog("failed", {
        error_message: "No synced teams found. Run sync-teams first.",
        synced_count: 0,
      });
      return jsonResponse({
        error: "No synced teams found. Run sync-teams first.",
        synced: 0,
      });
    }

    // Safety: verify none of these are demo teams
    if (dbLeagueId) {
      const { data: leagueCheck } = await supabase
        .from("leagues")
        .select("is_synthetic")
        .eq("id", dbLeagueId)
        .maybeSingle();
      if (leagueCheck?.is_synthetic) {
        await finalizeLog("failed", {
          error_message: "Refusing to sync players to synthetic/demo league.",
          synced_count: 0,
        });
        return jsonResponse({
          error: "Refusing to sync players to synthetic/demo league. No fake data created.",
          synced: 0,
        });
      }
    }

    const teamsByExtId = new Map<string, { id: string; name: string; league_id: string | null }>();
    for (const t of dbTeams) {
      if (t.external_id) teamsByExtId.set(t.external_id, { id: t.id, name: t.name, league_id: t.league_id });
    }

    // Filter to single team if requested
    const teamsToSync = singleTeamExtId
      ? dbTeams.filter((t: { external_id: string }) => t.external_id === String(singleTeamExtId))
      : dbTeams;

    if (teamsToSync.length === 0) {
      await finalizeLog("failed", {
        error_message: `Team with external_id ${singleTeamExtId} not found.`,
        synced_count: 0,
      });
      return jsonResponse({ error: `Team not found`, synced: 0 });
    }

    let totalSynced = 0;
    let totalSkipped = 0;
    const teamResults: Array<{ team: string; synced: number; skipped: number; pages: number }> = [];
    const missingFields: string[] = [];
    const errors: string[] = [];

    for (const team of teamsToSync) {
      const teamExtId = team.external_id;
      const dbTeam = teamsByExtId.get(teamExtId);
      if (!dbTeam) continue;

      let page = 1;
      let totalPages = 1;
      let teamSynced = 0;
      let teamSkipped = 0;

      while (page <= totalPages) {
        const url = `${API_BASE}/players?team=${teamExtId}&league=${leagueId}&season=${season}&page=${page}`;
        const resp = await fetch(url, {
          headers: { "x-apisports-key": apiKey },
        });

        if (!resp.ok) {
          errors.push(`API error for team ${teamExtId} page ${page}: ${resp.status}`);
          break;
        }

        const json = (await resp.json()) as ApiResponse;

        if (json.errors && !Array.isArray(json.errors) && Object.keys(json.errors).length > 0) {
          errors.push(`API error for team ${teamExtId}: ${JSON.stringify(json.errors)}`);
          break;
        }

        totalPages = json.paging?.total || 1;
        const players = json.response || [];

        for (const entry of players) {
          const p = entry.player;
          const stat = entry.statistics?.find(
            (s) => s.league.id === leagueId && String(s.team.id) === teamExtId
          ) || entry.statistics?.[0];

          if (!p.id || !p.name) {
            teamSkipped++;
            continue;
          }

          const position = mapPosition(stat?.games?.position ?? null);
          const rating = stat?.games?.rating ? parseFloat(stat.games.rating) : 0;
          const appearances = stat?.games?.appearences ?? 0;
          const minutes = stat?.games?.minutes ?? 0;
          const goals = stat?.goals?.total ?? 0;
          const assists = stat?.goals?.assists ?? 0;
          const yellowCards = stat?.cards?.yellow ?? 0;
          const redCards = stat?.cards?.red ?? 0;
          const jerseyNumber = stat?.games?.number ?? null;
          const heightCm = parseHeight(p.height);
          const weightKg = parseWeight(p.weight);

          // Track missing fields
          if (stat?.games?.rating === null) missingFields.push("rating");
          if (p.height === null) missingFields.push("height");
          if (p.weight === null) missingFields.push("weight");

          const playerData = {
            external_id: String(p.id),
            team_id: dbTeam.id,
            league_id: dbTeam.league_id,
            name: p.name,
            position,
            jersey_number: jerseyNumber,
            nationality: p.nationality ?? "Unknown",
            age: p.age ?? 0,
            height_cm: heightCm,
            weight_kg: weightKg,
            goals,
            assists,
            appearances,
            minutes_played: minutes,
            yellow_cards: yellowCards,
            red_cards: redCards,
            rating: Math.round(rating * 100) / 100,
            photo_url: p.photo ?? null,
            injured: p.injured ?? false,
            competition: "league",
          };

          const { error: upsertErr } = await supabase
            .from("players")
            .upsert(playerData, { onConflict: "external_id" });

          if (upsertErr) {
            errors.push(`Upsert failed for player ${p.id} (${p.name}): ${upsertErr.message}`);
            teamSkipped++;
          } else {
            teamSynced++;
          }
        }

        page++;
      }

      teamResults.push({
        team: dbTeam.name,
        synced: teamSynced,
        skipped: teamSkipped,
        pages: totalPages,
      });
      totalSynced += teamSynced;
      totalSkipped += teamSkipped;
    }

    // Deduplicate missing fields for report
    const uniqueMissing = [...new Set(missingFields)];

    await finalizeLog("completed", {
      synced_count: totalSynced,
      skipped_count: totalSkipped,
      error_count: errors.length,
      error_message: errors.length > 0 ? errors.join("; ").slice(0, 1000) : null,
      meta: {
        league: leagueId,
        season,
        teams_processed: teamResults.length,
        total_synced: totalSynced,
        total_skipped: totalSkipped,
        missing_fields: uniqueMissing,
        errors: errors.slice(0, 20),
        team_results: teamResults,
      },
    });

    return jsonResponse({
      synced: totalSynced,
      skipped: totalSkipped,
      teams_processed: teamResults.length,
      missing_fields: uniqueMissing,
      errors: errors.slice(0, 10),
      team_results: teamResults,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
