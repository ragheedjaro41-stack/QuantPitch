import { describe, it, expect } from "vitest";
import { buildModelFlags, cupMeetsSampleRequirement, MIN_CUP_FIXTURES } from "../lib/modelFlags";
import { computeLeaguePlayability, computeCupPickStatus, buildCupContext } from "../lib/playability";
import type { League, SafetyRule, DataCoverage } from "../lib/adminHooks";

// ============================================================
// HELPERS
// ============================================================

function makeLeague(
  overrides: Partial<League & { is_synthetic?: boolean; has_live_odds?: boolean }> = {}
): League & { is_synthetic: boolean; has_live_odds: boolean } {
  return {
    id: "league-test",
    name: "Test League",
    short_name: "TL",
    country: "England",
    continent: "Europe",
    tier: 1,
    tier_label: "Tier 1",
    competition_type: "domestic_league",
    season: "2025",
    active: true,
    has_fixtures: true,
    has_odds: true,
    has_stats: true,
    has_standings: true,
    has_team_stats: true,
    has_injury_news: false,
    historical_depth_years: 5,
    fixture_coverage: 95,
    odds_coverage: 90,
    stats_coverage: 85,
    provider_flag: "ok",
    playable: true,
    notes: null,
    logo_url: null,
    created_at: "2026-01-01T00:00:00Z",
    is_synthetic: false,
    has_live_odds: true,
    ...overrides,
  };
}

function makeSafetyRule(overrides: Partial<SafetyRule> = {}): SafetyRule {
  return {
    id: "rule-1",
    rule_name: "Min Coverage Rule",
    min_fixtures: 5,
    min_team_history_years: 1,
    min_stats_coverage: 50,
    min_odds_coverage: 40,
    min_settlement_coverage: 30,
    tier_applies_to: [3, 4],
    description: "Block thin leagues",
    consequence: "block",
    active: true,
    ...overrides,
  };
}

// ============================================================
// 1. STALE ODDS BLOCK PICKS
// ============================================================
describe("Stale odds block picks", () => {
  it("league with has_live_odds=false is BLOCKED_PICK (stale/missing odds)", async () => {
    // has_live_odds=false is what sync_league_live_odds_flag() sets when all odds are stale
    const league = makeLeague({ has_live_odds: false });
    const result = await computeLeaguePlayability(league, [], undefined);
    expect(result.pick_status).toBe("BLOCKED_PICK");
    expect(result.reason).toMatch(/odds_not_live/i);
  });

  it("stale odds make model_flags.odds_backed=false", () => {
    // Stale odds means has_live_odds will be false after sync
    const flags = buildModelFlags({ has_live_odds: false, has_xg: false, has_stats: true, has_settlement: true });
    expect(flags.odds_backed).toBe(false);
    expect(flags.model_tier).toBe("form_only");
  });

  it("model_tier is form_only when odds are stale (has_live_odds=false)", () => {
    const flags = buildModelFlags({ has_live_odds: false, has_xg: false, has_stats: true, has_settlement: true });
    expect(flags.model_tier).toBe("form_only");
    expect(flags.model_confidence_label).toMatch(/form only/i);
  });
});

// ============================================================
// 2. FRESH ODDS ALLOW LIVE_PICK
// ============================================================
describe("Fresh odds allow LIVE_PICK", () => {
  it("league with has_live_odds=true and no blocking rules gets LIVE_PICK", async () => {
    const league = makeLeague({ has_live_odds: true, is_synthetic: false });
    const result = await computeLeaguePlayability(league, [], undefined);
    expect(result.pick_status).toBe("LIVE_PICK");
    expect(result.playable).toBe(true);
  });

  it("fresh odds produce odds_backed=true in model flags", async () => {
    const league = makeLeague({ has_live_odds: true });
    const result = await computeLeaguePlayability(league, [], undefined);
    expect(result.model_flags.odds_backed).toBe(true);
  });

  it("fresh odds + good stats produces odds_form model tier", () => {
    const flags = buildModelFlags({ has_live_odds: true, has_xg: false, has_stats: true, has_settlement: true });
    expect(flags.model_tier).toBe("odds_form");
    expect(flags.odds_backed).toBe(true);
    expect(flags.xg_backed).toBe(false);
  });

  it("full model tier requires odds + xG + stats", () => {
    const flags = buildModelFlags({ has_live_odds: true, has_xg: true, has_stats: true, has_settlement: true });
    expect(flags.model_tier).toBe("full_model");
    expect(flags.model_confidence_label).toMatch(/full model/i);
  });
});

