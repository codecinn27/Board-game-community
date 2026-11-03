// Reads data/games.json and writes the SQL that loads it (spec 0009, AC-13 and
// AC-14). Pure and free of imports, so `scripts/seed-games.mjs` can run it with
// Node's own TypeScript support. The checks mirror the constraints on `games`.

export type GameInput = {
  name: string;
  description: string | null;
  playersMin: number | null;
  playersMax: number | null;
  playTimeMin: number | null;
  playTimeMax: number | null;
  coverTint: string | null;
  /** ISO timestamp, or null to keep the load time. */
  addedAt: string | null;
};

export type ParsedGames = { games: GameInput[]; problems: string[] };

const FIELDS = [
  "name",
  "description",
  "playersMin",
  "playersMax",
  "playTimeMin",
  "playTimeMax",
  "coverTint",
  "addedAt",
] as const;

const NAME_MAX = 200;
const DESCRIPTION_MAX = 4000;
const SMALLINT_MAX = 32767;
const TINT = /^#[0-9a-f]{6}$/;

function length(text: string): number {
  return Array.from(text).length;
}

/** The same idea as `games.name_normalized`: lowercase, no punctuation or spaces. */
function normalizedName(name: string): string {
  return name.toLowerCase().replace(/[\p{P}\p{S}\s]/gu, "");
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function wholeNumber(
  value: unknown,
  field: string,
  problems: string[],
): number | null {
  if (isBlank(value)) return null;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > SMALLINT_MAX
  ) {
    problems.push(
      `${field} must be a whole number from 1 to ${SMALLINT_MAX}, got ${JSON.stringify(value)}`,
    );
    return null;
  }
  return value;
}

/** Checks one list entry. Returns the game, or null with problems pushed. */
function parseGame(
  entry: unknown,
  position: number,
  problems: string[],
): GameInput | null {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    problems.push(`Game ${position}: must be an object`);
    return null;
  }
  const row = entry as Record<string, unknown>;
  const mine: string[] = [];

  for (const key of Object.keys(row)) {
    if (!(FIELDS as readonly string[]).includes(key)) {
      mine.push(`unknown field "${key}" (fields are ${FIELDS.join(", ")})`);
    }
  }

  let name = "";
  if (typeof row.name !== "string" || row.name.trim() === "") {
    mine.push("name is required");
  } else {
    name = row.name.trim();
    if (length(name) > NAME_MAX) {
      mine.push(`name must be at most ${NAME_MAX} characters`);
    }
  }

  let description: string | null = null;
  if (!isBlank(row.description)) {
    if (typeof row.description !== "string") {
      mine.push("description must be text");
    } else if (length(row.description) > DESCRIPTION_MAX) {
      mine.push(`description must be at most ${DESCRIPTION_MAX} characters`);
    } else {
      description = row.description;
    }
  }

  const playersMin = wholeNumber(row.playersMin, "playersMin", mine);
  const playersMax = wholeNumber(row.playersMax, "playersMax", mine);
  const playTimeMin = wholeNumber(row.playTimeMin, "playTimeMin", mine);
  const playTimeMax = wholeNumber(row.playTimeMax, "playTimeMax", mine);
  if (playersMin !== null && playersMax !== null && playersMin > playersMax) {
    mine.push(`playersMin (${playersMin}) is above playersMax (${playersMax})`);
  }
  if (
    playTimeMin !== null &&
    playTimeMax !== null &&
    playTimeMin > playTimeMax
  ) {
    mine.push(
      `playTimeMin (${playTimeMin}) is above playTimeMax (${playTimeMax})`,
    );
  }

  let coverTint: string | null = null;
  if (!isBlank(row.coverTint)) {
    if (typeof row.coverTint !== "string" || !TINT.test(row.coverTint)) {
      mine.push(
        `coverTint must be a lowercase #rrggbb color or empty, got ${JSON.stringify(row.coverTint)}`,
      );
    } else {
      coverTint = row.coverTint;
    }
  }

  let addedAt: string | null = null;
  if (!isBlank(row.addedAt)) {
    const time =
      typeof row.addedAt === "string" ? new Date(row.addedAt) : new Date(NaN);
    if (Number.isNaN(time.getTime())) {
      mine.push(
        `addedAt must be a real date such as 2026-11-04, got ${JSON.stringify(row.addedAt)}`,
      );
    } else {
      addedAt = time.toISOString();
    }
  }

  if (mine.length > 0) {
    const label = name === "" ? "" : ` ("${name}")`;
    for (const message of mine) {
      problems.push(`Game ${position}${label}: ${message}`);
    }
    return null;
  }
  return {
    name,
    description,
    playersMin,
    playersMax,
    playTimeMin,
    playTimeMax,
    coverTint,
    addedAt,
  };
}

