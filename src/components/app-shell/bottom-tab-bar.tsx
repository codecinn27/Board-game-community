import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { NavLink } from "./nav-link";
import { type ShellTab } from "./shell-tabs";

type BottomTabBarProps = {
  /** Already filtered by the 2 tab rule; empty renders nothing. */
  tabs: ShellTab[];
  /**
   * `fixed` (default) pins it to the bottom on phones and hides it from `md`.
   * `static` shows it inline at every width, for the `/design` preview.
   */
  position?: "fixed" | "static";
  /** Overrides the real path, for the `/design` preview. */
  pathname?: string;
};

export async function BottomTabBar({
  tabs,
  position = "fixed",
  pathname,
}: BottomTabBarProps) {
  if (tabs.length === 0) return null;
  const t = await getTranslations("shell.nav");

  return (
    <nav
      aria-label={t("label")}
      className={cn(
        "border-t bg-card pb-[env(safe-area-inset-bottom)] shadow-sm",
        position === "fixed" && "fixed inset-x-0 bottom-0 z-40 md:hidden",
      )}
    >
      <ul className="mx-auto flex h-16 max-w-xl items-stretch gap-1 px-2">
        {tabs.map((tab) => (
          <li key={tab.key} className="flex flex-1">
            <NavLink
              href={tab.href}
              icon={tab.icon}
              label={tab.label}
              variant={tab.raised ? "raised" : "tab"}
              pathname={pathname}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
