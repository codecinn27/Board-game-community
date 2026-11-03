import { describe, expect, it } from "vitest";
import { parseGamesFile, toGamesSql } from "./games-file";

// Spec 0009, AC-13 and AC-14.

const good = {
  name: "  Wingspan ",
  description: "Birds.",
  playersMin: 1,
  playersMax: 5,
  playTimeMin: 40,
  playTimeMax: 70,
  coverTint: "#f3ead2",
  addedAt: "2026-11-04",
};

describe("parseGamesFile", () => {
  // covers: AC-13
  it("accepts a full game and trims the name", () => {
    const { games, problems } = parseGamesFile([good]);

    expect(problems).toEqual([]);
    expect(games).toEqual([
      {
        name: "Wingspan",
        description: "Birds.",
        playersMin: 1,
        playersMax: 5,
        playTimeMin: 40,
        playTimeMax: 70,
        coverTint: "#f3ead2",
        addedAt: "2026-11-04T00:00:00.000Z",
      },
    ]);
  });

  // covers: AC-13
  it("needs only a name; everything else may be missing, empty, or null", () => {
    const { games, problems } = parseGamesFile([
      { name: "Just One" },
      { name: "Dixit", description: "", coverTint: "", playersMin: null },
    ]);

    expect(problems).toEqual([]);
    expect(games[0]).toMatchObject({
      description: null,
      playersMin: null,
      coverTint: null,
      addedAt: null,
    });
    expect(games[1]).toMatchObject({ description: null, coverTint: null });
  });

  // covers: AC-13
  it("accepts an empty list and Chinese text", () => {
    expect(parseGamesFile([])).toEqual({ games: [], problems: [] });
    expect(
      parseGamesFile([{ name: "三国杀", description: "身份推理。" }]).problems,
    ).toEqual([]);
  });

  // covers: AC-13
  it("lists every problem with the game's position and name before anything is written", () => {
    const { games, problems } = parseGamesFile([
      good,
      { name: "Bad tint", coverTint: "#ABCDEF" },
      { name: "", playersMin: 3 },
      {
        name: "Backwards",
        playersMin: 5,
        playersMax: 2,
        playTimeMin: 90,
        playTimeMax: 30,
      },
      { name: "Zero", playersMin: 0 },
      { name: "Fraction", playTimeMax: 1.5 },
      { name: "Date", addedAt: "last week" },
      { name: "Typo", descripton: "x" },
      "not an object",
    ]);

    expect(games).toHaveLength(1);
    expect(problems).toEqual([
      'Game 2 ("Bad tint"): coverTint must be a lowercase #rrggbb color or empty, got "#ABCDEF"',
      "Game 3: name is required",
      'Game 4 ("Backwards"): playersMin (5) is above playersMax (2)',
      'Game 4 ("Backwards"): playTimeMin (90) is above playTimeMax (30)',
      'Game 5 ("Zero"): playersMin must be a whole number from 1 to 32767, got 0',
      'Game 6 ("Fraction"): playTimeMax must be a whole number from 1 to 32767, got 1.5',
      'Game 7 ("Date"): addedAt must be a real date such as 2026-11-04, got "last week"',
      'Game 8 ("Typo"): unknown field "descripton" (fields are name, description, playersMin, playersMax, playTimeMin, playTimeMax, coverTint, addedAt)',
      "Game 9: must be an object",
    ]);
  });

  // covers: AC-13
  it.each([["#fff"], ["red"], ["#12345g"], [" #f3ead2"], ["f3ead2"]])(
    "rejects the tint %j",
    (coverTint) => {
      expect(parseGamesFile([{ name: "X", coverTint }]).problems).toHaveLength(
        1,
      );
    },
  );

  // covers: AC-13
  it("enforces the length limits in characters, not bytes", () => {
    expect(parseGamesFile([{ name: "三".repeat(200) }]).problems).toEqual([]);
    expect(parseGamesFile([{ name: "三".repeat(201) }]).problems).toHaveLength(
      1,
    );
    expect(
      parseGamesFile([{ name: "X", description: "三".repeat(4000) }]).problems,
    ).toEqual([]);
    expect(
      parseGamesFile([{ name: "X", description: "三".repeat(4001) }]).problems,
    ).toHaveLength(1);
  });

  // covers: AC-13, AC-14
  it("rejects two games the database would treat as one", () => {
    const { games, problems } = parseGamesFile([
      { name: "Ticket to Ride" },
      { name: "ticket-to ride!" },
    ]);

    expect(games).toHaveLength(1);
    expect(problems).toEqual([
      'Game 2 ("ticket-to ride!"): has the same name as game 1 once spaces, punctuation, and capitals are ignored',
    ]);
  });

  // covers: AC-13
  it("needs a list at the top", () => {
    expect(parseGamesFile({ name: "X" }).problems).toHaveLength(1);
    expect(parseGamesFile(null).problems).toHaveLength(1);
  });
});

describe("toGamesSql", () => {
  const sql = toGamesSql(
    parseGamesFile([good, { name: "O'Brien's 三国杀" }]).games,
  );

  // covers: AC-14
  it("runs in one transaction", () => {
    expect(sql).toMatch(/^begin;$/m);
    expect(sql.trimEnd().endsWith("commit;")).toBe(true);
  });

  // covers: AC-14
  it("matches by the same expression as games.name_normalized, updates if found, inserts if not", () => {
    expect(sql).toContain(
      "where name_normalized = regexp_replace(lower('Wingspan'), '[[:punct:][:space:]]', '', 'g')",
    );
    expect(sql).toContain("update public.games set");
    expect(sql).toContain("where not exists (select 1 from updated);");
    expect(sql.match(/insert into public\.games/g)).toHaveLength(2);
  });

  // covers: AC-14
  it("escapes quotes and keeps Chinese text", () => {
    expect(sql).toContain("'O''Brien''s 三国杀'");
  });

  // covers: AC-14
  it("keeps the existing date when a game has none, and uses nothing but plain game columns", () => {
    expect(sql).toContain(
      "created_at = coalesce('2026-11-04T00:00:00.000Z'::timestamptz, created_at)",
    );
    expect(sql).toContain(
      "created_at = coalesce(null::timestamptz, created_at)",
    );
    expect(sql).not.toMatch(/added_by|game_owners|ratings|auth\./);
  });

  // covers: AC-14
  it("is only a comment for an empty list", () => {
    const empty = toGamesSql([]);
    expect(empty).not.toMatch(/^begin;$|insert into/m);
    expect(empty).toContain("nothing to load");
  });
});
