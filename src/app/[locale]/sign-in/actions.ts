"use server";

import { createClient as createUnsavedClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { after } from "next/server";
import { goTo, localeOf, nextOf, siteUrl } from "@/lib/auth/actions-support";
import { authErrorKey, googleErrorKey } from "@/lib/auth/errors";
import {
  generatedUsername,
  googleDisplayName,
  hashNonce,
  isInvitedAccount,
  NEW_ACCOUNT_MS,
  NONCE_COOKIE,
  NONCE_SECONDS,
} from "@/lib/auth/google";
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
  checkUsername,
  field,
  type FieldCode,
} from "@/lib/auth/validation";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { findEmailByUsername, isUsernameTaken } from "@/lib/supabase/usernames";

export async function signInWithEmail(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  const locale = localeOf(data);
  const identifier = field(data, "identifier").trim();
  const password = field(data, "password");
  const token = field(data, "turnstileToken");
  const values = { identifier };

  if (token === "") return { error: "captcha", values };
  const fields: Record<string, FieldCode> = {};
  if (identifier === "") fields.identifier = "required";
  if (password === "") fields.password = "required";
  if (Object.keys(fields).length > 0) return { fields, values };

  // An `@` means an email; a username can never contain one.
  let email = identifier;
  if (identifier.includes("@")) {
    const checked = checkEmail(identifier);
    if (checked.error) return { fields: { identifier: checked.error }, values };
  } else {
    const found = await findEmailByUsername(identifier);
    // Same answer as a wrong password, so it never reveals which names exist.
    if (!found) return { error: "credentials", values };
    email = found;
  }

  const supabase = await createClient();
  // Supabase checks the Turnstile token itself (a token works only once).
  const { error } = await supabase.auth.signInWithPassword({
    email,
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
  const username = checkUsername(field(data, "username"));
  const email = checkEmail(field(data, "email"));
  const password = field(data, "password");
  const confirm = field(data, "confirm");
  const token = field(data, "turnstileToken");
  const values = {
    displayName: name.value,
    username: username.value,
    email: email.value,
  };

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
  if (username.error) fields.username = username.error;
  if (email.error) fields.email = email.error;
  const passwordError = checkPassword(password);
  if (passwordError) fields.password = passwordError;
  else if (password !== confirm) fields.confirm = "passwordMismatch";
  if (Object.keys(fields).length > 0) return { fields, values };

  if (await isUsernameTaken(username.value))
    return { fields: { username: "usernameTaken" }, values };

  const supabase = await createClient();
  const { data: result, error } = await supabase.auth.signUp({
    email: email.value,
    password,
    options: {
      // The sign up trigger reads both: the public display name and the
      // private username used to sign in.
      data: { full_name: name.value, username: username.value },
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

/**
 * Makes the one time value that ties a Google token to one attempt (spec 0015).
 * The raw value stays in an httpOnly cookie; the button only gets its hash.
 */
export async function startGoogleSignIn(): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  (await cookies()).set(NONCE_COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: NONCE_SECONDS,
  });
  return hashNonce(raw);
}

/** Keeps no session anywhere, so nothing is signed in until we say so. */
function unsavedClient() {
  return createUnsavedClient(
    requireEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL",
    ),
    requireEnv(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Removes the account a refused person just made. It reads the account again
 * first, so a member, or an older account, is never deleted. Logs the id only.
 */
async function removeRefusedAccount(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) {
    console.warn(`google refusal: could not read user ${userId}`);
    return;
  }
  const age = Date.now() - Date.parse(data.user.created_at);
  if (isInvitedAccount(data.user) || !(age < NEW_ACCOUNT_MS)) return;
  const { error: failed } = await admin.auth.admin.deleteUser(userId);
  if (failed) console.warn(`google refusal: could not delete user ${userId}`);
}

/** The sign up trigger should have used Google's name; fix it if it did not. */
async function nameNewMember(userId: string, name: string): Promise<void> {
  // Only a profile still showing the generated username is changed.
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ display_name: name })
    .eq("id", userId)
    .eq("display_name", generatedUsername(userId));
  if (error) console.warn(`google sign up: could not name user ${userId}`);
}

async function welcomeName(userId: string, fallback: string): Promise<string> {
  try {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    return data?.display_name ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Sign in or join with the ID token from Google's button (spec 0015). The
 * session cookie is written only at the very end, after the invite gate.
 */
export async function signInWithGoogle(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  const locale = localeOf(data);
  const next = nextOf(data);
  const credential = field(data, "credential");

  // Used up before anything else, so one nonce serves one attempt.
  const cookieStore = await cookies();
  const nonce = cookieStore.get(NONCE_COOKIE)?.value;
  cookieStore.delete(NONCE_COOKIE);
  if (credential === "" || !nonce) return { error: "google" };

  const unsaved = unsavedClient();
  const { data: result, error } = await unsaved.auth.signInWithIdToken({
    provider: "google",
    token: credential,
    nonce,
  });
  if (error) return { error: googleErrorKey(error) };
  const { session } = result;
  if (!session) return { error: "generic" };

  // Read fresh with the admin client: these facts decide the gate.
  const admin = createAdminClient();
  const { data: read, error: readError } = await admin.auth.admin.getUserById(
    session.user.id,
  );
  if (readError || !read.user) return { error: "generic" };
  const account = read.user;

  const isNew = !isInvitedAccount(account);
  if (isNew) {
    const secret = requireEnv(
      process.env.INVITE_COOKIE_SECRET,
      "INVITE_COOKIE_SECRET",
    );
    const pass = cookieStore.get(INVITE_COOKIE)?.value;
    if (!verifyInvitePass(pass, secret, Date.now())) {
      // `local`: ends only the session just made, never the person's others.
      await unsaved.auth.signOut({ scope: "local" });
      await removeRefusedAccount(account.id);
      return goTo(locale, "/sign-in", {
        mode: "register",
        error: "googleInvite",
        next,
      });
    }
    // Marked first: if this fails the pass is kept and nobody is signed in.
    const { error: markError } = await admin.auth.admin.updateUserById(
      account.id,
      { app_metadata: { invited: true } },
    );
    if (markError) return { error: "generic" };
    await nameNewMember(account.id, googleDisplayName(account.user_metadata));
    cookieStore.delete(INVITE_COOKIE);
  }

  const supabase = await createClient();
  const { error: saveError } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (saveError) return { error: "generic" };

  const { id: userId, email } = account;
  if (isNew && email) {
    const fallback = googleDisplayName(account.user_metadata);
    const site = siteUrl();
    after(async () =>
      sendWelcomeEmail({
        userId,
        email,
        displayName: await welcomeName(userId, fallback),
        locale,
        siteUrl: site,
      }),
    );
  }
  return goTo(locale, next);
}
