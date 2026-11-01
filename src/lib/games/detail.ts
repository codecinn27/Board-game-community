import { dummyGames, dummyOwners, dummyProfiles } from "./dummy-data";
import { compareNames } from "./shelf";
import { type DummyGame, type DummyOwner, type DummyProfile } from "./types";

/** The sheet's tint for a game with no `cover_tint`: one fixed warm sand. */
export const NEUTRAL_SHEET_TINT = "#e8dcc4";

export type GameOwner = {
  memberId: string;
  displayName: string;
  /** The link's `created_at`. */
  since: string;
};

export type GameDetail = {
  id: number;
  name: string;
  description: string | null;
  playersMin: number | null;
  playersMax: number | null;
  playTimeMin: number | null;
  playTimeMax: number | null;
  /** `#rrggbb`, or null: the sheet then uses `NEUTRAL_SHEET_TINT`. */
  coverTint: string | null;
  avgRecommendation: number | null;
  ratingCount: number;
  ownerCount: number;
  owners: GameOwner[];
};

/** A route param to a game id: a positive whole number, else null. */
export function parseGameId(value: string): number | null {
  if (!/^[1-9][0-9]*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

/**
 * `min–max` for two known ends, one number when they are equal, and `?` when
 * either end is unknown. Returns plain numbers so the caller formats them.
 */
export type Range =
  | { kind: "unknown" }
  | { kind: "single"; value: number }
  | { kind: "range"; min: number; max: number };

export function formatRange(min: number | null, max: number | null): Range {
  if (min === null || max === null) return { kind: "unknown" };
  if (min === max) return { kind: "single", value: min };
  return { kind: "range", min, max };
}

/** Oldest link first, ties by name A to Z, then by member id. */
export function compareOwners(a: GameOwner, b: GameOwner): number {
  return (
    Date.parse(a.since) - Date.parse(b.since) ||
    compareNames(a.displayName, b.displayName) ||
    (a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0)
  );
}

/** Pure: one game's sheet data, from the row sets. Null if the id is unknown. */
export function buildGameDetail(
  id: number,
  games: DummyGame[],
  profiles: DummyProfile[],
  owners: DummyOwner[],
): GameDetail | null {
  const game = games.find((g) => g.id === id);
  if (!game) return null;

  const names = new Map(profiles.map((p) => [p.id, p.display_name]));
  const rows = owners
    .filter((o) => o.game_id === id)
    .map((o) => ({
      memberId: o.member_id,
      displayName: names.get(o.member_id) ?? "",
      since: o.created_at,
    }))
    .sort(compareOwners);

  return {
    id: game.id,
    name: game.name,
    description: game.description,
    playersMin: game.players_min,
    playersMax: game.players_max,
    playTimeMin: game.play_time_min,
    playTimeMax: game.play_time_max,
    coverTint: game.cover_tint,
    avgRecommendation: game.avg_recommendation,
    ratingCount: game.rating_count,
    ownerCount: rows.length,
    owners: rows,
  };
}

/** Today: buildGameDetail over the dummy arrays. Feature 21 swaps this body for Supabase reads. */
export async function getGameDetail(id: string): Promise<GameDetail | null> {
  const gameId = parseGameId(id);
  if (gameId === null) return null;
  return buildGameDetail(gameId, dummyGames, dummyProfiles, dummyOwners);
}

/** Every id the build prerenders. Feature 21 reads them from `games`. */
export function getGameIds(): string[] {
  return dummyGames.map((g) => String(g.id));
}
