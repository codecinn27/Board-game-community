import { describe, expect, it } from "vitest";
import { localized } from "./localized";

// Spec 0013, AC-24.

describe("localized", () => {
  it("shows the Chinese text on /zh when it exists", () => {
    expect(localized("Catan", "卡坦岛", "zh")).toBe("卡坦岛");
  });

  it("falls back to English on /zh when there is no Chinese text", () => {
    expect(localized("Catan", null, "zh")).toBe("Catan");
    expect(localized("Catan", undefined, "zh")).toBe("Catan");
    expect(localized("Catan", "   ", "zh")).toBe("Catan");
  });

  it("never shows Chinese on /en", () => {
    expect(localized("Catan", "卡坦岛", "en")).toBe("Catan");
  });

  it("keeps a missing English description null", () => {
    expect(localized(null, null, "zh")).toBeNull();
    expect(localized(null, null, "en")).toBeNull();
  });

  it("shows Chinese text even when there is no English text", () => {
    expect(localized(null, "好玩", "zh")).toBe("好玩");
  });
});
