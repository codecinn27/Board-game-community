# 0004. Design system and mobile first app shell

**Date**: 2026-10-30
**Status**: In Progress

## Summary

This spec sets the look of the whole site: a warm "tabletop" style (cream and wood tones with a terracotta accent), light and dark modes that follow the phone's setting, the Geist font for English and the phone's own Chinese font for Chinese, and rounded, thumb friendly controls. It builds the app shell now (a slim top header plus a bottom tab bar on phones, an inline nav on desktop), and it writes the rules for the game card, score picker, form fields, and empty or loading states into `docs/design.md`, so the features that need them later build them the same way. A hidden `/design` page shows everything in one place for checking.

## Requirements

**User stories**:
- As a visitor on my phone, I want to move around the site with one thumb so that browsing the shelf feels like an app, not a cramped website.
- As a visitor, I want the site to match my phone's light or dark setting so that it's comfortable to read day or night.
- As a Chinese reader, I want Chinese text to look native and load instantly so that I'm not waiting on a large font download.
- As the maintainer, I want one written design reference and one preview page so that every later feature looks consistent without me redeciding colors, spacing, or component behavior.

**Acceptance criteria**:
- **AC-1**: `docs/design.md` exists and covers color tokens (light and dark), typography (Latin and Chinese font stacks, type scale), spacing and layout (page gutter, max widths, breakpoints, shelf grid columns), radius, elevation, motion, icons, and a component section that specifies the app shell, game card, cover placeholder tile, score input, form fields, and state blocks (empty, loading, error).
- **AC-2**: `src/app/globals.css` defines every color token in OKLCH for light and dark, mapped to the shadcn slots. The site follows the device's color scheme on first paint with no flash of the wrong theme and no manual toggle.
- **AC-3**: Latin text renders in Geist. Chinese text falls back to the device's system Chinese font (PingFang SC, Hiragino Sans GB, Microsoft YaHei, Noto Sans CJK SC). No Chinese web font is downloaded.
- **AC-4**: Every text on background token pair meets WCAG 2.2 AA contrast (4.5:1 for body text; 3:1 for large text, borders of inputs, and the focus ring) in both modes, checked by an automated test.
- **AC-5**: On screens narrower than 768px, a slim sticky header shows the wordmark and icon. A bottom tab bar is fixed to the bottom, respects the iPhone safe area, and renders only when the current viewer has 2 or more enabled tabs. Page content is never hidden behind it, and nothing scrolls sideways at 360px wide.
- **AC-6**: At 768px and wider there is no bottom bar. The header holds the wordmark plus the enabled tabs as inline links, and page content is centered with a max width of 72rem (forms 36rem).
- **AC-7**: Tabs come from one config. The guest set is Home, Shelf, Sign in. The member set is Home, Shelf, Add (raised center action), Me. A tab shows only when its flag is on; today only Shelf (at `/`) is on. The active tab carries `aria-current="page"` and a visible active style.
- **AC-8**: All shell text (wordmark, tab labels, page title) comes from next-intl with English and Chinese messages. The locale is fixed to English until spec for feature 5 adds switching. `<html lang>` matches the locale, and the browser tab title uses the brand name instead of "Create Next App".
- **AC-9**: Every interactive control in the shell is at least 44 by 44px, shows a visible focus ring on keyboard focus, is reachable by keyboard in a sensible order, and animations stop when the device asks for reduced motion.
- **AC-10**: `/design` renders the foundations (color swatches in the device's current scheme, type scale, spacing, radius) and an inline shell preview showing both the guest and member sets with every tab on. It works in local dev and Vercel preview deploys, returns 404 on the production deploy, and is marked `noindex`.
- **AC-11**: A Playwright check visits `/` and `/design` at 360px and 1280px wide, in light and dark, and confirms no horizontal scroll and every shell control at least 44px tall and wide, saving screenshots for a human look.

## Decision

**Chosen option**: Option 2: Warm tabletop tokens on shadcn base-nova, shell built now, other components specified now and built by their features.

Restyle the existing shadcn base-nova setup with a warm tabletop token set (OKLCH, light and dark following the system), keep Geist with a system Chinese fallback, build the app shell (header plus bottom tabs) with next-intl text, record every base component's rules in `docs/design.md`, and add a `/design` preview page that is hidden in production.

**Implementation skills**: `shadcn` (`shadcn-ui/ui`, `.claude/skills/shadcn/`) for token mapping (`design-system.md`), the preview page (`design-system-page.md`), and form and option set rules (`rules/forms.md`) · `vercel-composition-patterns` (`vercel-labs/agent-skills`, `.claude/skills/vercel-composition-patterns/`) for the shell's slot and config shape · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) for keeping the shell a Server Component with one small client island · `playwright-cli` (`microsoft/playwright-cli`, `.claude/skills/playwright-cli/`) for the AC-11 check

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

### Visual foundations (the values `docs/design.md` records and `globals.css` implements)

**Color tokens** (OKLCH means lightness 0 to 1, chroma, hue; starting values, the AC-4 test is the judge and may nudge lightness):

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `oklch(0.985 0.012 85)` cream | `oklch(0.19 0.012 50)` warm charcoal | page |
| `--foreground` | `oklch(0.24 0.02 50)` | `oklch(0.95 0.012 85)` | body text |
| `--card` / `--popover` | `oklch(0.995 0.006 85)` | `oklch(0.23 0.014 50)` | cards, sheets |
| `--card-foreground` / `--popover-foreground` | same as foreground | same as foreground | |
| `--primary` | `oklch(0.55 0.15 42)` terracotta | `oklch(0.70 0.15 45)` | buttons, active tab, links |
| `--primary-foreground` | `oklch(0.99 0.01 85)` | `oklch(0.20 0.02 45)` | text on primary |
| `--secondary` | `oklch(0.92 0.03 75)` sand | `oklch(0.29 0.02 55)` | quiet buttons, chips |
| `--secondary-foreground` | `oklch(0.30 0.03 50)` | `oklch(0.93 0.015 80)` | |
| `--muted` | `oklch(0.955 0.015 80)` | `oklch(0.27 0.014 50)` | skeletons, subtle fills |
| `--muted-foreground` | `oklch(0.48 0.025 60)` | `oklch(0.72 0.02 70)` | secondary text, stats |
| `--accent` | `oklch(0.93 0.04 60)` | `oklch(0.31 0.03 50)` | hover and pressed surfaces |
| `--accent-foreground` | same as foreground | same as foreground | |
| `--destructive` | `oklch(0.55 0.2 27)` | `oklch(0.68 0.19 25)` | delete, errors |
| `--border` | `oklch(0.86 0.02 75)` | `oklch(1 0 0 / 14%)` | decorative dividers and card outlines only (exempt from AC-4) |
| `--input` | `oklch(0.60 0.02 70)` | `oklch(0.60 0.02 70)` | form field borders (must reach 3:1, AC-4) |
| `--ring` | `var(--primary)` | `var(--primary)` | focus ring |
| `--cover-1` to `--cover-6` | six warm tints (terracotta, mustard, sage, teal, plum, sand) around L 0.85 | same hues around L 0.35 | coverless game tile; its icon and initial use `--foreground` |

**Dark mode is pure CSS, no JavaScript.** Light tokens sit in `:root`. Dark tokens sit once in `@media (prefers-color-scheme: dark) { :root { ... } }`, and Tailwind's dark variant is redefined to match: `@custom-variant dark (@media (prefers-color-scheme: dark));`. No theme library, no `.dark` class, no `suppressHydrationWarning`, and no wrong theme flash even with JS off. If the shadcn CLI later appends a `.dark { }` block when adding a component, move those values into the media block. A manual toggle, if ever wanted, gets its own spec.

**Viewport**: `export const viewport` in the root layout sets `viewportFit: "cover"` and `themeColor` as two entries with `media: "(prefers-color-scheme: light)"` and `"(prefers-color-scheme: dark)"`, using **hex** values precomputed from the two `--background` tokens (browsers handle `oklch()` poorly in that meta tag). A comment beside them names the token they mirror, and the contrast test (below) asserts each hex is within a rounding step of its token.

**`globals.css` structure**: match what the shadcn CLI writes for base-nova (its `@import` lines, `@theme inline` mapping every slot as `--color-<slot>: var(--<slot>)`, `--radius-*` derived from `--radius`, and the `@layer base` rules setting `border-border`, `outline-ring/50`, and `bg-background text-foreground` on `body`). Check with `pnpm dlx shadcn@latest info` before writing it. Add `--color-cover-1` to `--color-cover-6` so `bg-cover-3` works, and set `--font-sans` inside `@theme inline`.

**Typography**:
- `--font-sans`: `var(--font-geist-sans), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", system-ui, sans-serif`. Remove the starter `font-family: Arial` rule on `body`.
- Base body size 16px (also stops iOS zooming into inputs), line height 1.6 for body (Chinese reads better with more leading), 1.25 for headings.
- Scale (Tailwind steps): page title `text-2xl font-semibold` (`md:text-3xl`), section title `text-lg font-semibold`, body `text-base`, meta and stats `text-sm text-muted-foreground`, never smaller than `text-xs` (12px), and only for badges.
- Numbers in stats and scores use `tabular-nums`.

**Spacing and layout**:
- Tailwind's 4px spacing scale. Page gutter `px-4` (16px), `md:px-6`. Vertical rhythm between sections `gap-6`, inside cards `gap-2`.
- Breakpoints: Tailwind defaults (`sm` 640, `md` 768, `lg` 1024). Phone layout below `md`.
- Content container: `mx-auto w-full max-w-6xl` (72rem). Forms and reading text: `max-w-xl` (36rem).
- Shelf grid: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6`, `gap-3 md:gap-4`.

**Shape, elevation, motion, icons**:
- `--radius: 0.75rem` (12px). Cards and sheets `rounded-xl`, buttons and inputs `rounded-lg`, chips and score buttons `rounded-md`, the raised Add button `rounded-full`.
- Elevation: flat by default with `border`. Only the bottom bar and the raised Add button get a soft shadow (`shadow-sm`, `shadow-md`). Cards lift on hover only on pointer devices.
- Motion: 150 to 200ms ease out for press and hover. Everything wrapped in `motion-safe:`, so reduced motion turns it off.
- Icons: lucide (already set in `components.json`), 20px in tabs and buttons, 24px for the raised Add. Brand mark is the lucide `Dices` icon (lucide has no meeple).
- Tap targets: 44 by 44px minimum on every interactive element.

### App shell (built in this feature)

- **Header** (`src/components/app-shell/site-header.tsx`, Server Component): sticky top, height 56px, `bg-background/90` with backdrop blur, bottom border. Left: `Dices` icon plus the wordmark (`shell.brand`), one link to `/` with `min-h-11` and padding so it is at least 44 by 44px. At `md` and up, the enabled tabs render as inline links on the right (each `min-h-11 min-w-11`), but only when the viewer has 2 or more visible tabs, the same rule as the bottom bar. The member set's Add shows there as a shadcn `Button` (installed through `pnpm dlx shadcn@latest add button`), not raised.
- **Bottom tab bar** (`src/components/app-shell/bottom-tab-bar.tsx`, Server Component wrapper): `fixed inset-x-0 bottom-0`, hidden at `md` and up, height 64px plus `env(safe-area-inset-bottom)`, `bg-card` with top border and `shadow-sm`. Each tab is icon above label, full height, equal width. In the member set, Add sits in the center as a 56px round primary button raised 12px above the bar. Rendered only when the viewer has 2 or more visible tabs. It is placed **after** `<main>` in the page, so keyboard order is header, main, bar. Props for the preview: `position?: "fixed" | "static"` (default `"fixed"`; `"static"` drops `fixed` and `md:hidden` so it shows inline at every width) and `pathname?: string` (passed down to `NavLink`).
- **Active state** (`src/components/app-shell/nav-link.tsx`, the one client component): uses the `pathname` prop when given, else `usePathname()`, applies `aria-current="page"`, primary color text and icon, and a short indicator bar on top of the active tab (underline in the desktop header). Labels arrive as already translated props from the server, so no `NextIntlClientProvider` is needed. List items are keyed by the config `key`, never `href`. No Suspense is needed today; once dynamic routes exist (feature 9 `/games/[id]`), wrap the nav link group in Suspense with a static fallback if Next reports pathname as runtime data.
- **Main area**: `<main>` uses the content container and gets `pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0` only when the bottom bar is rendered, so no content hides behind it. The shell owns the only `<main>`; `src/app/page.tsx` changes its own `<main className="p-4">` to a plain `div`.
- **Viewer**: the shell takes `viewer: "guest" | "member"`. The root layout passes `"guest"` until feature 6 (Member accounts) reads the real session.

**Messages** (`messages/en.json`, `messages/zh.json`, identical key sets):

| Key | English | Chinese |
|---|---|---|
| `shell.brand` | Game Shelf | 桌游架 |
| `shell.meta.titleTemplate` | `%s · Game Shelf` | `%s · 桌游架` |
| `shell.meta.description` | Every board game our community owns, and who owns it. | 我们社区拥有的每一款桌游，以及谁拥有它。 |
| `shell.tabs.home` | Home | 首页 |
| `shell.tabs.shelf` | Shelf | 游戏架 |
| `shell.tabs.add` | Add | 添加 |
| `shell.tabs.signIn` | Sign in | 登录 |
| `shell.tabs.me` | Me | 我的 |
| `shell.nav.label` | Main navigation | 主导航 |

"Page title" in AC-8 means the browser tab title only. The root layout's `generateMetadata` (async, `getTranslations("shell")`) returns `title: { default: brand, template: titleTemplate }` and the description.

**next-intl wiring**: `next.config.ts` becomes `export default createNextIntlPlugin()(nextConfig)`, keeping the existing `turbopack.rules` CSS loader and other options intact. `src/i18n/request.ts` (the plugin's default path) returns `{ locale: "en", messages: (await import("../../messages/en.json")).default }` and reads no cookies or headers, so the root layout stays prerenderable under `cacheComponents`. `<html lang>` comes from `getLocale()`.

**Nav config** (`src/lib/app-shell/nav.ts`, plain data plus two pure helpers):

| key | href | icon | label key | audience | raised | enabled today |
|---|---|---|---|---|---|---|
| `home` | `/` (moves here when feature 15 ships) | `House` | `shell.tabs.home` | all | no | no (feature 15) |
| `shelf` | `/` today, `/shelf` once Home ships | `LibraryBig` | `shell.tabs.shelf` | all | no | **yes** |
| `add` | `/games/new` | `Plus` | `shell.tabs.add` | member | yes | no (feature 7) |
| `signIn` | `/sign-in` | `LogIn` | `shell.tabs.signIn` | guest | no | no (feature 6) |
| `me` | `/me` | `CircleUser` | `shell.tabs.me` | member | no | no (feature 6) |

Order: guest is home, shelf, signIn. Member is home, shelf, add, me. The feature that ships each page flips its flag and, for feature 15, swaps the two hrefs. The routes for `add`, `signIn`, and `me` are placeholders the owning feature's spec may rename here.

- `visibleTabs(viewer, items)`: returns enabled items for that audience, in order.
- `isActiveTab(pathname, href)`: `/` matches only exactly `/`; any other href matches itself or anything under it (`/shelf` matches `/shelf` and `/shelf/x`, not `/shelfish`).

### Components specified now, built by their features (rules live in `docs/design.md`)

| Component | Built in | Rules to record |
|---|---|---|
| Game card | feature 8 (Community shelf) | Square cover (`aspect-square`, `object-cover`, `rounded-lg`), name clamped to 2 lines, then one meta row: owner count (`Users` icon) and average recommendation (`Star` icon, one decimal, hidden when no ratings yet). Whole card is one link to the game page. Skeleton version with the same footprint. |
| Cover placeholder tile | feature 8 | Square tile filled with one of `--cover-1..6`, picked by a stable hash of the game id mod 6, showing a `Dices` icon and the first character of the game name (works for Chinese names). Has `role="img"` with the game name as its label. |
| Score input | feature 12 (Rating form) | shadcn `ToggleGroup`, single choice, inside a `Field` with `FieldLabel` and the chosen value shown large beside the label. 1 to 10 scales: `grid-cols-5` (two rows of 5, about 60 by 44px each on a 360px phone) and `sm:grid-cols-10`. 1 to 5 scale: always one row of 5. Each item 44px tall minimum, `tabular-nums`, `aria-label` like "Luck 7 of 10". Arrow keys move between values. |
| Form fields | feature 6 or 7 (whichever builds the first form) | Server Action plus `useActionState`, Zod schema shared by server and client, shadcn `FieldGroup`/`Field`/`FieldLabel`/`FieldDescription`/`FieldError` layout. Error text under the field, `aria-invalid` on the control. Inputs `text-base` (16px). Submit is full width on phones, shows a spinner and is disabled while pending. |
| State blocks | feature 8 | Empty: shadcn `Empty` (icon, title, one line, optional action). Loading: `Skeleton` shaped like the real content. Error: same layout as Empty with a `destructive` icon and a Retry action. All text through next-intl. |

### Preview page

`src/app/design/page.tsx`: a statically prerendered page that calls `notFound()` when `process.env.VERCEL_ENV === "production"`. Vercel sets `VERCEL_ENV` at build time too, so the production build bakes in the 404. Sets `robots: { index: false }`. Sections follow the shadcn skill's `design-system-page.md` outline, trimmed to what exists: color roles (each swatch with its token name, shown in whichever scheme the device is in; check dark through browser devtools or Playwright emulation), type scale, spacing, radius, and the shell preview. The preview renders the header and `BottomTabBar position="static"` for both the guest and member sets, with every tab forced on (`items.map((i) => ({ ...i, enabled: true }))` passed to `visibleTabs`) and `pathname="/shelf"` so Shelf shows as active. Each later feature adds a block for the component it builds. Its own headings may stay English (a developer page, not user facing); the components inside it use their real translations.

### Contrast test rules (AC-4)

`src/lib/design/contrast.ts` holds pure functions: parse `oklch(L C H)` and `oklch(L C H / A%)`, convert OKLCH to linear sRGB, **clamp each channel to 0..1** (a simple gamut clip; note in a comment that browsers map out of gamut colors slightly differently), composite any alpha over the pair's background, and compute the WCAG relative luminance ratio. `contrast.test.ts` reads `src/app/globals.css` with `fs` (path from `process.cwd()`, since Vitest runs from the repo root), extracts the `:root` block and the `:root` block inside the dark media query by regex, and resolves `var(--x)` one level deep. Pairs checked in **both** modes:

| Pair (text on surface) | Minimum |
|---|---|
| foreground on background, card, popover, muted, accent | 4.5 |
| muted-foreground on background, card, muted | 4.5 |
| primary-foreground on primary | 4.5 |
| secondary-foreground on secondary | 4.5 |
| primary on background and on card (links, active tab) | 4.5 |
| destructive on background and on card | 4.5 |
| foreground on cover-1 to cover-6 | 4.5 |
| input on background and on card | 3 |
| ring on background and on card | 3 |

`--border` is decorative and not checked. The test also asserts the two `themeColor` hex values sit within 2 sRGB steps per channel of their `--background` token. Use relative imports or the `@/` alias the way `src/lib/utils.test.ts` already does.

### End to end check (AC-11)

- Add `@playwright/test` as a dev dependency (install browsers with `pnpm exec playwright install chromium`).
- `playwright.config.ts` at the repo root: `testDir: "e2e"`, `webServer` running `pnpm dev` on port 3000 with `reuseExistingServer: true`, four projects (360 by 800 and 1280 by 800, each with `colorScheme` light and dark). Screenshots go to `test-results/` (add it and `playwright-report/` to `.gitignore`).
- `e2e/design-system.spec.ts`: for `/` and `/design`, assert `document.documentElement.scrollWidth <= innerWidth`; for every `header a, header button, nav a, nav button`, assert the bounding box is at least 44 by 44; assert `body` background color equals the expected token for the scheme; save a full page screenshot. At 1280 only, press Tab from the top and assert focus goes to the wordmark, then each header link in order, each with a visible outline.
- `package.json` script `"test:e2e": "playwright test"`. Add `exclude: ["e2e/**", "node_modules/**"]` to Vitest (create `vitest.config.ts` if needed, keeping how `@/` resolves today) so `pnpm test` ignores it.
- It runs locally against `pnpm dev` with `.env.local` (the `/` page reads Supabase). CI does not run it yet, the same as `next build` and pgTAP.

**Data model sketch**: none. This feature reads and writes no data. The game card's values come from the shelf read defined in spec 0002 when feature 8 builds it.

**State transitions**: none.

**API surface** (no HTTP endpoints; the surface is routes and component props):

| Surface | Kind | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `AppShell` in `src/app/layout.tsx` | Server Component | `viewer: "guest" \| "member"`, `children` | header, optional bottom bar, `<main>` | public | none |
| `NavLink` | Client Component | `href`, `icon`, `label`, `variant: "tab" \| "inline" \| "raised"` | link with `aria-current` | public | none |
| `visibleTabs` | pure function | `viewer`, nav items | ordered enabled items | n/a | none |
| `isActiveTab` | pure function | `pathname: string`, `href: string` | `boolean` | n/a | none |
| `/design` | page (GET) | none | preview page | public in dev and preview | 404 in production |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Render shell | wordmark, tab labels, page title | next-intl messages `messages/en.json`, `messages/zh.json` (`shell.*`) |
| Render shell | locale | fixed `"en"` in `src/i18n/request.ts` until feature 5's spec decides routing |
| Render shell | which tabs show | nav config `enabled` flag plus `audience`, filtered by `visibleTabs` |
| Render shell | viewer | root layout passes `"guest"`; feature 6 replaces it with the Supabase session (spec 0001) |
| Render shell | active tab | `usePathname()` through `isActiveTab` |
| Render shell | bottom bar shown or not | `visibleTabs(...).length >= 2` |
| First paint | light or dark | device `prefers-color-scheme`, applied by a CSS media query (no JS) |
| Browser tab | title and description | `generateMetadata` reading `shell.brand`, `shell.meta.*` |
| Browser chrome | theme color | hex values in `viewport.themeColor`, mirrored from `--background` |
| `/design` | production or not | `process.env.VERCEL_ENV`, set by Vercel (`production`, `preview`, `development`; missing locally, which counts as not production) |
| Game card (feature 8) | owner count, average recommendation | shelf read and game stats from spec 0002 |
| Cover tile (feature 8) | tint | hash of game id mod 6 to `--cover-N` |
| Cover tile (feature 8) | initial | first character of the game name |

**Key invariants**:
- No color, radius, or font value appears as a literal in components; everything goes through tokens or Tailwind classes mapped to them.
- Every token pair used for text passes AC-4 in both modes; a failing pair fails `pnpm test`.
- The bottom bar never renders with fewer than 2 tabs, and when it renders `<main>` always carries the matching bottom padding.
- One nav config is the only source of tabs for both the bottom bar and the desktop header.
- The shell stays a Server Component; only `NavLink` is client code.
- The two message files always have the same keys.

**Security model**: public, read only UI. No user data shown in the shell yet. `/design` contains no data, is unreachable in production, and is `noindex` elsewhere. When feature 6 passes a real viewer, the member set only hides or shows links; access to member pages is still enforced by their own pages and RLS (spec 0001).

**Configuration required**: no new env vars or secrets. `VERCEL_ENV` is provided by Vercel automatically and read directly (it is optional, so it does not go through `requireEnv`). New dev dependency: `@playwright/test`. New shadcn component: `button` (through the CLI). Zod is the agreed form library but is installed by the first feature that builds a form, not here.

**Critical test scenarios**:
- Happy path: on a 360px phone `/` shows the header with wordmark and the shelf list, no bottom bar (one tab), no sideways scroll; `/design` shows the member preview with 4 tabs and the raised Add, verifies **AC-5**, **AC-7**, **AC-10**, **AC-11**
- Active matching: `isActiveTab("/", "/")` true, `isActiveTab("/shelf", "/")` false, `isActiveTab("/shelf/abc", "/shelf")` true, `isActiveTab("/shelfish", "/shelf")` false, verifies **AC-7**
- Tab filtering: guest with only shelf enabled gets 1 tab; member with all enabled gets home, shelf, add, me in that order; a member item never appears for a guest, verifies **AC-7**, **AC-5**
- Contrast: every listed text pair at or above its threshold in light and dark; deliberately lowering `--muted-foreground` lightness makes the test fail, verifies **AC-4**
- Dark mode: Playwright with `colorScheme: "dark"` gets the dark background on first paint, verifies **AC-2**
- Production gate: run once by hand, `VERCEL_ENV=production pnpm build && pnpm start`, then `/design` returns 404 (a unit test can't meaningfully call the page), verifies **AC-10**
- Accessibility: at 1280, Tab reaches the wordmark then each header link in order with a visible ring; every shell control at least 44px at both widths, verifies **AC-9**, **AC-11**
- Translation: switching the fixed locale in `request.ts` to `zh` shows Chinese labels and title with no missing keys (both message files have the same keys), verifies **AC-8**

## Build plan

Tracer Bullet: first prove one thin thread (tokens, next-intl text, shell header) live on the real `/` page, then thicken it.

1. **Thin thread**: wire next-intl without locale routing (see *next-intl wiring*), add both message files with the full key table, add `AppShell` with just the header (icon plus translated wordmark) to `src/app/layout.tsx` around the existing `/` page, change `page.tsx`'s `<main>` to a `div`, set `<html lang>` from `getLocale()`, and replace the starter metadata with `generateMetadata`. Satisfies **AC-8**, part of **AC-5**, **AC-6**
2. **Tokens and theme**: replace the starter `globals.css` with the base-nova structure and the full light and dark OKLCH token set (dark in the media query, `dark` variant redefined), `--radius`, `--input`, cover tints and their color mappings, the font stack with the Chinese fallback (drop the Arial rule); set `viewport` hex theme colors and `viewportFit`. Satisfies **AC-2**, **AC-3**
3. **Contrast check**: add `src/lib/design/contrast.ts` and `contrast.test.ts` per *Contrast test rules*; tune token lightness until every pair passes. Satisfies **AC-4**
4. **Navigation**: add `src/lib/app-shell/nav.ts` (config, `visibleTabs`, `isActiveTab`) with `nav.test.ts`, install `button` through the shadcn CLI, the `NavLink` client component, the bottom tab bar (guest and member sets, raised Add, safe area, `position` and `pathname` props, render only at 2 or more tabs, placed after `<main>`), the inline desktop links (same 2 tab rule), the conditional `<main>` padding, focus rings, 44px targets, and `motion-safe` transitions. Satisfies **AC-5**, **AC-6**, **AC-7**, **AC-9**
5. **Preview page**: add `/design` with foundations and the static shell preview for both viewer sets with all tabs forced on and Shelf active; `notFound()` in production and `noindex`. Satisfies **AC-10**
6. **design.md and the Playwright check**: write `docs/design.md` (foundations plus the component rules table above, written for builders), then set up Playwright per *End to end check* and run it. Satisfies **AC-1**, **AC-11**

**Files touched**: `next.config.ts`, `package.json` (`@playwright/test`, `test:e2e`), `.gitignore`, `vitest.config.ts` (new or edited, for the `e2e/` exclude), `playwright.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/design/page.tsx`, `src/i18n/request.ts`, `messages/en.json`, `messages/zh.json`, `src/lib/app-shell/nav.ts` and `nav.test.ts`, `src/lib/design/contrast.ts` and `contrast.test.ts`, `src/components/app-shell/` (`app-shell.tsx`, `site-header.tsx`, `bottom-tab-bar.tsx`, `nav-link.tsx`), `src/components/ui/button.tsx` (CLI generated), `e2e/design-system.spec.ts`, `docs/design.md`.

## Consequences

**Positive**:
- Every later page inherits colors, type, spacing, and the shell; features 8, 12, 6, and 7 build their components to written rules instead of guessing.
- Zero font download for Chinese and zero JavaScript for theming, which keeps phones on mobile data fast and rules out a wrong theme flash.
- Contrast is enforced by a test, so a later color tweak can't quietly break readability.
- The nav config makes each later feature's change to the shell a one line flag flip.

**Negative / tradeoffs**:
- Chinese text looks slightly different across iPhone, Android, and Windows, since each uses its own system font.
- Until features 6, 7, and 15 ship, the phone layout has no bottom bar at all (one tab), so the bar is only seen on `/design` for now.
- Dark mode departs from shadcn's `.dark` class convention, so any `.dark { }` block the CLI adds must be moved into the media query by hand, and a future manual toggle would need a new spec and a switch to a class strategy.
- The Playwright check needs a local dev server with `.env.local`, so it is a manual step, not a CI gate.
- Building the game card, score input, and fields later means `docs/design.md` describes components that don't exist yet; their first build may surface a rule that needs adjusting here.
- The locale is hardcoded to English until feature 5, so the Chinese messages exist but no visitor sees them yet.

**Neutral**:
- `/` stays the shelf. When feature 15 ships, Home takes `/` and the Shelf tab moves to `/shelf`; that feature must also move the current page.
- The tab routes for Add, Sign in, and Me are placeholders their features may rename in the nav config.
- `docs/design.md` becomes a living file; each feature that builds a listed component updates its row if the build changes a rule.

## Follow-up

- [ ] Zod was declined for Agent Skill and MCP discovery: `/audit` or `/sync` should add Zod to the `Declined:` line in root `AGENTS.md` `## Agent skills`, so it isn't offered again.
- [ ] Root `AGENTS.md` should link `docs/design.md` under `## Context files` and add a rule that UI uses design tokens only (no literal colors) (owned by `/sync`).
- [ ] Feature 5 (Two languages) builds on the `src/i18n/request.ts` added here: its spec decides locale routing and replaces the fixed `en`. If it reads cookies or headers, the root layout's `getLocale()` becomes runtime data under `cacheComponents` and needs a Suspense boundary or a `[locale]` segment.
- [ ] Feature 6 (Member accounts) passes the real viewer to `AppShell` and turns on the Sign in and Me tabs.
- [ ] Feature 15 (Home page) takes over `/`, moves the shelf to `/shelf`, swaps the two hrefs in the nav config, and turns on Home.
- [ ] Spec 0001 lists `src/components/` but no `src/i18n/` or `messages/`; `/sync` should record where translations live once this lands.
