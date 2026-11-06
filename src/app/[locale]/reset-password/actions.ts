"use server";

import { goTo, localeOf } from "@/lib/auth/actions-support";
import { changePassword } from "@/lib/auth/password";
import { type FormState } from "@/lib/auth/state";

export async function resetPassword(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  const result = await changePassword(data);
  if (!result.ok) return result;
  // The reset link already signed the member in; send them home.
  return goTo(localeOf(data), "/");
}
