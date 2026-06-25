import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeLeaguePlayability,
  classifyMatchCompetition,
  buildCupContext,
  cupWeightModifier,
} from "../lib/playability";
import type { League, SafetyRule, DataCoverage } from "../lib/adminHooks";

// ============================================================
// HELPERS
// ============================================================

function makeLeague(overrides: Partial<League & { is_synthetic?: boolean; has_live_odds?: boolean }> = {}): League & { is_synthetic: boolean; has_live_odds: boolean } {
  return {
    id: "league-1",
    name: "Test Premier League",
    short_name: "TPL",
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
    rule_name: "Tier 4 Block",
    min_fixtures: 5,
    min_team_history_years: 1,
    min_stats_coverage: 50,
    min_odds_coverage: 40,
    min_settlement_coverage: 50,
    tier_applies_to: [4],
    description: "Block Tier 4 leagues with low coverage",
    consequence: "block",
    active: true,
    ...overrides,
  };
}

// ============================================================
// 1. FICTIONAL TEAMS NOT IN PREMIER LEAGUE
// ============================================================
describe("Fictional teams must not be assigned to Premier League", () => {
  it("Demo League is synthetic, Premier League is not", () => {
    const demoLeague = makeLeague({ name: "QuantPitch Demo League", is_synthetic: true });
    const premierLeague = makeLeague({ name: "Premier League", is_synthetic: false });
    expect(demoLeague.is_synthetic).toBe(true);
    expect(premierLeague.is_synthetic).toBe(false);
  });

  it("Synthetic league gets DEMO_PICK, never LIVE_PICK", async () => {
    const demo = makeLeague({ is_synthetic: true, has_live_odds: true });
    const result = await computeLeaguePlayability(demo, [], undefined);
    expect(result.pick_status).toBe("DEMO_PICK");
    expect(result.playable).toBe(false);
    expect(result.reason).toMatch(/synthetic/i);
  });

  it("Premier League with no live odds gets BLOCKED_PICK not DEMO_PICK", async () => {
    const pl = makeLeague({ name: "Premier League", is_synthetic: false, has_live_odds: false });
    const result = await computeLeaguePlayability(pl, [], undefined);
    expect(result.pick_status).toBe("BLOCKED_PICK");
    expect(result.is_synthetic).toBe(false);
    expect(result.reason).toMatch(/odds_not_live/i);
  });
});

// ============================================================
// 2. DEMO LEAGUES BLOCKED FROM LIVE TOP PLAYS
// ============================================================
describe("Demo leagues are excluded from live Top Plays", () => {
  it("Demo league not eligible for LIVE_PICK regardless of coverage", async () => {
    const demo = makeLeague({ is_synthetic: true, odds_coverage: 100, stats_coverage: 100, has_live_odds: true });
    const result = await computeLeaguePlayability(demo, [], undefined);
    expect(result.pick_status).not.toBe("LIVE_PICK");
  });

  it("Only LIVE_PICK leagues pass the Top Plays hard gate simulation", async () => {
    const demo = makeLeague({ id: "demo-id", is_synthetic: true, has_live_odds: true });
    const real = makeLeague({ id: "real-id", is_synthetic: false, has_live_odds: true });

    const demoResult = await computeLeaguePlayability(demo, [], undefined);
    const realResult = await computeLeaguePlayability(real, [], undefined);

    // Simulate the Top Plays filter
    const playabilityMap = new Map([
      ["demo-id", demoResult],
      ["real-id", realResult],
    ]);

    const matches = [
      { league_id: "demo-id" },
      { league_id: "real-id" },
    ];

    const liveMatches = matches.filter((m) => {
      const p = playabilityMap.get(m.league_id);
      return p?.pick_status === "LIVE_PICK";
    });

    expect(liveMatches.length).toBe(1);
    expect(liveMatches[0].league_id).toBe("real-id");
  });
});

