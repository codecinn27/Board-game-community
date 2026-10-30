import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { type ReactNode } from "react";
import { BottomTabBar } from "@/components/app-shell/bottom-tab-bar";
import { getShellTabs } from "@/components/app-shell/shell-tabs";
import { SiteHeader } from "@/components/app-shell/site-header";
import { navItems, type NavItem, type Viewer } from "@/lib/app-shell/nav";

// A developer page (spec 0004): its own headings stay English, the shell
// inside it uses the real translations. Hidden on the production deploy.

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

const colorPairs = [
  ["background", "foreground"],
  ["card", "card-foreground"],
  ["popover", "popover-foreground"],
  ["primary", "primary-foreground"],
  ["secondary", "secondary-foreground"],
  ["muted", "muted-foreground"],
  ["accent", "accent-foreground"],
  ["background", "destructive"],
  ["background", "primary"],
] as const;

const lines = ["border", "input", "ring"] as const;
const covers = [1, 2, 3, 4, 5, 6] as const;

const typeScale = [
  ["Page title", "text-2xl font-semibold md:text-3xl", "text-2xl md:text-3xl"],
  ["Section title", "text-lg font-semibold", "text-lg"],
  ["Body", "text-base", "text-base, 16px, line height 1.6"],
  ["Meta and stats", "text-sm text-muted-foreground tabular-nums", "text-sm"],
  ["Badge only", "text-xs font-medium", "text-xs, 12px floor"],
] as const;

const spacing = [
  ["1", "size-1"],
  ["2", "size-2"],
  ["3", "size-3"],
  ["4 (gutter)", "size-4"],
  ["6 (sections)", "size-6"],
  ["8", "size-8"],
  ["11 (tap)", "size-11"],
] as const;

const radii = [
  ["md", "rounded-md", "chips, score buttons"],
  ["lg", "rounded-lg", "buttons, inputs"],
  ["xl", "rounded-xl", "cards, sheets"],
  ["full", "rounded-full", "raised Add"],
] as const;

// Every tab on, with Home on `/` and the Shelf on `/shelf` (the layout once
// feature 15 ships), so `/shelf` shows the Shelf tab as active.
const previewItems: NavItem[] = navItems.map((item) => ({
  ...item,
  enabled: true,
  href: item.key === "shelf" ? "/shelf" : item.href,
}));
const previewPath = "/shelf";

export default function DesignPage() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-primary">Spec 0004</p>
        <h1 className="text-2xl font-semibold md:text-3xl">Design system</h1>
        <p className="max-w-xl text-muted-foreground">
          Tabletop tokens and the app shell in one place. Colors show the scheme
          your device is using; switch it in devtools to check the other one.
          Rules live in <code className="font-mono">docs/design.md</code>.
        </p>
      </header>

      <Section title="Color roles">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {colorPairs.map(([surface, text]) => (
            <li
              key={`${surface}-${text}`}
              className="flex flex-col overflow-hidden rounded-xl border"
            >
              <div
                className="flex h-20 items-center justify-center text-2xl font-semibold"
                style={{
                  background: `var(--${surface})`,
                  color: `var(--${text})`,
                }}
              >
                Aa
              </div>
              <p className="flex flex-col gap-0.5 bg-card p-2 font-mono text-xs text-muted-foreground">
                <span>--{text}</span>
                <span>on --{surface}</span>
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Lines and cover tints">
        <div className="flex flex-col gap-4">
          <ul className="grid grid-cols-3 gap-3 sm:max-w-md">
            {lines.map((line) => (
              <li key={line} className="flex flex-col gap-1">
                <div
                  className="h-12 rounded-lg border-2 bg-background"
                  style={{ borderColor: `var(--${line})` }}
                />
                <span className="font-mono text-xs text-muted-foreground">
                  --{line}
                </span>
              </li>
            ))}
          </ul>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {covers.map((n) => (
              <li key={n} className="flex flex-col gap-1">
                <div
                  className="flex aspect-square items-center justify-center rounded-lg text-2xl font-semibold text-foreground"
                  style={{ background: `var(--cover-${n})` }}
                >
                  {n}
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  --cover-{n}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section title="Type scale">
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {typeScale.map(([name, className, note]) => (
            <li
              key={name}
              className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:justify-between"
            >
              <span className={className}>{name} · 桌游架 4.5</span>
              <span className="font-mono text-xs text-muted-foreground">
                {note}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Spacing and radius">
        <div className="grid gap-6 md:grid-cols-2">
          <ul className="flex flex-col gap-2 rounded-xl border bg-card p-4">
            {spacing.map(([name, size]) => (
              <li key={name} className="flex items-center gap-3">
                <span className={`${size} shrink-0 rounded-sm bg-primary`} />
                <span className="font-mono text-xs text-muted-foreground">
                  {name}
                </span>
              </li>
            ))}
          </ul>
          <ul className="grid grid-cols-2 gap-3">
            {radii.map(([name, className, use]) => (
              <li key={name} className="flex flex-col gap-1">
                <div
                  className={`${className} flex h-16 items-center justify-center border bg-secondary text-secondary-foreground`}
                >
                  {name}
                </div>
                <span className="text-xs text-muted-foreground">{use}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section title="App shell">
        <div className="grid gap-6 lg:grid-cols-2">
          <ShellPreview viewer="guest" title="Guest set" />
          <ShellPreview viewer="member" title="Member set" />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

async function ShellPreview({
  viewer,
  title,
}: {
  viewer: Viewer;
  title: string;
}) {
  const tabs = await getShellTabs(viewer, previewItems);

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm text-muted-foreground">
        {title}: header (links show from 768px) and bottom bar, Shelf active
      </figcaption>
      <div className="flex flex-col overflow-hidden rounded-xl border bg-background">
        <SiteHeader tabs={tabs} position="static" pathname={previewPath} />
        <div className="flex h-32 flex-col gap-2 p-4">
          <div className="h-4 w-2/3 rounded-md bg-muted" />
          <div className="h-4 w-1/2 rounded-md bg-muted" />
        </div>
        <BottomTabBar tabs={tabs} position="static" pathname={previewPath} />
      </div>
    </figure>
  );
}
