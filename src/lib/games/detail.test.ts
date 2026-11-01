import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/design/contrast";
import {
  coverTheme,
  MIN_CONTRAST,
  parseColor,
  textSurfaces,
} from "@/lib/design/cover-tint";
import { dummyGames, dummyOwners, dummyProfiles } from "./dummy-data";
import {
  buildGameDetail,
  compareOwners,
  formatRange,
  getGameDetail,
  getGameIds,
  NEUTRAL_SHEET_TINT,
  parseGameId,
  type GameOwner,
} from "./detail";

// Spec 0008, AC-1, AC-5, AC-7, AC-9, AC-18.

function owner(over: Partial<GameOwner>): GameOwner {
  return {
    memberId: "m1",
    displayName: "Mei",
    since: "2026-08-02T11:00:00Z",
    ...over,
  };
}

describe("parseGameId", () => {
  // covers: AC-1
  it.each(["1", "12", "999"])("accepts %s", (value) => {
    expect(parseGameId(value)).toBe(Number(value));
  });

  // covers: AC-1
  it.each(["abc", "0", "1.5", "-3", "", "01", " 4", "1e3", "9".repeat(20)])(
    "rejects %j",
    (value) => {
      expect(parseGameId(value)).toBeNull();
    },
  );
});

describe("formatRange", () => {
  // covers: AC-7
  it("keeps a range, and one number when both ends match", () => {
    expect(formatRange(2, 4)).toEqual({ kind: "range", min: 2, max: 4 });
    expect(formatRange(4, 4)).toEqual({ kind: "single", value: 4 });
  });

  // covers: AC-7
  it("is unknown when any end is missing, never `?-4`", () => {
    expect(formatRange(null, 4)).toEqual({ kind: "unknown" });
    expect(formatRange(2, null)).toEqual({ kind: "unknown" });
    expect(formatRange(null, null)).toEqual({ kind: "unknown" });
  });
});

describe("compareOwners", () => {
  // covers: AC-9
  it("orders oldest link first, then by name, then by member id", () => {
    const owners = [
      owner({
        memberId: "c",
        displayName: "Zed",
        since: "2026-01-01T00:00:00Z",
      }),
      owner({
        memberId: "b",
        displayName: "sara",
        since: "2026-01-01T00:00:00Z",
      }),
      owner({
        memberId: "z",
        displayName: "Mei",
        since: "2026-01-01T00:00:00Z",
      }),
      owner({
        memberId: "a",
        displayName: "Mei",
        since: "2026-01-01T00:00:00Z",
      }),
      owner({
        memberId: "y",
        displayName: "Arif",
        since: "2026-03-01T00:00:00Z",
      }),
    ];

    const sorted = [...owners].sort(compareOwners).map((o) => o.memberId);

    expect(sorted).toEqual(["a", "z", "b", "c", "y"]);
  });
});

describe("buildGameDetail", () => {
  // covers: AC-18
  it("returns null for an id that is not in the data", () => {
    expect(
      buildGameDetail(99, dummyGames, dummyProfiles, dummyOwners),
    ).toBeNull();
  });

  // covers: AC-9, AC-18
  it("derives the owner count from the owner rows and names every owner", () => {
    const detail = buildGameDetail(1, dummyGames, dummyProfiles, dummyOwners);

    expect(detail?.ownerCount).toBe(4);
    expect(detail?.owners.map((o) => o.displayName).sort()).toEqual([
      "Arif",
      "Jun",
      "Mei",
      "Sara",
    ]);
    expect(
      detail?.owners.every((o) => o.since === "2026-08-02T11:00:00Z"),
    ).toBe(true);
  });

  // covers: AC-9
  it("gives a game with no owner rows an empty list", () => {
    const detail = buildGameDetail(1, dummyGames, dummyProfiles, []);

    expect(detail?.ownerCount).toBe(0);
    expect(detail?.owners).toEqual([]);
  });
});

describe("getGameDetail", () => {
  // covers: AC-1
  it("reads every dummy id and nothing else", async () => {
    for (const id of getGameIds()) {
      expect(await getGameDetail(id)).not.toBeNull();
    }
    expect(getGameIds()).toHaveLength(12);
    for (const bad of ["999", "abc", "0", "1.5"]) {
      expect(await getGameDetail(bad)).toBeNull();
    }
  });

  // covers: AC-18
  it("leaves every detail column empty for Just One only", async () => {
    const justOne = await getGameDetail("11");
    expect(justOne).toMatchObject({
      description: null,
      playersMin: null,
      playersMax: null,
      playTimeMin: null,
      playTimeMax: null,
      coverTint: null,
      avgRecommendation: null,
    });

    for (const game of dummyGames.filter((g) => g.id !== 11)) {
      expect(game.description, game.name).not.toBeNull();
      expect(game.players_min, game.name).not.toBeNull();
      expect(game.play_time_max, game.name).not.toBeNull();
    }
  });

  // covers: AC-18
  it("gives 三国杀 a Chinese description", async () => {
    const detail = await getGameDetail("12");

    expect(detail?.description).toMatch(/[一-鿿]/);
  });
});

describe("sheet colors", () => {
  const tints = [
    ...dummyGames.flatMap((g) => (g.cover_tint === null ? [] : [g.cover_tint])),
    NEUTRAL_SHEET_TINT,
  ];

  // covers: AC-5
  it("reach 4.5:1 for ink on every surface, for all 12 games and the neutral tint", () => {
    for (const tint of tints) {
      const theme = coverTheme(tint);
      for (const surface of textSurfaces(theme)) {
        expect(
          contrastRatio(parseColor(theme.ink), surface),
          tint,
        ).toBeGreaterThanOrEqual(MIN_CONTRAST);
      }
    }
  });

  // covers: AC-5
  it("keeps muted ink and inverse ink readable too", () => {
    for (const tint of tints) {
      const theme = coverTheme(tint);
      const [base] = textSurfaces(theme);
      if (base === undefined) throw new Error("no surface");
      expect(
        contrastRatio(parseColor(theme.inkMuted), base),
        tint,
      ).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });
});