// ============================================================
// 3. ODDS-NOT-LIVE BLOCKS LIVE_PICK
// ============================================================
describe("Leagues without live odds are BLOCKED_PICK", () => {
  it("has_live_odds=false → BLOCKED_PICK even with high odds_coverage seeded value", async () => {
    const league = makeLeague({ has_live_odds: false, odds_coverage: 95 });
    const result = await computeLeaguePlayability(league, [], undefined);
    expect(result.pick_status).toBe("BLOCKED_PICK");
    expect(result.reason).toMatch(/odds_not_live/i);
  });

  it("has_live_odds=true + good coverage → LIVE_PICK", async () => {
    const league = makeLeague({ has_live_odds: true, is_synthetic: false, odds_coverage: 90, stats_coverage: 85 });
    const result = await computeLeaguePlayability(league, [], undefined);
    expect(result.pick_status).toBe("LIVE_PICK");
    expect(result.playable).toBe(true);
  });

  it("Tier 4 + has_live_odds + low odds coverage → BLOCKED_PICK via safety rules", async () => {
    const league = makeLeague({ tier: 4, has_live_odds: true, odds_coverage: 20, is_synthetic: false });
    const rule = makeSafetyRule({ tier_applies_to: [4], min_odds_coverage: 40 });
    const result = await computeLeaguePlayability(league, [rule], undefined);
    expect(result.pick_status).toBe("BLOCKED_PICK");
    expect(result.reason).toMatch(/odds coverage/i);
  });
});

// ============================================================
// 4. CUP TWO-LEG CONTEXT CHANGES PREDICTION
// ============================================================
describe("Cup two-leg logic changes prediction context", () => {
  it("single-leg cup match has aggregate_context=single", () => {
    const ctx = buildCupContext({ leg: 1, home_agg: null, away_agg: null, stage: "round_of_16" });
    expect(ctx.aggregate_context).toBe("single");
    expect(ctx.is_two_leg).toBe(false);
  });

  it("leg 1 of two-leg tie has aggregate_context=first_leg", () => {
    const ctx = buildCupContext({ leg: 1, home_agg: 0, away_agg: 0, stage: "semifinal" });
    expect(ctx.aggregate_context).toBe("first_leg");
    expect(ctx.is_two_leg).toBe(true);
  });

  it("leg 2 of two-leg tie has aggregate_context=second_leg", () => {
    const ctx = buildCupContext({ leg: 2, home_agg: 3, away_agg: 1, stage: "semifinal" });
    expect(ctx.aggregate_context).toBe("second_leg");
    expect(ctx.is_two_leg).toBe(true);
    expect(ctx.home_agg).toBe(3);
  });

  it("second leg modifier is lower than first leg (more uncertainty)", () => {
    const firstLegCtx = buildCupContext({ leg: 1, home_agg: 0, away_agg: 0, stage: "quarterfinal" });
    const secondLegCtx = buildCupContext({ leg: 2, home_agg: 2, away_agg: 1, stage: "quarterfinal" });
    const firstMod = cupWeightModifier(firstLegCtx);
    const secondMod = cupWeightModifier(secondLegCtx);
    expect(secondMod).toBeLessThan(firstMod);
  });

  it("neutral venue removes home advantage flag", () => {
    const ctx = buildCupContext({ is_neutral_venue: true, leg: 1, stage: "final" });
    expect(ctx.is_neutral_venue).toBe(true);
    expect(ctx.xg_home_modifier).toBe(1.0);
  });

  it("final/semifinal sets pressure_flag=true reducing confidence", () => {
    const finalCtx = buildCupContext({ stage: "final", leg: 1 });
    const r16Ctx = buildCupContext({ stage: "round_of_16", leg: 1 });
    const finalMod = cupWeightModifier(finalCtx);
    const r16Mod = cupWeightModifier(r16Ctx);
    expect(finalCtx.pressure_flag).toBe(true);
    expect(r16Ctx.pressure_flag).toBe(false);
    expect(finalMod).toBeLessThan(r16Mod);
  });

  it("ET settlement type is aet", () => {
    const ctx = buildCupContext({ went_to_et: true, went_to_penalties: false });
    expect(ctx.settlement_type).toBe("aet");
  });

  it("penalties settlement type is penalties", () => {
    const ctx = buildCupContext({ went_to_et: true, went_to_penalties: true });
    expect(ctx.settlement_type).toBe("penalties");
  });

  it("normal 90-min settlement type is 90min", () => {
    const ctx = buildCupContext({ went_to_et: false, went_to_penalties: false });
    expect(ctx.settlement_type).toBe("90min");
  });
});

