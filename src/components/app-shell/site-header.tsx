import { Dices } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { hasLocale, htmlLang, routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { LanguageMenu, type LanguageOption } from "./language-menu";
import { NavLink } from "./nav-link";
import { type ShellTab } from "./shell-tabs";

type SiteHeaderProps = {
  /** Already filtered by the 2 tab rule; empty hides the inline links. */
  tabs: ShellTab[];
  /** `static` drops the sticky positioning, for the `/design` preview. */
  position?: "sticky" | "static";
  /** Overrides the real path, for the `/design` preview. */
  pathname?: string;
};

export async function SiteHeader({
  tabs,
  position = "sticky",
  pathname,
}: SiteHeaderProps) {
  const [t, tLanguage, locale] = await Promise.all([
    getTranslations("shell"),
    getTranslations("common.language"),
    getLocale(),
  ]);
  const current = hasLocale(locale) ? locale : routing.defaultLocale;
  const options: LanguageOption[] = routing.locales.map((value) => ({
    locale: value,
    name: tLanguage(`names.${value}`),
    lang: htmlLang[value],
  }));
  const label = tLanguage("label", { name: tLanguage(`names.${current}`) });

  return (
    <header
      className={cn(
        "z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75",
        position === "sticky" && "sticky top-0",
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href="/"
          className="-ml-2 inline-flex min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-lg px-2 text-lg font-semibold tracking-tight whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Dices aria-hidden className="size-6 text-primary" />
          <span>{t("brand")}</span>
        </Link>

        <div className="flex items-center gap-1">
          {tabs.length > 0 ? (
            <nav aria-label={t("nav.label")} className="hidden md:block">
              <ul className="flex items-center gap-1">
                {tabs.map((tab) => (
                  <li key={tab.key}>
                    <NavLink
                      href={tab.href}
                      icon={tab.icon}
                      label={tab.label}
                      variant={tab.raised ? "action" : "inline"}
                      pathname={pathname}
                    />
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <LanguageMenu current={current} label={label} options={options} />
        </div>
      </div>
    </header>
  );
}
