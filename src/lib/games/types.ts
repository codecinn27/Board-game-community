import { type Tables } from "@/lib/supabase/database.types";

type GameStatsRow = Tables<"game_stats">;
type Present<K extends keyof GameStatsRow> = {
  [P in K]: NonNullable<GameStatsRow[P]>;
};

/** A game as the dummy data and feature 21 provide it. */
export type ShelfGame = Present<"id" | "name" | "created_at" | "rating_count"> &
  Pick<GameStatsRow, "added_by" | "cover_path" | "avg_recommendation"> & {
    /** Feature 21 adds `games.cover_tint` (`#rrggbb`). */
    cover_tint: string | null;
  };

/** A shelf game plus the detail columns of `games` (spec 0008). */
export type DummyGame = ShelfGame &
  Pick<
    Tables<"games">,
    | "description"
    | "players_min"
    | "players_max"
    | "play_time_min"
    | "play_time_max"
  >;

export type DummyProfile = Pick<Tables<"profiles">, "id" | "display_name">;
export type DummyOwner = Pick<
  Tables<"game_owners">,
  "game_id" | "member_id" | "created_at"
>;