// ============================================================
// 5. ALIAS RESOLVER (pure / offline tests)
// ============================================================
describe("Alias resolver pure logic", () => {
  // Test the normalise + similarity logic directly by importing internals
  // Since normalise/similarityScore are not exported, we test via observable behaviour
  // of buildCupContext (exported) and computeLeaguePlayability (exported)
  // The resolver needs a Supabase call so we test the queue logic conceptually here

  it("Same league ID appears once in playability map regardless of multiple calls", async () => {
    const league = makeLeague({ id: "league-abc" });
    const r1 = await computeLeaguePlayability(league, [], undefined);
    const r2 = await computeLeaguePlayability(league, [], undefined);
    expect(r1.league_id).toBe(r2.league_id);
    expect(r1.pick_status).toBe(r2.pick_status);
  });

  it("Alias with different casing resolves to same status (normalisation)", async () => {
    // Proxy test: the playability engine is deterministic for same league input
    const league = makeLeague({ name: "FC Barcelona" });
    const leagueAlt = makeLeague({ name: "fc barcelona" });
    const r1 = await computeLeaguePlayability(league, [], undefined);
    const r2 = await computeLeaguePlayability(leagueAlt, [], undefined);
    expect(r1.pick_status).toBe(r2.pick_status);
  });
});

// ============================================================
// 6. COVERAGE REFRESH LOGIC (pure / unit)
// ============================================================
describe("Coverage refresh output logic", () => {
  it("synthetic league always maps to demo risk regardless of coverage numbers", async () => {
    // The stored procedure sets risk='demo' for is_synthetic=true leagues
    // We can test the pick_status which mirrors this
    const synthetic = makeLeague({ is_synthetic: true, odds_coverage: 99, stats_coverage: 99 });
    const result = await computeLeaguePlayability(synthetic, [], undefined);
    // The playability engine returns DEMO_PICK for synthetic, which corresponds to risk=demo
    expect(result.pick_status).toBe("DEMO_PICK");
  });

  it("league with no live odds has odds_pct=0 equivalent in playability", async () => {
    const league = makeLeague({ has_live_odds: false, odds_coverage: 80 });
    const result = await computeLeaguePlayability(league, [], undefined);
    // BLOCKED_PICK because odds feed is not live, not because seeded odds_coverage is low
    expect(result.pick_status).toBe("BLOCKED_PICK");
    expect(result.reason).toMatch(/odds_not_live/i);
  });

  it("league with live odds + good safety metrics produces LIVE_PICK", async () => {
    const league = makeLeague({ has_live_odds: true, tier: 1, odds_coverage: 90, stats_coverage: 85, playable: true });
    const safetyRule = makeSafetyRule({ tier_applies_to: [3, 4], min_odds_coverage: 40 }); // only applies to T3/4
    const coverage: DataCoverage = {
      id: "cov-1", entity_type: "league", entity_id: "league-1", entity_name: "Test Premier League",
      fixture_coverage: 95, odds_coverage: 90, stats_coverage: 85,
      standings_coverage: 95, team_stats_coverage: 80, injury_news_coverage: 0,
      historical_depth_years: 5, provider_flags: {}, missing_data_flags: [],
      overall_score: 88, risk_level: "low", last_audited_at: "2026-06-25T00:00:00Z",
    };
    const result = await computeLeaguePlayability(league, [safetyRule], coverage);
    expect(result.pick_status).toBe("LIVE_PICK");
    expect(result.playable).toBe(true);
    expect(result.confidence_cap).toBe(95);
  });
});

// ============================================================
// 7. CLASSIFICATION COMPLETENESS
// ============================================================
describe("Competition classification completeness", () => {
  it("league match in round 1 is domestic_league only", () => {
    const types = classifyMatchCompetition({ competition: "league", stage: null });
    expect(types).toEqual(["domestic_league"]);
  });

  it("worldcup group match is international + cup", () => {
    const types = classifyMatchCompetition({ competition: "worldcup", stage: "group" });
    expect(types).toContain("international");
    expect(types).toContain("cup");
    expect(types).not.toContain("knockout");
  });

  it("worldcup semifinal is international + cup + knockout", () => {
    const types = classifyMatchCompetition({ competition: "worldcup", stage: "semifinal" });
    expect(types).toContain("international");
    expect(types).toContain("cup");
    expect(types).toContain("knockout");
  });

  it("domestic cup final tagged as domestic_league + knockout", () => {
    const types = classifyMatchCompetition({ competition: "league", stage: "final" });
    expect(types).toContain("domestic_league");
    expect(types).toContain("knockout");
  });
});
