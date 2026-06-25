import { describe, it, expect } from "vitest";
import {
  settleMarket,
  settleAllMarkets,
  isSettleable,
  isSupportedMarket,
} from "../lib/settlement";
import type { MatchResult, MatchStatus } from "../lib/settlement";

// ============================================================
// HELPERS
// ============================================================

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
    provider_source: "manual",
    confirmed_at: new Date().toISOString(),
    notes: null,
    ...overrides,
  };
}

// ============================================================
// 1. SETTLEMENT ELIGIBILITY
// ============================================================
describe("Settlement eligibility", () => {
  it("confirmed match is settleable", () => {
    const result = makeResult({ match_status: "confirmed" });
    const { ok } = isSettleable(result);
    expect(ok).toBe(true);
  });

  it("unfinished/pending_review match is NOT settleable", () => {
    const result = makeResult({ match_status: "pending_review" });
    const { ok, reason } = isSettleable(result);
    expect(ok).toBe(false);
    expect(reason).toContain("pending");
  });

  it.each(["postponed", "cancelled", "abandoned", "void"] as MatchStatus[])(
    "%s match is NOT settleable",
    (status) => {
      const result = makeResult({ match_status: status });
      const { ok, reason } = isSettleable(result);
      expect(ok).toBe(false);
      expect(reason).toContain(status);
    }
  );
});

// ============================================================
// 2. MATCH RESULT (h2h) SETTLEMENT
// ============================================================
describe("Match Result (h2h) settlement", () => {
  it("home win settles as 'home'", () => {
    const result = makeResult({ ft_home: 3, ft_away: 1 });
    const decision = settleMarket(result, "h2h");
    expect(decision.outcome).toBe("home");
    expect(decision.status).toBe("settled");
    expect(decision.reason).toContain("Home win");
    expect(decision.reason).toContain("3-1");
  });

  it("away win settles as 'away'", () => {
    const result = makeResult({ ft_home: 0, ft_away: 2 });
    const decision = settleMarket(result, "h2h");
    expect(decision.outcome).toBe("away");
    expect(decision.status).toBe("settled");
    expect(decision.reason).toContain("Away win");
  });

  it("draw settles as 'draw'", () => {
    const result = makeResult({ ft_home: 1, ft_away: 1 });
    const decision = settleMarket(result, "h2h");
    expect(decision.outcome).toBe("draw");
    expect(decision.status).toBe("settled");
    expect(decision.reason).toContain("Draw");
  });

  it("0-0 draw settles correctly", () => {
    const result = makeResult({ ft_home: 0, ft_away: 0 });
    const decision = settleMarket(result, "h2h");
    expect(decision.outcome).toBe("draw");
    expect(decision.reason).toContain("0-0");
  });
});

// ============================================================
// 3. BTTS SETTLEMENT
// ============================================================
describe("BTTS settlement", () => {
  it("both teams score -> yes", () => {
    const result = makeResult({ ft_home: 2, ft_away: 1 });
    const decision = settleMarket(result, "btts");
    expect(decision.outcome).toBe("yes");
    expect(decision.status).toBe("settled");
  });

  it("home does not score -> no", () => {
    const result = makeResult({ ft_home: 0, ft_away: 3 });
    const decision = settleMarket(result, "btts");
    expect(decision.outcome).toBe("no");
    expect(decision.reason).toContain("Home did not score");
  });

  it("away does not score -> no", () => {
    const result = makeResult({ ft_home: 2, ft_away: 0 });
    const decision = settleMarket(result, "btts");
    expect(decision.outcome).toBe("no");
    expect(decision.reason).toContain("Away did not score");
  });

  it("0-0 -> no", () => {
    const result = makeResult({ ft_home: 0, ft_away: 0 });
    const decision = settleMarket(result, "btts");
    expect(decision.outcome).toBe("no");
  });

  it("1-1 -> yes", () => {
    const result = makeResult({ ft_home: 1, ft_away: 1 });
    const decision = settleMarket(result, "btts");
    expect(decision.outcome).toBe("yes");
  });
});

