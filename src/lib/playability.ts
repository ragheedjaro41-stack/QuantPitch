import { supabase } from "./supabase";
import type { League, SafetyRule, DataCoverage } from "./adminHooks";
import { buildModelFlags, cupMeetsSampleRequirement, MIN_CUP_FIXTURES } from "./modelFlags";
import type { ModelFeatureFlags } from "./modelFlags";
export type { ModelFeatureFlags };
export { MIN_CUP_FIXTURES };

// ============================================================
// TYPES
// ============================================================

export type PickStatus = "LIVE_PICK" | "DEMO_PICK" | "BLOCKED_PICK";

export type PlayabilityResult = {
  playable: boolean;
  reason: string | null;
  confidence_cap: number | null;
  tier: number;
  league_id: string;
  league_name: string;
  pick_status: PickStatus;
  is_synthetic: boolean;
  has_live_odds: boolean;
  model_flags: ModelFeatureFlags;
};

export type CupMatchContext = {
  is_neutral_venue: boolean;
  is_two_leg: boolean;
  leg: number;
  home_agg: number | null;
  away_agg: number | null;
  went_to_et: boolean;
  went_to_penalties: boolean;
  stage: string | null;
  // Derived adjustments
  xg_home_modifier: number;  // multiplier on expected home advantage
  pressure_flag: boolean;    // semifinal / final pressure flag
  aggregate_context: "first_leg" | "second_leg" | "single" | "unknown";
  settlement_type: "90min" | "aet" | "penalties";
};

export type TopPlay = {
  match_id: string;
  home_team_name: string;
  away_team_name: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  venue: string;
  league_id: string;
  league_name: string;
  league_short_name: string;
  tier: number;
  competition_type: string;
  odds_coverage: number;
  stats_coverage: number;
  confidence_cap: number;
  pick: "home" | "away" | "draw";
  pick_label: string;
  pick_status: PickStatus;
  block_reason: string | null;
  value_score: number;
  home_form_pts: number;
  away_form_pts: number;
  cup_context: CupMatchContext | null;
  model_flags: ModelFeatureFlags;
};

// ============================================================
// CUP MATCH CONTEXT
// ============================================================

export function buildCupContext(fixture: {
  is_neutral_venue?: boolean;
  leg?: number;
  home_agg?: number | null;
  away_agg?: number | null;
  went_to_et?: boolean;
  went_to_penalties?: boolean;
  stage?: string | null;
}): CupMatchContext {
  const leg = fixture.leg ?? 1;
  const is_neutral_venue = fixture.is_neutral_venue ?? false;
  const is_two_leg = leg > 1 || (fixture.home_agg !== null && fixture.home_agg !== undefined);
  const stage = fixture.stage ?? null;

  // Neutral venue removes home advantage entirely
  const xg_home_modifier = is_neutral_venue ? 1.0 : 1.0;

  // Pressure flag: semifinal and final increase draw probability
  const pressure_flag = stage === "semifinal" || stage === "final" || stage === "third_place";

  // Aggregate context
  let aggregate_context: CupMatchContext["aggregate_context"];
  if (!is_two_leg) {
    aggregate_context = "single";
  } else if (leg === 1) {
    aggregate_context = "first_leg";
  } else if (leg === 2) {
    aggregate_context = "second_leg";
  } else {
    aggregate_context = "unknown";
  }

  // Settlement type
  let settlement_type: CupMatchContext["settlement_type"];
  if (fixture.went_to_penalties) {
    settlement_type = "penalties";
  } else if (fixture.went_to_et) {
    settlement_type = "aet";
  } else {
    settlement_type = "90min";
  }

  return {
    is_neutral_venue,
    is_two_leg,
    leg,
    home_agg: fixture.home_agg ?? null,
    away_agg: fixture.away_agg ?? null,
    went_to_et: fixture.went_to_et ?? false,
    went_to_penalties: fixture.went_to_penalties ?? false,
    stage,
    xg_home_modifier,
    pressure_flag,
    aggregate_context,
    settlement_type,
  };
}