/** Checks the whole file. Every problem is listed, with the game's position and name. */
export function parseGamesFile(value: unknown): ParsedGames {
  if (!Array.isArray(value)) {
    return {
      games: [],
      problems: ["The file must be a list of games, like [ { ... }, { ... } ]"],
    };
  }

  const problems: string[] = [];
  const games: GameInput[] = [];
  const seen = new Map<string, number>();
  value.forEach((entry: unknown, index: number) => {
    const position = index + 1;
    const game = parseGame(entry, position, problems);
    if (game === null) return;
    const key = normalizedName(game.name);
    const first = seen.get(key);
    if (first !== undefined) {
      problems.push(
        `Game ${position} ("${game.name}"): has the same name as game ${first} once spaces, punctuation, and capitals are ignored`,
      );
      return;
    }
    seen.set(key, position);
    games.push(game);
  });
  return { games, problems };
}

function text(value: string | null): string {
  return value === null ? "null" : `'${value.replace(/'/g, "''")}'`;
}

function number(value: number | null): string {
  return value === null ? "null" : String(value);
}

/** The key `games.name_normalized` stores, written as SQL. */
const NORMALIZED = (name: string) =>
  `regexp_replace(lower(${text(name)}), '[[:punct:][:space:]]', '', 'g')`;

function gameSql(game: GameInput, position: number): string {
  const when = game.addedAt === null ? "null" : `${text(game.addedAt)}`;
  return [
    `-- ${position}. ${game.name.replace(/[\r\n]+/g, " ")}`,
    `with updated as (`,
    `  update public.games set`,
    `    name = ${text(game.name)},`,
    `    description = ${text(game.description)},`,
    `    players_min = ${number(game.playersMin)},`,
    `    players_max = ${number(game.playersMax)},`,
    `    play_time_min = ${number(game.playTimeMin)},`,
    `    play_time_max = ${number(game.playTimeMax)},`,
    `    cover_tint = ${text(game.coverTint)},`,
    `    created_at = coalesce(${when}::timestamptz, created_at)`,
    `  where name_normalized = ${NORMALIZED(game.name)}`,
    `  returning id`,
    `)`,
    `insert into public.games (name, description, players_min, players_max, play_time_min, play_time_max, cover_tint, created_at)`,
    `select ${text(game.name)}, ${text(game.description)}, ${number(game.playersMin)}, ${number(game.playersMax)}, ${number(game.playTimeMin)}, ${number(game.playTimeMax)}, ${text(game.coverTint)}, coalesce(${when}::timestamptz, now())`,
    `where not exists (select 1 from updated);`,
  ].join("\n");
}

/**
 * The SQL that loads the games. A game is matched by its normalized name, then
 * updated if found and inserted if not, so running it twice never duplicates.
 * It makes no owners, ratings, or members, and sets no `added_by`.
 */
export function toGamesSql(games: GameInput[]): string {
  const header = [
    "-- Generated by `pnpm seed:games` from data/games.json. Do not edit by hand.",
    "-- Safe to run again: a game is matched by its normalized name, updated if found, inserted if not.",
    "-- Run it in the Supabase SQL editor, or locally with `supabase db query -f supabase/games-data.sql`.",
  ];
  if (games.length === 0) {
    return [
      ...header,
      "-- data/games.json has no games yet, so there is nothing to load.",
      "",
    ].join("\n");
  }
  return [
    ...header,
    "begin;",
    "",
    games.map((game, index) => gameSql(game, index + 1)).join("\n\n"),
    "",
    "commit;",
    "",
  ].join("\n");
}
