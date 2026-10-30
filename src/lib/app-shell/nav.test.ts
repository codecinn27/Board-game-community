import { describe, expect, it } from "vitest";
import { isActiveTab, navItems, visibleTabs } from "./nav";

const allOn = navItems.map((item) => ({ ...item, enabled: true }));

describe("visibleTabs", () => {
  it("gives a guest only the shelf today", () => {
    expect(visibleTabs("guest").map((i) => i.key)).toEqual(["shelf"]);
  });

  it("gives a member only the shelf today", () => {
    expect(visibleTabs("member").map((i) => i.key)).toEqual(["shelf"]);
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
