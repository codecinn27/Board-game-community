import { describe, expect, it } from "vitest";
import {
  INVITE_PASS_SECONDS,
  inviteCodeMatches,
  signInvitePass,
  verifyInvitePass,
} from "./invite-pass";

const SECRET = "test-secret-with-enough-length-0123456789";
const NOW = 1_800_000_000_000;

describe("inviteCodeMatches", () => {
  it("accepts the right code, ignoring outer spaces", () => {
    expect(inviteCodeMatches("abc-123", "abc-123")).toBe(true);
    expect(inviteCodeMatches("  abc-123 ", "abc-123")).toBe(true);
  });

  it("refuses a wrong, shorter, or longer code", () => {
    expect(inviteCodeMatches("abc-124", "abc-123")).toBe(false);
    expect(inviteCodeMatches("abc", "abc-123")).toBe(false);
    expect(inviteCodeMatches("abc-123-extra", "abc-123")).toBe(false);
  });

  it("refuses everything when no code is configured", () => {
    expect(inviteCodeMatches("", "")).toBe(false);
  });
});

describe("invite pass", () => {
  it("is valid right after signing", () => {
    expect(verifyInvitePass(signInvitePass(SECRET, NOW), SECRET, NOW)).toBe(
      true,
    );
  });

  it("lasts 30 minutes and no longer", () => {
    expect(INVITE_PASS_SECONDS).toBe(1800);
    const pass = signInvitePass(SECRET, NOW);
    expect(verifyInvitePass(pass, SECRET, NOW + 1799 * 1000)).toBe(true);
    expect(verifyInvitePass(pass, SECRET, NOW + 1800 * 1000)).toBe(false);
  });

  it("rejects a changed expiry", () => {
    const [, signature] = signInvitePass(SECRET, NOW).split(".");
    const forged = `${NOW + 10 * 60 * 60 * 1000}.${signature}`;
    expect(verifyInvitePass(forged, SECRET, NOW)).toBe(false);
  });

  it("rejects a changed signature or another secret", () => {
    const pass = signInvitePass(SECRET, NOW);
    expect(verifyInvitePass(`${pass}0`, SECRET, NOW)).toBe(false);
    expect(verifyInvitePass(pass, "another-secret", NOW)).toBe(false);
  });

  it.each([undefined, null, "", "garbage", "1.2.3", ".abc", "12."])(
    "rejects %j",
    (value) => {
      expect(verifyInvitePass(value, SECRET, NOW)).toBe(false);
    },
  );

  it("rejects everything without a secret", () => {
    expect(verifyInvitePass(signInvitePass("", NOW), "", NOW)).toBe(false);
  });
});
