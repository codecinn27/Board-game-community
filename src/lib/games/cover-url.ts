import { requireEnv } from "@/lib/supabase/env";

/**
 * The public address of a cover in the `covers` bucket, or null when the game
 * has no image (the caller then draws the tint tile).
 */
export function coverUrl(path: string | null | undefined): string | null {
  if (path === null || path === undefined || path === "") return null;
  const base = requireEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  ).replace(/\/$/, "");
  return `${base}/storage/v1/object/public/covers/${encodeURIComponent(path)}`;
}
