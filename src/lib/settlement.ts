import { supabase } from "./supabase";

// ============================================================
// TYPES
// ============================================================

export type MatchResult = {
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
  match_status: MatchStatus;
  competition_type: "league" | "cup";
  provider_source: string | null;
  confirmed_at: string;
  notes: string | null;
};

export type MatchStatus =
  | "confirmed"
  | "postponed"
  | "cancelled"
  | "abandoned"
  | "void"
  | "pending_review";

export type SettlementOutcome =
  | "home"
  | "away"
  | "draw"
  | "over"
  | "under"
  | "yes"
  | "no"
  | "void"
  | "push";

export type SettlementStatus = "settled" | "void" | "pending_review" | "error";

export type SettlementDecision = {
  market_key: string;
  outcome: SettlementOutcome;
  status: SettlementStatus;
  reason: string;
};

// ============================================================
// SETTLEMENT ELIGIBILITY
// ============================================================

const VOID_STATUSES: MatchStatus[] = ["postponed", "cancelled", "abandoned", "void"];

export function isSettleable(result: MatchResult): { ok: boolean; reason: string } {
  if (result.match_status === "confirmed") {
    return { ok: true, reason: "Match confirmed" };
  }
  if (result.match_status === "pending_review") {
    return { ok: false, reason: "Match pending manual review" };
  }
  if (VOID_STATUSES.includes(result.match_status)) {
    return { ok: false, reason: `Match ${result.match_status} — all markets void` };
  }
  return { ok: false, reason: `Unknown status: ${result.match_status}` };
}

// ============================================================
// MARKET SETTLERS
// ============================================================

function settleMatchResult(result: MatchResult): SettlementDecision {
  const { ft_home, ft_away } = result;
  let outcome: SettlementOutcome;
  let reason: string;

  if (ft_home > ft_away) {
    outcome = "home";
    reason = `Home win ${ft_home}-${ft_away} (FT regulation)`;
  } else if (ft_away > ft_home) {
    outcome = "away";
    reason = `Away win ${ft_home}-${ft_away} (FT regulation)`;
  } else {
    outcome = "draw";
    reason = `Draw ${ft_home}-${ft_away} (FT regulation)`;
  }

  return { market_key: "h2h", outcome, status: "settled", reason };
}

function settleTotals(result: MatchResult, line: number): SettlementDecision {
  const totalGoals = result.ft_home + result.ft_away;
  const marketKey = `totals_${line}`;
  let outcome: SettlementOutcome;
  let reason: string;

  if (totalGoals > line) {
    outcome = "over";
    reason = `${totalGoals} goals > ${line} line (FT ${result.ft_home}-${result.ft_away})`;
  } else if (totalGoals < line) {
    outcome = "under";
    reason = `${totalGoals} goals < ${line} line (FT ${result.ft_home}-${result.ft_away})`;
  } else {
    outcome = "push";
    reason = `${totalGoals} goals = ${line} line exactly (push)`;
  }

  return { market_key: marketKey, outcome, status: "settled", reason };
}

function settleBTTS(result: MatchResult): SettlementDecision {
  const bothScored = result.ft_home > 0 && result.ft_away > 0;
  return {
    market_key: "btts",
    outcome: bothScored ? "yes" : "no",
    status: "settled",
    reason: bothScored
      ? `Both teams scored (FT ${result.ft_home}-${result.ft_away})`
      : `${result.ft_home === 0 ? "Home" : "Away"} did not score (FT ${result.ft_home}-${result.ft_away})`,
  };
}

// ============================================================
// SUPPORTED MARKETS REGISTRY
// ============================================================

const SUPPORTED_MARKETS = ["h2h", "totals_1.5", "totals_2.5", "totals_3.5", "btts"] as const;
export type SupportedMarket = (typeof SUPPORTED_MARKETS)[number];

export function isSupportedMarket(key: string): key is SupportedMarket {
  return (SUPPORTED_MARKETS as readonly string[]).includes(key);
}

// ============================================================
// CORE SETTLEMENT ENGINE
// ============================================================

export function settleMarket(
  result: MatchResult,
  marketKey: string
): SettlementDecision {
  // Gate: non-confirmed matches void all markets
  const eligibility = isSettleable(result);
  if (!eligibility.ok) {
    const status: SettlementStatus = VOID_STATUSES.includes(result.match_status)
      ? "void"
      : "pending_review";
    return {
      market_key: marketKey,
      outcome: "void",
      status,
      reason: eligibility.reason,
    };
  }

  // Gate: unsupported market
  if (!isSupportedMarket(marketKey)) {
    return {
      market_key: marketKey,
      outcome: "void",
      status: "error",
      reason: `Unsupported market: ${marketKey}. Cannot settle.`,
    };
  }

  // Cup ET/penalty safety: all standard markets settle on REGULATION time only.
  // The ft_home/ft_away fields always represent 90-minute scores.
  // ET and penalties are recorded separately and do NOT affect these markets.

  switch (marketKey) {
    case "h2h":
      return settleMatchResult(result);
    case "totals_1.5":
      return settleTotals(result, 1.5);
    case "totals_2.5":
      return settleTotals(result, 2.5);
    case "totals_3.5":
      return settleTotals(result, 3.5);
    case "btts":
      return settleBTTS(result);
    default:
      return {
        market_key: marketKey,
        outcome: "void",
        status: "error",
        reason: `No settler for market: ${marketKey}`,
      };
  }
}

