import { type SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@/lib/supabase/database.types";
import { localized } from "./localized";
import {
  type GameChoices,
  type GameRow,
  type OwnerRow,
  type ProfileRow,
  type SheetChoice,
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
  name_zh: string | null;
  created_at: string | null;
  rating_count: number | null;
  added_by: string | null;
  cover_path: string | null;
  cover_tint: string | null;
  avg_recommendation: number | null;
};

/** `name` is the Chinese name on `/zh` when there is one (spec 0013, AC-24). */
function toShelfGame(row: ShelfSelect, locale: string): ShelfGame {
  return {
    id: present(row.id, "id"),
    name: localized(present(row.name, "name"), row.name_zh, locale),
    created_at: present(row.created_at, "created_at"),
    rating_count: present(row.rating_count, "rating_count"),
    added_by: row.added_by,
    cover_path: row.cover_path,
    cover_tint: row.cover_tint,
    avg_recommendation: row.avg_recommendation,
  };
}

/** Every game, for the shelf and home. */
export async function fetchShelfGames(
  client: Client,
  locale: string,
): Promise<ShelfGame[]> {
  const { data, error } = await client
    .from("game_stats")
    .select(
      "id, name, name_zh, created_at, rating_count, added_by, cover_path, cover_tint, avg_recommendation",
    )
    .order("id");
  if (error) fail("games", error.message);
  return (data ?? []).map((row) => toShelfGame(row, locale));
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
  locale: string,
): Promise<GameRow | null> {
  const { data, error } = await client
    .from("game_stats")
    .select(
      "id, name, name_zh, created_at, rating_count, added_by, cover_path, cover_tint, avg_recommendation, description, description_zh, players_min, players_max, play_time_min, play_time_max",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) fail("a game", error.message);
  if (data === null) return null;
  return {
    ...toShelfGame(data, locale),
    description: localized(data.description, data.description_zh, locale),
    players_min: data.players_min,
    players_max: data.players_max,
    play_time_min: data.play_time_min,
    play_time_max: data.play_time_max,
  };
}

const CHOICE_COLUMNS = "id, slug, name_en, name_zh, position";

type ChoiceRow = {
  id: number;
  slug: string;
  name_en: string;
  name_zh: string;
  position: number;
};

function sortedChoices(
  links: { choice: ChoiceRow | null }[] | null | undefined,
): SheetChoice[] {
  return (links ?? [])
    .flatMap((link) => (link.choice === null ? [] : [link.choice]))
    .sort((a, b) => a.position - b.position || a.id - b.id)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      nameEn: c.name_en,
      nameZh: c.name_zh,
    }));
}

/** One game's feels, themes, and mechanics, each in `position` order (spec 0014, AC-13). */
export async function fetchGameChoices(
  client: Client,
  id: number,
): Promise<GameChoices> {
  const { data, error } = await client
    .from("games")
    .select(
      `game_feels(choice:feels(${CHOICE_COLUMNS})), game_themes(choice:themes(${CHOICE_COLUMNS})), game_mechanics(choice:mechanics(${CHOICE_COLUMNS}))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) fail("choices", error.message);
  return {
    feels: sortedChoices(data?.game_feels),
    themes: sortedChoices(data?.game_themes),
    mechanics: sortedChoices(data?.game_mechanics),
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
