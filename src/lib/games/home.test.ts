import { describe, expect, it } from "vitest";
import { dummyGames, dummyOwners, dummyProfiles } from "./dummy-data";
import {
  buildHomeData,
  countMembers,
  getHomeData,
  pickNewest,
  pickTopRated,
} from "./home";
import { type ShelfGame } from "./types";

// Spec 0006, AC-1, AC-2, AC-3, AC-5.

function fixture(overrides: Partial<ShelfGame> & { id: number }): ShelfGame {
  return {
    name: `Game ${overrides.id}`,
    created_at: "2026-01-01T00:00:00Z",
    added_by: null,
    cover_path: null,
    cover_tint: null,
    rating_count: 2,
    avg_recommendation: 7,
    ...overrides,
  };
}

describe("buildHomeData over the dummy data", () => {
  const data = buildHomeData(dummyGames, dummyProfiles, dummyOwners);

  it("counts 12 games and 4 members", () => {
    expect(data.gameCount).toBe(12);
    expect(data.memberCount).toBe(4);
  });

  it("lists the newest 6, newest first", () => {
    expect(data.newest.map((g) => g.name)).toEqual([
      "三国杀",
      "Just One",
      "Ark Nova",
      "Dixit",
      "Splendor",
      "Azul",
    ]);
  });

  it("names who added each game, and leaves it out when unknown", () => {
    expect(data.newest[0]?.addedByName).toBe("Mei");
    const all = buildHomeData(dummyGames, dummyProfiles, dummyOwners);
    expect(all.newest.every((g) => g.addedByName !== "")).toBe(true);
  });

  it("ranks the top 5", () => {
    expect(data.topRated.map((g) => g.name)).toEqual([
      "SETI",
      "Ark Nova",
      "Cascadia",
      "Wingspan",
      "Magical Athlete",
    ]);
    expect(data.topRated.map((g) => g.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it("derives owner counts from the owner links", () => {
    const owners = Object.fromEntries(
      data.topRated.map((g) => [g.name, g.ownerCount]),
    );
    expect(owners).toEqual({
      SETI: 1,
      "Ark Nova": 1,
      Cascadia: 2,
      Wingspan: 4,
      "Magical Athlete": 2,
    });
  });

  it("is what getHomeData returns", async () => {
    expect(await getHomeData()).toEqual(data);
  });
});

describe("pickTopRated", () => {
  const counts = new Map<number, number>();

  it("leaves out games with fewer than 2 ratings or no average", () => {
    const top = pickTopRated(
      [
        fixture({ id: 1, rating_count: 1, avg_recommendation: 9.9 }),
        fixture({ id: 2, rating_count: 0, avg_recommendation: null }),
        fixture({ id: 3, rating_count: 5, avg_recommendation: null }),
        fixture({ id: 4, rating_count: 2, avg_recommendation: 5 }),
      ],
      counts,
      2,
      5,
    );
    expect(top.map((g) => g.id)).toEqual([4]);
  });

  it("breaks an average tie by rating count, then by name", () => {
    const top = pickTopRated(
      [
        fixture({ id: 1, name: "b", rating_count: 3, avg_recommendation: 8 }),
        fixture({ id: 2, name: "a", rating_count: 3, avg_recommendation: 8 }),
        fixture({ id: 3, name: "z", rating_count: 9, avg_recommendation: 8 }),
        fixture({ id: 4, name: "B", rating_count: 3, avg_recommendation: 8 }),
      ],
      counts,
      2,
      5,
    );
    // "B" sorts before "a" by code point, the same in every language.
    expect(top.map((g) => g.name)).toEqual(["z", "B", "a", "b"]);
  });

  it("does not depend on input order", () => {
    const games = [1, 2, 3, 4].map((id) =>
      fixture({ id, avg_recommendation: 8 - id / 10 }),
    );
    const forward = pickTopRated(games, counts, 2, 5);
    const backward = pickTopRated([...games].reverse(), counts, 2, 5);
    expect(backward).toEqual(forward);
  });

  it("caps at the limit", () => {
    const games = Array.from({ length: 8 }, (_, i) =>
      fixture({ id: i + 1, avg_recommendation: 5 + i / 10 }),
    );
    expect(pickTopRated(games, counts, 2, 5)).toHaveLength(5);
  });

  it("returns an empty list when nothing qualifies", () => {
    expect(
      pickTopRated([fixture({ id: 1, rating_count: 1 })], counts, 2, 5),
    ).toEqual([]);
  });
});

describe("pickNewest", () => {
  it("breaks a created_at tie by id, highest first", () => {
    const games = [fixture({ id: 1 }), fixture({ id: 3 }), fixture({ id: 2 })];
    expect(pickNewest(games, 6).map((g) => g.id)).toEqual([3, 2, 1]);
  });

  it("returns what exists when there are fewer than the limit", () => {
    expect(pickNewest([fixture({ id: 1 })], 6)).toHaveLength(1);
  });
});

describe("edge cases", () => {
  it("handles zero games", () => {
    expect(buildHomeData([], dummyProfiles, [])).toEqual({
      gameCount: 0,
      memberCount: 0,
      newest: [],
      topRated: [],
    });
  });

  it("reports zero members when nobody owns a game", () => {
    const data = buildHomeData([fixture({ id: 1 })], dummyProfiles, []);
    expect(data.gameCount).toBe(1);
    expect(data.memberCount).toBe(0);
  });

  it("gives a null name for a null or unknown added_by", () => {
    const data = buildHomeData(
      [
        fixture({ id: 1, added_by: null }),
        fixture({ id: 2, added_by: "00000000-0000-4000-8000-0000000000ff" }),
      ],
      dummyProfiles,
      [],
    );
    expect(data.newest.map((g) => g.addedByName)).toEqual([null, null]);
  });

  it("counts a member once however many games they own", () => {
    expect(
      countMembers([
        { member_id: "a" },
        { member_id: "a" },
        { member_id: "b" },
      ]),
    ).toBe(2);
  });
});
