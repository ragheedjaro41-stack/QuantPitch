import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const STALE_THRESHOLD_HOURS = 4;

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

    // ── 1. Check for odds provider API key ──
    const oddsApiKey = Deno.env.get("ODDS_API_KEY");
    if (!oddsApiKey) {
      // Log the failure to provider status
      await supabase
        .from("odds_providers")
        .update({
          status: "inactive",
          last_ping_at: new Date().toISOString(),
          notes: "ODDS_API_KEY secret not configured. No sync performed.",
        })
        .eq("slug", "the-odds-api");

      return jsonResponse(
        {
          error:
            "ODDS_API_KEY secret not configured. Add it via Supabase dashboard > Edge Functions > Secrets. No odds were fetched and has_live_odds was NOT changed.",
          synced: 0,
          live_odds_changed: false,
          provider_status: "inactive",
        },
        200
      );
    }

    // ── 2. Fetch odds from The Odds API ──
    const sport = "soccer_epl"; // default sport key
    let body: { sport?: string } = {};
    try {
      body = await req.json();
    } catch {
      // no body is fine, use default
    }
    const sportKey = body.sport || sport;

    const apiUrl = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${oddsApiKey}&regions=uk,eu&markets=h2h&oddsFormat=decimal`;

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

        return jsonResponse(
          {
            error: `Odds API returned ${apiRes.status}`,
            detail: errText.slice(0, 200),
            synced: 0,
            live_odds_changed: false,
            provider_status: "error",
          },
          200
        );
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

      return jsonResponse(
        {
          error: `Failed to fetch from Odds API: ${message}`,
          synced: 0,
          live_odds_changed: false,
          provider_status: "error",
        },
        200
      );
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

      return jsonResponse({
        message: "API responded but returned 0 events for this sport.",
        synced: 0,
        live_odds_changed: false,
        provider_status: "active",
      });
    }

    // ── 3. Get provider ID ──
    const { data: providerRow } = await supabase
      .from("odds_providers")
      .select("id")
      .eq("slug", "the-odds-api")
      .maybeSingle();
    const providerId = providerRow?.id ?? null;

    // ── 4. Get league mapping ──
    // Try to find a league that matches the sport key
    const { data: leagueRows } = await supabase
      .from("leagues")
      .select("id")
      .eq("is_synthetic", false)
      .limit(1);
    const fallbackLeagueId = leagueRows?.[0]?.id ?? null;

    // ── 5. Normalize and insert odds ──
    const now = new Date().toISOString();
    let insertedCount = 0;

    for (const event of events) {
      for (const bk of event.bookmakers) {
        for (const mkt of bk.markets) {
          const outcomes = mkt.outcomes;
          const home = outcomes.find(
            (o) => o.name === event.home_team
          );
          const away = outcomes.find(
            (o) => o.name === event.away_team
          );
          const draw = outcomes.find((o) => o.name === "Draw");

          if (!home || !away) continue;

          // Mark previous odds for this event+bookmaker+market as stale
          await supabase
            .from("match_odds")
            .update({ is_stale: true })
            .eq("bookmaker", bk.key)
            .eq("market", mkt.key)
            .is("match_id", null)
            .eq("league_id", fallbackLeagueId);

          const { error: insertErr } = await supabase
            .from("match_odds")
            .insert({
              match_id: null,
              league_id: fallbackLeagueId,
              provider_id: providerId,
              bookmaker: bk.key,
              market: mkt.key,
              home_odds: home.price,
              draw_odds: draw?.price ?? null,
              away_odds: away.price,
              line: null,
              is_stale: false,
              fetched_at: now,
            });

          if (!insertErr) insertedCount++;
        }
      }
    }

    // ── 6. Mark globally stale odds ──
    await supabase.rpc("mark_stale_odds", {
      threshold_hours: STALE_THRESHOLD_HOURS,
    });

    // ── 7. Sync has_live_odds flag on leagues ──
    const { data: syncResult } = await supabase.rpc(
      "sync_league_live_odds_flag"
    );
    const liveOddsChanged =
      (syncResult || []).some(
        (r: { out_has_live_odds: boolean }) => r.out_has_live_odds
      ) || false;

    // ── 8. Update provider status ──
    await supabase
      .from("odds_providers")
      .update({
        status: "active",
        last_ping_at: now,
        last_success_at: now,
        notes: `Synced ${insertedCount} odds rows from ${events.length} events.`,
      })
      .eq("slug", "the-odds-api");

    return jsonResponse({
      message: `Synced ${insertedCount} odds rows from ${events.length} events.`,
      synced: insertedCount,
      events: events.length,
      live_odds_changed: liveOddsChanged,
      provider_status: "active",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(
      { error: `Unexpected error: ${message}`, live_odds_changed: false },
      500
    );
  }
});
