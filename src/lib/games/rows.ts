import { type SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@/lib/supabase/database.types";
import {
  type GameRow,
  type OwnerRow,
  type ProfileRow,
  type ShelfGame,
} from "./types";

// The plain reads behind the cached `get*` functions (spec 0009). They take a
// client so tests can hand them a fake one, and they never cache anything.

type Client = SupabaseClient<Database>;

function fail(what: string, message: string): never {
  throw new Error(`Could not read ${what}: ${message}`);
}

/** A `game_stats` column that is never null for a real row. */
function present<T>(value: T | null, column: string): T {
  if (value === null) fail("game_stats", `a row has no ${column}`);
  return value;
}

type ShelfSelect = {
  id: number | null;
  name: string | null;
  created_at: string | null;
  rating_count: number | null;
  added_by: string | null;
  cover_path: string | null;
  cover_tint: string | null;
  avg_recommendation: number | null;
};

function toShelfGame(row: ShelfSelect): ShelfGame {
  return {
    id: present(row.id, "id"),
    name: present(row.name, "name"),
    created_at: present(row.created_at, "created_at"),
    rating_count: present(row.rating_count, "rating_count"),
    added_by: row.added_by,
    cover_path: row.cover_path,
    cover_tint: row.cover_tint,
    avg_recommendation: row.avg_recommendation,
  };
}

/** Every game, for the shelf and home. */
export async function fetchShelfGames(client: Client): Promise<ShelfGame[]> {
  const { data, error } = await client
    .from("game_stats")
    .select(
      "id, name, created_at, rating_count, added_by, cover_path, cover_tint, avg_recommendation",
    )
    .order("id");
  if (error) fail("games", error.message);
  return (data ?? []).map(toShelfGame);
}

/** The id of every game, for the build. */
export async function fetchGameIds(client: Client): Promise<number[]> {
  const { data, error } = await client.from("games").select("id").order("id");
  if (error) fail("game ids", error.message);
  return (data ?? []).map((row) => row.id);
}

/** Whether a game with this id exists. */
export async function fetchGameExists(
  client: Client,
  id: number,
): Promise<boolean> {
  const { data, error } = await client
    .from("games")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("a game", error.message);
  return data !== null;
}

/** Every owner link, for the shelf and home counts. */
export async function fetchOwnerRows(client: Client): Promise<OwnerRow[]> {
  const { data, error } = await client
    .from("game_owners")
    .select("game_id, member_id, created_at");
  if (error) fail("owners", error.message);
  return data ?? [];
}

/** Every public profile, for the names on home. */
export async function fetchProfileRows(client: Client): Promise<ProfileRow[]> {
  const { data, error } = await client
    .from("profiles")
    .select("id, display_name");
  if (error) fail("profiles", error.message);
  return data ?? [];
}

/** One game with its detail columns, or null when no row has that id. */
export async function fetchGameRow(
  client: Client,
  id: number,
): Promise<GameRow | null> {
  const { data, error } = await client
    .from("game_stats")
    .select(
      "id, name, created_at, rating_count, added_by, cover_path, cover_tint, avg_recommendation, description, players_min, players_max, play_time_min, play_time_max",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) fail("a game", error.message);
  if (data === null) return null;
  return {
    ...toShelfGame(data),
    description: data.description,
    players_min: data.players_min,
    players_max: data.players_max,
    play_time_min: data.play_time_min,
    play_time_max: data.play_time_max,
  };
}

/** One game's owner links and the profiles of those owners. */
export async function fetchGameOwners(
  client: Client,
  id: number,
): Promise<{ owners: OwnerRow[]; profiles: ProfileRow[] }> {
  const { data, error } = await client
    .from("game_owners")
    .select("game_id, member_id, created_at, profiles(id, display_name)")
    .eq("game_id", id);
  if (error) fail("owners", error.message);

  const owners: OwnerRow[] = [];
  const profiles: ProfileRow[] = [];
  for (const row of data ?? []) {
    owners.push({
      game_id: row.game_id,
      member_id: row.member_id,
      created_at: row.created_at,
    });
    if (row.profiles !== null) profiles.push(row.profiles);
  }
  return { owners, profiles };
}
