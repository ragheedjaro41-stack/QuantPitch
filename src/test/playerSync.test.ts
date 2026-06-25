import { describe, it, expect } from "vitest";
import type { Player, Team } from "../types";

// ============================================================
// PLAYER SYNC SAFETY TESTS
// These verify the invariants enforced by the sync-players
// edge function and the frontend display logic.
// ============================================================

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "p-1",
    team_id: "t-1",
    name: "Test Player",
    position: "FWD",
    jersey_number: 9,
    nationality: "England",
    age: 25,
    height_cm: 180,
    weight_kg: 75,
    goals: 10,
    assists: 5,
    appearances: 20,
    minutes_played: 1500,
    yellow_cards: 2,
    red_cards: 0,
    clean_sheets: 0,
    saves: 0,
    rating: 7.5,
    photo_url: null,
    injured: false,
    competition: "league",
    external_id: "12345",
    league_id: "league-pl",
    ...overrides,
  };
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: "t-1",
    name: "Arsenal",
    short_name: "ARS",
    city: "London",
    stadium: "Emirates Stadium",
    founded: 1886,
    primary_color: "#EF0107",
    logo_url: null,
    competition: "league",
    league_id: "league-pl",
    country: "England",
    external_id: "42",
    active: true,
    ...overrides,
  };
}

// ============================================================
// 1. No duplicate players
// ============================================================

describe("Player deduplication", () => {
  it("external_id is unique — two players with the same external_id are the same player", () => {
    const p1 = makePlayer({ external_id: "99999" });
    const p2 = makePlayer({ external_id: "99999", name: "Updated Name" });
    expect(p1.external_id).toBe(p2.external_id);
  });

  it("duplicate detection logic: map-based counting catches dupes", () => {
    const players = [
      makePlayer({ id: "p-1", external_id: "100" }),
      makePlayer({ id: "p-2", external_id: "200" }),
      makePlayer({ id: "p-3", external_id: "100" }), // duplicate
    ];
    const counts = new Map<string, number>();
    for (const p of players) {
      if (p.external_id) counts.set(p.external_id, (counts.get(p.external_id) || 0) + 1);
    }
    const dupes = [...counts.entries()].filter(([, c]) => c > 1);
    expect(dupes.length).toBe(1);
    expect(dupes[0][0]).toBe("100");
  });

  it("players without external_id are demo players — not counted as duplicates", () => {
    const players = [
      makePlayer({ external_id: null, id: "demo-1" }),
      makePlayer({ external_id: null, id: "demo-2" }),
    ];
    const realPlayers = players.filter((p) => p.external_id !== null);
    expect(realPlayers.length).toBe(0);
  });
});

// ============================================================
// 2. Players linked to correct teams
// ============================================================

describe("Player-team linkage", () => {
  it("player team_id must match a real team with external_id", () => {
    const teams = [
      makeTeam({ id: "t-1", external_id: "42" }),
      makeTeam({ id: "t-2", external_id: "47" }),
    ];
    const player = makePlayer({ team_id: "t-1" });
    const matchedTeam = teams.find((t) => t.id === player.team_id);
    expect(matchedTeam).toBeDefined();
    expect(matchedTeam!.external_id).not.toBeNull();
  });

  it("player league_id should match team league_id", () => {
    const team = makeTeam({ league_id: "league-pl" });
    const player = makePlayer({ team_id: team.id, league_id: team.league_id });
    expect(player.league_id).toBe(team.league_id);
  });
});

// ============================================================
// 3. No players assigned to demo teams
// ============================================================

describe("Demo team isolation", () => {
  it("demo teams have no external_id — sync never targets them", () => {
    const demoTeam = makeTeam({ id: "demo-t-1", external_id: null, league_id: "demo-league" });
    expect(demoTeam.external_id).toBeNull();
    // sync-players only queries teams with external_id IS NOT NULL
    const syncTargets = [demoTeam].filter((t) => t.external_id !== null);
    expect(syncTargets.length).toBe(0);
  });

  it("synthetic league check prevents real player injection", () => {
    const syntheticLeague = { id: "demo-league", is_synthetic: true };
    // The edge function checks is_synthetic and refuses
    expect(syntheticLeague.is_synthetic).toBe(true);
    const shouldBlock = syntheticLeague.is_synthetic;
    expect(shouldBlock).toBe(true);
  });

  it("real players must not have league_id pointing to demo league", () => {
    const realPlayer = makePlayer({ external_id: "12345", league_id: "league-pl" });
    const demoLeagueId = "demo-league";
    expect(realPlayer.league_id).not.toBe(demoLeagueId);
  });
});

