import { createPublicClient } from "@/lib/supabase/public";

// Newest first. Owner count comes from the game_stats view, never a stored column.
export async function getShelfGames(limit = 50) {
  const { data, error } = await createPublicClient()
    .from("game_stats")
    .select("id, name, owner_count")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
