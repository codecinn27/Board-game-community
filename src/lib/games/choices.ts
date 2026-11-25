// The fixed feel, theme, and mechanic choices the editor shows (spec 0014).
// Pure, so it runs in the browser, on the server, and in tests.

export type EditorChoice = {
  id: number;
  slug: string;
  nameEn: string;
  nameZh: string;
  descriptionEn?: string | null;
  descriptionZh?: string | null;
};

/** The label to show: Chinese on `/zh`, English everywhere else. */
export function choiceLabel(
  choice: Pick<EditorChoice, "nameEn" | "nameZh">,
  locale: string,
): string {
  return locale === "zh" && choice.nameZh.trim() !== ""
    ? choice.nameZh
    : choice.nameEn;
}

/** The hint to show, with the same Chinese then English fallback; null when none. */
export function choiceHint(
  choice: Pick<EditorChoice, "descriptionEn" | "descriptionZh">,
  locale: string,
): string | null {
  const zh = choice.descriptionZh?.trim() ?? "";
  const en = choice.descriptionEn?.trim() ?? "";
  if (locale === "zh" && zh !== "") return zh;
  return en === "" ? null : en;
}
