import "server-only";

import { createClient } from "@/lib/supabase/server";
import { type ReviewTab } from "./review-params";

export type ReviewRow = {
  id: number;
  name: string;
  description: string | null;
  playersMin: number | null;
  playersMax: number | null;
  playTimeMin: number | null;
  playTimeMax: number | null;
  coverPath: string | null;
  coverTint: string | null;
  createdAt: string;
  addedBy: string | null;
  reviewedAt: string | null;
  /** Null with `reviewedAt` set: reviewed by the import, not a person. */
  reviewedBy: string | null;
};

export type ReviewQueue = { rows: ReviewRow[]; total: number };

// A literal string, so the client can type the embedded rows.
const COLUMNS =
  "id, name, description, players_min, players_max, play_time_min, play_time_max, cover_path, cover_tint, created_at, reviewed_at, adder:profiles!games_added_by_fkey(display_name), reviewer:profiles!games_reviewed_by_fkey(display_name)" as const;

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
      description: row.description,
      playersMin: row.players_min,
      playersMax: row.players_max,
      playTimeMin: row.play_time_min,
      playTimeMax: row.play_time_max,
      coverPath: row.cover_path,
      coverTint: row.cover_tint,
      createdAt: row.created_at,
      addedBy: adder?.display_name ?? null,
      reviewedAt: row.reviewed_at,
      reviewedBy: reviewer?.display_name ?? null,
    };
  });
  return { rows, total: count ?? rows.length };
}
