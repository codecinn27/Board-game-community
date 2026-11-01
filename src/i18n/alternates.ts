import { type Metadata } from "next";
import { getLocale } from "next-intl/server";
import { requireEnv } from "@/lib/supabase/env";
import { hasLocale, htmlLang, routing, type Locale } from "./routing";

type Alternates = NonNullable<Metadata["alternates"]>;

function localeUrl(site: string, locale: Locale, path: string): string {
  const base = site.replace(/\/+$/, "");
  return `${base}/${locale}${path === "/" ? "" : path}`;
}

/**
 * Pure part of getAlternates: canonical is the current language's URL, and the
 * language map is the same on both twins, with x-default on English.
 */
export function buildAlternates(
  site: string,
  locale: Locale,
  path: string,
): Alternates {
  const languages: Record<string, string> = {};
  for (const value of routing.locales) {
    languages[htmlLang[value]] = localeUrl(site, value, path);
  }
  languages["x-default"] = localeUrl(site, routing.defaultLocale, path);
  return { canonical: localeUrl(site, locale, path), languages };
}

/**
 * Canonical and hreflang links for one page (spec 0005, AC-7). `path` has no
 * language prefix and no query (`/`, `/games/12`); dynamic segments are
 * already URL encoded. Call it from each page's metadata, never a layout.
 */
export async function getAlternates(path: string): Promise<Alternates> {
  const site = requireEnv(
    process.env.NEXT_PUBLIC_SITE_URL,
    "NEXT_PUBLIC_SITE_URL",
  );
  const locale = await getLocale();
  return buildAlternates(
    site,
    hasLocale(locale) ? locale : routing.defaultLocale,
    path,
  );
}
