"use server";

import { checkMember } from "@/lib/auth/member-check";
import { revalidateGames } from "@/lib/games/cache";
import { createClient } from "@/lib/supabase/server";

export type OwnState = "guest" | "readOnly" | "owned" | "notOwned";

export type OwnResult =
  | { status: "owned" }
  | { status: "notOwned" }
  | { status: "guest" }
  | { status: "readOnly" }
  | { status: "notFound" }
  | { status: "error" };

/** Where the dock starts: read on mount so the cached sheet never reads cookies. */
export async function getOwnState(
  gameId: number,
): Promise<OwnState | { status: "error" }> {
  try {
    const supabase = await createClient();
    const member = await checkMember(supabase);
    if (member.status === "guest") return "guest";
    if (member.status === "readOnly") return "readOnly";
    const { data, error } = await supabase
      .from("game_owners")
      .select("game_id")
      .eq("game_id", gameId)
      .eq("member_id", member.id)
      .maybeSingle();
    if (error) return { status: "error" };
    return data === null ? "notOwned" : "owned";
  } catch (error) {
    console.error("getOwnState failed", error);
    return { status: "error" };
  }
}

/** Adds the member as an owner. Adding twice is the same as once. */
export async function markOwned(gameId: number): Promise<OwnResult> {
  try {
    const supabase = await createClient();
    const member = await checkMember(supabase);
    if (member.status === "guest") return { status: "guest" };
    if (member.status === "readOnly") return { status: "readOnly" };
    // `member_id` defaults to the caller; the policy checks it again.
    const { error } = await supabase
      .from("game_owners")
      .insert({ game_id: gameId });
    if (error) {
      if (error.code === "23505") return { status: "owned" };
      if (error.code === "23503") return { status: "notFound" };
      console.error("markOwned failed", error);
      return { status: "error" };
    }
    revalidateGames();
    return { status: "owned" };
  } catch (error) {
    console.error("markOwned failed", error);
    return { status: "error" };
  }
}

/** Removes the member as an owner. Removing nothing is fine. */
export async function unmarkOwned(gameId: number): Promise<OwnResult> {
  try {
    const supabase = await createClient();
    const member = await checkMember(supabase);
    if (member.status === "guest") return { status: "guest" };
    if (member.status === "readOnly") return { status: "readOnly" };
    const { error } = await supabase
      .from("game_owners")
      .delete()
      .eq("game_id", gameId)
      .eq("member_id", member.id);
    if (error) {
      console.error("unmarkOwned failed", error);
      return { status: "error" };
    }
    revalidateGames();
    return { status: "notOwned" };
  } catch (error) {
    console.error("unmarkOwned failed", error);
    return { status: "error" };
  }
}
