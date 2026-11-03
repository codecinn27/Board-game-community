import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { GAMES_TAG } from "./cache";
import {
  fetchGameExists,
  fetchGameIds,
  fetchGameOwners,
  fetchGameRow,
} from "./rows";
import { compareNames } from "./shelf";
import { type GameRow, type OwnerRow, type ProfileRow } from "./types";

export { NEUTRAL_SHEET_TINT } from "./neutral-tint";

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
  games: GameRow[],
  profiles: ProfileRow[],
  owners: OwnerRow[],
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

async function readGameDetail(id: number): Promise<GameDetail | null> {
  "use cache";
  cacheLife("games");
  cacheTag(GAMES_TAG);

  const client = createPublicClient();
  const [game, links] = await Promise.all([
    fetchGameRow(client, id),
    fetchGameOwners(client, id),
  ]);
  if (game === null) return null;
  return buildGameDetail(id, [game], links.profiles, links.owners);
}

/**
 * One game's sheet data from the database, cached for 5 minutes under the
 * `games` tag. An id that is not a positive whole number never reaches the
 * cache or the database. A failed read throws and is not cached.
 */
export async function getGameDetail(id: string): Promise<GameDetail | null> {
  const gameId = parseGameId(id);
  if (gameId === null) return null;
  return readGameDetail(gameId);
}

/**
 * Whether a route param names a real game: a plain one-row read, not cached,
 * for `src/proxy.ts`, where a cached function cannot run. A bad id never
 * reaches the database. A failed read answers true: the page then shows its
 * own error block instead of a false 404.
 */
export async function gameExists(id: string): Promise<boolean> {
  const gameId = parseGameId(id);
  if (gameId === null) return false;
  try {
    return await fetchGameExists(createPublicClient(), gameId);
  } catch (error) {
    console.error("gameExists failed", error);
    return true;
  }
}

/** A route param that is never a game, so the build always has one id to render. */
export const NO_GAME_ID = "0";

/**
 * Every id the build prerenders. Cache Components fails the build on an empty
 * list, so an empty database gives `NO_GAME_ID`, which the page answers with
 * its 404.
 */
export async function getGameIds(): Promise<string[]> {
  "use cache";
  cacheLife("games");
  cacheTag(GAMES_TAG);

  const ids = await fetchGameIds(createPublicClient());
  return ids.length === 0 ? [NO_GAME_ID] : ids.map(String);
}