// ============================================================
// 4. OVER/UNDER SETTLEMENT
// ============================================================
describe("Over/Under 1.5 settlement", () => {
  it("2 total goals -> over 1.5", () => {
    const result = makeResult({ ft_home: 1, ft_away: 1 });
    const decision = settleMarket(result, "totals_1.5");
    expect(decision.outcome).toBe("over");
    expect(decision.reason).toContain("2 goals > 1.5");
  });

  it("1 total goal -> under 1.5", () => {
    const result = makeResult({ ft_home: 1, ft_away: 0 });
    const decision = settleMarket(result, "totals_1.5");
    expect(decision.outcome).toBe("under");
    expect(decision.reason).toContain("1 goals < 1.5");
  });

  it("0 total goals -> under 1.5", () => {
    const result = makeResult({ ft_home: 0, ft_away: 0 });
    const decision = settleMarket(result, "totals_1.5");
    expect(decision.outcome).toBe("under");
  });
});

describe("Over/Under 2.5 settlement", () => {
  it("3 goals -> over 2.5", () => {
    const result = makeResult({ ft_home: 2, ft_away: 1 });
    const decision = settleMarket(result, "totals_2.5");
    expect(decision.outcome).toBe("over");
  });

  it("2 goals -> under 2.5", () => {
    const result = makeResult({ ft_home: 1, ft_away: 1 });
    const decision = settleMarket(result, "totals_2.5");
    expect(decision.outcome).toBe("under");
  });

  it("5 goals -> over 2.5", () => {
    const result = makeResult({ ft_home: 3, ft_away: 2 });
    const decision = settleMarket(result, "totals_2.5");
    expect(decision.outcome).toBe("over");
    expect(decision.reason).toContain("5 goals > 2.5");
  });
});

describe("Over/Under 3.5 settlement", () => {
  it("4 goals -> over 3.5", () => {
    const result = makeResult({ ft_home: 2, ft_away: 2 });
    const decision = settleMarket(result, "totals_3.5");
    expect(decision.outcome).toBe("over");
  });

  it("3 goals -> under 3.5", () => {
    const result = makeResult({ ft_home: 2, ft_away: 1 });
    const decision = settleMarket(result, "totals_3.5");
    expect(decision.outcome).toBe("under");
  });

  it("0 goals -> under 3.5", () => {
    const result = makeResult({ ft_home: 0, ft_away: 0 });
    const decision = settleMarket(result, "totals_3.5");
    expect(decision.outcome).toBe("under");
  });
});

// ============================================================
// 5. VOID / REVIEW SCENARIOS
// ============================================================
describe("Void and review scenarios", () => {
  it("cancelled match voids all markets", () => {
    const result = makeResult({ match_status: "cancelled" });
    const decisions = settleAllMarkets(result);
    expect(decisions.length).toBe(5);
    for (const d of decisions) {
      expect(d.outcome).toBe("void");
      expect(d.status).toBe("void");
      expect(d.reason).toContain("cancelled");
    }
  });

  it("postponed match voids all markets", () => {
    const result = makeResult({ match_status: "postponed" });
    const decisions = settleAllMarkets(result);
    for (const d of decisions) {
      expect(d.outcome).toBe("void");
      expect(d.status).toBe("void");
    }
  });

  it("abandoned match voids all markets", () => {
    const result = makeResult({ match_status: "abandoned" });
    const decisions = settleAllMarkets(result);
    for (const d of decisions) {
      expect(d.outcome).toBe("void");
      expect(d.status).toBe("void");
    }
  });

  it("pending_review match produces pending_review status (not void)", () => {
    const result = makeResult({ match_status: "pending_review" });
    const decisions = settleAllMarkets(result);
    for (const d of decisions) {
      expect(d.outcome).toBe("void");
      expect(d.status).toBe("pending_review");
    }
  });
});

