
// ============================================================
// MODEL FEATURE FLAGS
// Describes which data sources backed a prediction pick.
// Used to label picks honestly: form-only vs advanced-stat-backed.
// ============================================================

export type ModelFeatureFlags = {
  // Core data availability
  form_backed: boolean;       // Team form data available (always true when matches exist)
  odds_backed: boolean;       // Real bookmaker odds available and fresh
  xg_backed: boolean;         // Expected goals data available from provider
  stats_backed: boolean;      // Player/match stats available (shots, passes, etc.)
  settlement_backed: boolean; // Historical settlement data available
  trusted_market_backed: boolean; // Odds come from a trusted, normalized market

  // Cup-specific
  cup_historical_backed: boolean; // Historical cup data meets minimum sample requirement
  et_probability_backed: boolean; // ET probability computed from real historical data
  penalty_probability_backed: boolean; // Penalty probability backed by historical data

  // Derived label
  model_tier: "form_only" | "odds_form" | "full_model";
  model_confidence_label: string; // Human-readable label for the UI
};

// MIN_CUP_FIXTURES: minimum completed historical fixtures required
// to allow cup-specific ET/penalty probability to be considered real.
export const MIN_CUP_FIXTURES = 10;

// Build model feature flags from available data signals
export function buildModelFlags(signals: {
  has_live_odds: boolean;
  has_xg: boolean;
  has_stats: boolean;
  has_settlement: boolean;
  has_trusted_market?: boolean;
  cup_historical_sample?: number | null;
}): ModelFeatureFlags {
  const form_backed = true; // always available when match history exists
  const odds_backed = signals.has_live_odds;
  const xg_backed = signals.has_xg;
  const stats_backed = signals.has_stats;
  const settlement_backed = signals.has_settlement;
  const trusted_market_backed = signals.has_trusted_market ?? false;

  const sample = signals.cup_historical_sample ?? 0;
  const cup_historical_backed = sample >= MIN_CUP_FIXTURES;
  const et_probability_backed = cup_historical_backed && signals.has_xg;
  const penalty_probability_backed = cup_historical_backed;

  // Tier classification
  let model_tier: ModelFeatureFlags["model_tier"];
  if (odds_backed && xg_backed && stats_backed) {
    model_tier = "full_model";
  } else if (odds_backed) {
    model_tier = "odds_form";
  } else {
    model_tier = "form_only";
  }

  const model_confidence_label =
    model_tier === "full_model"
      ? "Full model (odds + xG + stats)"
      : model_tier === "odds_form"
      ? "Odds + form model"
      : "Form only — no odds/xG data";

  return {
    form_backed,
    odds_backed,
    xg_backed,
    stats_backed,
    settlement_backed,
    trusted_market_backed,
    cup_historical_backed,
    et_probability_backed,
    penalty_probability_backed,
    model_tier,
    model_confidence_label,
  };
}

// Check whether a cup competition has enough historical data for predictions
// Returns true if sample meets MIN_CUP_FIXTURES threshold.
export function cupMeetsSampleRequirement(
  cupHistoricalSample: number | null | undefined
): boolean {
  return (cupHistoricalSample ?? 0) >= MIN_CUP_FIXTURES;
}
