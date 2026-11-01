import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { type ShelfView } from "@/lib/games/shelf";
import { cn } from "@/lib/utils";

type ShelfSwitchProps = {
  view: ShelfView;
};

const focusRing =
  "outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function ShelfSwitch({ view }: ShelfSwitchProps) {
  const t = useTranslations("shelf.switch");
  const items = [
    { value: "all", href: "/shelf", label: t("all") },
    { value: "owner", href: "/shelf?view=owner", label: t("owner") },
  ] as const;

  return (
    <nav
      aria-label={t("label")}
      className="grid w-full grid-cols-2 gap-1 rounded-xl bg-muted p-1 md:w-75 md:self-center"
    >
      {items.map((item) => (
        <Link
          key={item.value}
          href={item.href}
          aria-current={view === item.value ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center justify-center rounded-lg px-3 text-sm text-muted-foreground",
            "aria-[current=page]:bg-card aria-[current=page]:font-semibold aria-[current=page]:text-foreground aria-[current=page]:shadow-sm",
            focusRing,
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
