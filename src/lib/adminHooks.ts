import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";

export type League = {
  id: string;
  name: string;
  short_name: string;
  country: string;
  continent: string;
  tier: number;
  tier_label: string;
  competition_type: string;
  season: string;
  active: boolean;
  has_fixtures: boolean;
  has_odds: boolean;
  has_stats: boolean;
  has_standings: boolean;
  has_team_stats: boolean;
  has_injury_news: boolean;
  historical_depth_years: number;
  fixture_coverage: number;
  odds_coverage: number;
  stats_coverage: number;
  provider_flag: string;
  playable: boolean;
  notes: string | null;
  logo_url: string | null;
  created_at: string;
};

export type CupCompetition = {
  id: string;
  name: string;
  short_name: string;
  country: string;
  continent: string;
  competition_type: string;
  current_season: string;
  active: boolean;
  has_groups: boolean;
  has_two_legs: boolean;
  tier_label: string;
  has_fixtures: boolean;
  has_odds: boolean;
  has_stats: boolean;
  provider_flag: string;
  playable: boolean;
  notes: string | null;
};

export type CupRound = {
  id: string;
  cup_id: string;
  name: string;
  round_number: number;
  is_two_legs: boolean;
  is_neutral_venue: boolean;
};

export type CupFixture = {
  id: string;
  cup_id: string;
  round_id: string | null;
  round_name: string;
  home_team_name: string | null;
  away_team_name: string | null;
  match_date: string | null;
  venue: string | null;
  is_neutral_venue: boolean;
  home_score: number | null;
  away_score: number | null;
  home_score_et: number | null;
  away_score_et: number | null;
  home_score_pen: number | null;
  away_score_pen: number | null;
  went_to_et: boolean;
  went_to_penalties: boolean;
  leg: number;
  tie_id: string | null;
  home_agg: number | null;
  away_agg: number | null;
  status: string;
  winner_name: string | null;
  season: string;
};

export type DataCoverage = {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  fixture_coverage: number;
  odds_coverage: number;
  stats_coverage: number;
  standings_coverage: number;
  team_stats_coverage: number;
  injury_news_coverage: number;
  historical_depth_years: number;
  provider_flags: Record<string, string>;
  missing_data_flags: string[];
  overall_score: number;
  risk_level: string;
  last_audited_at: string;
};

export type PredictionRule = {
  id: string;
  rule_name: string;
  competition_types: string[];
  applies_to: string[];
  rule_description: string;
  weight_modifier: number;
  priority: number;
  active: boolean;
  category: string;
};

export type SafetyRule = {
  id: string;
  rule_name: string;
  min_fixtures: number;
  min_team_history_years: number;
  min_stats_coverage: number;
  min_odds_coverage: number;
  min_settlement_coverage: number;
  tier_applies_to: number[];
  description: string;
  consequence: string;
  active: boolean;
};

export type TeamAlias = {
  id: string;
  team_id: string;
  alias: string;
  source: string;
};

// ============================================================
// LEAGUES
// ============================================================
export function useAdminLeagues(filters?: { tier?: number; competition_type?: string; playable?: boolean }) {
  return useQuery({
    queryKey: ["admin-leagues", filters],
    queryFn: async () => {
      let q = supabase.from("leagues").select("*").order("tier").order("name");
      if (filters?.tier !== undefined) q = q.eq("tier", filters.tier);
      if (filters?.competition_type) q = q.eq("competition_type", filters.competition_type);
      if (filters?.playable !== undefined) q = q.eq("playable", filters.playable);
      const { data, error } = await q;
      if (error) throw error;
      return data as League[];
    },
  });
}

export function useLeagueTierSummary() {
  return useQuery({
    queryKey: ["league-tier-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leagues").select("*");
      if (error) throw error;
      const leagues = data as League[];

      const tiers = [
        { tier: 1, label: "Tier 1", color: "#10B981" },
        { tier: 2, label: "Tier 2", color: "#00D4FF" },
        { tier: 3, label: "Tier 3", color: "#fbbf24" },
        { tier: 4, label: "Tier 4", color: "#f87171" },
      ];

      return tiers.map((t) => {
        const tierLeagues = leagues.filter((l) => l.tier === t.tier);
        return {
          ...t,
          count: tierLeagues.length,
          playable: tierLeagues.filter((l) => l.playable).length,
          blocked: tierLeagues.filter((l) => !l.playable).length,
          avgOdds: tierLeagues.length
            ? Math.round(tierLeagues.reduce((s, l) => s + l.odds_coverage, 0) / tierLeagues.length)
            : 0,
          avgStats: tierLeagues.length
            ? Math.round(tierLeagues.reduce((s, l) => s + l.stats_coverage, 0) / tierLeagues.length)
            : 0,
        };
      });
    },
  });
}

