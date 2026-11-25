import { describe, expect, it } from "vitest";
import {
  isEditDirty,
  tabForErrors,
  toEditInput,
  validateEditGame,
  type EditGameInput,
  type EditSnapshot,
} from "./edit-game";

// Spec 0013 amendment, AC-17 and AC-19.

const blank: EditGameInput = {
  name: "Catan",
  nameZh: "",
  description: "",
  descriptionZh: "",
  playersMin: "",
  playersMax: "",
  playTimeMin: "",
  playTimeMax: "",
};

function input(over: Partial<EditGameInput> = {}): EditGameInput {
  return { ...blank, ...over };
}

function errorsOf(over: Partial<EditGameInput>) {
  const result = validateEditGame(input(over));
  return result.ok ? {} : result.errors;
}

describe("validateEditGame", () => {
  it("accepts a name alone and stores blank Chinese fields as null", () => {
    expect(validateEditGame(input())).toEqual({
      ok: true,
      value: {
        name: "Catan",
        playersMin: null,
        playersMax: null,
        playTimeMin: null,
        playTimeMax: null,
        description: null,
        nameZh: null,
        descriptionZh: null,
      },
    });
  });

  it("trims and keeps the Chinese text", () => {
    const result = validateEditGame(
      input({ nameZh: "  卡坦岛 ", descriptionZh: " 好玩 " }),
    );
    expect(result.ok && result.value.nameZh).toBe("卡坦岛");
    expect(result.ok && result.value.descriptionZh).toBe("好玩");
  });

  it("applies the Add form rules to the English fields", () => {
    expect(errorsOf({ name: "  " })).toEqual({ name: "nameRequired" });
    expect(errorsOf({ name: "?!" })).toEqual({ name: "nameSymbols" });
    expect(errorsOf({ playersMin: "5", playersMax: "2" })).toEqual({
      playersMax: "playersOrder",
    });
    expect(errorsOf({ playTimeMin: "0" })).toEqual({
      playTimeMin: "playTimeWhole",
    });
  });

  it("refuses a Chinese name that is too long or only symbols", () => {
    expect(errorsOf({ nameZh: "字".repeat(201) })).toEqual({
      nameZh: "nameZhLong",
    });
    expect(errorsOf({ nameZh: "！？" })).toEqual({ nameZh: "nameZhSymbols" });
  });

  it("allows a Chinese name of exactly 200 characters", () => {
    expect(errorsOf({ nameZh: "字".repeat(200) })).toEqual({});
  });

  it("refuses a Chinese description over 4000 characters", () => {
    expect(errorsOf({ descriptionZh: "字".repeat(4001) })).toEqual({
      descriptionZh: "descriptionZhLong",
    });
    expect(errorsOf({ descriptionZh: "字".repeat(4000) })).toEqual({});
  });

  it("reports English and Chinese errors together", () => {
    expect(errorsOf({ name: "", nameZh: "！" })).toEqual({
      name: "nameRequired",
      nameZh: "nameZhSymbols",
    });
  });

  it("fails on a Chinese error even when the English fields are fine", () => {
    expect(validateEditGame(input({ nameZh: "！" })).ok).toBe(false);
  });
});

describe("toEditInput", () => {
  it("turns saved values into field text and a missing value into blank", () => {
    expect(
      toEditInput({
        id: 1,
        name: "Catan",
        nameZh: null,
        description: null,
        descriptionZh: "好玩",
        playersMin: 3,
        playersMax: null,
        playTimeMin: 60,
        playTimeMax: 120,
        coverPath: null,
        coverTint: null,
        feelIds: [],
        themeIds: [],
        mechanicIds: [],
        owners: [],
      }),
    ).toEqual({
      name: "Catan",
      nameZh: "",
      description: "",
      descriptionZh: "好玩",
      playersMin: "3",
      playersMax: "",
      playTimeMin: "60",
      playTimeMax: "120",
    });
  });
});

describe("tabForErrors", () => {
  it("stays put when there are no errors", () => {
    expect(tabForErrors({}, "zh")).toBe("zh");
    expect(tabForErrors({}, "en")).toBe("en");
  });

  it("moves to the tab that holds the error", () => {
    expect(tabForErrors({ nameZh: "nameZhLong" }, "en")).toBe("zh");
    expect(tabForErrors({ name: "nameRequired" }, "zh")).toBe("en");
  });

  it("stays when the current tab holds an error too", () => {
    expect(
      tabForErrors({ name: "nameRequired", nameZh: "nameZhLong" }, "zh"),
    ).toBe("zh");
  });

  it("ignores errors on fields outside the tabs", () => {
    expect(tabForErrors({ playersMax: "playersOrder" }, "zh")).toBe("zh");
  });
});

describe("isEditDirty", () => {
  const initial: EditSnapshot = {
    fields: input({ description: "Trade" }),
    feelIds: [1, 2],
    themeIds: [3],
    mechanicIds: [4, 5],
    ownerIds: ["a", "b"],
    cover: "keep",
  };

  it("is clean for the same values", () => {
    expect(isEditDirty(initial, { ...initial })).toBe(false);
  });

  it("ignores spaces around text and the order of ids", () => {
    expect(
      isEditDirty(initial, {
        ...initial,
        fields: { ...initial.fields, description: "  Trade " },
        feelIds: [2, 1],
        mechanicIds: [5, 4],
        ownerIds: ["b", "a"],
      }),
    ).toBe(false);
  });

  it("is dirty after a text change", () => {
    expect(
      isEditDirty(initial, {
        ...initial,
        fields: { ...initial.fields, nameZh: "卡坦岛" },
      }),
    ).toBe(true);
  });

  it("is dirty after a feel, theme, mechanic, or owner change", () => {
    expect(isEditDirty(initial, { ...initial, feelIds: [1] })).toBe(true);
    expect(isEditDirty(initial, { ...initial, themeIds: [] })).toBe(true);
    expect(isEditDirty(initial, { ...initial, mechanicIds: [4] })).toBe(true);
    expect(isEditDirty(initial, { ...initial, ownerIds: ["a"] })).toBe(true);
  });

  it("is dirty after any cover change", () => {
    expect(isEditDirty(initial, { ...initial, cover: "replace" })).toBe(true);
    expect(isEditDirty(initial, { ...initial, cover: "remove" })).toBe(true);
  });
});
