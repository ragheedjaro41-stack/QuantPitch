import { describe, it, expect } from "vitest";
import {
  settleMarket,
  settleAllMarkets,
  isSettleable,
} from "../lib/settlement";
import type { MatchResult, MatchStatus } from "../lib/settlement";

function makeResult(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    id: "result-1",
    match_id: "match-1",
    ft_home: 2,
    ft_away: 1,
    ht_home: 1,
    ht_away: 0,
    et_home: null,
    et_away: null,
    pen_home: null,
    pen_away: null,
    went_to_et: false,
    went_to_penalties: false,
    match_status: "confirmed",
    competition_type: "league",
    provider_source: "football-data-api",
    confirmed_at: new Date().toISOString(),
    notes: null,
    ...overrides,
  };
}

// ============================================================
// SAFETY GATE: Missing provider key must not write results
// ============================================================
describe("Missing provider key safety", () => {
  it("settlement engine requires confirmed status -- simulates key-missing scenario", () => {
    // When provider key is missing, sync-results never creates a match_results row.
    // If somehow a row existed with pending_review (manual entry), it must not settle.
    const result = makeResult({ match_status: "pending_review", provider_source: null });
    const decisions = settleAllMarkets(result);
    for (const d of decisions) {
      expect(d.outcome).toBe("void");
      expect(d.status).toBe("pending_review");
    }
  });

  it("no provider source does not affect settlement of confirmed matches", () => {
    // A confirmed result with no provider is still settleable (manual entry)
    const result = makeResult({ match_status: "confirmed", provider_source: null });
    const decisions = settleAllMarkets(result);
    const h2h = decisions.find((d) => d.market_key === "h2h")!;
    expect(h2h.status).toBe("settled");
    expect(h2h.outcome).toBe("home");
  });
});

// ============================================================
// SAFETY GATE: Unfinished fixture does not settle
// ============================================================
describe("Unfinished fixture safety", () => {
  it("match with status 'pending_review' is NOT settled", () => {
    const result = makeResult({ match_status: "pending_review" });
    expect(isSettleable(result).ok).toBe(false);
    const decisions = settleAllMarkets(result);
    for (const d of decisions) {
      expect(d.status).toBe("pending_review");
      expect(d.outcome).toBe("void");
    }
  });

  it("match with status 'void' is NOT settled", () => {
    const result = makeResult({ match_status: "void" });
    expect(isSettleable(result).ok).toBe(false);
  });
});

// ============================================================
// SAFETY GATE: Completed fixture creates result and settlement
// ============================================================
describe("Completed fixture settlement", () => {
  it("confirmed 3-1 home win settles all 5 markets correctly", () => {
    const result = makeResult({ ft_home: 3, ft_away: 1, match_status: "confirmed" });
    const decisions = settleAllMarkets(result);
    expect(decisions.length).toBe(5);

    expect(decisions.find((d) => d.market_key === "h2h")!.outcome).toBe("home");
    expect(decisions.find((d) => d.market_key === "totals_1.5")!.outcome).toBe("over");
    expect(decisions.find((d) => d.market_key === "totals_2.5")!.outcome).toBe("over");
    expect(decisions.find((d) => d.market_key === "totals_3.5")!.outcome).toBe("over");
    expect(decisions.find((d) => d.market_key === "btts")!.outcome).toBe("yes");

    for (const d of decisions) {
      expect(d.status).toBe("settled");
    }
  });

  it("confirmed 0-0 draw settles correctly", () => {
    const result = makeResult({ ft_home: 0, ft_away: 0, match_status: "confirmed" });
    const decisions = settleAllMarkets(result);

    expect(decisions.find((d) => d.market_key === "h2h")!.outcome).toBe("draw");
    expect(decisions.find((d) => d.market_key === "totals_1.5")!.outcome).toBe("under");
    expect(decisions.find((d) => d.market_key === "totals_2.5")!.outcome).toBe("under");
    expect(decisions.find((d) => d.market_key === "totals_3.5")!.outcome).toBe("under");
    expect(decisions.find((d) => d.market_key === "btts")!.outcome).toBe("no");
  });
});

// ============================================================
// SAFETY GATE: Cancelled fixture becomes void/review
// ============================================================
describe("Cancelled/postponed fixture voiding", () => {
  it.each(["cancelled", "postponed", "abandoned"] as MatchStatus[])(
    "%s fixture voids all markets with status=void",
    (status) => {
      const result = makeResult({ match_status: status });
      const decisions = settleAllMarkets(result);
      for (const d of decisions) {
        expect(d.outcome).toBe("void");
        expect(d.status).toBe("void");
        expect(d.reason).toContain(status);
      }
    }
  );

  it("pending_review uses pending_review status (not void)", () => {
    const result = makeResult({ match_status: "pending_review" });
    const decisions = settleAllMarkets(result);
    for (const d of decisions) {
      expect(d.status).toBe("pending_review");
    }
  });
});