// ============================================================
// CUPS
// ============================================================
export function useAdminCups() {
  return useQuery({
    queryKey: ["admin-cups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cup_competitions")
        .select("*")
        .order("competition_type")
        .order("name");
      if (error) throw error;
      return data as CupCompetition[];
    },
  });
}

export function useCupFixtures(cupId?: string) {
  return useQuery({
    queryKey: ["cup-fixtures", cupId],
    queryFn: async () => {
      let q = supabase
        .from("cup_fixtures")
        .select("*")
        .order("match_date", { ascending: false });
      if (cupId) q = q.eq("cup_id", cupId);
      const { data, error } = await q;
      if (error) throw error;
      return data as CupFixture[];
    },
  });
}

export function useAllCupFixtures() {
  return useQuery({
    queryKey: ["all-cup-fixtures"],
    queryFn: async () => {
      const { data: fixtures, error: fe } = await supabase
        .from("cup_fixtures")
        .select("*")
        .order("match_date", { ascending: false });
      if (fe) throw fe;

      const { data: cups, error: ce } = await supabase
        .from("cup_competitions")
        .select("id, name, short_name, country, competition_type");
      if (ce) throw ce;

      const cupMap = new Map((cups || []).map((c) => [c.id, c]));
      return (fixtures as CupFixture[]).map((f) => ({
        ...f,
        cup: cupMap.get(f.cup_id),
      }));
    },
  });
}

// ============================================================
// DATA COVERAGE
// ============================================================
export function useDataCoverage(entityType?: string) {
  return useQuery({
    queryKey: ["data-coverage", entityType],
    queryFn: async () => {
      let q = supabase
        .from("data_coverage")
        .select("*")
        .order("overall_score", { ascending: false });
      if (entityType) q = q.eq("entity_type", entityType);
      const { data, error } = await q;
      if (error) throw error;
      return data as DataCoverage[];
    },
  });
}

export function useCoverageSummary() {
  return useQuery({
    queryKey: ["coverage-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("data_coverage").select("*");
      if (error) throw error;
      const all = data as DataCoverage[];
      return {
        total: all.length,
        low: all.filter((d) => d.risk_level === "low").length,
        medium: all.filter((d) => d.risk_level === "medium").length,
        high: all.filter((d) => d.risk_level === "high").length,
        critical: all.filter((d) => d.risk_level === "critical").length,
        avgScore: all.length
          ? Math.round(all.reduce((s, d) => s + d.overall_score, 0) / all.length)
          : 0,
        missingOdds: all.filter((d) => d.missing_data_flags.includes("odds")).length,
        missingStats: all.filter((d) => d.missing_data_flags.includes("stats")).length,
        missingFixtures: all.filter((d) => d.missing_data_flags.includes("fixtures")).length,
      };
    },
  });
}

// ============================================================
// PREDICTION & SAFETY RULES
// ============================================================
export function usePredictionRules() {
  return useQuery({
    queryKey: ["prediction-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prediction_rules")
        .select("*")
        .order("category")
        .order("priority");
      if (error) throw error;
      return data as PredictionRule[];
    },
  });
}

export function useSafetyRules() {
  return useQuery({
    queryKey: ["safety-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safety_rules")
        .select("*")
        .order("rule_name");
      if (error) throw error;
      return data as SafetyRule[];
    },
  });
}

// ============================================================
// TEAM ADMIN
// ============================================================
export function useAdminTeams() {
  return useQuery({
    queryKey: ["admin-teams"],
    queryFn: async () => {
      const { data: teams, error: te } = await supabase
        .from("teams")
        .select("*")
        .order("name");
      if (te) throw te;

      const { data: aliases } = await supabase.from("team_aliases").select("*");
      const aliasMap = new Map<string, TeamAlias[]>();
      (aliases || []).forEach((a: TeamAlias) => {
        if (!aliasMap.has(a.team_id)) aliasMap.set(a.team_id, []);
        aliasMap.get(a.team_id)!.push(a);
      });

      return teams.map((t) => ({
        ...t,
        aliases: aliasMap.get(t.id) || [],
      }));
    },
  });
}

