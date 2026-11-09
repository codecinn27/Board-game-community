"use server";

import { cookies } from "next/headers";
import { after } from "next/server";
import { goTo, localeOf, nextOf, siteUrl } from "@/lib/auth/actions-support";
import { authErrorKey } from "@/lib/auth/errors";
import {
  INVITE_COOKIE,
  INVITE_PASS_SECONDS,
  inviteCodeMatches,
  signInvitePass,
  verifyInvitePass,
} from "@/lib/auth/invite-pass";
import { type FormState } from "@/lib/auth/state";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import {
  checkDisplayName,
  checkEmail,
  checkPassword,
  field,
  type FieldCode,
} from "@/lib/auth/validation";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";
import { requireEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function signInWithEmail(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  const locale = localeOf(data);
  const email = checkEmail(field(data, "email"));
  const password = field(data, "password");
  const token = field(data, "turnstileToken");
  const values = { email: email.value };

  if (token === "") return { error: "captcha", values };
  const fields: Record<string, FieldCode> = {};
  if (email.error) fields.email = email.error;
  if (password === "") fields.password = "required";
  if (Object.keys(fields).length > 0) return { fields, values };

  const supabase = await createClient();
  // Supabase checks the Turnstile token itself (a token works only once).
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password,
    options: { captchaToken: token },
  });
  if (error) return { error: authErrorKey(error), values };

  return goTo(locale, nextOf(data));
}

export async function verifyInvite(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  const locale = localeOf(data);
  if (!(await verifyTurnstile(field(data, "turnstileToken"))))
    return { error: "captcha" };

  const code = field(data, "code");
  if (code.trim() === "") return { fields: { code: "required" } };
  const expected = requireEnv(process.env.INVITE_CODE, "INVITE_CODE");
  if (!inviteCodeMatches(code, expected)) return { error: "inviteWrong" };

  const secret = requireEnv(
    process.env.INVITE_COOKIE_SECRET,
    "INVITE_COOKIE_SECRET",
  );
  (await cookies()).set(INVITE_COOKIE, signInvitePass(secret, Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: INVITE_PASS_SECONDS,
  });
  return goTo(locale, "/sign-in", { mode: "register", next: nextOf(data) });
}

export async function signUpWithEmail(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  const locale = localeOf(data);
  const next = nextOf(data);
  const name = checkDisplayName(field(data, "displayName"));
  const email = checkEmail(field(data, "email"));
  const password = field(data, "password");
  const token = field(data, "turnstileToken");
  const values = { displayName: name.value, email: email.value };

  const cookieStore = await cookies();
  const secret = requireEnv(
    process.env.INVITE_COOKIE_SECRET,
    "INVITE_COOKIE_SECRET",
  );
  const pass = cookieStore.get(INVITE_COOKIE)?.value;
  if (!verifyInvitePass(pass, secret, Date.now()))
    return { error: "inviteNeeded", values };
  if (token === "") return { error: "captcha", values };

  const fields: Record<string, FieldCode> = {};
  if (name.error) fields.displayName = name.error;
  if (email.error) fields.email = email.error;
  const passwordError = checkPassword(password);
  if (passwordError) fields.password = passwordError;
  if (Object.keys(fields).length > 0) return { fields, values };

  const supabase = await createClient();
  const { data: result, error } = await supabase.auth.signUp({
    email: email.value,
    password,
    options: {
      // The existing sign up trigger reads this for the profile name.
      data: { full_name: name.value },
      captchaToken: token,
    },
  });
  if (error) return { error: authErrorKey(error), values };

  cookieStore.delete(INVITE_COOKIE);
  // Email confirmation is off, so sign up returns a session: the member is
  // signed in at once. No session means the project setting is wrong.
  if (!result.session) return { error: "generic", values };

  // The welcome email goes out after the response, so it never slows or blocks
  // sign up (spec 0011, AC-4). It never throws.
  const userId = result.user?.id;
  if (userId) {
    const request = {
      userId,
      email: email.value,
      displayName: name.value,
      locale,
      siteUrl: siteUrl(),
    };
    after(() => sendWelcomeEmail(request));
  }
  return goTo(locale, next);
}
