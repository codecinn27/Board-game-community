"use server";

import { checkAdmin } from "@/lib/auth/member-check";
import { field } from "@/lib/auth/validation";
import { revalidateGames } from "@/lib/games/cache";
import {
  slugify,
  validateCategory,
  type CategoryErrors,
  type EditorCategory,
} from "@/lib/games/categories";
import { COVER_MAX_BYTES, coverKind, isTint } from "@/lib/games/cover-image";
import { logFailure, type DebugInfo } from "@/lib/games/debug";
import {
  validateEditGame,
  type EditGameErrors,
  type EditGameInput,
} from "@/lib/games/edit-game";
import { createAdminClient } from "@/lib/supabase/admin";
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

// The editor (spec 0013 amendment, AC-16 to AC-22) -------------------------------

export type SaveGameResult =
  | { status: "ok" }
  | { status: "invalid"; fields: EditGameErrors }
  /** Another game already uses the name; `other` is null when it cannot be found. */
  | { status: "clash"; other: { id: number; name: string } | null }
  | { status: "alreadyReviewed" }
  | { status: "notFound" }
  | { status: "coverInvalid" }
  | { status: "uploadFailed"; debug?: DebugInfo | undefined }
  | { status: "forbidden" }
  | { status: "error"; debug?: DebugInfo | undefined };

type Client = Awaited<ReturnType<typeof createClient>>;

/** A SQL null for a nullable argument (the generated argument types are strict). */
function orNull<T>(value: T | null): T {
  return value as T;
}

