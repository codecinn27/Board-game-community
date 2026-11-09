import "server-only";

import { redirect } from "@/i18n/navigation";
import { hasLocale, routing, type Locale } from "@/i18n/routing";
import { requireEnv } from "@/lib/supabase/env";
import { safeNext } from "./safe-next";
import { field } from "./validation";

/** A Server Action has no route, so the locale arrives as a form field. */
export function localeOf(data: FormData): Locale {
  const value = field(data, "locale");
  return hasLocale(value) ? value : routing.defaultLocale;
}

/** `next` from a form field, always through `safeNext`. */
export function nextOf(data: FormData): string {
  return safeNext(field(data, "next"));
}

export function siteUrl(): string {
  return requireEnv(
    process.env.NEXT_PUBLIC_SITE_URL,
    "NEXT_PUBLIC_SITE_URL",
  ).replace(/\/+$/, "");
}

/** The link the reset email sends the person back to. */
export function authLink(
  route: "confirm",
  locale: Locale,
  next: string,
): string {
  const params = new URLSearchParams({ next: safeNext(next), locale });
  return `${siteUrl()}/auth/${route}?${params.toString()}`;
}

/** Sends the person to a page on this site, in their language. */
export function goTo(
  locale: Locale,
  pathname: string,
  query?: Record<string, string>,
): never {
  return redirect({ href: query ? { pathname, query } : pathname, locale });
}
