import { beforeEach, describe, expect, it, vi } from "vitest";
import { GAMES_TAG, revalidateGames } from "./cache";
import { gameExists, getGameDetail, getGameIds, NO_GAME_ID } from "./detail";
import { fixtureGames } from "./fixtures";
import { getHomeData } from "./home";
import { getShelfData } from "./shelf";
import {
  emptyTables,
  fakeClient,
  fixtureTables,
  type FakeTables,
} from "./test-support";

// Spec 0009, AC-4 to AC-10: the cached reads, over a fake database client.

const mocks = vi.hoisted(() => ({
  client: null as unknown,
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({
  cacheLife: mocks.cacheLife,
  cacheTag: mocks.cacheTag,
  updateTag: mocks.updateTag,
}));
vi.mock("@/lib/supabase/public", () => ({
  createPublicClient: () => mocks.client,
}));

function use(tables: FakeTables, failWith: string | null = null) {
  mocks.client = fakeClient(tables, failWith);
}

beforeEach(() => {
  vi.clearAllMocks();
  use(fixtureTables());
});

describe("getGameDetail", () => {
  // covers: AC-4, AC-5
  it("reads every fixture id from the database rows", async () => {
    for (const game of fixtureGames) {
      const detail = await getGameDetail(String(game.id));
      expect(detail?.name, game.name).toBe(game.name);
      expect(detail?.coverTint, game.name).toBe(game.cover_tint);
    }
  });

  // covers: AC-4
  it("returns the owners, named and in order, and the owner count", async () => {
    const detail = await getGameDetail("1");

    expect(detail?.ownerCount).toBe(4);
    expect(detail?.owners.map((o) => o.displayName).sort()).toEqual([
      "Arif",
      "Jun",
      "Mei",
      "Sara",
    ]);
  });

  // covers: AC-4, AC-9
  it("gives a game with no owners an empty list", async () => {
    const tables = fixtureTables();
    tables.game_owners = [];
    use(tables);

    const detail = await getGameDetail("1");
    expect(detail?.ownerCount).toBe(0);
    expect(detail?.owners).toEqual([]);
  });

  // covers: AC-4
  it("returns null for an unknown id and never asks the database for a bad one", async () => {
    expect(await getGameDetail("999")).toBeNull();

    mocks.client = null; // a read would now crash
    for (const bad of ["abc", "0", "1.5", "-1", ""]) {
      expect(await getGameDetail(bad), bad).toBeNull();
    }
  });

  // covers: AC-4, AC-10
  it("throws when the read fails, so nothing is cached", async () => {
    use(fixtureTables(), "connection refused");
    await expect(getGameDetail("1")).rejects.toThrow(/connection refused/);
  });

  // covers: AC-10
  it("is cached for the games profile under the games tag", async () => {
    await getGameDetail("1");
    expect(mocks.cacheLife).toHaveBeenCalledWith("games");
    expect(mocks.cacheTag).toHaveBeenCalledWith(GAMES_TAG);
  });
});

describe("getGameIds", () => {
  // covers: AC-6
  it("lists every game id as a route param", async () => {
    expect(await getGameIds()).toEqual(fixtureGames.map((g) => String(g.id)));
  });

  // covers: AC-6
  it("gives one id that is never a game when the database is empty", async () => {
    use(emptyTables());
    expect(await getGameIds()).toEqual([NO_GAME_ID]);
    expect(await getGameDetail(NO_GAME_ID)).toBeNull();
  });

  // covers: AC-10
  it("is cached under the games tag", async () => {
    await getGameIds();
    expect(mocks.cacheLife).toHaveBeenCalledWith("games");
    expect(mocks.cacheTag).toHaveBeenCalledWith(GAMES_TAG);
  });
});

describe("getShelfData", () => {
  // covers: AC-7
  it("lists every game A to Z with its owner count, rating, and tint", async () => {
    const { games } = await getShelfData();

    expect(games).toHaveLength(12);
    expect(games.map((g) => g.name).slice(0, 3)).toEqual([
      "Ark Nova",
      "Azul",
      "Cascadia",
    ]);
    expect(games.find((g) => g.name === "Wingspan")).toEqual({
      id: 1,
      name: "Wingspan",
      coverTint: "#f3ead2",
      ownerCount: 4,
      avgRecommendation: 8,
    });
  });

  // covers: AC-9
  it("is an empty shelf, not an error, for an empty database", async () => {
    use(emptyTables());
    expect(await getShelfData()).toEqual({ games: [] });
  });

  // covers: AC-11
  it("throws when the read fails", async () => {
    use(fixtureTables(), "connection refused");
    await expect(getShelfData()).rejects.toThrow(/connection refused/);
  });

  // covers: AC-10
  it("is cached for the games profile under the games tag", async () => {
    await getShelfData();
    expect(mocks.cacheLife).toHaveBeenCalledWith("games");
    expect(mocks.cacheTag).toHaveBeenCalledWith(GAMES_TAG);
  });
});

describe("getHomeData", () => {
  // covers: AC-8
  it("counts games, owning members, the newest six, and the top five", async () => {
    const data = await getHomeData();

    expect(data.gameCount).toBe(12);
    expect(data.memberCount).toBe(4);
    expect(data.newest).toHaveLength(6);
    expect(data.newest[0]).toMatchObject({ id: 12, addedByName: "Mei" });
    expect(data.topRated.map((g) => g.name)).toEqual([
      "SETI",
      "Ark Nova",
      "Cascadia",
      "Wingspan",
      "Magical Athlete",
    ]);
  });

  // covers: AC-9
  it("renders an empty community, games without ratings, and games without owners", async () => {
    use(emptyTables());
    expect(await getHomeData()).toEqual({
      gameCount: 0,
      memberCount: 0,
      newest: [],
      topRated: [],
    });

    const tables = fixtureTables();
    tables.game_owners = [];
    tables.game_stats = tables.game_stats.map((g) => ({
      ...g,
      rating_count: 0,
      avg_recommendation: null,
    }));
    use(tables);
    const bare = await getHomeData();
    expect(bare.gameCount).toBe(12);
    expect(bare.memberCount).toBe(0);
    expect(bare.topRated).toEqual([]);
  });

  // covers: AC-11
  it("throws when the read fails", async () => {
    use(fixtureTables(), "connection refused");
    await expect(getHomeData()).rejects.toThrow(/connection refused/);
  });

  // covers: AC-10
  it("is cached for the games profile under the games tag", async () => {
    await getHomeData();
    expect(mocks.cacheLife).toHaveBeenCalledWith("games");
    expect(mocks.cacheTag).toHaveBeenCalledWith(GAMES_TAG);
  });
});

describe("revalidateGames", () => {
  // covers: AC-10
  it("clears the one games tag", () => {
    revalidateGames();
    expect(mocks.updateTag).toHaveBeenCalledExactlyOnceWith(GAMES_TAG);
  });
});

describe("gameExists", () => {
  // covers: AC-6
  it("is true for a real id and false for an unknown or bad one", async () => {
    expect(await gameExists("3")).toBe(true);
    expect(await gameExists("999")).toBe(false);

    mocks.client = null; // a read would now crash
    for (const bad of ["abc", "0", "1.5"]) {
      expect(await gameExists(bad), bad).toBe(false);
    }
  });

  // covers: AC-6, AC-11
  it("lets the request through when the database cannot be read", async () => {
    use(fixtureTables(), "connection refused");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await gameExists("3")).toBe(true);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
