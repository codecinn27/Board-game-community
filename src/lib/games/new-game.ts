// The rules for a new game, shared by the Add form and the `addGame` action
// (spec 0013, AC-4). Hand written, like `src/lib/auth/validation.ts`.

export const NAME_MAX = 200;
export const DESCRIPTION_MAX = 4000;
export const PLAYERS_LIMIT = 99;
export const PLAY_TIME_LIMIT = 1440;

export type NewGameFieldKey =
  | "name"
  | "playersMin"
  | "playersMax"
  | "playTimeMin"
  | "playTimeMax"
  | "description";

export type NewGameErrorCode =
  | "nameRequired"
  | "nameLong"
  | "nameSymbols"
  | "playersWhole"
  | "playTimeWhole"
  | "playersOrder"
  | "playTimeOrder"
  | "descriptionLong";

export type NewGameErrors = Partial<Record<NewGameFieldKey, NewGameErrorCode>>;

/** What the form holds: every field as typed. */
export type NewGameInput = Record<NewGameFieldKey, string>;

export type NewGame = {
  name: string;
  playersMin: number | null;
  playersMax: number | null;
  playTimeMin: number | null;
  playTimeMax: number | null;
  description: string | null;
};

export const emptyNewGame: NewGameInput = {
  name: "",
  playersMin: "",
  playersMax: "",
  playTimeMin: "",
  playTimeMax: "",
  description: "",
};

export type NewGameCheck =
  { ok: true; value: NewGame } | { ok: false; errors: NewGameErrors };

/** A game found by name: the shape of a search result and of an `exists` answer. */
export type GameMatch = {
  id: number;
  name: string;
  /** Shown instead of `name` on `/zh` pages when it exists (spec 0013, AC-24). */
  nameZh: string | null;
  coverPath: string | null;
  coverTint: string | null;
  ownerNames: string[];
  mine: boolean;
  exact: boolean;
};

/**
 * True when the text has at least one letter, digit, or other character that is
 * not a space or punctuation. The database repeats this rule (`add_game` raises
 * `22023`); this one only gives the member an early message.
 */
export function hasNameCharacter(text: string): boolean {
  return /[^\p{P}\p{S}\p{Z}\s]/u.test(text);
}

function length(text: string): number {
  return Array.from(text).length;
}

/** A blank value is null; a whole number in range is a number; else "bad". */
function whole(raw: string, max: number): number | null | "bad" {
  const text = raw.trim();
  if (text === "") return null;
  if (!/^[0-9]{1,6}$/.test(text)) return "bad";
  const value = Number(text);
  return value >= 1 && value <= max ? value : "bad";
}

export function validateNewGame(input: NewGameInput): NewGameCheck {
  const errors: NewGameErrors = {};

  const name = input.name.trim();
  if (name === "") errors.name = "nameRequired";
  else if (length(name) > NAME_MAX) errors.name = "nameLong";
  else if (!hasNameCharacter(name)) errors.name = "nameSymbols";

  const playersMin = whole(input.playersMin, PLAYERS_LIMIT);
  const playersMax = whole(input.playersMax, PLAYERS_LIMIT);
  if (playersMin === "bad") errors.playersMin = "playersWhole";
  if (playersMax === "bad") errors.playersMax = "playersWhole";
  if (
    typeof playersMin === "number" &&
    typeof playersMax === "number" &&
    playersMin > playersMax
  ) {
    errors.playersMax = "playersOrder";
  }

  const playTimeMin = whole(input.playTimeMin, PLAY_TIME_LIMIT);
  const playTimeMax = whole(input.playTimeMax, PLAY_TIME_LIMIT);
  if (playTimeMin === "bad") errors.playTimeMin = "playTimeWhole";
  if (playTimeMax === "bad") errors.playTimeMax = "playTimeWhole";
  if (
    typeof playTimeMin === "number" &&
    typeof playTimeMax === "number" &&
    playTimeMin > playTimeMax
  ) {
    errors.playTimeMax = "playTimeOrder";
  }

  const description = input.description.trim();
  if (length(description) > DESCRIPTION_MAX) {
    errors.description = "descriptionLong";
  }

  if (
    Object.keys(errors).length > 0 ||
    playersMin === "bad" ||
    playersMax === "bad" ||
    playTimeMin === "bad" ||
    playTimeMax === "bad"
  ) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      name,
      playersMin,
      playersMax,
      playTimeMin,
      playTimeMax,
      description: description === "" ? null : description,
    },
  };
}

/** The ranked rows `search_games` returns, as the app uses them. */
export type SearchRow = {
  id: number;
  name: string;
  name_zh?: string | null;
  cover_path: string | null;
  cover_tint: string | null;
  owner_names: string[] | null;
  mine: boolean;
  exact: boolean;
};

export function toGameMatch(row: SearchRow): GameMatch {
  return {
    id: row.id,
    name: row.name,
    nameZh: row.name_zh ?? null,
    coverPath: row.cover_path,
    coverTint: row.cover_tint,
    ownerNames: row.owner_names ?? [],
    mine: row.mine,
    exact: row.exact,
  };
}
