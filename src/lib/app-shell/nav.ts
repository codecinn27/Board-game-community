// The one source of tabs for the bottom bar and the desktop header.
// Each feature that ships a page flips its `enabled` flag here.

export type Viewer = "guest" | "member";

export type NavKey = "home" | "shelf" | "add" | "signIn" | "me";

export type NavIcon = "House" | "LibraryBig" | "Plus" | "LogIn" | "CircleUser";

export type NavItem = {
  key: NavKey;
  href: string;
  icon: NavIcon;
  /** Key under `shell.tabs` in the message files. */
  labelKey: NavKey;
  audience: "all" | Viewer;
  /** The member set's center action: a round, raised button. */
  raised: boolean;
  enabled: boolean;
};

// Order matters: guest is home, shelf, signIn; member is home, shelf, add, me.
export const navItems: readonly NavItem[] = [
  {
    // Moves to `/` when feature 15 (Home page) ships.
    key: "home",
    href: "/",
    icon: "House",
    labelKey: "home",
    audience: "all",
    raised: false,
    enabled: false,
  },
  {
    // `/` today, `/shelf` once Home ships.
    key: "shelf",
    href: "/",
    icon: "LibraryBig",
    labelKey: "shelf",
    audience: "all",
    raised: false,
    enabled: true,
  },
  {
    // Feature 7 (Add a game I own).
    key: "add",
    href: "/games/new",
    icon: "Plus",
    labelKey: "add",
    audience: "member",
    raised: true,
    enabled: false,
  },
  {
    // Feature 6 (Member accounts).
    key: "signIn",
    href: "/sign-in",
    icon: "LogIn",
    labelKey: "signIn",
    audience: "guest",
    raised: false,
    enabled: false,
  },
  {
    // Feature 6 (Member accounts).
    key: "me",
    href: "/me",
    icon: "CircleUser",
    labelKey: "me",
    audience: "member",
    raised: false,
    enabled: false,
  },
];

/** Enabled items for this viewer, in config order. */
export function visibleTabs(
  viewer: Viewer,
  items: readonly NavItem[] = navItems,
): NavItem[] {
  return items.filter(
    (item) =>
      item.enabled && (item.audience === "all" || item.audience === viewer),
  );
}

/** The bar and the inline links only render with 2 or more tabs. */
export const MIN_TABS_FOR_NAV = 2;

/**
 * `/` matches only `/`. Any other href matches itself or anything under it,
 * so `/shelf` matches `/shelf/x` but not `/shelfish`.
 */
export function isActiveTab(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