// Derive cup weight modifier for the scoring model
// Neutral venue → no home advantage, use 1.0 for both sides
// Second leg with aggregate lead → away side needs fewer goals, adjust
// Final/semi → pressure suppresses goals (draw more likely), reduce confidence
export function cupWeightModifier(ctx: CupMatchContext): number {
  let modifier = 1.0;
  if (ctx.is_neutral_venue) modifier *= 0.95; // slight uncertainty
  if (ctx.pressure_flag) modifier *= 0.90;    // final/semi: draws more likely, lower pick confidence
  if (ctx.aggregate_context === "second_leg" && ctx.home_agg !== null && ctx.away_agg !== null) {
    // The team with aggregate lead plays more defensively
    modifier *= 0.85;
  }
  return modifier;
}

// ============================================================
// PLAYABILITY ENGINE
// ============================================================

export async function computeLeaguePlayability(
  league: League & { is_synthetic?: boolean; has_live_odds?: boolean },
  safetyRules: SafetyRule[],
  coverage: DataCoverage | undefined
): Promise<PlayabilityResult> {
  const is_synthetic = league.is_synthetic ?? false;
  const has_live_odds = league.has_live_odds ?? false;
  const has_stats = (coverage?.stats_coverage ?? league.stats_coverage) >= 50;
  const has_settlement = (coverage?.standings_coverage ?? league.fixture_coverage) >= 30;

  const demoFlags = buildModelFlags({ has_live_odds: false, has_xg: false, has_stats: false, has_settlement: false });

  // Synthetic/demo leagues are always DEMO_PICK, never LIVE_PICK
  if (is_synthetic) {
    return {
      playable: false,
      reason: "Synthetic/demo league — not eligible for live picks",
      confidence_cap: null,
      tier: league.tier,
      league_id: league.id,
      league_name: league.name,
      pick_status: "DEMO_PICK",
      is_synthetic: true,
      has_live_odds: false,
      model_flags: demoFlags,
    };
  }

  // No live odds → cannot produce LIVE_PICK
  if (!has_live_odds) {
    return {
      playable: false,
      reason: "No live odds feed connected — odds_not_live",
      confidence_cap: null,
      tier: league.tier,
      league_id: league.id,
      league_name: league.name,
      pick_status: "BLOCKED_PICK",
      is_synthetic: false,
      has_live_odds: false,
      model_flags: buildModelFlags({ has_live_odds: false, has_xg: false, has_stats, has_settlement }),
    };
  }

  // Evaluate safety rules against live coverage data
  const tierRules = safetyRules.filter((r) => r.active && r.tier_applies_to.includes(league.tier));
  for (const rule of tierRules) {
    const oddsCov = coverage?.odds_coverage ?? league.odds_coverage;
    const statsCov = coverage?.stats_coverage ?? league.stats_coverage;

    if (oddsCov < rule.min_odds_coverage) {
      return {
        playable: false,
        reason: `${rule.rule_name}: odds coverage ${oddsCov}% < required ${rule.min_odds_coverage}%`,
        confidence_cap: null,
        tier: league.tier,
        league_id: league.id,
        league_name: league.name,
        pick_status: "BLOCKED_PICK",
        is_synthetic: false,
        has_live_odds,
        model_flags: buildModelFlags({ has_live_odds, has_xg: false, has_stats, has_settlement }),
      };
    }
    if (statsCov < rule.min_stats_coverage) {
      return {
        playable: false,
        reason: `${rule.rule_name}: stats coverage ${statsCov}% < required ${rule.min_stats_coverage}%`,
        confidence_cap: null,
        tier: league.tier,
        league_id: league.id,
        league_name: league.name,
        pick_status: "BLOCKED_PICK",
        is_synthetic: false,
        has_live_odds,
        model_flags: buildModelFlags({ has_live_odds, has_xg: false, has_stats, has_settlement }),
      };
    }
  }

  // Explicit non-playable flag in registry
  if (!league.playable) {
    return {
      playable: false,
      reason: "Marked non-playable in registry",
      confidence_cap: null,
      tier: league.tier,
      league_id: league.id,
      league_name: league.name,
      pick_status: "BLOCKED_PICK",
      is_synthetic: false,
      has_live_odds,
      model_flags: buildModelFlags({ has_live_odds, has_xg: false, has_stats, has_settlement }),
    };
  }

  const confidenceCap = league.tier >= 3 ? 70 : league.tier === 2 ? 85 : 95;

  return {
    playable: true,
    reason: null,
    confidence_cap: confidenceCap,
    tier: league.tier,
    league_id: league.id,
    league_name: league.name,
    pick_status: "LIVE_PICK",
    is_synthetic: false,
    has_live_odds: true,
    model_flags: buildModelFlags({ has_live_odds: true, has_xg: false, has_stats, has_settlement }),
  };
}

