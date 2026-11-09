"use server";

import { goTo, localeOf } from "@/lib/auth/actions-support";
import { changePassword } from "@/lib/auth/password";
import { type FormState } from "@/lib/auth/state";
import { checkDisplayName, field } from "@/lib/auth/validation";
import { revalidateGames } from "@/lib/games/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateDisplayName(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  const name = checkDisplayName(field(data, "displayName"));
  const values = { displayName: name.value };
  if (name.error) return { fields: { displayName: name.error }, values };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const id = claims?.claims.sub;
  if (!id) return { error: "generic", values };

  // Row level security allows this only for the member's own row, and only
  // while they are active; a refused write updates no row.
  const { data: rows, error } = await supabase
    .from("profiles")
    .update({ display_name: name.value })
    .eq("id", id)
    .select("id");
  if (error || !rows || rows.length === 0) return { error: "generic", values };

  // Owner lists on home, shelf, and the game sheet show this name.
  revalidateGames();
  return { ok: true, values };
}

export async function updatePassword(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  return changePassword(data);
}

export async function signOut(data: FormData): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return goTo(localeOf(data), "/");
}
