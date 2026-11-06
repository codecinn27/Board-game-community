"use server";

import { authLink, localeOf } from "@/lib/auth/actions-support";
import { authErrorKey } from "@/lib/auth/errors";
import { type FormState } from "@/lib/auth/state";
import { checkEmail, field } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  const locale = localeOf(data);
  const email = checkEmail(field(data, "email"));
  const token = field(data, "turnstileToken");
  const values = { email: email.value };

  if (token === "") return { error: "captcha", values };
  if (email.error) return { fields: { email: email.error }, values };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
    redirectTo: authLink("confirm", locale, "/reset-password"),
    captchaToken: token,
  });
  // The same answer whether or not the address has an account. Only a failed
  // security check or a rate limit is worth telling the person about.
  if (error) {
    const key = authErrorKey(error);
    if (key === "captcha" || key === "rateLimit") return { error: key, values };
  }
  return { sent: true, values };
}
