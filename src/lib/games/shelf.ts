import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { GAMES_TAG } from "./cache";
import { fetchOwnerRows, fetchShelfGames } from "./rows";
import { type OwnerRow, type ProfileRow, type ShelfGame } from "./types";

export type ShelfCard = {
  id: number;
  name: string;
  coverTint: string | null;
  coverPath: string | null;
  ownerCount: number;
  avgRecommendation: number | null;
};

export type ShelfData = { games: ShelfCard[] };

/**
 * Name A to Z: lowercased with `toLowerCase()` (not the locale version), then
 * compared one character at a time by code point; the shorter name wins a tie.
 * Ties on the whole name are broken by the caller, by id.
 */
export function compareNames(a: string, b: string): number {
  const left = Array.from(a.toLowerCase());
  const right = Array.from(b.toLowerCase());
  const shared = Math.min(left.length, right.length);
  for (let i = 0; i < shared; i++) {
    const diff =
      (left[i]?.codePointAt(0) ?? 0) - (right[i]?.codePointAt(0) ?? 0);
    if (diff !== 0) return diff;
  }
  return left.length - right.length;
}

/** Pure: everything the shelf shows, from the row sets. */
export function buildShelfData(
  games: ShelfGame[],
  _profiles: ProfileRow[],
  owners: OwnerRow[],
): ShelfData {
  const ownerCounts = new Map<number, number>();
  for (const o of owners) {
    ownerCounts.set(o.game_id, (ownerCounts.get(o.game_id) ?? 0) + 1);
  }

  return {
    games: [...games]
      .sort((a, b) => compareNames(a.name, b.name) || a.id - b.id)
      .map((g) => ({
        id: g.id,
        name: g.name,
        coverTint: g.cover_tint,
        coverPath: g.cover_path,
        ownerCount: ownerCounts.get(g.id) ?? 0,
        avgRecommendation: g.avg_recommendation,
      })),
  };
}

/** Everything the shelf shows, from the database, cached for 5 minutes under the `games` tag. */
export async function getShelfData(): Promise<ShelfData> {
  "use cache";
  cacheLife("games");
  cacheTag(GAMES_TAG);

  const client = createPublicClient();
  const [games, owners] = await Promise.all([
    fetchShelfGames(client),
    fetchOwnerRows(client),
  ]);
  return buildShelfData(games, [], owners);
}

export type ShelfView = "all" | "owner";

/** `?view=owner` is By owner; a missing, unknown, or repeated value is All games. */
export function parseShelfView(
  value: string | string[] | undefined,
): ShelfView {
  return value === "owner" ? "owner" : "all";
}
