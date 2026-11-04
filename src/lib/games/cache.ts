import { updateTag } from "next/cache";

/**
 * The one tag every cached game read carries (spec 0009, AC-10). The cache
 * life is the `games` profile in `next.config.ts`.
 */
export const GAMES_TAG = "games";

/**
 * Clears every cached game read. Call it from a Server Action right after a
 * write that changes a game, an owner, or a rating, so the writer sees it at
 * once instead of after the 5 minute life.
 */
export function revalidateGames(): void {
  updateTag(GAMES_TAG);
}