export function usePromotionRelegation() {
  return useQuery({
    queryKey: ["promotion-relegation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .or("promoted.eq.true,relegated.eq.true")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

// ============================================================
// THIN LEAGUES (Tier 3-4 or not playable)
// ============================================================
export function useThinLeagues() {
  return useQuery({
    queryKey: ["thin-leagues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leagues")
        .select("*")
        .or("tier.gte.3,playable.eq.false")
        .order("tier")
        .order("odds_coverage", { ascending: true });
      if (error) throw error;
      return data as League[];
    },
  });
}

export function useMissingProviderData() {
  return useQuery({
    queryKey: ["missing-provider-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_coverage")
        .select("*")
        .neq("missing_data_flags", "{}")
        .order("overall_score", { ascending: true });
      if (error) throw error;
      return data as DataCoverage[];
    },
  });
}

// ============================================================
// ODDS PROVIDERS + REFRESH LOG
// ============================================================
export type OddsProviderRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  api_endpoint: string | null;
  last_ping_at: string | null;
  last_success_at: string | null;
  notes: string | null;
};

export function useOddsProviders() {
  return useQuery({
    queryKey: ["odds-providers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("odds_providers").select("*").order("name");
      if (error) throw error;
      return data as OddsProviderRow[];
    },
  });
}

export function useCoverageRefreshLog(limit = 10) {
  return useQuery({
    queryKey: ["coverage-refresh-log", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coverage_refresh_log")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as Array<{
        id: string;
        triggered_by: string;
        started_at: string;
        finished_at: string | null;
        leagues_refreshed: number | null;
        status: string;
        error_message: string | null;
      }>;
    },
  });
}

// ============================================================
// ODDS MONITOR — full audit view
// ============================================================
export type OddsMonitorLeague = {
  id: string;
  name: string;
  tier: number;
  is_synthetic: boolean;
  has_live_odds: boolean;
  playable: boolean;
  fresh_odds_count: number;
  stale_odds_count: number;
  total_odds_count: number;
  freshest_at: string | null;
  bookmakers: string[];
  markets: string[];
};

export function useOddsMonitor() {
  return useQuery({
    queryKey: ["odds-monitor"],
    queryFn: async () => {
      const [leaguesR, oddsR] = await Promise.all([
        supabase.from("leagues").select("id, name, tier, is_synthetic, has_live_odds, playable").order("tier").order("name"),
        supabase.from("match_odds").select("id, league_id, bookmaker, market, is_stale, fetched_at").order("fetched_at", { ascending: false }),
      ]);
      if (leaguesR.error) throw leaguesR.error;

      const leagues = leaguesR.data as Array<{ id: string; name: string; tier: number; is_synthetic: boolean; has_live_odds: boolean; playable: boolean }>;
      const odds = (oddsR.data || []) as Array<{ id: string; league_id: string | null; bookmaker: string; market: string; is_stale: boolean; fetched_at: string }>;

      const oddsByLeague = new Map<string, typeof odds>();
      for (const o of odds) {
        if (!o.league_id) continue;
        if (!oddsByLeague.has(o.league_id)) oddsByLeague.set(o.league_id, []);
        oddsByLeague.get(o.league_id)!.push(o);
      }

      const result: OddsMonitorLeague[] = leagues.map((l) => {
        const lo = oddsByLeague.get(l.id) || [];
        const fresh = lo.filter((o) => !o.is_stale);
        const stale = lo.filter((o) => o.is_stale);
        const bookmakers = [...new Set(lo.map((o) => o.bookmaker))];
        const markets = [...new Set(lo.map((o) => o.market))];
        const freshestAt = fresh.length > 0 ? fresh[0].fetched_at : null;
        return {
          id: l.id,
          name: l.name,
          tier: l.tier,
          is_synthetic: l.is_synthetic,
          has_live_odds: l.has_live_odds,
          playable: l.playable,
          fresh_odds_count: fresh.length,
          stale_odds_count: stale.length,
          total_odds_count: lo.length,
          freshest_at: freshestAt,
          bookmakers,
          markets,
        };
      });

      return {
        leagues: result,
        totalOdds: odds.length,
        totalFresh: odds.filter((o) => !o.is_stale).length,
        totalStale: odds.filter((o) => o.is_stale).length,
        uniqueBookmakers: [...new Set(odds.map((o) => o.bookmaker))],
        uniqueMarkets: [...new Set(odds.map((o) => o.market))],
      };
    },
  });
}

// ============================================================
// ODDS SYNC LOG
// ============================================================
export type OddsSyncLogEntry = {
  id: string;
  provider_slug: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  synced_count: number;
  events_count: number;
  error_message: string | null;
  leagues_changed: string[];
  odds_age_summary: {
    freshest_hours: number | null;
    oldest_hours: number | null;
    avg_hours: number | null;
    total_fresh: number;
  } | null;
  markets_seen: string[];
  untrusted_markets_seen: string[];
  sport_key: string | null;
};

export function useOddsSyncLog(limit = 10) {
  return useQuery({
    queryKey: ["odds-sync-log", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("odds_sync_log")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as OddsSyncLogEntry[];
    },
  });
}

