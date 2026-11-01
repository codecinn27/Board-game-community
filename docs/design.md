---
name: Game Shelf
source: spec 0004 (docs/specs/0004-design-system-mobile-ui/index.md)
tokens: src/app/globals.css
preview: /design (local dev and Vercel previews only)
---

# Game Shelf design system

**Character**: a warm tabletop. Cream and wood tones, a terracotta accent, rounded and friendly controls, built for one thumb on a phone first and stretched to a desktop second. It should feel like a well loved game shelf in a friend's living room, not a SaaS dashboard.

The token **values** live in [`src/app/globals.css`](../src/app/globals.css) and nowhere else. This file holds the rules for using them. The `/design` page shows everything rendered.

## Build mandate

- Design for a 360px phone first, then add `sm`, `md`, `lg`.
- Use tokens only. No literal color, radius, or font value in a component; use the Tailwind classes mapped to tokens (`bg-card`, `text-muted-foreground`, `rounded-xl`).
- Every interactive control is at least 44 by 44px (`min-h-11 min-w-11`, reached with padding).
- Every control shows a focus ring on keyboard focus: `focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`.
- All user facing text goes through next-intl (`messages/en.json`, `messages/zh.json`, same keys in both).
- Every screen ships its empty, loading, and error states (see *State blocks*).

## Visual reference