export function settleAllMarkets(result: MatchResult): SettlementDecision[] {
  return SUPPORTED_MARKETS.map((mk) => settleMarket(result, mk));
}

// ============================================================
// RESULTS INGESTION
// ============================================================

export type ResultInput = {
  match_id: string;
  ft_home: number;
  ft_away: number;
  ht_home?: number | null;
  ht_away?: number | null;
  et_home?: number | null;
  et_away?: number | null;
  pen_home?: number | null;
  pen_away?: number | null;
  went_to_et?: boolean;
  went_to_penalties?: boolean;
  match_status?: MatchStatus;
  competition_type?: "league" | "cup";
  provider_source?: string;
  notes?: string;
};

export async function ingestResult(input: ResultInput): Promise<{
  result: MatchResult;
  settlements: SettlementDecision[];
  errors: string[];
}> {
  const errors: string[] = [];

  // Validate inputs
  if (input.ft_home < 0 || input.ft_away < 0) {
    throw new Error("Scores cannot be negative");
  }
  if (input.went_to_et && (input.et_home == null || input.et_away == null)) {
    throw new Error("ET scores required when went_to_et is true");
  }
  if (input.went_to_penalties && (input.pen_home == null || input.pen_away == null)) {
    throw new Error("Penalty scores required when went_to_penalties is true");
  }

  const row = {
    match_id: input.match_id,
    ft_home: input.ft_home,
    ft_away: input.ft_away,
    ht_home: input.ht_home ?? null,
    ht_away: input.ht_away ?? null,
    et_home: input.et_home ?? null,
    et_away: input.et_away ?? null,
    pen_home: input.pen_home ?? null,
    pen_away: input.pen_away ?? null,
    went_to_et: input.went_to_et ?? false,
    went_to_penalties: input.went_to_penalties ?? false,
    match_status: input.match_status ?? "confirmed",
    competition_type: input.competition_type ?? "league",
    provider_source: input.provider_source ?? null,
    notes: input.notes ?? null,
  };

  // Upsert result (one result per match)
  const { data: resultData, error: resultErr } = await supabase
    .from("match_results")
    .upsert(row, { onConflict: "match_id" })
    .select("*")
    .single();

  if (resultErr) {
    throw new Error(`Failed to upsert match result: ${resultErr.message}`);
  }

  const matchResult = resultData as MatchResult;
  const settlements = settleAllMarkets(matchResult);

  // Write settlement log entries
  for (const s of settlements) {
    const { error: sErr } = await supabase.from("settlement_log").insert({
      match_id: matchResult.match_id,
      match_result_id: matchResult.id,
      market_key: s.market_key,
      outcome: s.outcome,
      status: s.status,
      reason: s.reason,
    });
    if (sErr) {
      errors.push(`Settlement log write failed for ${s.market_key}: ${sErr.message}`);
    }
  }

  return { result: matchResult, settlements, errors };
}

// ============================================================
// QUERY HELPERS
// ============================================================

export async function getPendingMatches(): Promise<
  Array<{ id: string; home_team_id: string; away_team_id: string; match_date: string; status: string; league_id: string | null }>
> {
  const { data: allMatches, error: mErr } = await supabase
    .from("matches")
    .select("id, home_team_id, away_team_id, match_date, status, league_id")
    .eq("status", "completed")
    .order("match_date", { ascending: false });
  if (mErr) throw mErr;

  const { data: settledIds, error: sErr } = await supabase
    .from("match_results")
    .select("match_id");
  if (sErr) throw sErr;

  const settledSet = new Set((settledIds || []).map((r: { match_id: string }) => r.match_id));
  return (allMatches || []).filter((m: { id: string }) => !settledSet.has(m.id));
}

export async function getSettlementSummary(): Promise<{
  total_results: number;
  confirmed: number;
  void_count: number;
  pending_review: number;
  total_settlements: number;
  settled_count: number;
  void_settlements: number;
  error_settlements: number;
  by_market: Array<{ market_key: string; settled: number; void: number; error: number }>;
}> {
  const [resultsR, settlementsR] = await Promise.all([
    supabase.from("match_results").select("id, match_status"),
    supabase.from("settlement_log").select("id, market_key, status"),
  ]);

  const results = (resultsR.data || []) as Array<{ id: string; match_status: string }>;
  const settlements = (settlementsR.data || []) as Array<{ id: string; market_key: string; status: string }>;

  const confirmed = results.filter((r) => r.match_status === "confirmed").length;
  const void_count = results.filter((r) => VOID_STATUSES.includes(r.match_status as MatchStatus)).length;
  const pending_review = results.filter((r) => r.match_status === "pending_review").length;

  const settled_count = settlements.filter((s) => s.status === "settled").length;
  const void_settlements = settlements.filter((s) => s.status === "void").length;
  const error_settlements = settlements.filter((s) => s.status === "error").length;

  const marketMap = new Map<string, { settled: number; void: number; error: number }>();
  for (const s of settlements) {
    if (!marketMap.has(s.market_key)) {
      marketMap.set(s.market_key, { settled: 0, void: 0, error: 0 });
    }
    const entry = marketMap.get(s.market_key)!;
    if (s.status === "settled") entry.settled++;
    else if (s.status === "void") entry.void++;
    else if (s.status === "error") entry.error++;
  }

  return {
    total_results: results.length,
    confirmed,
    void_count,
    pending_review,
    total_settlements: settlements.length,
    settled_count,
    void_settlements,
    error_settlements,
    by_market: [...marketMap.entries()].map(([market_key, counts]) => ({ market_key, ...counts })),
  };
}
