import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/design/contrast";
import { coverTheme, MIN_CONTRAST, parseColor } from "@/lib/design/cover-tint";
import { fixtureGames, fixtureOwners, fixtureProfiles } from "./fixtures";

// Spec 0006, AC-6 and AC-12.

describe("fixture data", () => {
  it("has 12 games and 4 profiles", () => {
    expect(fixtureGames).toHaveLength(12);
    expect(fixtureProfiles).toHaveLength(4);
  });

  it("has unique ids", () => {
    expect(new Set(fixtureGames.map((g) => g.id)).size).toBe(
      fixtureGames.length,
    );
    expect(new Set(fixtureProfiles.map((p) => p.id)).size).toBe(
      fixtureProfiles.length,
    );
  });

  it("points every owner link at a real game and profile", () => {
    const gameIds = new Set(fixtureGames.map((g) => g.id));
    const profileIds = new Set(fixtureProfiles.map((p) => p.id));
    for (const owner of fixtureOwners) {
      expect(gameIds.has(owner.game_id)).toBe(true);
      expect(profileIds.has(owner.member_id)).toBe(true);
    }
  });

  it("has no duplicate owner links", () => {
    const keys = fixtureOwners.map((o) => `${o.game_id}:${o.member_id}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every game an owner and every profile a game", () => {
    for (const game of fixtureGames) {
      expect(fixtureOwners.some((o) => o.game_id === game.id)).toBe(true);
    }
    for (const profile of fixtureProfiles) {
      expect(fixtureOwners.some((o) => o.member_id === profile.id)).toBe(true);
    }
  });

  it("makes every non null added_by an owner of that game", () => {
    for (const game of fixtureGames) {
      if (game.added_by === null) continue;
      expect(
        fixtureOwners.some(
          (o) => o.game_id === game.id && o.member_id === game.added_by,
        ),
        `${game.name}'s adder owns it`,
      ).toBe(true);
    }
  });

  it("has no cover images", () => {
    expect(fixtureGames.every((g) => g.cover_path === null)).toBe(true);
  });
});

describe("cover tile colors", () => {
  it("reach 4.5:1 for ink on the calmed tint, for every fixture tint", () => {
    for (const game of fixtureGames) {
      if (game.cover_tint === null) continue;
      const theme = coverTheme(game.cover_tint);
      expect(
        contrastRatio(parseColor(theme.ink), parseColor(theme.tint)),
        game.name,
      ).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });
});
