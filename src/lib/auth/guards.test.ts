import { describe, expect, it } from "vitest";
import { authRedirect, GUEST, sessionFromClaims, type Session } from "./guards";

const member: Session = { signedIn: true, viaEmailLink: false };
const recovery: Session = { signedIn: true, viaEmailLink: true };
const none = new URLSearchParams();

describe("sessionFromClaims", () => {
  it("is a guest without a verified subject", () => {
    expect(sessionFromClaims(null)).toEqual(GUEST);
    expect(sessionFromClaims({})).toEqual(GUEST);
    expect(sessionFromClaims({ sub: "" })).toEqual(GUEST);
  });

  it("is signed in with a subject, and spots an email link login", () => {
    expect(
      sessionFromClaims({ sub: "u1", amr: [{ method: "password" }] }),
    ).toEqual(member);
    expect(sessionFromClaims({ sub: "u1", amr: [{ method: "otp" }] })).toEqual(
      recovery,
    );
    expect(sessionFromClaims({ sub: "u1" })).toEqual(member);
  });
});

describe("authRedirect", () => {
  it("sends a guest on /me to sign in, keeping the way back", () => {
    expect(authRedirect("/me", none, GUEST)).toBe("/sign-in?next=/me");
  });

  it("lets a member through /me", () => {
    expect(authRedirect("/me", none, member)).toBeNull();
  });

  it("sends a signed in member away from sign in and forgot password", () => {
    expect(authRedirect("/sign-in", none, member)).toBe("/");
    expect(authRedirect("/forgot-password", none, member)).toBe("/");
    expect(
      authRedirect("/sign-in", new URLSearchParams({ next: "/shelf" }), member),
    ).toBe("/shelf");
  });

  it("never follows an unsafe next", () => {
    expect(
      authRedirect(
        "/sign-in",
        new URLSearchParams({ next: "//evil.com" }),
        member,
      ),
    ).toBe("/");
  });

  it("leaves guests alone on the public auth pages", () => {
    expect(authRedirect("/sign-in", none, GUEST)).toBeNull();
    expect(authRedirect("/forgot-password", none, GUEST)).toBeNull();
    expect(authRedirect("/privacy", none, GUEST)).toBeNull();
    expect(authRedirect("/shelf", none, member)).toBeNull();
  });

  it("opens the reset page only to a reset link session", () => {
    expect(authRedirect("/reset-password", none, recovery)).toBeNull();
    expect(authRedirect("/reset-password", none, member)).toBe("/");
    expect(authRedirect("/reset-password", none, GUEST)).toBe(
      "/forgot-password",
    );
  });

  it("ignores a trailing slash", () => {
    expect(authRedirect("/me/", none, GUEST)).toBe("/sign-in?next=/me");
  });
});
