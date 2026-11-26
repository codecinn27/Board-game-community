import { createHash } from "node:crypto";
import { DISPLAY_NAME_MAX } from "./validation";

// Rules for Google sign in (spec 0015). Pure, so they are easy to test.

/** The raw nonce lives here between the button and the token exchange. */
export const NONCE_COOKIE = "google_nonce";
export const NONCE_SECONDS = 10 * 60;

/** Only an account this young may be deleted after a refusal. */
export const NEW_ACCOUNT_MS = 5 * 60 * 1000;

type AccountFacts = {
  identities?: { provider: string }[] | undefined;
  app_metadata?: Record<string, unknown> | undefined;
};

/** What Google gets; Supabase hashes the raw value the same way and compares. */
export function hashNonce(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * A member registered with email, or already passed the invite gate. Reads only
 * `identities` and `app_metadata`, which a member cannot edit.
 */
export function isInvitedAccount(account: AccountFacts): boolean {
  return (
    account.app_metadata?.invited === true ||
    (account.identities?.some(({ provider }) => provider === "email") ?? false)
  );
}

/** The name Google sent, cut to fit a display name; "Member" without one. */
export function googleDisplayName(
  metadata: Record<string, unknown> | undefined,
): string {
  for (const key of ["full_name", "name"] as const) {
    const value = metadata?.[key];
    if (typeof value !== "string" || value.trim() === "") continue;
    // By code point, so a cut never splits a character in two.
    return Array.from(value.trim()).slice(0, DISPLAY_NAME_MAX).join("").trim();
  }
  return "Member";
}

/** The username the sign up trigger makes when none was given. */
export function generatedUsername(userId: string): string {
  return `member_${userId.replaceAll("-", "").slice(0, 12)}`;
}
