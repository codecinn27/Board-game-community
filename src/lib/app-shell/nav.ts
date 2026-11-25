// The one source of tabs for the bottom bar and the desktop header.
// Each feature that ships a page flips its `enabled` flag here.

export type Viewer = "guest" | "member" | "admin";

export type NavKey = "home" | "shelf" | "add" | "review" | "signIn" | "me";

export type NavIcon =
  "House" | "LibraryBig" | "Plus" | "ShieldCheck" | "LogIn" | "CircleUser";

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

// Order matters: guest is home, shelf, signIn; member is home, shelf, add, me;
// an admin also gets review, between add and me.
export const navItems: readonly NavItem[] = [
  {
    // Feature 15 (Home page).
    key: "home",
    href: "/",
    icon: "House",
    labelKey: "home",
    audience: "all",
    raised: false,
    enabled: true,
  },
  {
    // The tracer list today; the real shelf is feature 8.
    key: "shelf",
    href: "/shelf",
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
    enabled: true,
  },
  {
    // Feature 7 (Add a game I own): the admin only review list.
    key: "review",
    href: "/admin/review",
    icon: "ShieldCheck",
    labelKey: "review",
    audience: "admin",
    raised: false,
    enabled: true,
  },
  {
    // Feature 6 (Member accounts).
    key: "signIn",
    href: "/sign-in",
    icon: "LogIn",
    labelKey: "signIn",
    audience: "guest",
    raised: false,
    enabled: true,
  },
  {
    // Feature 6 (Member accounts).
    key: "me",
    href: "/me",
    icon: "CircleUser",
    labelKey: "me",
    audience: "member",
    raised: false,
    enabled: true,
  },
];

/** Enabled items for this viewer, in config order. */
export function visibleTabs(
  viewer: Viewer,
  items: readonly NavItem[] = navItems,
): NavItem[] {
  return items.filter(
    (item) =>
      item.enabled &&
      (item.audience === "all" ||
        item.audience === viewer ||
        // An admin is a member with extra tabs.
        (item.audience === "member" && viewer === "admin")),
  );
}

/** The tab set for a signed in or signed out viewer. Disabled admins are members. */
export function navViewer(
  viewer:
    | { kind: "guest" }
    | {
        kind: "member";
        role: "member" | "admin";
        status: "active" | "disabled";
      },
): Viewer {
  if (viewer.kind === "guest") return "guest";
  return viewer.role === "admin" && viewer.status === "active"
    ? "admin"
    : "member";
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