// ============================================================
// 6. CUP ET/PENALTY HANDLING
// ============================================================
describe("Cup extra time and penalty handling", () => {
  it("cup match with ET: h2h settles on REGULATION time only", () => {
    const result = makeResult({
      ft_home: 1,
      ft_away: 1,
      et_home: 2,
      et_away: 1,
      went_to_et: true,
      competition_type: "cup",
    });
    const h2h = settleMarket(result, "h2h");
    expect(h2h.outcome).toBe("draw");
    expect(h2h.reason).toContain("FT regulation");
    expect(h2h.reason).toContain("1-1");
  });

  it("cup match with ET: totals settle on REGULATION time only", () => {
    const result = makeResult({
      ft_home: 1,
      ft_away: 1,
      et_home: 3,
      et_away: 2,
      went_to_et: true,
      competition_type: "cup",
    });
    const totals = settleMarket(result, "totals_2.5");
    // FT is 1-1 = 2 goals, not 3+2 = 5 from ET
    expect(totals.outcome).toBe("under");
    expect(totals.reason).toContain("2 goals < 2.5");
  });

  it("cup match with penalties: h2h settles on REGULATION time (draw)", () => {
    const result = makeResult({
      ft_home: 2,
      ft_away: 2,
      et_home: 2,
      et_away: 2,
      pen_home: 4,
      pen_away: 2,
      went_to_et: true,
      went_to_penalties: true,
      competition_type: "cup",
    });
    const h2h = settleMarket(result, "h2h");
    expect(h2h.outcome).toBe("draw");
    expect(h2h.reason).toContain("2-2");
  });

  it("cup match with penalties: BTTS uses REGULATION only", () => {
    const result = makeResult({
      ft_home: 0,
      ft_away: 0,
      et_home: 1,
      et_away: 1,
      pen_home: 5,
      pen_away: 4,
      went_to_et: true,
      went_to_penalties: true,
      competition_type: "cup",
    });
    const btts = settleMarket(result, "btts");
    expect(btts.outcome).toBe("no");
  });

  it("cup match with penalties: totals use REGULATION only", () => {
    const result = makeResult({
      ft_home: 1,
      ft_away: 1,
      et_home: 2,
      et_away: 2,
      pen_home: 3,
      pen_away: 1,
      went_to_et: true,
      went_to_penalties: true,
      competition_type: "cup",
    });
    const totals15 = settleMarket(result, "totals_1.5");
    expect(totals15.outcome).toBe("over");
    expect(totals15.reason).toContain("2 goals > 1.5");

    const totals25 = settleMarket(result, "totals_2.5");
    expect(totals25.outcome).toBe("under");
  });
});

// ============================================================
// 7. UNSUPPORTED MARKET HANDLING
// ============================================================
describe("Unsupported market handling", () => {
  it("unknown market returns error status", () => {
    const result = makeResult();
    const decision = settleMarket(result, "asian_handicap_1.5");
    expect(decision.outcome).toBe("void");
    expect(decision.status).toBe("error");
    expect(decision.reason).toContain("Unsupported market");
  });

  it("isSupportedMarket correctly classifies markets", () => {
    expect(isSupportedMarket("h2h")).toBe(true);
    expect(isSupportedMarket("totals_2.5")).toBe(true);
    expect(isSupportedMarket("totals_1.5")).toBe(true);
    expect(isSupportedMarket("totals_3.5")).toBe(true);
    expect(isSupportedMarket("btts")).toBe(true);
    expect(isSupportedMarket("double_chance")).toBe(false);
    expect(isSupportedMarket("draw_no_bet")).toBe(false);
    expect(isSupportedMarket("")).toBe(false);
  });
});

