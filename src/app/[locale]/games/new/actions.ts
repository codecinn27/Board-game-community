"use server";

import { goTo, localeOf } from "@/lib/auth/actions-support";
import { checkMember } from "@/lib/auth/member-check";
import { field } from "@/lib/auth/validation";
import { revalidateGames } from "@/lib/games/cache";
import { COVER_MAX_BYTES, coverKind, isTint } from "@/lib/games/cover-image";
import { logFailure, type DebugInfo } from "@/lib/games/debug";
import {
  toGameMatch,
  validateNewGame,
  type GameMatch,
  type NewGameErrors,
  type NewGameInput,
} from "@/lib/games/new-game";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// `debug` is filled outside production only, so the screen can say which layer
// failed. Every failure is also logged on the server with a `[add-game]` tag.
export type SearchState =
  | { status: "ok"; results: GameMatch[] }
  | { status: "guest" }
  | { status: "error"; debug?: DebugInfo | undefined };

export type AddGameResult =
  | { status: "invalid"; fields: NewGameErrors }
  | { status: "exists"; game: GameMatch }
  | { status: "coverInvalid" }
  | { status: "uploadFailed"; debug?: DebugInfo | undefined }
  | { status: "readOnly" }
  | { status: "guest" }
  | { status: "error"; debug?: DebugInfo | undefined };

type Client = Awaited<ReturnType<typeof createClient>>;

/** The ranked matches for a name. A database error is returned, not thrown. */
async function findGames(supabase: Client, text: string) {
  const { data, error } = await supabase.rpc("search_games", { q: text });
  if (error) return { error, games: null };
  return { error: null, games: (data ?? []).map((row) => toGameMatch(row)) };
}

export async function searchGames(query: string): Promise<SearchState> {
  try {
    const supabase = await createClient();
    const member = await checkMember(supabase);
    if (member.status === "guest") return { status: "guest" };
    if (query.trim() === "") return { status: "ok", results: [] };
    const { error, games } = await findGames(supabase, query);
    if (games === null) {
      return {
        status: "error",
        debug: logFailure("database", "rpc search_games", error),
      };
    }
    return { status: "ok", results: games };
  } catch (error) {
    return {
      status: "error",
      debug: logFailure("backend", "searchGames unexpected", error),
    };
  }
}

function formInput(data: FormData): NewGameInput {
  return {
    name: field(data, "name"),
    playersMin: field(data, "playersMin"),
    playersMax: field(data, "playersMax"),
    playTimeMin: field(data, "playTimeMin"),
    playTimeMax: field(data, "playTimeMax"),
    description: field(data, "description"),
  };
}

/** A SQL null for a nullable column (the generated argument types are strict). */
function orNull<T>(value: T | null): T {
  return value as T;
}

/**
 * Saves a new game and makes the member its owner (spec 0013). Order matters:
 * exact name check, upload, `add_game`, cover columns, then the redirect. A
 * failure before the game exists removes the file; a failure after keeps the
 * game without a cover, because other members may already own it.
 */
export async function addGame(data: FormData): Promise<AddGameResult> {
  const locale = localeOf(data);
  let gameId: number;
  try {
    const supabase = await createClient();
    const member = await checkMember(supabase);
    if (member.status === "guest") return { status: "guest" };
    if (member.status === "readOnly") return { status: "readOnly" };

    const checked = validateNewGame(formInput(data));
    if (!checked.ok) return { status: "invalid", fields: checked.errors };
    const game = checked.value;

    const found = await findGames(supabase, game.name);
    if (found.games === null) {
      return {
        status: "error",
        debug: logFailure(
          "database",
          "rpc search_games (name check)",
          found.error,
        ),
      };
    }
    const same = found.games.find((match) => match.exact);
    if (same) return { status: "exists", game: same };

    // The cover, checked on the bytes again (the browser's check is a courtesy).
    let cover: { bytes: Uint8Array; kind: "webp" | "jpeg" } | null = null;
    const file = data.get("cover");
    if (file instanceof File && file.size > 0) {
      if (file.size > COVER_MAX_BYTES) {
        logFailure("backend", `cover too big (${file.size} bytes)`);
        return { status: "coverInvalid" };
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const kind = coverKind(bytes);
      if (kind === null) {
        logFailure("backend", "cover is not WebP or JPEG");
        return { status: "coverInvalid" };
      }
      cover = { bytes, kind };
    }
    const tintText = field(data, "coverTint");
    const tint = isTint(tintText) ? tintText : null;

    // The admin client (secret key) is only needed to store a cover.
    const admin = cover ? createAdminClient() : null;
    let path: string | null = null;
    if (cover && admin) {
      path = `${crypto.randomUUID()}.${cover.kind === "webp" ? "webp" : "jpg"}`;
      const { error } = await admin.storage
        .from("covers")
        .upload(path, cover.bytes, {
          contentType: cover.kind === "webp" ? "image/webp" : "image/jpeg",
          upsert: false,
        });
      if (error) {
        return {
          status: "uploadFailed",
          debug: logFailure("database", "storage upload to covers", error),
        };
      }
    }
    const removeFile = async () => {
      if (path !== null && admin) {
        await admin.storage.from("covers").remove([path]);
      }
    };

    const { data: id, error } = await supabase.rpc("add_game", {
      p_name: game.name,
      p_players_min: orNull(game.playersMin),
      p_players_max: orNull(game.playersMax),
      p_play_time_min: orNull(game.playTimeMin),
      p_play_time_max: orNull(game.playTimeMax),
      p_description: orNull(game.description),
    });
    if (error || typeof id !== "number") {
      await removeFile();
      if (error?.code === "23505") {
        // Two members saved the same name at once: show the one that won.
        const again = await findGames(supabase, game.name);
        const winner = again.games?.find((match) => match.exact);
        if (winner) return { status: "exists", game: winner };
        return {
          status: "error",
          debug: logFailure("database", "name clash, winner not found", error),
        };
      }
      if (error?.code === "22023") {
        return { status: "invalid", fields: { name: "nameSymbols" } };
      }
      return {
        status: "error",
        debug: logFailure(
          "database",
          "rpc add_game",
          error ?? "add_game returned no id",
        ),
      };
    }
    gameId = id;

    if (path !== null && admin) {
      const { error: coverError } = await admin
        .from("games")
        .update({ cover_path: path, cover_tint: tint })
        .eq("id", gameId);
      if (coverError) {
        // Keep the game without a cover; never delete a game others may own.
        logFailure("database", "update games cover columns", coverError);
        await removeFile();
      }
    }
    revalidateGames();
  } catch (error) {
    return {
      status: "error",
      debug: logFailure("backend", "addGame unexpected", error),
    };
  }

  // `redirect` works by throwing, so it stays outside every try/catch.
  return goTo(locale, `/games/${gameId}`);
}
