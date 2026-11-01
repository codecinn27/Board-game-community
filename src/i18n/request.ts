import { locale as rootLocale } from "next/root-params";
import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import en from "../../messages/en.json";
import zh from "../../messages/zh.json";
import { deepMerge, missingKeys } from "./merge-messages";
import { hasLocale, type Locale } from "./routing";

// English underneath, Chinese on top, so a missing Chinese key shows the full
// English message (spec 0005, AC-12).
const messages: Record<Locale, typeof en> = {
  en,
  zh: deepMerge(en, zh),
};

if (process.env.NODE_ENV === "development") {
  const missing = missingKeys(en, zh);
  if (missing.length > 0) {
    console.warn(`[i18n] Missing in messages/zh.json: ${missing.join(", ")}`);
  }
}

// The locale comes from the `[locale]` segment via next/root-params, never from
// cookies or headers, so every page stays prerendered (spec 0005, AC-6).
export default getRequestConfig(async ({ locale: override }) => {
  const locale = override ?? (await rootLocale());
  if (!hasLocale(locale)) notFound();

  return {
    locale,
    messages: messages[locale],
    timeZone: "Asia/Kuala_Lumpur",
    onError(error) {
      console.error(error);
    },
  };
});
