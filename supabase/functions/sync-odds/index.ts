import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const STALE_THRESHOLD_HOURS = 4;
const COOLDOWN_SECONDS = 120;

type OddsApiEvent = {
  id: string;
  sport_key: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        price: number;
        point?: number;
      }>;
    }>;
  }>;
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
        {
          error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
          live_odds_changed: false,
        },
        500
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parse request body
    let body: { sport?: string } = {};
    try {
      body = await req.json();
    } catch {
      // no body is fine
    }
    const sportKey = body.sport || "soccer_epl";

    // ── 1. Rate-limit / cooldown check ──
    const { data: recentSync } = await supabase
      .from("odds_sync_log")
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
          error: `Rate limited. Cooldown: ${remaining}s remaining. Last sync started ${Math.round(elapsed)}s ago.`,
          synced: 0,
          live_odds_changed: false,
          provider_status: "rate_limited",
          cooldown_remaining: remaining,
        });
      }
    }

    // ── 2. Create sync log entry ──
    const { data: logEntry, error: logErr } = await supabase
      .from("odds_sync_log")
      .insert({
        provider_slug: "the-odds-api",
        status: "running",
        sport_key: sportKey,
      })
      .select("id")
      .single();

    if (logErr) {
      return jsonResponse(
        { error: `Failed to create sync log: ${logErr.message}`, live_odds_changed: false },
        500
      );
    }
    const logId = logEntry.id;

    // Helper to finalize the log entry
    const finalizeLog = async (
      status: string,
      updates: Record<string, unknown>
    ) => {
      await supabase
        .from("odds_sync_log")
        .update({ status, finished_at: new Date().toISOString(), ...updates })
        .eq("id", logId);
    };

    // ── 3. Check for odds provider API key (env secret first, then DB fallback) ──
    let oddsApiKey = Deno.env.get("ODDS_API_KEY");
    if (!oddsApiKey) {
      const { data: cfgRow } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "ODDS_API_KEY")
        .maybeSingle();
      if (cfgRow?.value) oddsApiKey = cfgRow.value;
    }
    if (!oddsApiKey) {
      await supabase
        .from("odds_providers")
        .update({
          status: "inactive",
          last_ping_at: new Date().toISOString(),
          notes: "ODDS_API_KEY secret not configured. No sync performed.",
        })
        .eq("slug", "the-odds-api");

      await finalizeLog("failed", {
        error_message:
          "ODDS_API_KEY secret not configured. No odds fetched, has_live_odds NOT changed.",
        synced_count: 0,
      });

      return jsonResponse({
        error:
          "ODDS_API_KEY secret not configured. Add it via Supabase dashboard > Edge Functions > Secrets. No odds were fetched and has_live_odds was NOT changed.",
        synced: 0,
        live_odds_changed: false,
        provider_status: "inactive",
      });
    }

    // ── 4. Load trusted markets list ──
    const { data: trustedRows } = await supabase
      .from("trusted_markets")
      .select("market_key, trusted, settlement_supported")
      .eq("trusted", true);
    const trustedKeys = new Set(
      (trustedRows || []).map((r: { market_key: string }) => r.market_key)
    );

    // ── 5. Fetch odds from The Odds API ──
    const apiUrl = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${oddsApiKey}&regions=uk,eu&markets=h2h,totals&oddsFormat=decimal`;

    let events: OddsApiEvent[];
    try {
      const apiRes = await fetch(apiUrl);
      if (!apiRes.ok) {
        const errText = await apiRes.text();
        await supabase
          .from("odds_providers")
          .update({
            status: "error",
            last_ping_at: new Date().toISOString(),
            notes: `API returned ${apiRes.status}: ${errText.slice(0, 200)}`,
          })
          .eq("slug", "the-odds-api");

        await finalizeLog("failed", {
          error_message: `API returned ${apiRes.status}: ${errText.slice(0, 200)}`,
          synced_count: 0,
        });

        return jsonResponse({
          error: `Odds API returned ${apiRes.status}`,
          synced: 0,
          live_odds_changed: false,
          provider_status: "error",
        });
      }
      events = await apiRes.json();
    } catch (fetchErr: unknown) {
      const message =
        fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      await supabase
        .from("odds_providers")
        .update({
          status: "error",
          last_ping_at: new Date().toISOString(),
          notes: `Fetch failed: ${message.slice(0, 200)}`,
        })
        .eq("slug", "the-odds-api");

      await finalizeLog("failed", {
        error_message: `Fetch failed: ${message.slice(0, 200)}`,
        synced_count: 0,
      });

      return jsonResponse({
        error: `Failed to fetch from Odds API: ${message}`,
        synced: 0,
        live_odds_changed: false,
        provider_status: "error",
      });
    }

    if (!Array.isArray(events) || events.length === 0) {
      await supabase
        .from("odds_providers")
        .update({
          status: "active",
          last_ping_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          notes: "API responded but returned 0 events.",
        })
        .eq("slug", "the-odds-api");

      await finalizeLog("completed", {
        synced_count: 0,
        events_count: 0,
      });

      return jsonResponse({
        message: "API responded but returned 0 events for this sport.",
        synced: 0,
        live_odds_changed: false,
        provider_status: "active",
      });
    }

    // ── 6. Get provider ID ──
    const { data: providerRow } = await supabase
      .from("odds_providers")
      .select("id")
      .eq("slug", "the-odds-api")
      .maybeSingle();
    const providerId = providerRow?.id ?? null;

    // ── 7. Get league mapping ──
    const { data: leagueRows } = await supabase
      .from("leagues")
      .select("id")
      .eq("is_synthetic", false)
      .limit(1);
    const fallbackLeagueId = leagueRows?.[0]?.id ?? null;

    // ── 8. Normalize and insert odds with market audit ──
    const now = new Date().toISOString();
    let insertedCount = 0;
    const marketsSeen = new Set<string>();
    const untrustedMarketsSeen = new Set<string>();

    for (const event of events) {
      for (const bk of event.bookmakers) {
        for (const mkt of bk.markets) {
          // Normalize market key
          let normalizedKey = mkt.key;
          if (mkt.key === "totals") {
            const point =
              mkt.outcomes.find((o) => o.point !== undefined)?.point ?? 2.5;
            normalizedKey = `totals_${point}`;
          }

          marketsSeen.add(normalizedKey);

          // Check if market is trusted
          const isTrusted = trustedKeys.has(normalizedKey);
          if (!isTrusted) {
            untrustedMarketsSeen.add(normalizedKey);
            continue; // skip untrusted markets entirely
          }

          const outcomes = mkt.outcomes;
          const home = outcomes.find((o) => o.name === event.home_team);
          const away = outcomes.find((o) => o.name === event.away_team);
          const draw = outcomes.find((o) => o.name === "Draw");
          const over = outcomes.find((o) => o.name === "Over");
          const under = outcomes.find((o) => o.name === "Under");

          // For h2h we need home+away; for totals we need over+under
          if (normalizedKey === "h2h" && (!home || !away)) continue;
          if (normalizedKey.startsWith("totals_") && (!over || !under))
            continue;

          // Mark previous odds stale
          await supabase
            .from("match_odds")
            .update({ is_stale: true })
            .eq("bookmaker", bk.key)
            .eq("market", normalizedKey)
            .eq("league_id", fallbackLeagueId)
            .eq("is_stale", false);

          const row: Record<string, unknown> = {
            match_id: null,
            league_id: fallbackLeagueId,
            provider_id: providerId,
            bookmaker: bk.key,
            market: normalizedKey,
            is_stale: false,
            fetched_at: now,
          };

          if (normalizedKey === "h2h") {
            row.home_odds = home!.price;
            row.draw_odds = draw?.price ?? null;
            row.away_odds = away!.price;
            row.line = null;
          } else {
            row.home_odds = over!.price;
            row.draw_odds = null;
            row.away_odds = under!.price;
            row.line = over!.point ?? null;
          }

          const { error: insertErr } = await supabase
            .from("match_odds")
            .insert(row);

          if (!insertErr) insertedCount++;
        }
      }
    }

    // ── 9. Mark globally stale odds ──
    await supabase.rpc("mark_stale_odds", {
      threshold_hours: STALE_THRESHOLD_HOURS,
    });

    // ── 10. Sync has_live_odds flag on leagues ──
    const { data: syncResult } = await supabase.rpc(
      "sync_league_live_odds_flag"
    );
    const changedLeagues = (syncResult || [])
      .filter((r: { out_has_live_odds: boolean }) => r.out_has_live_odds)
      .map(
        (r: { out_league_name: string; out_has_live_odds: boolean }) =>
          r.out_league_name
      );
    const liveOddsChanged = changedLeagues.length > 0;

    // ── 11. Update provider status ──
    await supabase
      .from("odds_providers")
      .update({
        status: "active",
        last_ping_at: now,
        last_success_at: now,
        notes: `Synced ${insertedCount} odds rows from ${events.length} events. Trusted markets only.`,
      })
      .eq("slug", "the-odds-api");

    // ── 12. Compute odds age summary ──
    const { data: ageData } = await supabase
      .from("match_odds")
      .select("fetched_at, is_stale")
      .eq("is_stale", false)
      .order("fetched_at", { ascending: false })
      .limit(100);
    const ages = (ageData || []).map(
      (r: { fetched_at: string }) =>
        (Date.now() - new Date(r.fetched_at).getTime()) / 3600000
    );
    const oddsAgeSummary = {
      freshest_hours: ages.length > 0 ? Math.round(Math.min(...ages) * 100) / 100 : null,
      oldest_hours: ages.length > 0 ? Math.round(Math.max(...ages) * 100) / 100 : null,
      avg_hours:
        ages.length > 0
          ? Math.round((ages.reduce((a, b) => a + b, 0) / ages.length) * 100) / 100
          : null,
      total_fresh: ages.length,
    };

    // ── 13. Finalize sync log ──
    await finalizeLog("completed", {
      synced_count: insertedCount,
      events_count: events.length,
      leagues_changed: changedLeagues,
      odds_age_summary: oddsAgeSummary,
      markets_seen: [...marketsSeen],
      untrusted_markets_seen: [...untrustedMarketsSeen],
    });

    return jsonResponse({
      message: `Synced ${insertedCount} odds rows from ${events.length} events. Trusted markets only.`,
      synced: insertedCount,
      events: events.length,
      live_odds_changed: liveOddsChanged,
      leagues_changed: changedLeagues,
      provider_status: "active",
      markets_seen: [...marketsSeen],
      untrusted_markets_skipped: [...untrustedMarketsSeen],
      odds_age: oddsAgeSummary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(
      { error: `Unexpected error: ${message}`, live_odds_changed: false },
      500
    );
  }
});