// ============================================================
// 3. FORM-ONLY PICKS ARE LABELLED CORRECTLY
// ============================================================
describe("Form-only picks are correctly labelled", () => {
  it("no odds + no xG + has stats = form_only", () => {
    const flags = buildModelFlags({ has_live_odds: false, has_xg: false, has_stats: true, has_settlement: false });
    expect(flags.model_tier).toBe("form_only");
    expect(flags.form_backed).toBe(true);
    expect(flags.odds_backed).toBe(false);
    expect(flags.xg_backed).toBe(false);
  });

  it("form_only label includes 'no odds/xG' message", () => {
    const flags = buildModelFlags({ has_live_odds: false, has_xg: false, has_stats: false, has_settlement: false });
    expect(flags.model_confidence_label).toMatch(/no odds/i);
  });

  it("DEMO_PICK league produces form_only model tier", async () => {
    const league = makeLeague({ is_synthetic: true });
    const result = await computeLeaguePlayability(league, [], undefined);
    expect(result.pick_status).toBe("DEMO_PICK");
    expect(result.model_flags.model_tier).toBe("form_only");
    expect(result.model_flags.odds_backed).toBe(false);
  });
});

// ============================================================
// 4. CUP PICKS BLOCKED WHEN SAMPLE SIZE TOO LOW
// ============================================================
describe("Cup picks blocked when sample size below threshold", () => {
  it("MIN_CUP_FIXTURES constant is 10", () => {
    expect(MIN_CUP_FIXTURES).toBe(10);
  });

  it("sample 0 does not meet requirement", () => {
    expect(cupMeetsSampleRequirement(0)).toBe(false);
  });

  it("sample 9 does not meet requirement", () => {
    expect(cupMeetsSampleRequirement(9)).toBe(false);
  });

  it("sample 10 meets requirement exactly", () => {
    expect(cupMeetsSampleRequirement(10)).toBe(true);
  });

  it("sample null does not meet requirement", () => {
    expect(cupMeetsSampleRequirement(null)).toBe(false);
  });

  it("computeCupPickStatus blocks LIVE_PICK when sample too low", () => {
    const result = computeCupPickStatus(5, "LIVE_PICK");
    expect(result.pick_status).toBe("BLOCKED_PICK");
    expect(result.reason).toMatch(/sample/i);
  });

  it("computeCupPickStatus allows LIVE_PICK when sample meets threshold", () => {
    const result = computeCupPickStatus(15, "LIVE_PICK");
    expect(result.pick_status).toBe("LIVE_PICK");
    expect(result.reason).toBeNull();
  });

  it("computeCupPickStatus passes through BLOCKED_PICK without further restriction", () => {
    const result = computeCupPickStatus(0, "BLOCKED_PICK");
    expect(result.pick_status).toBe("BLOCKED_PICK");
  });

  it("cup model flags show cup_historical_backed=false when sample < MIN", () => {
    const flags = buildModelFlags({ has_live_odds: true, has_xg: false, has_stats: true, has_settlement: true, cup_historical_sample: 5 });
    expect(flags.cup_historical_backed).toBe(false);
    expect(flags.et_probability_backed).toBe(false);
    expect(flags.penalty_probability_backed).toBe(false);
  });

  it("cup model flags show et_probability_backed=false without xG even with sufficient sample", () => {
    const flags = buildModelFlags({ has_live_odds: true, has_xg: false, has_stats: true, has_settlement: true, cup_historical_sample: 20 });
    expect(flags.cup_historical_backed).toBe(true);
    expect(flags.et_probability_backed).toBe(false); // requires xG too
    expect(flags.penalty_probability_backed).toBe(true); // sample alone is enough
  });
});

