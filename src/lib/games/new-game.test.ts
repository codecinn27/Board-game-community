import { describe, expect, it } from "vitest";
import {
  emptyNewGame,
  hasNameCharacter,
  toGameMatch,
  validateNewGame,
  type NewGameInput,
} from "./new-game";

// Spec 0013, AC-4.

function input(over: Partial<NewGameInput> = {}): NewGameInput {
  return { ...emptyNewGame, name: "Catan", ...over };
}

function errorsOf(over: Partial<NewGameInput>) {
  const result = validateNewGame(input(over));
  return result.ok ? {} : result.errors;
}

describe("validateNewGame", () => {
  it("accepts a name alone and trims it", () => {
    const result = validateNewGame(input({ name: "  Catan  " }));
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Catan",
        playersMin: null,
        playersMax: null,
        playTimeMin: null,
        playTimeMax: null,
        description: null,
      },
    });
  });

  it("reads numbers and stores a blank description as null", () => {
    const result = validateNewGame(
      input({
        playersMin: " 2 ",
        playersMax: "4",
        playTimeMin: "30",
        playTimeMax: "90",
        description: "  Trade and build.  ",
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      value: {
        playersMin: 2,
        playersMax: 4,
        playTimeMin: 30,
        playTimeMax: 90,
        description: "Trade and build.",
      },
    });
    expect(validateNewGame(input({ description: "   " }))).toMatchObject({
      ok: true,
      value: { description: null },
    });
  });

  it("requires a name with a letter or number in it", () => {
    expect(errorsOf({ name: "   " }).name).toBe("nameRequired");
    expect(errorsOf({ name: "?!  -" }).name).toBe("nameSymbols");
    expect(errorsOf({ name: "卡坦岛" }).name).toBeUndefined();
  });

  it("limits the name to 200 characters, counting characters not bytes", () => {
    expect(errorsOf({ name: "卡".repeat(200) }).name).toBeUndefined();
    expect(errorsOf({ name: "卡".repeat(201) }).name).toBe("nameLong");
  });

  it("limits the description to 4000 characters", () => {
    expect(errorsOf({ description: "a".repeat(4000) }).description).toBe(
      undefined,
    );
    expect(errorsOf({ description: "a".repeat(4001) }).description).toBe(
      "descriptionLong",
    );
  });

  it("takes whole numbers from 1 to 99 for players", () => {
    expect(errorsOf({ playersMin: "0" }).playersMin).toBe("playersWhole");
    expect(errorsOf({ playersMax: "100" }).playersMax).toBe("playersWhole");
    expect(errorsOf({ playersMax: "2.5" }).playersMax).toBe("playersWhole");
    expect(errorsOf({ playersMin: "-1" }).playersMin).toBe("playersWhole");
    expect(errorsOf({ playersMax: "99" }).playersMax).toBeUndefined();
  });

  it("takes whole numbers from 1 to 1440 for play time", () => {
    expect(errorsOf({ playTimeMax: "1441" }).playTimeMax).toBe("playTimeWhole");
    expect(errorsOf({ playTimeMin: "abc" }).playTimeMin).toBe("playTimeWhole");
    expect(errorsOf({ playTimeMax: "1440" }).playTimeMax).toBeUndefined();
  });

  it("rejects a minimum above the maximum, and allows equal", () => {
    expect(errorsOf({ playersMin: "5", playersMax: "2" }).playersMax).toBe(
      "playersOrder",
    );
    expect(errorsOf({ playTimeMin: "60", playTimeMax: "30" }).playTimeMax).toBe(
      "playTimeOrder",
    );
    expect(errorsOf({ playersMin: "3", playersMax: "3" })).toEqual({});
  });

  it("allows one end of a range alone", () => {
    expect(validateNewGame(input({ playersMin: "2" })).ok).toBe(true);
  });

  it("reports several broken fields at once", () => {
    expect(errorsOf({ name: "", playersMin: "x", playTimeMax: "0" })).toEqual({
      name: "nameRequired",
      playersMin: "playersWhole",
      playTimeMax: "playTimeWhole",
    });
  });
});

describe("hasNameCharacter", () => {
  it("is false for only spaces and punctuation", () => {
    expect(hasNameCharacter(" -- ! ")).toBe(false);
    expect(hasNameCharacter("7 Wonders")).toBe(true);
  });
});

describe("toGameMatch", () => {
  it("maps a search row and turns missing owner names into an empty list", () => {
    expect(
      toGameMatch({
        id: 3,
        name: "Catan",
        cover_path: null,
        cover_tint: "#aabbcc",
        owner_names: null,
        mine: false,
        exact: true,
      }),
    ).toEqual({
      id: 3,
      name: "Catan",
      coverPath: null,
      coverTint: "#aabbcc",
      ownerNames: [],
      mine: false,
      exact: true,
    });
  });
});