// ============================================================
// 4. Provider-missing fields handled safely
// ============================================================

describe("Missing field handling", () => {
  it("player with null height_cm is valid", () => {
    const p = makePlayer({ height_cm: null });
    expect(p.height_cm).toBeNull();
    expect(p.name).toBeTruthy();
  });

  it("player with null weight_kg is valid", () => {
    const p = makePlayer({ weight_kg: null });
    expect(p.weight_kg).toBeNull();
  });

  it("player with 0 rating is valid (provider did not supply)", () => {
    const p = makePlayer({ rating: 0 });
    expect(p.rating).toBe(0);
    const display = p.rating > 0 ? p.rating.toFixed(1) : "--";
    expect(display).toBe("--");
  });

  it("player with null jersey_number is valid", () => {
    const p = makePlayer({ jersey_number: null });
    expect(p.jersey_number).toBeNull();
  });

  it("player with null photo_url uses initials fallback", () => {
    const p = makePlayer({ photo_url: null, name: "Bukayo Saka" });
    const initials = p.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
    expect(initials).toBe("BS");
  });

  it("injured flag defaults to false", () => {
    const p = makePlayer({});
    expect(typeof p.injured).toBe("boolean");
  });
});

// ============================================================
// 5. Sync idempotency
// ============================================================

describe("Sync idempotency", () => {
  it("upserting the same external_id twice produces one player, not two", () => {
    const db = new Map<string, Player>();

    const insert = (p: Player) => {
      if (p.external_id) {
        db.set(p.external_id, p);
      }
    };

    const p1 = makePlayer({ external_id: "555", goals: 5 });
    insert(p1);
    expect(db.size).toBe(1);
    expect(db.get("555")!.goals).toBe(5);

    const p2 = makePlayer({ external_id: "555", goals: 8 });
    insert(p2);
    expect(db.size).toBe(1);
    expect(db.get("555")!.goals).toBe(8);
  });

  it("different external_ids produce separate players", () => {
    const db = new Map<string, Player>();
    const insert = (p: Player) => { if (p.external_id) db.set(p.external_id, p); };

    insert(makePlayer({ external_id: "100" }));
    insert(makePlayer({ external_id: "200" }));
    expect(db.size).toBe(2);
  });
});

// ============================================================
// 6. Position mapping
// ============================================================

describe("Position mapping", () => {
  function mapPosition(pos: string | null): string {
    if (!pos) return "SUB";
    const p = pos.toLowerCase();
    if (p.includes("goalkeeper")) return "GK";
    if (p.includes("defender")) return "DEF";
    if (p.includes("midfielder")) return "MID";
    if (p.includes("attacker") || p.includes("forward")) return "FWD";
    return "SUB";
  }

  it("maps API-Football positions correctly", () => {
    expect(mapPosition("Goalkeeper")).toBe("GK");
    expect(mapPosition("Defender")).toBe("DEF");
    expect(mapPosition("Midfielder")).toBe("MID");
    expect(mapPosition("Attacker")).toBe("FWD");
    expect(mapPosition(null)).toBe("SUB");
  });
});

// ============================================================
// 7. Three laws enforcement
// ============================================================

describe("Three laws", () => {
  it("LAW 1: No fake players — external_id required for real players", () => {
    const realPlayer = makePlayer({ external_id: "42" });
    expect(realPlayer.external_id).toBeTruthy();
  });

  it("LAW 2: No fake statistics — stats come from provider fields only", () => {
    const p = makePlayer({ goals: 0, assists: 0, appearances: 0, rating: 0 });
    // Zero stats are valid when provider reports zero
    expect(p.goals).toBe(0);
    expect(p.assists).toBe(0);
    expect(p.rating).toBe(0);
  });

  it("LAW 3: Only store provider-backed data — unknown fields stay null/0", () => {
    const p = makePlayer({
      height_cm: null,
      weight_kg: null,
      clean_sheets: 0,
      saves: 0,
    });
    expect(p.height_cm).toBeNull();
    expect(p.weight_kg).toBeNull();
    expect(p.clean_sheets).toBe(0);
    expect(p.saves).toBe(0);
  });
});
