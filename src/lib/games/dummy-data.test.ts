import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/design/contrast";
import { coverTheme, MIN_CONTRAST, parseColor } from "@/lib/design/cover-tint";
import { dummyGames, dummyOwners, dummyProfiles } from "./dummy-data";

// Spec 0006, AC-6 and AC-12.

describe("dummy data", () => {
  it("has 12 games and 4 profiles", () => {
    expect(dummyGames).toHaveLength(12);
    expect(dummyProfiles).toHaveLength(4);
  });

  it("has unique ids", () => {
    expect(new Set(dummyGames.map((g) => g.id)).size).toBe(dummyGames.length);
    expect(new Set(dummyProfiles.map((p) => p.id)).size).toBe(
      dummyProfiles.length,
    );
  });

  it("points every owner link at a real game and profile", () => {
    const gameIds = new Set(dummyGames.map((g) => g.id));
    const profileIds = new Set(dummyProfiles.map((p) => p.id));
    for (const owner of dummyOwners) {
      expect(gameIds.has(owner.game_id)).toBe(true);
      expect(profileIds.has(owner.member_id)).toBe(true);
    }
  });

  it("has no duplicate owner links", () => {
    const keys = dummyOwners.map((o) => `${o.game_id}:${o.member_id}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every game an owner and every profile a game", () => {
    for (const game of dummyGames) {
      expect(dummyOwners.some((o) => o.game_id === game.id)).toBe(true);
    }
    for (const profile of dummyProfiles) {
      expect(dummyOwners.some((o) => o.member_id === profile.id)).toBe(true);
    }
  });

  it("makes every non null added_by an owner of that game", () => {
    for (const game of dummyGames) {
      if (game.added_by === null) continue;
      expect(
        dummyOwners.some(
          (o) => o.game_id === game.id && o.member_id === game.added_by,
        ),
        `${game.name}'s adder owns it`,
      ).toBe(true);
    }
  });

  it("has no cover images", () => {
    expect(dummyGames.every((g) => g.cover_path === null)).toBe(true);
  });
});

describe("cover tile colors", () => {
  it("reach 4.5:1 for ink on the calmed tint, for every dummy tint", () => {
    for (const game of dummyGames) {
      if (game.cover_tint === null) continue;
      const theme = coverTheme(game.cover_tint);
      expect(
        contrastRatio(parseColor(theme.ink), parseColor(theme.tint)),
        game.name,
      ).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });
});
