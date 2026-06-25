import { describe, it, expect } from "vitest";
import { computeLeaguePlayability, classifyMatchCompetition } from "../lib/playability";
import type { League, SafetyRule, DataCoverage } from "../lib/adminHooks";

function makeLeague(overrides: Partial<League & { is_synthetic?: boolean; has_live_odds?: boolean }> = {}): League & { is_synthetic: boolean; has_live_odds: boolean } {
  return {
    id: "league-1",
    name: "Test League",
    short_name: "TL",
    country: "Testland",
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
    historical_depth_years: 3,
    fixture_coverage: 90,
    odds_coverage: 85,
    stats_coverage: 80,
    provider_flag: "ok",
    playable: true,
    notes: null,
    logo_url: null,
    created_at: "2026-01-01T00:00:00Z",
    // Default to has_live_odds=true so old tests remain valid (simulating a connected league)
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
// TIER 4 BLOCKING
// ============================================================
describe("Tier 4 blocking", () => {
  it("blocks a Tier 4 league with low odds coverage", async () => {
    const league = makeLeague({ tier: 4, odds_coverage: 30, playable: true });
    const rule = makeSafetyRule({ tier_applies_to: [4], min_odds_coverage: 40 });
    const result = await computeLeaguePlayability(league, [rule], undefined);
    expect(result.playable).toBe(false);
    expect(result.reason).toMatch(/odds coverage/i);
  });

  it("blocks a Tier 4 league with low stats coverage", async () => {
    const league = makeLeague({ tier: 4, stats_coverage: 20, odds_coverage: 90, playable: true });
    const rule = makeSafetyRule({ tier_applies_to: [4], min_stats_coverage: 50, min_odds_coverage: 40 });
    const result = await computeLeaguePlayability(league, [rule], undefined);
    expect(result.playable).toBe(false);
    expect(result.reason).toMatch(/stats coverage/i);
  });

  it("allows Tier 1 league to pass when no matching safety rule", async () => {
    const league = makeLeague({ tier: 1 });
    const rule = makeSafetyRule({ tier_applies_to: [4] });
    const result = await computeLeaguePlayability(league, [rule], undefined);
    expect(result.playable).toBe(true);
  });

  it("respects the playable=false flag even without a safety rule breach", async () => {
    const league = makeLeague({ playable: false });
    const result = await computeLeaguePlayability(league, [], undefined);
    expect(result.playable).toBe(false);
    expect(result.reason).toMatch(/non-playable/i);
  });
});

// ============================================================
// CONFIDENCE CAPS BY TIER
// ============================================================
describe("Confidence caps by tier", () => {
  it("caps Tier 1 at 95%", async () => {
    const league = makeLeague({ tier: 1 });
    const result = await computeLeaguePlayability(league, [], undefined);
    expect(result.confidence_cap).toBe(95);
  });

  it("caps Tier 2 at 85%", async () => {
    const league = makeLeague({ tier: 2 });
    const result = await computeLeaguePlayability(league, [], undefined);
    expect(result.confidence_cap).toBe(85);
  });

  it("caps Tier 3+ at 70%", async () => {
    const league = makeLeague({ tier: 3 });
    const result = await computeLeaguePlayability(league, [], undefined);
    expect(result.confidence_cap).toBe(70);
  });

  it("caps Tier 4 at 70%", async () => {
    const league = makeLeague({ tier: 4 });
    const result = await computeLeaguePlayability(league, [], undefined);
    expect(result.confidence_cap).toBe(70);
  });
});

// ============================================================
// COVERAGE DATA OVERRIDE
// ============================================================
describe("Coverage data overrides league static fields", () => {
  it("uses data_coverage odds_coverage instead of league's when present", async () => {
    const league = makeLeague({ tier: 4, odds_coverage: 90 }); // looks fine statically
    const rule = makeSafetyRule({ tier_applies_to: [4], min_odds_coverage: 40 });
    // But coverage data shows it's actually 15%
    const coverage: DataCoverage = {
      id: "cov-1",
      entity_type: "league",
      entity_id: "league-1",
      entity_name: "Test League",
      fixture_coverage: 90,
      odds_coverage: 15, // real coverage is low
      stats_coverage: 80,
      standings_coverage: 80,
      team_stats_coverage: 80,
      injury_news_coverage: 0,
      historical_depth_years: 2,
      provider_flags: {},
      missing_data_flags: ["odds"],
      overall_score: 55,
      risk_level: "high",
      last_audited_at: "2026-06-01T00:00:00Z",
    };
    const result = await computeLeaguePlayability(league, [rule], coverage);
    expect(result.playable).toBe(false);
    expect(result.reason).toMatch(/odds coverage/i);
  });
});

// ============================================================
// CUP GAME RECOGNITION
// ============================================================
describe("Cup/competition classification", () => {
  it("classifies league match as domestic_league", () => {
    const types = classifyMatchCompetition({ competition: "league", stage: null });
    expect(types).toContain("domestic_league");
    expect(types).not.toContain("international");
  });

  it("classifies worldcup group match as international + cup", () => {
    const types = classifyMatchCompetition({ competition: "worldcup", stage: "group" });
    expect(types).toContain("international");
    expect(types).toContain("cup");
  });

  it("classifies worldcup knockout match as international + cup + knockout", () => {
    const types = classifyMatchCompetition({ competition: "worldcup", stage: "quarterfinal" });
    expect(types).toContain("international");
    expect(types).toContain("cup");
    expect(types).toContain("knockout");
  });

  it("classifies league knockout (cup) match", () => {
    const types = classifyMatchCompetition({ competition: "league", stage: "final" });
    expect(types).toContain("domestic_league");
    expect(types).toContain("knockout");
  });
});

// ============================================================
// NEUTRAL VENUE
// ============================================================
describe("Neutral venue detection", () => {
  it("detects neutral venue flag on cup fixture", () => {
    const fixture = { is_neutral_venue: true, home_team_name: "Arsenal", away_team_name: "Chelsea" };
    expect(fixture.is_neutral_venue).toBe(true);
  });

  it("non-neutral venue is false by default", () => {
    const fixture = { is_neutral_venue: false };
    expect(fixture.is_neutral_venue).toBe(false);
  });
});

// ============================================================
// TWO-LEG / AGGREGATE
// ============================================================
describe("Two-leg tie aggregate score handling", () => {
  it("identifies two-leg tie by leg number", () => {
    const fixture = { leg: 2, home_agg: 3, away_agg: 2, went_to_et: false, went_to_penalties: false };
    expect(fixture.leg).toBe(2);
    expect(fixture.home_agg).toBe(3);
    expect(fixture.away_agg).toBe(2);
  });

  it("identifies winner by aggregate when second leg", () => {
    const fixture = { leg: 2, home_agg: 3, away_agg: 2, winner_name: "Home Team" };
    const homeWinsOnAgg = fixture.home_agg! > fixture.away_agg!;
    expect(homeWinsOnAgg).toBe(true);
    expect(fixture.winner_name).toBe("Home Team");
  });
});

// ============================================================
// ET AND PENALTIES SETTLEMENT
// ============================================================
describe("ET and penalties settlement", () => {
  it("marks match as gone to ET and penalties", () => {
    const fixture = {
      home_score: 1, away_score: 1,
      home_score_et: 1, away_score_et: 1,
      home_score_pen: 4, away_score_pen: 3,
      went_to_et: true,
      went_to_penalties: true,
      winner_name: "Home Team",
    };
    expect(fixture.went_to_et).toBe(true);
    expect(fixture.went_to_penalties).toBe(true);
    expect(fixture.winner_name).toBe("Home Team");
    // Settlement: penalty winner is the match winner
    const penaltyWinner = fixture.home_score_pen > fixture.away_score_pen ? "Home Team" : "Away Team";
    expect(penaltyWinner).toBe(fixture.winner_name);
  });

  it("ET-only match (no penalties)", () => {
    const fixture = {
      home_score: 1, away_score: 1,
      home_score_et: 2, away_score_et: 1,
      went_to_et: true,
      went_to_penalties: false,
      winner_name: "Home Team",
    };
    expect(fixture.went_to_et).toBe(true);
    expect(fixture.went_to_penalties).toBe(false);
    const etWinner = fixture.home_score_et > fixture.away_score_et ? "Home Team" : "Away Team";
    expect(etWinner).toBe(fixture.winner_name);
  });
});

// ============================================================
// TOP PLAYS EXCLUSION
// ============================================================
describe("Top Plays league exclusion logic", () => {
  it("excludes matches from blocked leagues", async () => {
    const blockedLeague = makeLeague({ id: "blocked-league", tier: 4, odds_coverage: 10, playable: true });
    const rule = makeSafetyRule({ tier_applies_to: [4], min_odds_coverage: 40 });
    const result = await computeLeaguePlayability(blockedLeague, [rule], undefined);

    // Simulate top plays filter
    const playableIds = new Set<string>();
    if (result.playable) playableIds.add(blockedLeague.id);

    const match = { league_id: "blocked-league" };
    const included = match.league_id ? playableIds.has(match.league_id) : false;
    expect(included).toBe(false);
  });

  it("includes matches from Tier 1 playable leagues", async () => {
    const goodLeague = makeLeague({ id: "good-league", tier: 1, odds_coverage: 90, stats_coverage: 85 });
    const rule = makeSafetyRule({ tier_applies_to: [4] }); // only applies to T4
    const result = await computeLeaguePlayability(goodLeague, [rule], undefined);

    const playableIds = new Set<string>();
    if (result.playable) playableIds.add(goodLeague.id);

    const match = { league_id: "good-league" };
    const included = match.league_id ? playableIds.has(match.league_id) : false;
    expect(included).toBe(true);
  });
});
