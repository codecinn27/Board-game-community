import { Baloo_2 } from "next/font/google";
import { type ComponentProps, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { AuthDecor, RocketHero } from "./auth-decor";

// The auth Dice Galaxy scene (spec 0010, AC-16 to AC-21): a night sky with
// stars, a rocket, a planet, clay dice, and a cloud bank; the heading sits on
// the sky above a white form card that rests on the clouds. Colors come only
// from the `--auth-*` tokens, which exist only inside `.auth-scene`
// (globals.css).

// Baloo 2 for Latin text on the auth pages only (next/font scopes it to the
// pages that render this file). Chinese falls back to the device font.
const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo",
  display: "swap",
});

/**
 * Put this on anything that should resolve the scene's tokens and font.
 * Joined as plain text, not `cn`: tailwind-merge could read the font
 * variable class as a second `font-*` class and drop `font-auth`.
 */
export const authSceneClass = `auth-scene font-auth ${baloo.variable}`;

/**
 * Full bleed inside `<main>`: it cancels the page gutter and the shell's
 * `--main-pt` and `--main-pb`, then pads itself back so nothing hides behind
 * the bottom bar. The bottom padding is shorter than the cloud bank, so the
 * card's lower edge rests in the clouds.
 */
export function AuthScene({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${authSceneClass} relative isolate -mx-(--page-gutter) -mt-(--main-pt) -mb-(--main-pb) flex flex-1 flex-col px-4 pt-6 pb-[calc(var(--main-pb)+2.75rem)] text-auth-on-sky md:pt-10 lg:pb-[calc(var(--main-pb)+4.5rem)]`}
    >
      <AuthDecor />
      {/* `mt-auto`: on a tall screen the column sinks so the card still
          rests on the clouds, and the extra sky opens up above it. */}
      <div className="relative z-10 mx-auto mt-auto flex w-full max-w-110 flex-col">
        {children}
      </div>
    </div>
  );
}

type AuthCardProps = {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
};

/** The small rocket (below `lg`), the heading on the sky, then the card. */
export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="flex flex-col items-center">
      <RocketHero className="lg:hidden" />
      <h1 className="mt-1 text-center text-4xl font-bold text-balance text-auth-on-sky md:text-5xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1.5 max-w-sm text-center text-base text-pretty text-auth-on-sky-muted md:text-lg">
          {subtitle}
        </p>
      ) : null}
      <FormCard className="mt-5 md:mt-7">{children}</FormCard>
    </div>
  );
}

/** Shaped like the heading and the form while the page reads the session. */
export function AuthSkeleton({ label }: { label: string }) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className="flex flex-col items-center"
    >
      <RocketHero className="lg:hidden" />
      <div className="mt-2 h-10 w-56 rounded-full bg-auth-on-sky/20" />
      <div className="mt-3 h-5 w-64 max-w-full rounded-full bg-auth-on-sky/15" />
      <FormCard className="mt-6 md:mt-8">
        <div className="flex flex-col gap-5">
          <div className="h-13 rounded-xl bg-auth-field" />
          <div className="h-13 rounded-xl bg-auth-field" />
          <div className="h-14 rounded-full bg-auth-field" />
        </div>
      </FormCard>
    </div>
  );
}

type AuthFooterProps = {
  prompt: string;
  label: string;
  href: ComponentProps<typeof Link>["href"];
};

/** "Don't have an account? Sign up" under the form (AC-17). */
export function AuthFooter({ prompt, label, href }: AuthFooterProps) {
  return (
    <p className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 text-center text-sm text-auth-ink-muted">
      <span>{prompt}</span>
      <Link
        href={href}
        className="inline-flex min-h-11 items-center rounded-lg px-1 font-bold text-auth-link underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-auth-ring focus-visible:outline-none"
      >
        {label}
      </Link>
    </p>
  );
}

/** The white card the form sits in. */
function FormCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "w-full rounded-[32px] bg-auth-card px-5 pt-6 pb-4 text-auth-ink shadow-[0_30px_60px_-20px_var(--auth-shadow)] sm:px-7 sm:pt-7",
        className,
      )}
    >
      {children}
    </div>
  );
}