// ============================================================
// 8. SETTLE ALL MARKETS
// ============================================================
describe("settleAllMarkets", () => {
  it("settles all 5 supported markets for a confirmed match", () => {
    const result = makeResult({ ft_home: 3, ft_away: 1 });
    const decisions = settleAllMarkets(result);
    expect(decisions.length).toBe(5);

    const keys = decisions.map((d) => d.market_key);
    expect(keys).toContain("h2h");
    expect(keys).toContain("totals_1.5");
    expect(keys).toContain("totals_2.5");
    expect(keys).toContain("totals_3.5");
    expect(keys).toContain("btts");

    // Verify specific outcomes for 3-1
    const h2h = decisions.find((d) => d.market_key === "h2h")!;
    expect(h2h.outcome).toBe("home");

    const t15 = decisions.find((d) => d.market_key === "totals_1.5")!;
    expect(t15.outcome).toBe("over"); // 4 > 1.5

    const t25 = decisions.find((d) => d.market_key === "totals_2.5")!;
    expect(t25.outcome).toBe("over"); // 4 > 2.5

    const t35 = decisions.find((d) => d.market_key === "totals_3.5")!;
    expect(t35.outcome).toBe("over"); // 4 > 3.5

    const btts = decisions.find((d) => d.market_key === "btts")!;
    expect(btts.outcome).toBe("yes"); // both scored
  });

  it("voids all 5 markets for a void match", () => {
    const result = makeResult({ match_status: "void" });
    const decisions = settleAllMarkets(result);
    expect(decisions.length).toBe(5);
    for (const d of decisions) {
      expect(d.outcome).toBe("void");
      expect(d.status).toBe("void");
    }
  });
});

// ============================================================
// 9. EDGE CASES
// ============================================================
describe("Edge cases", () => {
  it("high-scoring match: 7-5", () => {
    const result = makeResult({ ft_home: 7, ft_away: 5 });
    expect(settleMarket(result, "h2h").outcome).toBe("home");
    expect(settleMarket(result, "totals_1.5").outcome).toBe("over");
    expect(settleMarket(result, "totals_2.5").outcome).toBe("over");
    expect(settleMarket(result, "totals_3.5").outcome).toBe("over");
    expect(settleMarket(result, "btts").outcome).toBe("yes");
  });

  it("exactly 2 goals (boundary for totals_1.5 and totals_2.5)", () => {
    const result = makeResult({ ft_home: 2, ft_away: 0 });
    expect(settleMarket(result, "totals_1.5").outcome).toBe("over");
    expect(settleMarket(result, "totals_2.5").outcome).toBe("under");
  });

  it("exactly 4 goals (boundary for totals_3.5)", () => {
    const result = makeResult({ ft_home: 3, ft_away: 1 });
    expect(settleMarket(result, "totals_3.5").outcome).toBe("over");
  });

  it("league match never has ET/pen fields affecting settlement", () => {
    const result = makeResult({
      ft_home: 1,
      ft_away: 1,
      competition_type: "league",
      went_to_et: false,
      went_to_penalties: false,
    });
    expect(settleMarket(result, "h2h").outcome).toBe("draw");
  });
});

// ============================================================
// 10. THE 3 LAWS
// ============================================================
describe("The 3 Laws of Settlement", () => {
  it("LAW 1: unfinished matches NEVER settle", () => {
    const statuses: MatchStatus[] = ["pending_review", "postponed", "cancelled", "abandoned", "void"];
    for (const s of statuses) {
      const result = makeResult({ match_status: s, ft_home: 3, ft_away: 0 });
      const decisions = settleAllMarkets(result);
      for (const d of decisions) {
        expect(d.outcome).toBe("void");
        expect(d.status).not.toBe("settled");
      }
    }
  });

  it("LAW 2: no fake results — settlement requires confirmed match_status", () => {
    const confirmed = makeResult({ match_status: "confirmed", ft_home: 2, ft_away: 1 });
    const decisions = settleAllMarkets(confirmed);
    const h2h = decisions.find((d) => d.market_key === "h2h")!;
    expect(h2h.status).toBe("settled");
    expect(h2h.outcome).toBe("home");
  });

  it("LAW 3: no settlement without final confirmed score", () => {
    const pending = makeResult({ match_status: "pending_review", ft_home: 0, ft_away: 0 });
    const decisions = settleAllMarkets(pending);
    for (const d of decisions) {
      expect(d.status).toBe("pending_review");
    }
  });
});