Mobile reference: **Overboard, Board game manager** ([App Store](https://apps.apple.com/us/app/overboard-board-game-manager/id1662351733)). We borrow patterns, never assets:

- **Cover art leads.** A game's detail view opens with its cover at the top; the interface stays quiet around it.
- **One glance stats.** Three equal columns: a small uppercase label over a big number.
- **Floating dock.** The detail view's actions float in a blurred pill near the bottom, in thumb reach.
- **The cover sets the color.** The game detail sheet takes its whole theme from its cover (see *Game detail sheet*).

Not borrowed: the Overboard name, logo, icons, screenshots, or BGG data fields (year, rank, weight). Our brand (`Dices` mark, terracotta, Game Shelf) stays. The five explored sheet designs live on the [Game Detail Sheet canvas](https://claude.ai/artifact/PBVkW9skcPLVmEjDbS8Bog); Design 5, Cover Tint, is the one we build.

## Color tokens

The site is always light: tokens sit in `:root` with `color-scheme: light`, and there is no dark theme, no toggle, and no device setting follow. The `dark:` Tailwind variant is redefined to match only a `.dark` class that nothing sets, so `dark:` classes from shadcn never apply.

| Token | Role |
|---|---|
| `background` / `foreground` | page and body text (cream / warm charcoal) |
| `card`, `popover` (+ `-foreground`) | cards, sheets, menus, the bottom bar |
| `primary` / `primary-foreground` | terracotta: main buttons, active tab, links, the raised Add |
| `secondary` / `secondary-foreground` | sand: quiet buttons, chips |
| `muted` / `muted-foreground` | skeletons and subtle fills / secondary text and stats |
| `accent` / `accent-foreground` | hover and pressed surfaces |
| `destructive` | delete actions and error text |
| `border` | decorative dividers and card outlines only (not a contrast pair) |
| `input` | form field borders (3:1 or better) |
| `ring` | focus ring, same as `primary` |
| `cover-1` to `cover-6` | coverless game tiles: terracotta, mustard, sage, teal, plum, sand. Use `bg-cover-N` with `text-foreground` |

**Contrast is enforced by a test.** [`src/lib/design/contrast.test.ts`](../src/lib/design/contrast.test.ts) reads `globals.css` and checks every text pair at WCAG 2.2 AA (4.5:1 text; 3:1 for `input` and `ring`) in both modes. If you change or add a token used for text, add its pair there. `pnpm test` fails on any miss.

**Browser chrome color**: `viewport.themeColor` uses the hex values in [`src/lib/design/theme-color.ts`](../src/lib/design/theme-color.ts), which mirror `--background`. If you change `--background`, update the hex too (the test checks they agree).

## Typography

- Font stack (`--font-sans`): Geist for Latin, then the device's own Chinese font (PingFang SC, Hiragino Sans GB, Microsoft YaHei, Noto Sans CJK SC). No Chinese web font is ever downloaded.
- Body is 16px with line height 1.6 (also stops iOS zooming into inputs). Headings use line height 1.25.

| Use | Classes |
|---|---|
| Page title (one `h1` per page) | `text-2xl font-semibold md:text-3xl` |
| Section title | `text-lg font-semibold` |
| Body | `text-base` |
| Meta and stats | `text-sm text-muted-foreground` |
| Badges only | `text-xs` (12px is the floor) |

Numbers in stats and scores use `tabular-nums`.

## Spacing and layout

- Tailwind's 4px scale. Page gutter `px-4`, `md:px-6`. Between sections `gap-6`; inside cards `gap-2`.
- Breakpoints: Tailwind defaults (`sm` 640, `md` 768, `lg` 1024). The phone layout is everything below `md`.
- Content container: `mx-auto w-full max-w-screen-2xl` (the app shell's `<main>` already applies it). Forms and long text: `max-w-xl`.
- Shelf grid: `grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6`.

## Shape, elevation, motion, icons

- Radius base `--radius: 0.75rem`. Cards and sheets `rounded-xl`; buttons and inputs `rounded-lg`; chips and score buttons `rounded-md`; the raised Add `rounded-full`.
- Flat by default with a `border`. Only the bottom bar (`shadow-sm`) and the raised Add (`shadow-md`) carry a shadow. Cards may lift on hover, on pointer devices only.
- Motion: 150 to 200ms ease out for press and hover, always behind `motion-safe:` so reduced motion turns it off.
- Icons: lucide. 20px (`size-5`) in tabs and buttons, 24px (`size-6`) for the raised Add and the brand mark. The brand mark is `Dices`. Decorative icons get `aria-hidden`.

## Components

### App shell (built)

Code in [`src/components/app-shell/`](../src/components/app-shell/); tabs in [`src/lib/app-shell/nav.ts`](../src/lib/app-shell/nav.ts).

- **Header**: sticky, 56px, translucent `bg-background` with blur and a bottom border. Wordmark (`Dices` + `shell.brand`) links to `/`. From `md` up it also shows the tabs as inline links, the member Add as a primary button.
- **Bottom tab bar**: phones only, fixed to the bottom, 64px plus the iPhone safe area, `bg-card`, top border, `shadow-sm`. Icon above label, equal widths. The member Add sits in the center as a 56px round primary button raised 12px. It comes after `<main>` so keyboard order is header, main, bar.
- **Two tab rule**: the bar and the inline links render only when the viewer has 2 or more enabled tabs. When the bar renders, `<main>` gets matching bottom padding so nothing hides behind it.
- **Active tab**: `aria-current="page"`, primary color, an indicator bar on top (tabs) or underneath (header links).
- **Adding a page to the nav**: flip its `enabled` flag in `nav.ts`. Don't add tabs anywhere else. The shell owns the page's only `<main>`; pages render a plain wrapper.

### Game card (feature 8)

Square cover (`aspect-square object-cover rounded-lg`), the name clamped to 2 lines, then one meta row: owner count (`Users` icon) and average recommendation (`Star` icon, one decimal, hidden while there are no ratings). The whole card is one link to the game page. A skeleton version keeps the same footprint.

### Cover placeholder tile (feature 8)

For a game with no cover: a square tile in `bg-cover-N`, where N is a stable hash of the game id mod 6, plus 1. It shows a `Dices` icon and the first character of the game name (works for Chinese names), in `text-foreground`. It has `role="img"` and the game name as its label.

### Score input (feature 12)

shadcn `ToggleGroup`, single choice, inside a `Field` with a `FieldLabel` and the chosen value shown large beside the label. 1 to 10 scales: `grid-cols-5 sm:grid-cols-10` (two rows of 5 on a phone). 1 to 5 scales: one row of 5. Each item at least 44px tall, `rounded-md`, `tabular-nums`, with an `aria-label` like "Luck 7 of 10". Arrow keys move between values.

### Form fields (feature 6 or 7, whichever builds the first form)

Server Action plus `useActionState`, one Zod schema shared by server and client, laid out with shadcn `FieldGroup`, `Field`, `FieldLabel`, `FieldDescription`, `FieldError`. The error sits under its field and the control gets `aria-invalid`. Inputs are `text-base` (16px). Submit is full width on phones, shows a spinner and is disabled while pending. The form sits in `max-w-xl`.

### State blocks (feature 8)

- **Empty**: shadcn `Empty` with an icon, a title, one line of help, and an optional action.
- **Loading**: `Skeleton` shaped like the real content (`bg-muted`).
- **Error**: the Empty layout with a `destructive` icon and a Retry action.
- All of their text goes through next-intl.

### Game detail sheet (feature 9, Cover Tint)

Tapping a game on the shelf opens this sheet over the shelf. Its colors come from the game's own cover, so every game gets its own theme. The color math is built and tested ([`src/lib/design/cover-tint.ts`](../src/lib/design/cover-tint.ts)); The real sheet is built (feature 9, spec 0008): code in [`src/components/game-sheet/`](../src/components/game-sheet/), data from `getGameDetail` in [`src/lib/games/detail.ts`](../src/lib/games/detail.ts). `/design` shows it in four states (complete, no tint, no description and no ratings, no owners), plus the loading and error blocks.

**Anatomy, top to bottom**:
1. **Cover**: full bleed, `object-cover`, about half the sheet (`h-[52dvh] max-h-[30rem]`). No cover: the cover placeholder tile, stretched.
2. **Fade**: the lower part of the cover melts into the theme tint, reaching solid tint before any text starts. Text never sits on raw art.
3. **Body**: a gradient from tint (held to 55%) down to deep.
4. **Glass buttons**: Close top left, Share top right, 44px, round, glass fill, line border.
5. **Title**, centered, `text-3xl font-bold tracking-tight`, clamp 2 lines; then two chips: rating (`Star`, hidden with no ratings) and owners (`Users`).
6. **Stats card**: Players, Minutes, Owners. `rounded-[22px]`, card fill, line border and dividers; label `text-xs uppercase` in muted ink over a `text-2xl font-bold tabular-nums whitespace-nowrap` value. Missing value: "?".
7. **Description**: clamp 4 lines, then an underlined "More".
8. **Owners list** (feature 9).
9. **Dock**: floating pill, dock fill with blur. "I own this" is filled with ink, its text in inverse ink; until feature 7 it is disabled with a "Coming soon" hint inside it. Beside it: Share.

**Cover Tint colors**: the server samples the average color of the bottom 20% of the cover once, when the cover is saved, and stores it as `games.cover_tint` (`#rrggbb`). On render, `coverTheme(cover_tint)` returns every color the sheet needs:

| Variable | What it is |
|---|---|
| `--sheet-tint` / `--sheet-deep` | the calmed cover color (chroma at most 0.14, a bit darker), and a darker shade for the bottom |
| `--sheet-ink` | text and icons: white, or `#1b1410` on pale tints, always 4.5:1 or better |
| `--sheet-ink-muted` | secondary text (ink at 82% or more, still 4.5:1) |
| `--sheet-ink-inverse` | text on an ink filled button |
| `--sheet-line`, `--sheet-chip`, `--sheet-card`, `--sheet-glass`, `--sheet-dock` | borders, chips, stats card, glass buttons, dock |

- Set the variables inline on the sheet's root (`style={{ "--sheet-tint": theme.tint, ... }}`) and style with `bg-(--sheet-tint)`, `text-(--sheet-ink)` and so on. This is the **one** place colors come from data; everywhere else stays on tokens.
- Focus rings on the themed controls use ink: `focus-visible:ring-(--sheet-ink) focus-visible:ring-offset-(--sheet-tint)`.
- No cover tint: `coverTheme(NEUTRAL_SHEET_TINT)`, one fixed warm sand (`src/lib/games/detail.ts`). The cover area then shows the placeholder tile in that same tint, so the fade is seamless.
- The sheet ignores the device's light or dark setting: the cover decides. The page behind is light too.

**Frame and motion**: phones get a bottom sheet (`h-[96dvh]`, `rounded-t-[32px]`, dimmed page behind); from `md` a centered dialog (`max-w-lg`, `rounded-[28px]`) with a soft blurred glow in the tint behind it. Open: slide up 280ms ease out, the cover settles from `scale-105`; close 200ms. All behind `motion-safe:`.

**Route and accessibility**: the sheet is `/games/[id]`, opened over the current page by an intercepting route in the `@modal` slot of `[locale]` (`@modal/(.)games/[id]`), so Back closes it and the link can be shared; a direct visit renders the same `GameSheet` as a page inside the shell. The overlay frame is `SheetFrame` (shadcn Dialog, Base UI): `role="dialog"` labelled by the title, focus trapped, `Esc` and the dimmed area close, focus returns to the tapped card. Close plays the 200ms exit, then calls `router.back()` (or goes to `/shelf` with no history). Share is one behavior for both Share buttons (`ShareProvider`): the native sheet, else copy the link with a polite "Link copied" message.

When a feature builds one of these, it adds a block for it to `/design` and updates its rules here if the build changed them.

## Do and don't

- Do take every color from a token. Don't write `#hex`, `oklch()`, or `bg-[...]` colors in components. The one exception is the game detail sheet, whose colors come from `coverTheme()` through the `--sheet-*` variables.
- Do use `text-muted-foreground` for secondary text. Don't fade text with opacity, which breaks the contrast test's guarantee.
- Do keep the shell a Server Component. Only `NavLink` is client code; pass it translated labels as props.
- Don't add a dark theme or a theme toggle without a new spec.
- Don't put anything interactive under 44px, even an icon button.
