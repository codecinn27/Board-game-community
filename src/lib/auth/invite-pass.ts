import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** The pass cookie's name and lifetime (spec 0010, AC-13). */
export const INVITE_COOKIE = "invite_pass";
export const INVITE_PASS_MINUTES = 30;
export const INVITE_PASS_SECONDS = INVITE_PASS_MINUTES * 60;

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Constant time compare: both sides are hashed so lengths always match. */
export function inviteCodeMatches(input: string, expected: string): boolean {
  if (expected === "") return false;
  return timingSafeEqual(sha256(input.trim()), sha256(expected));
}

function sign(expiry: string, secret: string): string {
  return createHmac("sha256", secret).update(expiry).digest("hex");
}

/** `<expiry in ms>.<hex hmac>`, valid for 30 minutes from `now`. */
export function signInvitePass(secret: string, now: number): string {
  const expiry = String(now + INVITE_PASS_SECONDS * 1000);
  return `${expiry}.${sign(expiry, secret)}`;
}

/** False for a missing, tampered, malformed, or expired pass. */
export function verifyInvitePass(
  value: string | undefined | null,
  secret: string,
  now: number,
): boolean {
  if (!value || secret === "") return false;
  const [expiry, signature, ...rest] = value.split(".");
  if (!expiry || !signature || rest.length > 0) return false;
  if (!/^\d{1,16}$/.test(expiry)) return false;
  // Exactly one SHA-256 in hex: Buffer.from ignores a stray last digit.
  if (!/^[0-9a-f]{64}$/.test(signature)) return false;
  const expected = Buffer.from(sign(expiry, secret), "hex");
  const given = Buffer.from(signature, "hex");
  if (given.length !== expected.length) return false;
  if (!timingSafeEqual(given, expected)) return false;
  return Number(expiry) > now;
}
