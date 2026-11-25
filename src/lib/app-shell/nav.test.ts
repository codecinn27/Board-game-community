import { describe, expect, it } from "vitest";
import { isActiveTab, navItems, navViewer, visibleTabs } from "./nav";

const allOn = navItems.map((item) => ({ ...item, enabled: true }));

describe("visibleTabs", () => {
  it("gives a guest home, shelf, and sign in today", () => {
    expect(visibleTabs("guest").map((i) => i.key)).toEqual([
      "home",
      "shelf",
      "signIn",
    ]);
  });

  it("gives a member home, shelf, add, and me", () => {
    expect(visibleTabs("member").map((i) => i.key)).toEqual([
      "home",
      "shelf",
      "add",
      "me",
    ]);
  });

  it("gives an admin the member tabs plus review, between add and me", () => {
    expect(visibleTabs("admin").map((i) => i.key)).toEqual([
      "home",
      "shelf",
      "add",
      "review",
      "me",
    ]);
  });

  it("never shows review to a guest or a member", () => {
    expect(visibleTabs("guest").map((i) => i.key)).not.toContain("review");
    expect(visibleTabs("member").map((i) => i.key)).not.toContain("review");
  });

  it("orders the guest set home, shelf, sign in", () => {
    expect(visibleTabs("guest", allOn).map((i) => i.key)).toEqual([
      "home",
      "shelf",
      "signIn",
    ]);
  });

  it("orders the member set home, shelf, add, me", () => {
    expect(visibleTabs("member", allOn).map((i) => i.key)).toEqual([
      "home",
      "shelf",
      "add",
      "me",
    ]);
  });

  it("never shows a member item to a guest", () => {
    const guestKeys = visibleTabs("guest", allOn).map((i) => i.key);
    expect(guestKeys).not.toContain("add");
    expect(guestKeys).not.toContain("me");
  });

  it("never shows sign in to an admin", () => {
    expect(visibleTabs("admin", allOn).map((i) => i.key)).not.toContain(
      "signIn",
    );
  });

  it("never shows sign in to a member", () => {
    expect(visibleTabs("member", allOn).map((i) => i.key)).not.toContain(
      "signIn",
    );
  });

  it("skips disabled items", () => {
    expect(visibleTabs("member", [])).toEqual([]);
  });

  it("marks only add as raised", () => {
    expect(allOn.filter((i) => i.raised).map((i) => i.key)).toEqual(["add"]);
  });

  it("has unique keys", () => {
    const keys = navItems.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("navViewer", () => {
  it("maps a guest to guest", () => {
    expect(navViewer({ kind: "guest" })).toBe("guest");
  });

  it("maps an active admin to admin", () => {
    expect(navViewer({ kind: "member", role: "admin", status: "active" })).toBe(
      "admin",
    );
  });

  it("treats a disabled admin and a plain member as member", () => {
    expect(
      navViewer({ kind: "member", role: "admin", status: "disabled" }),
    ).toBe("member");
    expect(
      navViewer({ kind: "member", role: "member", status: "active" }),
    ).toBe("member");
  });
});

describe("isActiveTab", () => {
  it.each([
    ["/", "/", true],
    ["/shelf", "/", false],
    ["/shelf", "/shelf", true],
    ["/shelf/abc", "/shelf", true],
    ["/shelfish", "/shelf", false],
    ["/", "/shelf", false],
  ])("isActiveTab(%s, %s) is %s", (pathname, href, expected) => {
    expect(isActiveTab(pathname, href)).toBe(expected);
  });
});
