import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const COOLDOWN_SECONDS = 120;
const PROVIDER_SOURCE = "api-football";

// API-Football status values
const FINISHED_STATUSES = ["FT", "AET", "PEN"];
const VOID_STATUSES_API = [
  "PST",  // Postponed
  "CANC", // Cancelled
  "ABD",  // Abandoned
  "SUSP", // Suspended
  "AWD",  // Awarded (technical)
];

type ApiFixture = {
  fixture: {
    id: number;
    date: string;
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
    venue?: { name: string | null };
  };
  league: {
    id: number;
    name: string;
    round: string;
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
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

    // ── 1. Rate-limit / cooldown check ──
    const { data: recentSync } = await supabase
      .from("results_sync_log")
      .select("id, started_at, status")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentSync) {
      const elapsed =
        (Date.now() - new Date(recentSync.started_at).getTime()) / 1000;
      if (elapsed < COOLDOWN_SECONDS) {
        const remaining = Math.ceil(COOLDOWN_SECONDS - elapsed);
        return jsonResponse({
          error: `Rate limited. Cooldown: ${remaining}s remaining.`,
          synced: 0,
          settled: 0,
          cooldown_remaining: remaining,
        });
      }
    }

    // ── 2. Create sync log entry ──
    const { data: logEntry, error: logErr } = await supabase
      .from("results_sync_log")
      .insert({ provider: PROVIDER_SOURCE, status: "running" })
      .select("id")
      .single();

    if (logErr) {
      return jsonResponse(
        { error: `Failed to create sync log: ${logErr.message}` },
        500
      );
    }
    const logId = logEntry.id;

    const finalizeLog = async (
      status: string,
      updates: Record<string, unknown>
    ) => {
      await supabase
        .from("results_sync_log")
        .update({
          status,
          finished_at: new Date().toISOString(),
          ...updates,
        })
        .eq("id", logId);
    };

    // ── 3. Check for API-Football key (env secret first, then DB fallback) ──
    let resultsApiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!resultsApiKey) {
      const { data: cfgRow } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "API_FOOTBALL_KEY")
        .maybeSingle();
      if (cfgRow?.value) resultsApiKey = cfgRow.value;
    }
    if (!resultsApiKey) {
      await finalizeLog("failed", {
        error_message:
          "API_FOOTBALL_KEY secret not configured. No results fetched. No fake results created.",
        synced_count: 0,
        settled_count: 0,
        void_count: 0,
      });

      return jsonResponse({
        error:
          "API_FOOTBALL_KEY secret not configured. Add it via Supabase dashboard > Edge Functions > Secrets.",
        synced: 0,
        settled: 0,
        provider_status: "missing_key",
      });
    }

    // ── 4. Fetch completed fixtures from API-Football ──
    let body: { league?: number; season?: number } = {};
    try {
      body = await req.json();
    } catch {
      // no body is fine
    }
    const leagueId = body.league || 39; // default: Premier League
    const season = body.season || new Date().getFullYear();

    const apiUrl = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&status=FT-AET-PEN-PST-CANC-ABD-SUSP-AWD`;
    let fixtures: ApiFixture[];
    try {
      const apiRes = await fetch(apiUrl, {
        headers: { "x-apisports-key": resultsApiKey },
      });
      if (!apiRes.ok) {
        const errText = await apiRes.text();
        await finalizeLog("failed", {
          error_message: `API returned ${apiRes.status}: ${errText.slice(0, 300)}`,
          synced_count: 0,
          settled_count: 0,
        });
        return jsonResponse({
          error: `API-Football returned ${apiRes.status}`,
          detail: errText.slice(0, 300),
          synced: 0,
          settled: 0,
          provider_status: "error",
        });
      }
      const json = await apiRes.json();
      fixtures = json.response || [];
    } catch (fetchErr: unknown) {
      const message =
        fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      await finalizeLog("failed", {
        error_message: `Fetch failed: ${message.slice(0, 300)}`,
        synced_count: 0,
        settled_count: 0,
      });
      return jsonResponse({
        error: `Failed to fetch from API-Football: ${message}`,
        synced: 0,
        settled: 0,
        provider_status: "error",
      });
    }

    if (!Array.isArray(fixtures) || fixtures.length === 0) {
      await finalizeLog("completed", {
        synced_count: 0,
        settled_count: 0,
        void_count: 0,
        missing_score_count: 0,
      });
      return jsonResponse({
        message: "API responded but returned 0 fixtures.",
        synced: 0,
        settled: 0,
      });
    }

    // ── 5. Load existing match_results to skip already-ingested ──
    const { data: existingResults } = await supabase
      .from("match_results")
      .select("match_id");
    const alreadySettled = new Set(
      (existingResults || []).map((r: { match_id: string }) => r.match_id)
    );

    // ── 6. Load matches for name-based matching ──
    const { data: dbMatches } = await supabase
      .from("matches")
      .select("id, home_team_id, away_team_id, competition, league_id");
    const { data: dbTeams } = await supabase
      .from("teams")
      .select("id, name");
    const teamNameById = new Map(
      (dbTeams || []).map((t: { id: string; name: string }) => [t.id, t.name])
    );

    // ── 7. Process each fixture ──
    let syncedCount = 0;
    let settledCount = 0;
    let voidCount = 0;
    let missingScoreCount = 0;
    const errors: string[] = [];
    const SUPPORTED_MARKETS = [
      "h2h",
      "totals_1.5",
      "totals_2.5",
      "totals_3.5",
      "btts",
    ];

    for (const fixture of fixtures) {
      const fixtureStatus = fixture.fixture.status.short;

      // Try to match fixture to a database match by team names
      let matchId: string | null = null;
      for (const m of dbMatches || []) {
        const dbHome = teamNameById.get(
          (m as { home_team_id: string }).home_team_id
        );
        const dbAway = teamNameById.get(
          (m as { away_team_id: string }).away_team_id
        );
        if (!dbHome || !dbAway) continue;
        const apiHome = fixture.teams.home?.name || "";
        const apiAway = fixture.teams.away?.name || "";
        if (
          (dbHome.toLowerCase().includes(apiHome.toLowerCase()) ||
            apiHome.toLowerCase().includes(dbHome.toLowerCase())) &&
          (dbAway.toLowerCase().includes(apiAway.toLowerCase()) ||
            apiAway.toLowerCase().includes(dbAway.toLowerCase()))
        ) {
          matchId = (m as { id: string }).id;
          break;
        }
      }

      if (!matchId) continue;
      if (alreadySettled.has(matchId)) continue;

      const isFinished = FINISHED_STATUSES.includes(fixtureStatus);
      const isVoid = VOID_STATUSES_API.includes(fixtureStatus);

      if (!isFinished && !isVoid) continue;

      const score = fixture.score;

      // SAFETY: finished fixture MUST have a final score
      if (isFinished) {
        if (score.fulltime.home == null || score.fulltime.away == null) {
          missingScoreCount++;
          errors.push(
            `Fixture ${fixture.fixture.id}: status=${fixtureStatus} but fulltime score is null. Skipped.`
          );
          continue;
        }
      }

      // Determine competition type from league round
      const round = fixture.league.round?.toLowerCase() || "";
      const isCup =
        round.includes("final") ||
        round.includes("semi") ||
        round.includes("quarter") ||
        round.includes("round of") ||
        round.includes("knockout");
      const compType = isCup ? "cup" : "league";

      // Determine if ET/penalties happened
      const wentToET =
        score.extratime?.home != null && score.extratime?.away != null;
      const wentToPen =
        score.penalty?.home != null && score.penalty?.away != null;

      // Build match_status
      let matchStatus: string;
      if (isFinished) {
        matchStatus = "confirmed";
      } else if (fixtureStatus === "PST") {
        matchStatus = "postponed";
      } else if (fixtureStatus === "CANC") {
        matchStatus = "cancelled";
      } else if (fixtureStatus === "ABD") {
        matchStatus = "abandoned";
      } else {
        matchStatus = "pending_review";
      }

      // Build result row — FT score uses score.fulltime (regulation only)
      const resultRow: Record<string, unknown> = {
        match_id: matchId,
        ft_home: isFinished ? score.fulltime.home : 0,
        ft_away: isFinished ? score.fulltime.away : 0,
        ht_home: score.halftime?.home ?? null,
        ht_away: score.halftime?.away ?? null,
        et_home: score.extratime?.home ?? null,
        et_away: score.extratime?.away ?? null,
        pen_home: score.penalty?.home ?? null,
        pen_away: score.penalty?.away ?? null,
        went_to_et: wentToET,
        went_to_penalties: wentToPen,
        match_status: matchStatus,
        competition_type: compType,
        provider_source: PROVIDER_SOURCE,
      };

      // Insert match result
      const { data: resultData, error: resultErr } = await supabase
        .from("match_results")
        .upsert(resultRow, { onConflict: "match_id" })
        .select("id, match_id, ft_home, ft_away, match_status")
        .single();

      if (resultErr) {
        errors.push(
          `Failed to insert result for match ${matchId}: ${resultErr.message}`
        );
        continue;
      }

      syncedCount++;
      alreadySettled.add(matchId);

      // ── 8. Settlement: only for confirmed results ──
      if (matchStatus === "confirmed") {
        const ftHome = resultData.ft_home as number;
        const ftAway = resultData.ft_away as number;
        const resultId = resultData.id as string;
        const totalGoals = ftHome + ftAway;

        for (const market of SUPPORTED_MARKETS) {
          let outcome: string;
          let reason: string;

          if (market === "h2h") {
            if (ftHome > ftAway) {
              outcome = "home";
              reason = `Home win ${ftHome}-${ftAway} (FT regulation)`;
            } else if (ftAway > ftHome) {
              outcome = "away";
              reason = `Away win ${ftHome}-${ftAway} (FT regulation)`;
            } else {
              outcome = "draw";
              reason = `Draw ${ftHome}-${ftAway} (FT regulation)`;
            }
          } else if (market === "btts") {
            const both = ftHome > 0 && ftAway > 0;
            outcome = both ? "yes" : "no";
            reason = both
              ? `Both scored (FT ${ftHome}-${ftAway})`
              : `Not both scored (FT ${ftHome}-${ftAway})`;
          } else {
            const line = parseFloat(market.replace("totals_", ""));
            if (totalGoals > line) {
              outcome = "over";
              reason = `${totalGoals} goals > ${line} (FT ${ftHome}-${ftAway})`;
            } else {
              outcome = "under";
              reason = `${totalGoals} goals < ${line} (FT ${ftHome}-${ftAway})`;
            }
          }

          await supabase.from("settlement_log").insert({
            match_id: matchId,
            match_result_id: resultId,
            market_key: market,
            outcome,
            status: "settled",
            reason,
            provider_source: PROVIDER_SOURCE,
          });
        }
        settledCount++;
      } else {
        const resultId = resultData.id as string;
        for (const market of SUPPORTED_MARKETS) {
          await supabase.from("settlement_log").insert({
            match_id: matchId,
            match_result_id: resultId,
            market_key: market,
            outcome: "void",
            status: matchStatus === "pending_review" ? "pending_review" : "void",
            reason: `Match ${matchStatus} — all markets voided`,
            provider_source: PROVIDER_SOURCE,
          });
        }
        voidCount++;
      }
    }

    // ── 9. Finalize sync log ──
    await finalizeLog("completed", {
      synced_count: syncedCount,
      settled_count: settledCount,
      void_count: voidCount,
      missing_score_count: missingScoreCount,
      error_message: errors.length > 0 ? errors.join("; ") : null,
    });

    return jsonResponse({
      message: `Synced ${syncedCount} results, settled ${settledCount}, voided ${voidCount}.`,
      synced: syncedCount,
      settled: settledCount,
      voided: voidCount,
      missing_scores: missingScoreCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(
      { error: `Unexpected error: ${message}` },
      500
    );
  }
});
