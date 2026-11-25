import { describe, expect, it } from "vitest";
import { choiceHint, choiceLabel } from "./choices";

// Spec 0014, AC-4.

describe("choiceLabel", () => {
  const choice = { nameEn: "Trading", nameZh: "交易" };

  it("shows Chinese on /zh and English elsewhere", () => {
    expect(choiceLabel(choice, "zh")).toBe("交易");
    expect(choiceLabel(choice, "en")).toBe("Trading");
  });

  it("falls back to English when the Chinese name is blank", () => {
    expect(choiceLabel({ nameEn: "Trading", nameZh: " " }, "zh")).toBe(
      "Trading",
    );
  });
});

describe("choiceHint", () => {
  const choice = { descriptionEn: "Swap goods.", descriptionZh: "交换物品。" };

  it("shows the hint in the page language", () => {
    expect(choiceHint(choice, "zh")).toBe("交换物品。");
    expect(choiceHint(choice, "en")).toBe("Swap goods.");
  });

  it("falls back to English on /zh when the Chinese hint is missing", () => {
    expect(choiceHint({ descriptionEn: "Swap goods." }, "zh")).toBe(
      "Swap goods.",
    );
  });

  it("is null when the choice has no hint", () => {
    expect(choiceHint({}, "en")).toBeNull();
    expect(
      choiceHint({ descriptionEn: null, descriptionZh: null }, "zh"),
    ).toBeNull();
  });
});
