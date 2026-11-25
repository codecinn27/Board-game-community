// Which language of a game's text to show (spec 0013, AC-24). Pure, so the
// server reads, the client, and tests all share it.

/**
 * `/zh` pages show the Chinese text when it exists (not blank), otherwise the
 * English text. Every other locale always shows the English text.
 */
export function localized<T extends string | null>(
  text: T,
  textZh: string | null | undefined,
  locale: string,
): T | string {
  if (locale === "zh" && textZh && textZh.trim() !== "") return textZh;
  return text;
}
