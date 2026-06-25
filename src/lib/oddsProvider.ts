import { supabase } from "./supabase";

// ============================================================
// TYPES
// ============================================================

export type OddsProviderStatus = "active" | "inactive" | "error" | "stale";

export type OddsProvider = {
  id: string;
  name: string;
  slug: string;
  status: OddsProviderStatus;
  api_endpoint: string | null;
  last_ping_at: string | null;
  last_success_at: string | null;
  config: Record<string, unknown>;
  notes: string | null;
  created_at: string;
};

export type MatchOdds = {
  id: string;
  match_id: string | null;
  league_id: string | null;
  provider_id: string | null;
  bookmaker: string;
  market: string;
  home_odds: number | null;
  draw_odds: number | null;
  away_odds: number | null;
  line: number | null;
  is_stale: boolean;
  fetched_at: string;
};

export type OddsStaleCheckResult = {
  league_id: string;
  league_name: string;
  has_fresh_odds: boolean;
  freshest_at: string | null;
  stale_count: number;
  fresh_count: number;
};

// Stale threshold: odds older than this are considered stale
export const ODDS_STALE_THRESHOLD_HOURS = 4;

// ============================================================
// PROVIDER STATUS
// ============================================================

export async function getOddsProviders(): Promise<OddsProvider[]> {
  const { data, error } = await supabase
    .from("odds_providers")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as OddsProvider[];
}

export async function updateProviderStatus(
  slug: string,
  status: OddsProviderStatus,
  lastSuccessAt?: string
) {
  const update: Record<string, unknown> = {
    status,
    last_ping_at: new Date().toISOString(),
  };
  if (lastSuccessAt) update.last_success_at = lastSuccessAt;

  const { error } = await supabase
    .from("odds_providers")
    .update(update)
    .eq("slug", slug);
  if (error) throw error;
}

// ============================================================
// ODDS FRESHNESS CHECK
// ============================================================

// Check whether a league has fresh (non-stale) odds
export async function checkLeagueOddsFreshness(
  leagueId: string
): Promise<OddsStaleCheckResult & { league_name: string }> {
  const { data: league } = await supabase
    .from("leagues")
    .select("id, name")
    .eq("id", leagueId)
    .single();

  const { data: oddsRows } = await supabase
    .from("match_odds")
    .select("id, is_stale, fetched_at")
    .eq("league_id", leagueId)
    .order("fetched_at", { ascending: false });

  const rows = oddsRows || [];
  const freshRows = rows.filter((r) => !r.is_stale);
  const staleRows = rows.filter((r) => r.is_stale);
  const freshestAt = freshRows.length > 0 ? freshRows[0].fetched_at : null;

  return {
    league_id: leagueId,
    league_name: league?.name ?? "Unknown",
    has_fresh_odds: freshRows.length > 0,
    freshest_at: freshestAt,
    stale_count: staleRows.length,
    fresh_count: freshRows.length,
  };
}

// ============================================================
// ODDS INGESTION (used when a provider sends data)
// Inserts new odds rows. Marks prior rows for this match stale.
// ============================================================

export async function ingestMatchOdds(
  matchId: string,
  leagueId: string,
  providerId: string,
  bookmaker: string,
  market: string,
  homeOdds: number,
  drawOdds: number | null,
  awayOdds: number
): Promise<void> {
  // Mark previous odds for this match+bookmaker+market as stale
  await supabase
    .from("match_odds")
    .update({ is_stale: true })
    .eq("match_id", matchId)
    .eq("bookmaker", bookmaker)
    .eq("market", market);

  // Insert fresh odds
  const { error } = await supabase.from("match_odds").insert({
    match_id: matchId,
    league_id: leagueId,
    provider_id: providerId,
    bookmaker,
    market,
    home_odds: homeOdds,
    draw_odds: drawOdds,
    away_odds: awayOdds,
    is_stale: false,
    fetched_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// ============================================================
// SYNC LIVE ODDS FLAG (calls DB function)
// ============================================================

export async function syncLeagueLiveOddsFlags(): Promise<
  { league_name: string; has_live_odds: boolean }[]
> {
  const { data, error } = await supabase.rpc("sync_league_live_odds_flag");
  if (error) throw error;
  return (data || []).map((r: any) => ({
    league_name: r.out_league_name,
    has_live_odds: r.out_has_live_odds,
  }));
}

// ============================================================
// GET COVERAGE REFRESH LOG
// ============================================================

export type RefreshLogEntry = {
  id: string;
  triggered_by: string;
  started_at: string;
  finished_at: string | null;
  leagues_refreshed: number | null;
  status: "running" | "completed" | "failed";
  error_message: string | null;
  summary: any;
};

export async function getCoverageRefreshLog(limit = 20): Promise<RefreshLogEntry[]> {
  const { data, error } = await supabase
    .from("coverage_refresh_log")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as RefreshLogEntry[];
}

// ============================================================
// LOGGED COVERAGE REFRESH (calls DB function)
// ============================================================

export async function runCoverageRefreshLogged(
  triggeredBy: "manual" | "cron" | "system" = "manual"
): Promise<string> {
  const { data, error } = await supabase.rpc("refresh_league_coverage_logged", {
    p_triggered_by: triggeredBy,
  });
  if (error) throw error;
  return data as string; // returns log entry UUID
}
