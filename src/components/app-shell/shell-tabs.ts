import "server-only";

import { getTranslations } from "next-intl/server";
import {
  MIN_TABS_FOR_NAV,
  navItems,
  visibleTabs,
  type NavIcon,
  type NavItem,
  type NavKey,
  type Viewer,
} from "@/lib/app-shell/nav";

/** A visible tab with its label already translated on the server. */
export type ShellTab = {
  key: NavKey;
  href: string;
  icon: NavIcon;
  label: string;
  raised: boolean;
};

/**
 * The viewer's tabs, translated. Empty when fewer than 2 are visible, so the
 * bottom bar and the inline links render only when there is a real choice.
 */
export async function getShellTabs(
  viewer: Viewer,
  items: readonly NavItem[] = navItems,
): Promise<ShellTab[]> {
  const t = await getTranslations("shell.tabs");
  const tabs = visibleTabs(viewer, items);
  if (tabs.length < MIN_TABS_FOR_NAV) return [];
  return tabs.map((item) => ({
    key: item.key,
    href: item.href,
    icon: item.icon,
    label: t(item.labelKey),
    raised: item.raised,
  }));
}
