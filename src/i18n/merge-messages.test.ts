import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { deepMerge, missingKeys } from "./merge-messages";

const en = {
  shelf: {
    title: "Shelf",
    players: "{count, plural, one {# player} other {# players}}",
  },
  common: { save: "Save" },
};

describe("deepMerge", () => {
  it("keeps the Chinese text where it exists", () => {
    const zh = { shelf: { title: "游戏架", players: "{count} 位玩家" } };
    expect(deepMerge(en, zh).shelf.title).toBe("游戏架");
  });

  it("falls back to the full English message for a missing key", () => {
    const zh = { shelf: { title: "游戏架" }, common: { save: "保存" } };
    const merged = deepMerge(en, zh);
    const t = createTranslator({ locale: "zh", messages: merged });
    expect(t("shelf.players", { count: 3 })).toBe("3 players");
    // The fallback is formatted with Chinese plural rules, which have only an
    // "other" form, so it still shows a whole English message, not the key.
    expect(t("shelf.players", { count: 1 })).toBe("1 players");
    expect(t("shelf.title")).toBe("游戏架");
  });

  it("falls back for a whole missing namespace and an empty string", () => {
    const merged = deepMerge(en, { shelf: { title: "" } });
    expect(merged.shelf.title).toBe("Shelf");
    expect(merged.common.save).toBe("Save");
  });

  it("does not change the English input", () => {
    deepMerge(en, { common: { save: "保存" } });
    expect(en.common.save).toBe("Save");
  });
});

describe("missingKeys", () => {
  it("lists dotted keys missing or empty on top", () => {
    expect(missingKeys(en, { shelf: { title: "" } })).toEqual([
      "shelf.title",
      "shelf.players",
      "common.save",
    ]);
  });

  it("is empty when every key is present", () => {
    expect(
      missingKeys(en, {
        shelf: { title: "a", players: "b" },
        common: { save: "c" },
      }),
    ).toEqual([]);
  });
});
