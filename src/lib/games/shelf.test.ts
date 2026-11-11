import { describe, expect, it } from "vitest";
import { fixtureGames, fixtureOwners, fixtureProfiles } from "./fixtures";
import { buildShelfData, compareNames, parseShelfView } from "./shelf";
import { type ShelfGame } from "./types";

// Spec 0007, AC-2, AC-3, AC-11.

function fixture(id: number, name: string): ShelfGame {
  return {
    id,
    name,
    created_at: "2026-01-01T00:00:00Z",
    added_by: null,
    cover_path: null,
    cover_tint: null,
    rating_count: 0,
    avg_recommendation: null,
  };
}

describe("compareNames", () => {
  // covers: AC-3
  it("ignores case", () => {
    expect(compareNames("azul", "Azul")).toBe(0);
    expect(compareNames("SETI", "Splendor")).toBeLessThan(0);
  });

  // covers: AC-3
  it("compares by code point, so Chinese sorts after Latin", () => {
    expect(compareNames("三国杀", "Wingspan")).toBeGreaterThan(0);
    expect(compareNames("Wingspan", "三国杀")).toBeLessThan(0);
  });

  // covers: AC-3
  it("compares whole code points, not UTF-16 units", () => {
    // U+1F600 is a surrogate pair (0xD83D first) but a higher code point than U+FF5E.
    expect(compareNames("\u{1F600}", "\uFF5E")).toBeGreaterThan(0);
  });

  // covers: AC-3
  it("puts the shorter name first when one is a prefix", () => {
    expect(compareNames("Dix", "Dixit")).toBeLessThan(0);
  });
});

describe("buildShelfData over the fixture data", () => {
  const { games } = buildShelfData(
    fixtureGames,
    fixtureProfiles,
    fixtureOwners,
  );

  // covers: AC-3, AC-11
  it("lists all 12 games A to Z", () => {
    expect(games.map((g) => g.name)).toEqual([
      "Ark Nova",
      "Azul",
      "Cascadia",
      "Codenames",
      "Dixit",
      "Just One",
      "Magical Athlete",
      "SETI",
      "Splendor",
      "Ticket to Ride",
      "Wingspan",
      "三国杀",
    ]);
  });

  // covers: AC-2
  it("derives the owner count from the owner links", () => {
    const byName = new Map(games.map((g) => [g.name, g]));
    expect(byName.get("Wingspan")?.ownerCount).toBe(4);
    expect(byName.get("SETI")?.ownerCount).toBe(1);
    const total = games.reduce((sum, g) => sum + g.ownerCount, 0);
    expect(total).toBe(fixtureOwners.length);
  });

  // covers: AC-2
  it("keeps a missing average as null", () => {
    expect(
      games.find((g) => g.name === "Just One")?.avgRecommendation,
    ).toBeNull();
    expect(games.find((g) => g.name === "SETI")?.avgRecommendation).toBe(8.6);
  });
});

describe("buildShelfData ties", () => {
  // covers: AC-3
  it("breaks equal names by id ascending", () => {
    const { games } = buildShelfData(
      [fixture(9, "Twin"), fixture(2, "twin"), fixture(5, "Twin")],
      [],
      [],
    );
    expect(games.map((g) => g.id)).toEqual([2, 5, 9]);
  });

  // covers: AC-7
  it("returns no cards for no games", () => {
    expect(buildShelfData([], [], []).games).toEqual([]);
  });

  // covers: AC-11
  it("gives a game with no owner links a count of 0", () => {
    const { games } = buildShelfData([fixture(1, "Solo")], [], []);
    expect(games[0]?.ownerCount).toBe(0);
  });
});

describe("buildShelfData owners", () => {
  const { owners } = buildShelfData(
    fixtureGames,
    fixtureProfiles,
    fixtureOwners,
  );

  // covers: AC-13
  it("lists members A to Z with their game counts", () => {
    expect(owners.map((o) => [o.name, o.games.length])).toEqual([
      ["Arif", 5],
      ["Jun", 5],
      ["Mei", 5],
      ["Sara", 6],
    ]);
  });

  // covers: AC-13
  it("lists each member's games A to Z, once each", () => {
    for (const owner of owners) {
      const names = owner.games.map((g) => g.name);
      expect(names).toEqual([...names].sort((a, b) => compareNames(a, b)));
      expect(new Set(owner.games.map((g) => g.id)).size).toBe(names.length);
    }
  });

  // covers: AC-13
  it("leaves out a member who owns nothing and counts a repeated link once", () => {
    const profiles = [
      { id: "b", display_name: "Bo" },
      { id: "a", display_name: "Al" },
      { id: "z", display_name: "Zed" },
    ];
    const link = (game_id: number, member_id: string) => ({
      game_id,
      member_id,
      created_at: "2026-01-01T00:00:00Z",
    });
    const built = buildShelfData(
      [fixture(1, "One"), fixture(2, "Two")],
      profiles,
      [link(2, "b"), link(1, "b"), link(1, "b"), link(1, "a")],
    );

    expect(built.owners.map((o) => o.name)).toEqual(["Al", "Bo"]);
    expect(built.owners[1]?.games.map((g) => g.id)).toEqual([1, 2]);
  });

  // covers: AC-13
  it("has no owners when no links exist", () => {
    expect(buildShelfData(fixtureGames, fixtureProfiles, []).owners).toEqual(
      [],
    );
  });
});

describe("parseShelfView", () => {
  // covers: AC-5
  it("reads owner as By owner", () => {
    expect(parseShelfView("owner")).toBe("owner");
  });

  // covers: AC-5
  it.each([undefined, "", "all", "Owner", "x", ["owner"], ["owner", "owner"]])(
    "shows All games for %j",
    (value) => {
      expect(parseShelfView(value)).toBe("all");
    },
  );
});
