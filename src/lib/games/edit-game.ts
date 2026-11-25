// The rules for the review editor, shared by the editor and the `saveGame`
// action (spec 0013 amendment, AC-17 and AC-19). The English fields follow the
// Add form rules in `new-game.ts`; the Chinese fields are optional.

import { type EditorCategory } from "./categories";
import {
  DESCRIPTION_MAX,
  NAME_MAX,
  hasNameCharacter,
  validateNewGame,
  type NewGame,
  type NewGameErrorCode,
  type NewGameFieldKey,
} from "./new-game";

export type EditGameFieldKey = NewGameFieldKey | "nameZh" | "descriptionZh";

export type EditGameErrorCode =
  NewGameErrorCode | "nameZhLong" | "nameZhSymbols" | "descriptionZhLong";

export type EditGameErrors = Partial<
  Record<EditGameFieldKey, EditGameErrorCode>
>;

/** What the editor holds: every text field as typed. */
export type EditGameInput = Record<EditGameFieldKey, string>;

export type EditGame = NewGame & {
  nameZh: string | null;
  descriptionZh: string | null;
};

export type EditGameCheck =
  { ok: true; value: EditGame } | { ok: false; errors: EditGameErrors };

function length(text: string): number {
  return Array.from(text).length;
}

export function validateEditGame(input: EditGameInput): EditGameCheck {
  const base = validateNewGame({
    name: input.name,
    playersMin: input.playersMin,
    playersMax: input.playersMax,
    playTimeMin: input.playTimeMin,
    playTimeMax: input.playTimeMax,
    description: input.description,
  });
  const errors: EditGameErrors = base.ok ? {} : { ...base.errors };

  const nameZh = input.nameZh.trim();
  if (nameZh !== "") {
    if (length(nameZh) > NAME_MAX) errors.nameZh = "nameZhLong";
    else if (!hasNameCharacter(nameZh)) errors.nameZh = "nameZhSymbols";
  }

  const descriptionZh = input.descriptionZh.trim();
  if (length(descriptionZh) > DESCRIPTION_MAX) {
    errors.descriptionZh = "descriptionZhLong";
  }

  if (!base.ok || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      ...base.value,
      nameZh: nameZh === "" ? null : nameZh,
      descriptionZh: descriptionZh === "" ? null : descriptionZh,
    },
  };
}

/** A member the owners picker can show. */
export type EditorMember = { id: string; name: string; disabled: boolean };

/** The choices the editor offers: every category and every pickable member. */
export type EditorLists = {
  categories: readonly EditorCategory[];
  members: readonly EditorMember[];
};

/** The saved values the editor opens with (client safe, unlike `ReviewRow`). */
export type EditorGame = {
  id: number;
  name: string;
  nameZh: string | null;
  description: string | null;
  descriptionZh: string | null;
  playersMin: number | null;
  playersMax: number | null;
  playTimeMin: number | null;
  playTimeMax: number | null;
  coverPath: string | null;
  coverTint: string | null;
  categoryIds: number[];
  owners: EditorMember[];
};

const text = (value: string | number | null): string =>
  value === null ? "" : String(value);

/** Saved values as the editor fields hold them: a missing value is "". */
export function toEditInput(game: EditorGame): EditGameInput {
  return {
    name: game.name,
    nameZh: text(game.nameZh),
    description: text(game.description),
    descriptionZh: text(game.descriptionZh),
    playersMin: text(game.playersMin),
    playersMax: text(game.playersMax),
    playTimeMin: text(game.playTimeMin),
    playTimeMax: text(game.playTimeMax),
  };
}

export type EditTab = "en" | "zh";

const ZH_FIELDS: readonly EditGameFieldKey[] = ["nameZh", "descriptionZh"];
const EN_FIELDS: readonly EditGameFieldKey[] = ["name", "description"];

/**
 * Which language tab to show after a failed check (AC-17): stay on the current
 * tab when it holds an error, else move to the one that does. Fields outside the
 * tabs (players, minutes) never move it.
 */
export function tabForErrors(
  errors: EditGameErrors,
  current: EditTab,
): EditTab {
  const has = (keys: readonly EditGameFieldKey[]) =>
    keys.some((key) => errors[key] !== undefined);
  const enHas = has(EN_FIELDS);
  const zhHas = has(ZH_FIELDS);
  if (current === "en" && enHas) return "en";
  if (current === "zh" && zhHas) return "zh";
  if (enHas) return "en";
  if (zhHas) return "zh";
  return current;
}

export type CoverChange = "keep" | "replace" | "remove";

/** Everything the editor can change, for the unsaved changes check. */
export type EditSnapshot = {
  fields: EditGameInput;
  categoryIds: readonly number[];
  ownerIds: readonly string[];
  cover: CoverChange;
};

function sameSet<T extends number | string>(a: readonly T[], b: readonly T[]) {
  if (new Set(a).size !== new Set(b).size) return false;
  const set = new Set(a);
  return b.every((item) => set.has(item));
}

/**
 * True when the editor holds something the saved game does not. Text is
 * compared trimmed (a blank field and a missing value match), the id lists
 * without order, and any cover change counts.
 */
export function isEditDirty(
  initial: EditSnapshot,
  current: EditSnapshot,
): boolean {
  if (current.cover !== "keep") return true;
  const keys = Object.keys(initial.fields) as EditGameFieldKey[];
  if (
    keys.some(
      (key) => initial.fields[key].trim() !== current.fields[key].trim(),
    )
  ) {
    return true;
  }
  return (
    !sameSet(initial.categoryIds, current.categoryIds) ||
    !sameSet(initial.ownerIds, current.ownerIds)
  );
}