export function useSyncCooldown() {
  return useQuery({
    queryKey: ["sync-cooldown"],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("odds_sync_log")
        .select("started_at")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { onCooldown: false, remaining: 0 };
      const elapsed = (Date.now() - new Date(data.started_at).getTime()) / 1000;
      const remaining = Math.max(0, Math.ceil(120 - elapsed));
      return { onCooldown: remaining > 0, remaining };
    },
  });
}

// ============================================================
// TRUSTED MARKETS
// ============================================================
export type TrustedMarket = {
  id: string;
  market_key: string;
  display_name: string;
  category: string;
  trusted: boolean;
  settlement_supported: boolean;
  notes: string | null;
};

export function useTrustedMarkets() {
  return useQuery({
    queryKey: ["trusted-markets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trusted_markets")
        .select("*")
        .order("category")
        .order("market_key");
      if (error) throw error;
      return data as TrustedMarket[];
    },
  });
}

// ============================================================
// SETTLEMENT
// ============================================================

export type MatchResultRow = {
  id: string;
  match_id: string;
  ft_home: number;
  ft_away: number;
  ht_home: number | null;
  ht_away: number | null;
  et_home: number | null;
  et_away: number | null;
  pen_home: number | null;
  pen_away: number | null;
  went_to_et: boolean;
  went_to_penalties: boolean;
  match_status: string;
  competition_type: string;
  provider_source: string | null;
  confirmed_at: string;
  notes: string | null;
};

export type SettlementLogRow = {
  id: string;
  match_id: string;
  match_result_id: string;
  market_key: string;
  outcome: string;
  status: string;
  reason: string;
  settled_at: string;
};

export function useMatchResults(limit = 50) {
  return useQuery({
    queryKey: ["match-results", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_results")
        .select("*")
        .order("confirmed_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as MatchResultRow[];
    },
  });
}

export function useSettlementLog(limit = 100) {
  return useQuery({
    queryKey: ["settlement-log", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settlement_log")
        .select("*")
        .order("settled_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as SettlementLogRow[];
    },
  });
}

export function usePendingSettlementMatches() {
  return useQuery({
    queryKey: ["pending-settlement-matches"],
    queryFn: async () => {
      const [matchesR, resultsR, teamsR] = await Promise.all([
        supabase.from("matches").select("id, home_team_id, away_team_id, match_date, status, league_id, competition").eq("status", "completed").order("match_date", { ascending: false }),
        supabase.from("match_results").select("match_id"),
        supabase.from("teams").select("id, name"),
      ]);
      if (matchesR.error) throw matchesR.error;

      const settledSet = new Set((resultsR.data || []).map((r: { match_id: string }) => r.match_id));
      const teamMap = new Map((teamsR.data || []).map((t: { id: string; name: string }) => [t.id, t.name]));

      const pending = (matchesR.data || [])
        .filter((m: { id: string }) => !settledSet.has(m.id))
        .map((m: any) => ({
          ...m,
          home_team_name: teamMap.get(m.home_team_id) || "Unknown",
          away_team_name: teamMap.get(m.away_team_id) || "Unknown",
        }));

      return { pending, totalSettled: settledSet.size };
    },
  });
}

export function useSettlementSummary() {
  return useQuery({
    queryKey: ["settlement-summary"],
    queryFn: async () => {
      const [resultsR, logsR] = await Promise.all([
        supabase.from("match_results").select("id, match_status"),
        supabase.from("settlement_log").select("id, market_key, status"),
      ]);

      const results = (resultsR.data || []) as Array<{ id: string; match_status: string }>;
      const logs = (logsR.data || []) as Array<{ id: string; market_key: string; status: string }>;

      const confirmed = results.filter((r) => r.match_status === "confirmed").length;
      const voided = results.filter((r) => ["postponed", "cancelled", "abandoned", "void"].includes(r.match_status)).length;
      const review = results.filter((r) => r.match_status === "pending_review").length;

      const settled = logs.filter((l) => l.status === "settled").length;
      const voidLogs = logs.filter((l) => l.status === "void").length;
      const errorLogs = logs.filter((l) => l.status === "error").length;

      const marketMap = new Map<string, { settled: number; void: number; error: number }>();
      for (const l of logs) {
        if (!marketMap.has(l.market_key)) marketMap.set(l.market_key, { settled: 0, void: 0, error: 0 });
        const e = marketMap.get(l.market_key)!;
        if (l.status === "settled") e.settled++;
        else if (l.status === "void") e.void++;
        else e.error++;
      }

      return {
        total_results: results.length,
        confirmed,
        voided,
        review,
        total_logs: logs.length,
        settled,
        voidLogs,
        errorLogs,
        by_market: [...marketMap.entries()].map(([k, v]) => ({ market_key: k, ...v })),
      };
    },
  });
}