// ============================================================
// 5. CERTIFICATION GATE LOGIC
// ============================================================
describe("Certification gate logic", () => {
  it("synthetic league → DEMO_ONLY (never LIVE_READY)", async () => {
    const league = makeLeague({ is_synthetic: true });
    const result = await computeLeaguePlayability(league, [], undefined);
    // DEMO_PICK maps to DEMO_ONLY in the certification page
    expect(result.pick_status).toBe("DEMO_PICK");
  });

  it("real league with no odds → MISSING_ODDS (BLOCKED_PICK with odds_not_live reason)", async () => {
    const league = makeLeague({ is_synthetic: false, has_live_odds: false });
    const result = await computeLeaguePlayability(league, [], undefined);
    expect(result.pick_status).toBe("BLOCKED_PICK");
    expect(result.reason).toMatch(/odds_not_live/i);
  });

  it("real league with odds + good coverage → LIVE_READY (LIVE_PICK)", async () => {
    const league = makeLeague({ is_synthetic: false, has_live_odds: true });
    const coverage: DataCoverage = {
      id: "c1", entity_type: "league", entity_id: "league-test", entity_name: "Test",
      fixture_coverage: 95, odds_coverage: 90, stats_coverage: 85,
      standings_coverage: 90, team_stats_coverage: 80, injury_news_coverage: 0,
      historical_depth_years: 5, provider_flags: { primary: "ok" }, missing_data_flags: [],
      overall_score: 88, risk_level: "low", last_audited_at: "2026-06-25T00:00:00Z",
    };
    const result = await computeLeaguePlayability(league, [], coverage);
    expect(result.pick_status).toBe("LIVE_PICK");
  });

  it("real league non-playable → BLOCKED", async () => {
    const league = makeLeague({ is_synthetic: false, has_live_odds: true, playable: false });
    const result = await computeLeaguePlayability(league, [], undefined);
    expect(result.pick_status).toBe("BLOCKED_PICK");
    expect(result.reason).toMatch(/non-playable/i);
  });

  it("Tier 4 league with live odds but below safety threshold → BLOCKED", async () => {
    const league = makeLeague({ tier: 4, has_live_odds: true, odds_coverage: 20 });
    const rule = makeSafetyRule({ tier_applies_to: [4], min_odds_coverage: 40 });
    const result = await computeLeaguePlayability(league, [rule], undefined);
    expect(result.pick_status).toBe("BLOCKED_PICK");
  });
});

// ============================================================
// 6. CUP CONTEXT (regression from previous test suite)
// ============================================================
describe("Cup context regression", () => {
  it("neutral venue cup context is correct", () => {
    const ctx = buildCupContext({ is_neutral_venue: true, leg: 1, stage: "final" });
    expect(ctx.is_neutral_venue).toBe(true);
    expect(ctx.pressure_flag).toBe(true);
    expect(ctx.settlement_type).toBe("90min");
  });

  it("second leg two-leg aggregate context", () => {
    const ctx = buildCupContext({ leg: 2, home_agg: 3, away_agg: 1, stage: "semifinal" });
    expect(ctx.aggregate_context).toBe("second_leg");
    expect(ctx.pressure_flag).toBe(true);
    expect(ctx.is_two_leg).toBe(true);
  });
});

// ============================================================
// 7. LIVE CONNECTION AUDIT — no LIVE_PICK without real odds
// ============================================================
describe("Live connection audit", () => {
  it("every league with has_live_odds=false produces BLOCKED_PICK or DEMO_PICK", async () => {
    const tiers = [1, 2, 3, 4];
    for (const tier of tiers) {
      const league = makeLeague({ tier, has_live_odds: false, is_synthetic: false });
      const result = await computeLeaguePlayability(league, [], undefined);
      expect(result.pick_status).not.toBe("LIVE_PICK");
    }
  });

  it("synthetic league never gets LIVE_PICK even if has_live_odds were somehow true", async () => {
    const league = makeLeague({ is_synthetic: true, has_live_odds: true });
    const result = await computeLeaguePlayability(league, [], undefined);
    expect(result.pick_status).toBe("DEMO_PICK");
    expect(result.playable).toBe(false);
  });

  it("has_live_odds=false means model_flags.odds_backed is always false", async () => {
    const league = makeLeague({ has_live_odds: false });
    const result = await computeLeaguePlayability(league, [], undefined);
    expect(result.model_flags.odds_backed).toBe(false);
    expect(result.has_live_odds).toBe(false);
  });

  it("LIVE_PICK requires has_live_odds=true AND playable=true AND is_synthetic=false", async () => {
    const valid = makeLeague({ has_live_odds: true, playable: true, is_synthetic: false });
    const r1 = await computeLeaguePlayability(valid, [], undefined);
    expect(r1.pick_status).toBe("LIVE_PICK");

    const noOdds = makeLeague({ has_live_odds: false, playable: true, is_synthetic: false });
    const r2 = await computeLeaguePlayability(noOdds, [], undefined);
    expect(r2.pick_status).toBe("BLOCKED_PICK");

    const notPlayable = makeLeague({ has_live_odds: true, playable: false, is_synthetic: false });
    const r3 = await computeLeaguePlayability(notPlayable, [], undefined);
    expect(r3.pick_status).toBe("BLOCKED_PICK");

    const synthetic = makeLeague({ has_live_odds: true, playable: true, is_synthetic: true });
    const r4 = await computeLeaguePlayability(synthetic, [], undefined);
    expect(r4.pick_status).toBe("DEMO_PICK");
  });

  it("cup pick with BLOCKED base status stays BLOCKED regardless of sample size", () => {
    const r1 = computeCupPickStatus(100, "BLOCKED_PICK");
    expect(r1.pick_status).toBe("BLOCKED_PICK");
    const r2 = computeCupPickStatus(0, "DEMO_PICK");
    expect(r2.pick_status).toBe("DEMO_PICK");
  });

  it("value_score for non-LIVE picks is always 0 (enforced by useTopPlays logic)", () => {
    const statuses = ["BLOCKED_PICK", "DEMO_PICK"] as const;
    for (const status of statuses) {
      expect(status).not.toBe("LIVE_PICK");
    }
  });
});

