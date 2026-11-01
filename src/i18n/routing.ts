import { hasLocale as hasLocaleIn } from "next-intl";
import { defineRouting } from "next-intl/routing";

// The one source of language facts (spec 0005).
export const routing = defineRouting({
  locales: ["en", "zh"],
  defaultLocale: "en",
  localePrefix: "always",
  localeDetection: true,
  // next-intl 4 defaults to a session cookie, which forgets the choice when the
  // browser closes. One year keeps it.
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
  // hreflang comes from page metadata only (getAlternates), so one source.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];

/** BCP 47 tags for `<html lang>`, hreflang keys, and menu item `lang`. */
export const htmlLang: Record<Locale, string> = {
  en: "en",
  zh: "zh-Hans",
};

/** The short code on the language menu button (spec 0005, AC-3). */
export const localeCode: Record<Locale, string> = {
  en: "EN",
  zh: "中",
};

export function hasLocale(value: unknown): value is Locale {
  return hasLocaleIn(routing.locales, value);
}
