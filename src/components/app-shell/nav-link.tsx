"use client";

import {
  CircleUser,
  House,
  LibraryBig,
  LogIn,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { Suspense } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { isActiveTab, type NavIcon } from "@/lib/app-shell/nav";
import { cn } from "@/lib/utils";

// Icons travel from the server as names, since components can't be props
// across the server to client boundary.
const icons: Record<NavIcon, LucideIcon> = {
  House,
  LibraryBig,
  Plus,
  LogIn,
  CircleUser,
};

export type NavLinkVariant = "tab" | "inline" | "raised" | "action";

type NavLinkProps = {
  href: string;
  icon: NavIcon;
  label: string;
  /**
   * tab: bottom bar item. inline: desktop header link.
   * raised: the bottom bar's round center action. action: the same action as a
   * button in the desktop header.
   */
  variant: NavLinkVariant;
  /** Overrides the real path, for the `/design` preview. */
  pathname?: string;
};

const focusRing =
  "outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * The path is runtime data on routes with a `[param]` (the game sheet), so the
 * live link streams in; until then the same link shows as not active.
 */
export function NavLink(props: NavLinkProps) {
  if (props.pathname !== undefined) {
    return (
      <NavLinkView
        {...props}
        active={isActiveTab(props.pathname, props.href)}
      />
    );
  }
  return (
    <Suspense fallback={<NavLinkView {...props} active={false} />}>
      <LiveNavLink {...props} />
    </Suspense>
  );
}

function LiveNavLink(props: NavLinkProps) {
  const currentPath = usePathname();
  return (
    <NavLinkView {...props} active={isActiveTab(currentPath, props.href)} />
  );
}

function NavLinkView({
  href,
  icon,
  label,
  variant,
  active,
}: NavLinkProps & { active: boolean }) {
  const Icon = icons[icon];

  if (variant === "raised") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex min-h-11 min-w-11 flex-1 flex-col items-center justify-start gap-1 rounded-lg pt-0 text-xs font-medium text-muted-foreground",
          focusRing,
          active && "text-primary",
        )}
      >
        <span
          aria-hidden
          className="-mt-3 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:group-active:scale-95"
        >
          <Icon className="size-6" />
        </span>
        <span>{label}</span>
      </Link>
    );
  }

  if (variant === "action") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          buttonVariants({ variant: "default" }),
          "min-h-11 min-w-11 gap-2 px-4 text-sm",
          focusRing,
        )}
      >
        <Icon aria-hidden className="size-5" />
        {label}
      </Link>
    );
  }

  if (variant === "inline") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out",
          focusRing,
          active &&
            "text-primary after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-primary hover:text-primary",
        )}
      >
        <Icon aria-hidden className="size-5" />
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium text-muted-foreground motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out",
        focusRing,
        active &&
          "text-primary before:absolute before:inset-x-1/4 before:top-0 before:h-0.5 before:rounded-full before:bg-primary",
      )}
    >
      <Icon aria-hidden className="size-5" />
      <span>{label}</span>
    </Link>
  );
}
