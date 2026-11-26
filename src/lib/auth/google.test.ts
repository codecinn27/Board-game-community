import { describe, expect, it } from "vitest";
import { googleDisplayName, isInvitedAccount } from "./google";

describe("isInvitedAccount", () => {
  it("accepts an email identity or the server only mark", () => {
    expect(isInvitedAccount({ identities: [{ provider: "email" }] })).toBe(
      true,
    );
    expect(isInvitedAccount({ app_metadata: { invited: true } })).toBe(true);
  });

  it("refuses a Google only account with no mark", () => {
    expect(
      isInvitedAccount({
        identities: [{ provider: "google" }],
        app_metadata: { invited: "true" },
      }),
    ).toBe(false);
  });
});

describe("googleDisplayName", () => {
  it("uses the Google name, trimmed and cut to 40 characters", () => {
    expect(googleDisplayName({ full_name: "  Mei Tan " })).toBe("Mei Tan");
    expect(googleDisplayName({ name: "x".repeat(60) })).toHaveLength(40);
  });

  it("never splits a character when cutting", () => {
    expect(Array.from(googleDisplayName({ name: "🎲".repeat(45) }))).toEqual(
      Array.from("🎲".repeat(40)),
    );
  });

  it("falls back to Member", () => {
    expect(googleDisplayName({ full_name: "   " })).toBe("Member");
    expect(googleDisplayName(undefined)).toBe("Member");
  });
});
