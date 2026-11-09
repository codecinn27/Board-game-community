import { describe, expect, it } from "vitest";
import { localePath, safeNext } from "./safe-next";

describe("safeNext", () => {
  it.each([
    ["/", "/"],
    ["/shelf", "/shelf"],
    ["/games/12", "/games/12"],
    ["/me?tab=1", "/me?tab=1"],
  ])("keeps a plain path: %s", (value, expected) => {
    expect(safeNext(value)).toBe(expected);
  });

  it.each([
    "//evil.com",
    "https://evil.com",
    "http://evil.com/x",
    "javascript:alert(1)",
    "/\\evil.com",
    "\\\\evil.com",
    "/%2F%2Fevil.com",
    "/%5Cevil.com",
    "/ok\nhttps://evil.com",
    "shelf",
    "",
    "/%E0%A4%A",
  ])("sends %j home", (value) => {
    expect(safeNext(value)).toBe("/");
  });

  it("sends a missing value home", () => {
    expect(safeNext(null)).toBe("/");
    expect(safeNext(undefined)).toBe("/");
  });
});

describe("localePath", () => {
  it("adds the language prefix", () => {
    expect(localePath("en", "/shelf")).toBe("/en/shelf");
    expect(localePath("zh", "/")).toBe("/zh");
  });

  it("still refuses an unsafe next", () => {
    expect(localePath("en", "//evil.com")).toBe("/en");
  });
});
