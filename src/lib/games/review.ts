import "server-only";

import { createClient } from "@/lib/supabase/server";
import { type EditorLists, type EditorMember } from "./edit-game";
import { type ReviewTab } from "./review-params";

export type ReviewRow = {
  id: number;
  name: string;
  nameZh: string | null;
  description: string | null;
  descriptionZh: string | null;
  playersMin: number | null;
  playersMax: number | null;
  playTimeMin: number | null;
  playTimeMax: number | null;
  coverPath: string | null;
  coverTint: string | null;
  categoryIds: number[];
  /** Current owners, with disabled members marked so the picker can keep them. */
  owners: EditorMember[];
  createdAt: string;
  addedBy: string | null;
  reviewedAt: string | null;
  /** Null with `reviewedAt` set: reviewed by the import, not a person. */
  reviewedBy: string | null;
};

export type ReviewQueue = { rows: ReviewRow[]; total: number };

// A literal string, so the client can type the embedded rows.
const COLUMNS =
  "id, name, name_zh, description, description_zh, players_min, players_max, play_time_min, play_time_max, cover_path, cover_tint, created_at, reviewed_at, game_categories(category_id), game_owners(member_id, member:profiles!game_owners_member_id_fkey(display_name, status)), adder:profiles!games_added_by_fkey(display_name), reviewer:profiles!games_reviewed_by_fkey(display_name)" as const;

/**
 * One page of the review lists, read with the admin's own session and never
 * cached (spec 0013, AC-14). `shown` rows from the top; `total` drives Show more.
 */
export async function getReviewQueue(
  tab: ReviewTab,
  shown: number,
): Promise<ReviewQueue> {
  const supabase = await createClient();
  const base = supabase.from("games").select(COLUMNS, { count: "exact" });
  const query =
    tab === "todo"
      ? base
          .is("reviewed_at", null)
          .order("created_at", { ascending: true })
          .order("id")
      : base
          .not("reviewed_at", "is", null)
          .order("reviewed_at", { ascending: false })
          .order("id");
  const { data, count, error } = await query.range(0, shown - 1);
  if (error) throw error;

  const rows = (data ?? []).map((row): ReviewRow => {
    const adder = row.adder as { display_name: string } | null;
    const reviewer = row.reviewer as { display_name: string } | null;
    return {
      id: row.id,
      name: row.name,
      nameZh: row.name_zh,
      description: row.description,
      descriptionZh: row.description_zh,
      playersMin: row.players_min,
      playersMax: row.players_max,
      playTimeMin: row.play_time_min,
      playTimeMax: row.play_time_max,
      coverPath: row.cover_path,
      coverTint: row.cover_tint,
      categoryIds: row.game_categories.map((link) => link.category_id),
      owners: row.game_owners.map((link) => {
        const member = link.member as {
          display_name: string;
          status: string;
        } | null;
        return {
          id: link.member_id,
          name: member?.display_name ?? "?",
          disabled: member?.status === "disabled",
        };
      }),
      createdAt: row.created_at,
      addedBy: adder?.display_name ?? null,
      reviewedAt: row.reviewed_at,
      reviewedBy: reviewer?.display_name ?? null,
    };
  });
  return { rows, total: count ?? rows.length };
}

/**
 * The choices the editor offers (spec 0013 amendment, AC-17, AC-25): every
 * category and every active member. Read once per page view with the admin's
 * own session, never cached.
 */
export async function getEditorLists(): Promise<EditorLists> {
  const supabase = await createClient();
  const [categories, members] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, name_en, name_zh")
      .order("name_en")
      .order("id"),
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("status", "active")
      .order("display_name")
      .order("id"),
  ]);
  if (categories.error) throw categories.error;
  if (members.error) throw members.error;
  return {
    categories: categories.data.map((row) => ({
      id: row.id,
      slug: row.slug,
      nameEn: row.name_en,
      nameZh: row.name_zh,
    })),
    members: members.data.map((row) => ({
      id: row.id,
      name: row.display_name,
      disabled: false,
    })),
  };
}
