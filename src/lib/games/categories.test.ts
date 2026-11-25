import { describe, expect, it } from "vitest";
import { categoryLabel, slugify, validateCategory } from "./categories";

// Spec 0013 amendment, AC-25.

describe("validateCategory", () => {
  it("accepts two labels and trims them", () => {
    expect(validateCategory({ nameEn: " Roll ", nameZh: " 掷骰 " })).toEqual({
      ok: true,
      value: { nameEn: "Roll", nameZh: "掷骰" },
    });
  });

  it("requires both labels", () => {
    expect(validateCategory({ nameEn: "", nameZh: "  " })).toEqual({
      ok: false,
      errors: { nameEn: "required", nameZh: "required" },
    });
  });

  it("refuses labels over 60 characters or with no letter or number", () => {
    expect(validateCategory({ nameEn: "x".repeat(61), nameZh: "！" })).toEqual({
      ok: false,
      errors: { nameEn: "long", nameZh: "symbols" },
    });
    expect(validateCategory({ nameEn: "x".repeat(60), nameZh: "好" }).ok).toBe(
      true,
    );
  });
});

describe("slugify", () => {
  it("makes a lowercase dashed id", () => {
    expect(slugify("Co-op")).toBe("co-op");
    expect(slugify("  Roll & Write! ")).toBe("roll-write");
  });

  it("strips accents", () => {
    expect(slugify("Café")).toBe("cafe");
  });

  it("returns null when no letter or digit is left", () => {
    expect(slugify("卡牌")).toBeNull();
    expect(slugify("!!!")).toBeNull();
  });

  it("keeps the id within 50 characters", () => {
    const slug = slugify("a".repeat(70));
    expect(slug?.length).toBe(50);
  });
});

describe("categoryLabel", () => {
  const category = { nameEn: "Card", nameZh: "卡牌" };

  it("shows Chinese on /zh and English elsewhere", () => {
    expect(categoryLabel(category, "zh")).toBe("卡牌");
    expect(categoryLabel(category, "en")).toBe("Card");
  });

  it("falls back to English when the Chinese label is blank", () => {
    expect(categoryLabel({ nameEn: "Card", nameZh: " " }, "zh")).toBe("Card");
  });
});
