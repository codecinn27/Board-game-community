import { dummyGames, dummyOwners, dummyProfiles } from "./dummy-data";
import { type DummyOwner, type DummyProfile, type ShelfGame } from "./types";

export type HomeGame = {
  id: number;
  name: string;
  coverTint: string | null;
  addedAt: string;
  addedByName: string | null;
};

export type TopGame = {
  id: number;
  name: string;
  coverTint: string | null;
  ownerCount: number;
  avgRecommendation: number;
  rank: number;
};

export type HomeData = {
  gameCount: number;
  memberCount: number;
  newest: HomeGame[];
  topRated: TopGame[];
};

export const HOME_NEWEST_LIMIT = 6;
export const HOME_TOP_LIMIT = 5;
export const HOME_TOP_MIN_RATINGS = 2;

/** Newest first by `created_at`, ties by `id` descending. */
export function pickNewest(games: ShelfGame[], limit: number): ShelfGame[] {
  return [...games]
    .sort((a, b) => {
      const byTime =
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return byTime !== 0 ? byTime : b.id - a.id;
    })
    .slice(0, limit);
}

/** Highest average first, then more ratings, then name by code point. */
export function pickTopRated(
  games: ShelfGame[],
  ownerCounts: Map<number, number>,
  minRatings: number,
  limit: number,
): TopGame[] {
  const ranked: { game: ShelfGame; avg: number }[] = [];
  for (const game of games) {
    if (game.avg_recommendation === null) continue;
    if (game.rating_count < minRatings) continue;
    ranked.push({ game, avg: game.avg_recommendation });
  }
  ranked.sort(
    (a, b) =>
      b.avg - a.avg ||
      b.game.rating_count - a.game.rating_count ||
      (a.game.name < b.game.name ? -1 : a.game.name > b.game.name ? 1 : 0),
  );
  return ranked.slice(0, limit).map(({ game, avg }, index) => ({
    id: game.id,
    name: game.name,
    coverTint: game.cover_tint,
    ownerCount: ownerCounts.get(game.id) ?? 0,
    avgRecommendation: avg,
    rank: index + 1,
  }));
}

/** Members who own at least one game. */
export function countMembers(owners: { member_id: string }[]): number {
  return new Set(owners.map((o) => o.member_id)).size;
}

/** Pure: everything the page shows, from the three row sets. */
export function buildHomeData(
  games: ShelfGame[],
  profiles: DummyProfile[],
  owners: DummyOwner[],
): HomeData {
  const names = new Map(profiles.map((p) => [p.id, p.display_name]));
  const ownerCounts = new Map<number, number>();
  for (const o of owners) {
    ownerCounts.set(o.game_id, (ownerCounts.get(o.game_id) ?? 0) + 1);
  }

  return {
    gameCount: games.length,
    memberCount: countMembers(owners),
    newest: pickNewest(games, HOME_NEWEST_LIMIT).map((g) => ({
      id: g.id,
      name: g.name,
      coverTint: g.cover_tint,
      addedAt: g.created_at,
      addedByName: (g.added_by !== null && names.get(g.added_by)) || null,
    })),
    topRated: pickTopRated(
      games,
      ownerCounts,
      HOME_TOP_MIN_RATINGS,
      HOME_TOP_LIMIT,
    ),
  };
}

/** Today: buildHomeData over the dummy arrays. Feature 21 swaps this body for Supabase reads. */
export async function getHomeData(): Promise<HomeData> {
  return buildHomeData(dummyGames, dummyProfiles, dummyOwners);
}
