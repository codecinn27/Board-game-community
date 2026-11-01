import { type Metadata, type Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { locale as rootLocale } from "next/root-params";
import { notFound } from "next/navigation";
import { getMessages, getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell/app-shell";
import { IntlClientProvider } from "@/i18n/intl-client-provider";
import { hasLocale, htmlLang, routing } from "@/i18n/routing";
import { themeColors } from "@/lib/design/theme-color";
import { requireEnv } from "@/lib/supabase/env";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// `dynamicParams = false` is not allowed with cacheComponents; the hasLocale
// guard below sends any other value to the 404 instead.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// No `alternates` here: each page sets its own through getAlternates, so a
// page that forgets cannot inherit the home page's canonical (spec 0005).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shell");
  return {
    metadataBase: new URL(
      requireEnv(process.env.NEXT_PUBLIC_SITE_URL, "NEXT_PUBLIC_SITE_URL"),
    ),
    title: { default: t("brand"), template: t("meta.titleTemplate") },
    description: t("meta.description"),
  };
}

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: themeColors.light },
    { media: "(prefers-color-scheme: dark)", color: themeColors.dark },
  ],
};

export default async function RootLayout({
  children,
}: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!hasLocale(locale)) notFound();
  const messages = await getMessages();

  return (
    <html
      lang={htmlLang[locale]}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Locale and time zone flow through. Only `common.time` (for
            LocalTime, used anywhere) ships to the browser here; other client
            components pick their own namespace, never the whole file. */}
        <IntlClientProvider
          messages={{ common: { time: messages.common.time } }}
        >
          {/* "guest" until feature 6 (Member accounts) reads the session. */}
          <AppShell viewer="guest">{children}</AppShell>
        </IntlClientProvider>
      </body>
    </html>
  );
}
