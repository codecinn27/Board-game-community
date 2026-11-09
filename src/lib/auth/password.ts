import "server-only";

import { authErrorKey } from "./errors";
import { type FormState } from "./state";
import { checkPassword, field } from "./validation";
import { createClient } from "@/lib/supabase/server";

/**
 * Sets a new password for the signed in person (a normal session, or the
 * recovery session a reset link opens). Returns `{ ok: true }` or the errors.
 */
export async function changePassword(data: FormData): Promise<FormState> {
  const password = field(data, "password");
  const confirm = field(data, "confirm");

  const fields: FormState["fields"] = {};
  const short = checkPassword(password);
  if (short) fields.password = short;
  else if (password !== confirm) fields.confirm = "passwordMismatch";
  if (Object.keys(fields).length > 0) return { fields };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: authErrorKey(error) };
  return { ok: true };
}
