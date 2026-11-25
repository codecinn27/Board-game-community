// Category rules shared by the editor and the `createCategory` action (spec 0013
// amendment, AC-25). Pure, so it runs in the browser, on the server, and in tests.

import { hasNameCharacter } from "./new-game";

export const CATEGORY_NAME_MAX = 60;

export type EditorCategory = {
  id: number;
  slug: string;
  nameEn: string;
  nameZh: string;
};

/** The label to show: Chinese on `/zh`, English everywhere else. */
export function categoryLabel(
  category: Pick<EditorCategory, "nameEn" | "nameZh">,
  locale: string,
): string {
  return locale === "zh" && category.nameZh.trim() !== ""
    ? category.nameZh
    : category.nameEn;
}

export type CategoryErrorCode = "required" | "long" | "symbols";
export type CategoryErrors = Partial<
  Record<"nameEn" | "nameZh", CategoryErrorCode>
>;

export type CategoryCheck =
  | { ok: true; value: { nameEn: string; nameZh: string } }
  | { ok: false; errors: CategoryErrors };

function check(raw: string): CategoryErrorCode | null {
  const text = raw.trim();
  if (text === "") return "required";
  if (Array.from(text).length > CATEGORY_NAME_MAX) return "long";
  if (!hasNameCharacter(text)) return "symbols";
  return null;
}

/** Both labels are required (AC-25), each 1 to 60 characters. */
export function validateCategory(input: {
  nameEn: string;
  nameZh: string;
}): CategoryCheck {
  const errors: CategoryErrors = {};
  const en = check(input.nameEn);
  const zh = check(input.nameZh);
  if (en) errors.nameEn = en;
  if (zh) errors.nameZh = zh;
  if (en || zh) return { ok: false, errors };
  return {
    ok: true,
    value: { nameEn: input.nameEn.trim(), nameZh: input.nameZh.trim() },
  };
}

/**
 * A URL friendly id from the English label: lowercase letters and digits joined
 * by single dashes. Null when nothing is left (the caller adds its own suffix).
 */
export function slugify(name: string): string | null {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");
  return slug === "" ? null : slug;
}
