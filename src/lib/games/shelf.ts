import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { GAMES_TAG } from "./cache";
import { compareNames } from "./compare-names";
import { fetchOwnerRows, fetchProfileRows, fetchShelfGames } from "./rows";
import { type OwnerRow, type ProfileRow, type ShelfGame } from "./types";

export { compareNames };

export type ShelfCard = {
  id: number;
  name: string;
  coverTint: string | null;
  coverPath: string | null;
  ownerCount: number;
  avgRecommendation: number | null;
};

export type OwnerGame = {
  id: number;
  name: string;
  coverTint: string | null;
  coverPath: string | null;
};

export type OwnerShelf = {
  memberId: string;
  name: string;
  games: OwnerGame[];
};

export type ShelfData = { games: ShelfCard[]; owners: OwnerShelf[] };

/**
 * One section per member who owns at least one game: members A to Z (ties by
 * id), each with their games A to Z (ties by id), every game once.
 */
function buildOwnerShelves(
  games: ShelfGame[],
  profiles: ProfileRow[],
  owners: OwnerRow[],
): OwnerShelf[] {
  const gamesById = new Map(games.map((g) => [g.id, g]));
  const byMember = new Map<string, Map<number, ShelfGame>>();
  for (const o of owners) {
    const game = gamesById.get(o.game_id);
    if (game === undefined) continue;
    const owned = byMember.get(o.member_id) ?? new Map<number, ShelfGame>();
    owned.set(game.id, game);
    byMember.set(o.member_id, owned);
  }

  const shelves: OwnerShelf[] = [];
  for (const profile of profiles) {
    const owned = byMember.get(profile.id);
    if (owned === undefined || owned.size === 0) continue;
    shelves.push({
      memberId: profile.id,
      name: profile.display_name,
      games: [...owned.values()]
        .sort((a, b) => compareNames(a.name, b.name) || a.id - b.id)
        .map((g) => ({
          id: g.id,
          name: g.name,
          coverTint: g.cover_tint,
          coverPath: g.cover_path,
        })),
    });
  }
  return shelves.sort(
    (a, b) =>
      compareNames(a.name, b.name) ||
      (a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0),
  );
}

/** Pure: everything the shelf shows, from the row sets. */
export function buildShelfData(
  games: ShelfGame[],
  profiles: ProfileRow[],
  owners: OwnerRow[],
): ShelfData {
  const ownerCounts = new Map<number, number>();
  for (const o of owners) {
    ownerCounts.set(o.game_id, (ownerCounts.get(o.game_id) ?? 0) + 1);
  }

  return {
    owners: buildOwnerShelves(games, profiles, owners),
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
  const [games, owners, profiles] = await Promise.all([
    fetchShelfGames(client),
    fetchOwnerRows(client),
    fetchProfileRows(client),
  ]);
  return buildShelfData(games, profiles, owners);
}

export type ShelfView = "all" | "owner";

/** `?view=owner` is By owner; a missing, unknown, or repeated value is All games. */
export function parseShelfView(
  value: string | string[] | undefined,
): ShelfView {
  return value === "owner" ? "owner" : "all";
}