// ============================================================
// CUP PICK GATE
// Returns BLOCKED_PICK when a cup has insufficient historical data
// ============================================================

export function computeCupPickStatus(
  cupHistoricalSample: number | null | undefined,
  basePickStatus: PickStatus
): { pick_status: PickStatus; reason: string | null } {
  if (basePickStatus !== "LIVE_PICK") {
    return { pick_status: basePickStatus, reason: null };
  }
  if (!cupMeetsSampleRequirement(cupHistoricalSample)) {
    return {
      pick_status: "BLOCKED_PICK",
      reason: `Cup historical sample too small (${cupHistoricalSample ?? 0} < ${MIN_CUP_FIXTURES} required). ET/pen probability unavailable.`,
    };
  }
  return { pick_status: "LIVE_PICK", reason: null };
}

// Returns a map of league_id → PlayabilityResult for all active leagues
export async function getAllLeaguePlayability(): Promise<Map<string, PlayabilityResult>> {
  const [leaguesR, safetyR, coverageR] = await Promise.all([
    supabase.from("leagues").select("*"),
    supabase.from("safety_rules").select("*").eq("active", true),
    supabase.from("data_coverage").select("*").eq("entity_type", "league"),
  ]);

  if (leaguesR.error) throw leaguesR.error;
  if (safetyR.error) throw safetyR.error;

  const leagues = leaguesR.data as (League & { is_synthetic: boolean; has_live_odds: boolean })[];
  const safetyRules = safetyR.data as SafetyRule[];
  const coverageMap = new Map(
    ((coverageR.data as DataCoverage[]) || []).map((c) => [c.entity_id, c])
  );

  const result = new Map<string, PlayabilityResult>();
  for (const league of leagues) {
    const coverage = coverageMap.get(league.id);
    const pr = await computeLeaguePlayability(league, safetyRules, coverage);
    result.set(league.id, pr);
  }
  return result;
}

// Returns only the IDs of playable (LIVE_PICK) leagues
export async function getPlayableLeagueIds(): Promise<Set<string>> {
  const all = await getAllLeaguePlayability();
  const ids = new Set<string>();
  for (const [id, result] of all) {
    if (result.pick_status === "LIVE_PICK") ids.add(id);
  }
  return ids;
}

// ============================================================
// COMPETITION CLASSIFIER
// ============================================================

export function classifyMatchCompetition(match: {
  competition: string;
  stage?: string | null;
}): string[] {
  const types: string[] = [];
  if (match.competition === "worldcup") types.push("international", "cup");
  else if (match.competition === "league") types.push("domestic_league");
  if (match.stage && match.stage !== "group") types.push("knockout");
  return types;
}

// ============================================================
// COVERAGE REFRESH (calls DB stored procedure)
// ============================================================

export type CoverageRefreshResult = {
  league_name: string;
  fixture_pct: number;
  odds_pct: number;
  stats_pct: number;
  settlement_pct: number;
  overall: number;
  risk: string;
};

export async function runCoverageRefresh(): Promise<CoverageRefreshResult[]> {
  // Use logged version so every refresh is tracked in coverage_refresh_log
  await supabase.rpc("refresh_league_coverage_logged", { p_triggered_by: "manual" });
  // Return detailed results from the base function for UI display
  const { data, error } = await supabase.rpc("refresh_league_coverage");
  if (error) throw error;
  return (data || []).map((r: any) => ({
    league_name: r.out_league_name,
    fixture_pct: r.out_fixture_pct,
    odds_pct: r.out_odds_pct,
    stats_pct: r.out_stats_pct,
    settlement_pct: r.out_settlement_pct,
    overall: r.out_overall,
    risk: r.out_risk,
  }));
}