/** Ids sent as a JSON array; anything else is not a list. */
function readList(data: FormData, key: string): unknown[] | null {
  if (!data.has(key)) return null;
  try {
    const parsed: unknown = JSON.parse(field(data, key));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function numbers(list: unknown[]): number[] | null {
  return list.every((item) => Number.isInteger(item))
    ? (list as number[])
    : null;
}

function strings(list: unknown[]): string[] | null {
  return list.every((item) => typeof item === "string")
    ? (list as string[])
    : null;
}

/** The other game that holds the name this save asked for, if any. */
async function findClash(
  supabase: Client,
  gameId: number,
  name: string,
  nameZh: string | null,
): Promise<{ id: number; name: string } | null> {
  const english = await supabase.rpc("search_games", { q: name });
  const sameEnglish = english.data?.find((r) => r.id !== gameId && r.exact);
  if (sameEnglish) return { id: sameEnglish.id, name: sameEnglish.name };
  if (nameZh === null) return null;
  const chinese = await supabase.rpc("search_games", { q: nameZh });
  const sameChinese = chinese.data?.find((r) => r.id !== gameId && r.exact_zh);
  return sameChinese ? { id: sameChinese.id, name: sameChinese.name } : null;
}

/**
 * Moves a replaced or removed cover to the private `covers-trash` bucket and
 * records it (AC-22). The row goes in first, so a file in the bin always has a
 * row for the purge to find. A failure here never undoes the save: the old file
 * just stays in `covers`, a harmless orphan.
 */
async function trashCover(path: string, gameId: number, adminId: string) {
  try {
    const admin = createAdminClient();
    const { data: row, error } = await admin
      .from("cover_trash")
      .insert({ path, game_id: gameId, trashed_by: adminId })
      .select("id")
      .single();
    if (error) {
      logFailure("database", "insert cover_trash", error);
      return;
    }
    const { error: moveError } = await admin.storage
      .from("covers")
      .move(path, path, { destinationBucket: "covers-trash" });
    if (moveError) {
      logFailure("database", "move cover to covers-trash", moveError);
      await admin.from("cover_trash").delete().eq("id", row.id);
    }
  } catch (error) {
    logFailure("backend", "trashCover unexpected", error);
  }
}

/**
 * Saves the editor (AC-19). One call to `admin_update_game` writes the game,
 * its links, the history row, and the optional review stamp in one transaction.
 * A field the form does not send keeps its saved value, so a strand that is not
 * built yet can never wipe it.
 */
export async function saveGame(data: FormData): Promise<SaveGameResult> {
  // The file uploaded for this save, so every failure path can remove it.
  let newPath: string | null = null;
  const dropNewFile = async () => {
    if (newPath === null) return;
    try {
      await createAdminClient().storage.from("covers").remove([newPath]);
    } catch (error) {
      logFailure("backend", "remove uploaded cover", error);
    }
  };
  try {
    const supabase = await createClient();
    const admin = await checkAdmin(supabase);
    if (admin.status !== "admin") return { status: "forbidden" };

    const gameId = Number(field(data, "gameId"));
    if (!Number.isInteger(gameId) || gameId <= 0) return { status: "notFound" };

    // The new cover, checked on its bytes (the browser's check is a courtesy).
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

    const { data: current, error: readError } = await supabase
      .from("games")
      .select(
        "name_zh, description_zh, cover_path, cover_tint, reviewed_at, game_categories(category_id), game_owners(member_id)",
      )
      .eq("id", gameId)
      .maybeSingle();
    if (readError) {
      return {
        status: "error",
        debug: logFailure("database", "read game before save", readError),
      };
    }
    if (current === null) return { status: "notFound" };
    if (current.reviewed_at !== null) return { status: "alreadyReviewed" };

    const input: EditGameInput = {
      name: field(data, "name"),
      nameZh: data.has("nameZh")
        ? field(data, "nameZh")
        : (current.name_zh ?? ""),
      description: field(data, "description"),
      descriptionZh: data.has("descriptionZh")
        ? field(data, "descriptionZh")
        : (current.description_zh ?? ""),
      playersMin: field(data, "playersMin"),
      playersMax: field(data, "playersMax"),
      playTimeMin: field(data, "playTimeMin"),
      playTimeMax: field(data, "playTimeMax"),
    };
    const checked = validateEditGame(input);
    if (!checked.ok) return { status: "invalid", fields: checked.errors };
    const game = checked.value;

    const sentCategories = readList(data, "categoryIds");
    const sentOwners = readList(data, "ownerIds");
    const categoryIds = sentCategories
      ? numbers(sentCategories)
      : current.game_categories.map((row) => row.category_id);
    const ownerIds = sentOwners
      ? strings(sentOwners)
      : current.game_owners.map((row) => row.member_id);
    if (categoryIds === null || ownerIds === null) {
      return {
        status: "error",
        debug: logFailure("backend", "saveGame got a bad id list"),
      };
    }

    // The final cover columns: keep, replace (upload first), or remove.
    let coverPath = current.cover_path;
    let coverTint = current.cover_tint;
    if (cover) {
      const tintText = field(data, "coverTint");
      newPath = `${crypto.randomUUID()}.${cover.kind === "webp" ? "webp" : "jpg"}`;
      const { error: uploadError } = await createAdminClient()
        .storage.from("covers")
        .upload(newPath, cover.bytes, {
          contentType: cover.kind === "webp" ? "image/webp" : "image/jpeg",
          upsert: false,
        });
      if (uploadError) {
        return {
          status: "uploadFailed",
          debug: logFailure(
            "database",
            "storage upload to covers",
            uploadError,
          ),
        };
      }
      coverPath = newPath;
      coverTint = isTint(tintText) ? tintText : null;
    } else if (field(data, "removeCover") === "true") {
      coverPath = null;
      coverTint = null;
    }
    const { data: result, error } = await supabase.rpc("admin_update_game", {
      p_game_id: gameId,
      p_name: game.name,
      p_name_zh: orNull(game.nameZh),
      p_description: orNull(game.description),
      p_description_zh: orNull(game.descriptionZh),
      p_players_min: orNull(game.playersMin),
      p_players_max: orNull(game.playersMax),
      p_play_time_min: orNull(game.playTimeMin),
      p_play_time_max: orNull(game.playTimeMax),
      p_category_ids: categoryIds,
      p_owner_ids: ownerIds,
      p_cover_path: orNull(coverPath),
      p_cover_tint: orNull(coverTint),
      p_mark_reviewed: field(data, "markReviewed") === "true",
    });
    if (error) {
      await dropNewFile();
      if (error.code === "42501") return { status: "forbidden" };
      if (error.code === "22023") {
        return { status: "invalid", fields: { name: "nameSymbols" } };
      }
      return {
        status: "error",
        debug: logFailure("database", "rpc admin_update_game", error),
      };
    }

    if (result === "ok") {
      revalidateGames();
      // The save stands whatever happens to the old file (AC-22).
      if (current.cover_path !== null && current.cover_path !== coverPath) {
        await trashCover(current.cover_path, gameId, admin.id);
      }
      return { status: "ok" };
    }

    // Nothing was written, so the file uploaded for this save is not needed.
    await dropNewFile();
    switch (result) {
      case "reviewed":
        return { status: "alreadyReviewed" };
      case "notfound":
        return { status: "notFound" };
      case "clash":
        return {
          status: "clash",
          other: await findClash(supabase, gameId, game.name, game.nameZh),
        };
      default:
        return {
          status: "error",
          debug: logFailure("database", `admin_update_game returned ${result}`),
        };
    }
  } catch (error) {
    await dropNewFile();
    return {
      status: "error",
      debug: logFailure("backend", "saveGame unexpected", error),
    };
  }
}

// Categories (AC-25) ----------------------------------------------------------------

export type CreateCategoryResult =
  | { status: "ok"; category: EditorCategory }
  | { status: "exists"; category: EditorCategory }
  | { status: "invalid"; errors: CategoryErrors }
  | { status: "forbidden" }
  | { status: "error" };

type CategoryRow = {
  id: number;
  slug: string;
  name_en: string;
  name_zh: string;
};

function toCategory(row: CategoryRow): EditorCategory {
  return {
    id: row.id,
    slug: row.slug,
    nameEn: row.name_en,
    nameZh: row.name_zh,
  };
}

/** Adds a category with both labels; an existing English label is returned. */
export async function createCategory(
  nameEn: string,
  nameZh: string,
): Promise<CreateCategoryResult> {
  try {
    const supabase = await createClient();
    const admin = await checkAdmin(supabase);
    if (admin.status !== "admin") return { status: "forbidden" };

    const checked = validateCategory({ nameEn, nameZh });
    if (!checked.ok) return { status: "invalid", errors: checked.errors };
    const { nameEn: en, nameZh: zh } = checked.value;

    const base = slugify(en) ?? "category";
    // The first try uses the plain slug; a slug clash retries with a random tail.
    for (const slug of [base, `${base}-${crypto.randomUUID().slice(0, 6)}`]) {
      const { data, error } = await supabase
        .from("categories")
        .insert({ slug, name_en: en, name_zh: zh })
        .select("id, slug, name_en, name_zh")
        .single();
      if (!error) return { status: "ok", category: toCategory(data) };
      if (error.code === "42501") return { status: "forbidden" };
      if (error.code !== "23505") {
        logFailure("database", "insert category", error);
        return { status: "error" };
      }
      // A clash on the English label returns the category that already has it.
      const { data: all } = await supabase
        .from("categories")
        .select("id, slug, name_en, name_zh");
      const same = all?.find(
        (row) => row.name_en.trim().toLowerCase() === en.toLowerCase(),
      );
      if (same) return { status: "exists", category: toCategory(same) };
    }
    return { status: "error" };
  } catch (error) {
    logFailure("backend", "createCategory unexpected", error);
    return { status: "error" };
  }
}
