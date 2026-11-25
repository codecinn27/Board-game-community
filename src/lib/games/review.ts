import "server-only";

import { createClient } from "@/lib/supabase/server";
import { type EditorLists, type EditorMember } from "./edit-game";
import { REVIEW_MAX_SHOWN, type ReviewTab } from "./review-params";
import { type PromptGame } from "./tagging-prompt";

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
  feelIds: number[];
  themeIds: number[];
  mechanicIds: number[];
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
  "id, name, name_zh, description, description_zh, players_min, players_max, play_time_min, play_time_max, cover_path, cover_tint, created_at, reviewed_at, game_feels(feel_id), game_themes(theme_id), game_mechanics(mechanic_id), game_owners(member_id, member:profiles!game_owners_member_id_fkey(display_name, status)), adder:profiles!games_added_by_fkey(display_name), reviewer:profiles!games_reviewed_by_fkey(display_name)" as const;

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
      feelIds: row.game_feels.map((link) => link.feel_id),
      themeIds: row.game_themes.map((link) => link.theme_id),
      mechanicIds: row.game_mechanics.map((link) => link.mechanic_id),
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
 * Every game still to review, for the AI tagging prompt (admin only, never
 * cached). Capped at the largest page the list can show.
 */
export async function getUnreviewedForPrompt(): Promise<PromptGame[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(
      "id, name, name_zh, description, game_feels(choice:feels(slug)), game_themes(choice:themes(slug)), game_mechanics(choice:mechanics(slug))",
    )
    .is("reviewed_at", null)
    .order("created_at", { ascending: true })
    .order("id")
    .range(0, REVIEW_MAX_SHOWN - 1);
  if (error) throw error;
  const slugs = (links: { choice: { slug: string } | null }[]): string[] =>
    links.flatMap((link) => (link.choice === null ? [] : [link.choice.slug]));
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    nameZh: row.name_zh,
    description: row.description,
    feels: slugs(row.game_feels),
    themes: slugs(row.game_themes),
    mechanics: slugs(row.game_mechanics),
  }));
}

/**
 * The choices the editor offers (spec 0014): the three fixed lists in position
 * order and every active member. Read once per page view with the admin's own
 * session, never cached.
 */
export async function getEditorLists(): Promise<EditorLists> {
  const supabase = await createClient();
  const [feels, themes, mechanics, members] = await Promise.all([
    supabase
      .from("feels")
      .select("id, slug, name_en, name_zh")
      .order("position")
      .order("id"),
    supabase
      .from("themes")
      .select("id, slug, name_en, name_zh")
      .order("position")
      .order("id"),
    supabase
      .from("mechanics")
      .select("id, slug, name_en, name_zh, description_en, description_zh")
      .order("position")
      .order("id"),
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("status", "active")
      .order("display_name")
      .order("id"),
  ]);
  if (feels.error) throw feels.error;
  if (themes.error) throw themes.error;
  if (mechanics.error) throw mechanics.error;
  if (members.error) throw members.error;
  const plain = (row: {
    id: number;
    slug: string;
    name_en: string;
    name_zh: string;
  }) => ({
    id: row.id,
    slug: row.slug,
    nameEn: row.name_en,
    nameZh: row.name_zh,
  });
  return {
    feels: feels.data.map(plain),
    themes: themes.data.map(plain),
    mechanics: mechanics.data.map((row) => ({
      ...plain(row),
      descriptionEn: row.description_en,
      descriptionZh: row.description_zh,
    })),
    members: members.data.map((row) => ({
      id: row.id,
      name: row.display_name,
      disabled: false,
    })),
  };
}
