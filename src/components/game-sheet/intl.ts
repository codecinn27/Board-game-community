import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { type Locale } from "@/i18n/routing";

/**
 * Translations for the sheet's server components. A route reads the language
 * from the URL; a Server Action has no route, so it passes `locale` itself.
 */
export function sheetT<
  N extends "game" | "game.stats" | "game.owners" | "game.choices",
>(namespace: N, locale?: Locale) {
  return locale === undefined
    ? getTranslations(namespace)
    : getTranslations({ locale, namespace });
}

export function sheetFormat(locale?: Locale) {
  return locale === undefined ? getFormatter() : getFormatter({ locale });
}

/** The language as a plain string: the argument, else the one on the route. */
export async function sheetLocale(locale?: Locale): Promise<string> {
  return locale ?? (await getLocale());
}
