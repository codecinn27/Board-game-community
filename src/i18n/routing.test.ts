import { describe, expect, it } from "vitest";
import { hasLocale, htmlLang, localeCode, routing } from "./routing";

describe("routing", () => {
  // covers: AC-1, AC-2
  it("offers English and Chinese, English by default, always prefixed", () => {
    expect(routing.locales).toEqual(["en", "zh"]);
    expect(routing.defaultLocale).toBe("en");
    expect(routing.localePrefix).toBe("always");
  });

  // covers: AC-4
  it("keeps the language cookie for one year", () => {
    const cookie = routing.localeCookie;

    expect(cookie).toMatchObject({ maxAge: 60 * 60 * 24 * 365 });
  });
});

describe("hasLocale", () => {
  it.each(["en", "zh"])("accepts %s", (value) => {
    expect(hasLocale(value)).toBe(true);
  });

  it.each(["EN", "zh-CN", "fr", "", " en"])("rejects %j", (value) => {
    expect(hasLocale(value)).toBe(false);
  });

  it("rejects values that are not strings", () => {
    expect(hasLocale(undefined)).toBe(false);
    expect(hasLocale(null)).toBe(false);
    expect(hasLocale(1)).toBe(false);
  });
});

describe("language labels", () => {
  // covers: AC-5
  it("tags Chinese pages as Simplified Chinese", () => {
    expect(htmlLang).toEqual({ en: "en", zh: "zh-Hans" });
  });

  // covers: AC-3
  it("shows EN or 中 on the menu button", () => {
    expect(localeCode).toEqual({ en: "EN", zh: "中" });
  });
});
