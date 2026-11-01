"use client";

import { Globe } from "lucide-react";
import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { hasLocale, localeCode, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export type LanguageOption = {
  locale: Locale;
  /** The language's name in its own script, for example "中文". */
  name: string;
  /** BCP 47 tag for the `lang` attribute. */
  lang: string;
};

type LanguageMenuProps = {
  current: Locale;
  /** Full accessible name, built on the server, for example "Language: English". */
  label: string;
  options: LanguageOption[];
};

const focusRing =
  "outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function LanguageMenu({ current, label, options }: LanguageMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const currentLang = options.find((o) => o.locale === current)?.lang;

  function choose(value: unknown) {
    if (!hasLocale(value) || value === current) return;
    // Read the query at choose time, so no useSearchParams (and no Suspense)
    // is needed. Items are not links: nothing is prefetched, and the cookie
    // only changes when the proxy sees the new prefixed path (spec 0005, AC-4).
    const href = `${pathname}${window.location.search}`;
    startTransition(() => router.replace(href, { locale: value }));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        lang={currentLang}
        className={cn(
          "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground data-popup-open:bg-accent data-popup-open:text-accent-foreground motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out",
          focusRing,
        )}
      >
        <Globe aria-hidden className="size-5" />
        <span aria-hidden>{localeCode[current]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-36">
        <DropdownMenuRadioGroup value={current} onValueChange={choose}>
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.locale}
              value={option.locale}
              lang={option.lang}
              closeOnClick
              className="min-h-11 px-3 text-base"
            >
              {option.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