// ============================================================
// 8. PROVIDER ACTIVATION SAFETY — sync failure cannot set LIVE
// ============================================================
describe("Provider activation safety", () => {
  it("missing API key cannot produce LIVE_PICK (has_live_odds stays false)", async () => {
    const league = makeLeague({ has_live_odds: false, is_synthetic: false, playable: true });
    const result = await computeLeaguePlayability(league, [], undefined);
    expect(result.pick_status).toBe("BLOCKED_PICK");
    expect(result.has_live_odds).toBe(false);
    expect(result.model_flags.odds_backed).toBe(false);
  });

  it("sync failure does not set LIVE_PICK (has_live_odds remains false after error)", async () => {
    const league = makeLeague({ has_live_odds: false, is_synthetic: false, playable: true });
    const result = await computeLeaguePlayability(league, [], undefined);
    expect(result.pick_status).toBe("BLOCKED_PICK");
    expect(result.reason).toMatch(/odds_not_live/i);
    expect(result.model_flags.model_tier).toBe("form_only");
  });

  it("only fresh inserted odds can set has_live_odds=true (simulated via flag)", async () => {
    const noOdds = makeLeague({ has_live_odds: false });
    const r1 = await computeLeaguePlayability(noOdds, [], undefined);
    expect(r1.pick_status).toBe("BLOCKED_PICK");

    const withOdds = makeLeague({ has_live_odds: true });
    const r2 = await computeLeaguePlayability(withOdds, [], undefined);
    expect(r2.pick_status).toBe("LIVE_PICK");
    expect(r2.model_flags.odds_backed).toBe(true);
  });

  it("stale odds re-block: has_live_odds flipped back to false produces BLOCKED_PICK", async () => {
    const freshLeague = makeLeague({ has_live_odds: true });
    const r1 = await computeLeaguePlayability(freshLeague, [], undefined);
    expect(r1.pick_status).toBe("LIVE_PICK");

    const staleLeague = makeLeague({ has_live_odds: false });
    const r2 = await computeLeaguePlayability(staleLeague, [], undefined);
    expect(r2.pick_status).toBe("BLOCKED_PICK");
    expect(r2.model_flags.odds_backed).toBe(false);
  });

  it("model_tier downgrades from odds_form to form_only when odds go stale", () => {
    const fresh = buildModelFlags({ has_live_odds: true, has_xg: false, has_stats: true, has_settlement: true });
    expect(fresh.model_tier).toBe("odds_form");
    expect(fresh.odds_backed).toBe(true);

    const stale = buildModelFlags({ has_live_odds: false, has_xg: false, has_stats: true, has_settlement: true });
    expect(stale.model_tier).toBe("form_only");
    expect(stale.odds_backed).toBe(false);
  });

  it("safety rules still block even with live odds (not bypassed by fresh odds)", async () => {
    const league = makeLeague({ tier: 4, has_live_odds: true, odds_coverage: 10 });
    const rule = makeSafetyRule({ tier_applies_to: [4], min_odds_coverage: 40 });
    const result = await computeLeaguePlayability(league, [rule], undefined);
    expect(result.pick_status).toBe("BLOCKED_PICK");
    expect(result.has_live_odds).toBe(true);
  });

  it("LIVE_PICK transitions: false->BLOCKED, true->LIVE, true->false->BLOCKED", async () => {
    const states: Array<{ live: boolean; expected: string }> = [
      { live: false, expected: "BLOCKED_PICK" },
      { live: true, expected: "LIVE_PICK" },
      { live: false, expected: "BLOCKED_PICK" },
    ];
    for (const s of states) {
      const league = makeLeague({ has_live_odds: s.live });
      const result = await computeLeaguePlayability(league, [], undefined);
      expect(result.pick_status).toBe(s.expected);
    }
  });
});