// ============================================================
// SAFETY GATE: Penalties do not change 90-min result
// ============================================================
describe("Penalty safety for 90-min markets", () => {
  it("cup match drawn in 90min, won on penalties: h2h = draw", () => {
    const result = makeResult({
      ft_home: 1,
      ft_away: 1,
      et_home: 1,
      et_away: 1,
      pen_home: 5,
      pen_away: 3,
      went_to_et: true,
      went_to_penalties: true,
      match_status: "confirmed",
      competition_type: "cup",
    });

    const h2h = settleMarket(result, "h2h");
    expect(h2h.outcome).toBe("draw");
    expect(h2h.reason).toContain("1-1");
  });

  it("cup match: totals use FT only, not ET/pen goals", () => {
    const result = makeResult({
      ft_home: 1,
      ft_away: 0,
      et_home: 2,
      et_away: 2,
      pen_home: 4,
      pen_away: 3,
      went_to_et: true,
      went_to_penalties: true,
      match_status: "confirmed",
      competition_type: "cup",
    });

    // FT total = 1 goal
    expect(settleMarket(result, "totals_1.5").outcome).toBe("under");
    expect(settleMarket(result, "totals_2.5").outcome).toBe("under");
  });

  it("cup match: BTTS uses FT only", () => {
    const result = makeResult({
      ft_home: 1,
      ft_away: 0,
      et_home: 1,
      et_away: 1,
      pen_home: 3,
      pen_away: 2,
      went_to_et: true,
      went_to_penalties: true,
      match_status: "confirmed",
      competition_type: "cup",
    });

    const btts = settleMarket(result, "btts");
    expect(btts.outcome).toBe("no");
  });

  it("penalty goals never inflate total for Over/Under", () => {
    // FT: 0-0, ET: 0-0, Pen: 5-4
    const result = makeResult({
      ft_home: 0,
      ft_away: 0,
      et_home: 0,
      et_away: 0,
      pen_home: 5,
      pen_away: 4,
      went_to_et: true,
      went_to_penalties: true,
      match_status: "confirmed",
      competition_type: "cup",
    });

    expect(settleMarket(result, "totals_1.5").outcome).toBe("under");
    expect(settleMarket(result, "totals_2.5").outcome).toBe("under");
    expect(settleMarket(result, "totals_3.5").outcome).toBe("under");
  });
});

// ============================================================
// SAFETY GATE: Sync failure logs error safely
// ============================================================
describe("Sync failure safety", () => {
  it("settlement engine handles all non-confirmed statuses gracefully", () => {
    const statuses: MatchStatus[] = [
      "postponed", "cancelled", "abandoned", "void", "pending_review",
    ];
    for (const s of statuses) {
      const result = makeResult({ match_status: s, ft_home: 5, ft_away: 0 });
      const decisions = settleAllMarkets(result);
      for (const d of decisions) {
        expect(d.outcome).toBe("void");
        expect(["void", "pending_review"]).toContain(d.status);
      }
    }
  });

  it("unsupported market produces error status, not crash", () => {
    const result = makeResult({ match_status: "confirmed" });
    const decision = settleMarket(result, "correct_score");
    expect(decision.status).toBe("error");
    expect(decision.outcome).toBe("void");
    expect(decision.reason).toContain("Unsupported market");
  });
});

// ============================================================
// THE 3 LAWS (results sync context)
// ============================================================
describe("The 3 Laws -- results sync context", () => {
  it("LAW 1: no result without confirmed provider data", () => {
    // Settlement engine never settles non-confirmed matches
    const nonConfirmed = makeResult({ match_status: "pending_review" });
    for (const d of settleAllMarkets(nonConfirmed)) {
      expect(d.status).not.toBe("settled");
    }
  });

  it("LAW 2: no fake results", () => {
    // The settlement engine settles only what it receives.
    // A confirmed 0-0 is settled as 0-0, not invented.
    const result = makeResult({ ft_home: 0, ft_away: 0, match_status: "confirmed" });
    const h2h = settleMarket(result, "h2h");
    expect(h2h.outcome).toBe("draw");
    expect(h2h.reason).toContain("0-0");
  });

  it("LAW 3: no settlement without final confirmed score", () => {
    // Every non-confirmed status produces void/pending_review outcomes
    const statuses: MatchStatus[] = [
      "postponed", "cancelled", "abandoned", "void", "pending_review",
    ];
    for (const s of statuses) {
      const result = makeResult({ match_status: s });
      const decisions = settleAllMarkets(result);
      for (const d of decisions) {
        expect(d.outcome).toBe("void");
      }
    }
  });
});

// ============================================================
// ET handling explicit tests
// ============================================================
describe("Cup ET/penalty handling is explicit", () => {
  it("ET scores are recorded but do not affect any market", () => {
    const result = makeResult({
      ft_home: 2,
      ft_away: 2,
      et_home: 3,
      et_away: 2,
      went_to_et: true,
      went_to_penalties: false,
      match_status: "confirmed",
      competition_type: "cup",
    });

    // H2H settles on FT only (2-2 = draw)
    expect(settleMarket(result, "h2h").outcome).toBe("draw");

    // Totals use FT only (4 goals)
    expect(settleMarket(result, "totals_3.5").outcome).toBe("over");
    expect(settleMarket(result, "totals_2.5").outcome).toBe("over");

    // BTTS uses FT only
    expect(settleMarket(result, "btts").outcome).toBe("yes");
  });

  it("league match with no ET: straightforward settlement", () => {
    const result = makeResult({
      ft_home: 1,
      ft_away: 0,
      match_status: "confirmed",
      competition_type: "league",
    });

    expect(settleMarket(result, "h2h").outcome).toBe("home");
    expect(settleMarket(result, "totals_1.5").outcome).toBe("under");
    expect(settleMarket(result, "btts").outcome).toBe("no");
  });
});
