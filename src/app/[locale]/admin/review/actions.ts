"use server";

import { createClient } from "@/lib/supabase/server";

export type ReviewResult =
  | { status: "ok" }
  | { status: "notFound" }
  | { status: "forbidden" }
  | { status: "error" };

/** Calls `set_game_reviewed`, which checks for an active admin itself. */
async function setReviewed(
  gameId: number,
  reviewed: boolean,
): Promise<ReviewResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("set_game_reviewed", {
      p_game_id: gameId,
      p_reviewed: reviewed,
    });
    if (error) {
      if (error.code === "42501") return { status: "forbidden" };
      console.error("set_game_reviewed failed", error);
      return { status: "error" };
    }
    return data === "notfound" ? { status: "notFound" } : { status: "ok" };
  } catch (error) {
    console.error("set_game_reviewed failed", error);
    return { status: "error" };
  }
}

export async function markReviewed(gameId: number): Promise<ReviewResult> {
  return setReviewed(gameId, true);
}

export async function markUnreviewed(gameId: number): Promise<ReviewResult> {
  return setReviewed(gameId, false);
}
