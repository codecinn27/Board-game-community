# 0008. Game detail sheet: the tinted sheet at /games/[id]

**Date**: 2026-11-02
**Status**: In Progress

## Summary

Tapping a game on home or the shelf opens its detail sheet over the page you were on, in the game's own colors (Cover Tint). Back closes it, and a shared link or a refresh shows the same sheet as a normal page. It reads the same typed dummy data as home and shelf, so feature 21 can later swap the reads for Supabase without touching the components. "I own this" is visible but switched off until feature 7, and Share works now.

## Context

Every card on home and the shelf already links to `/games/{id}`, which today shows the translated 404 (spec 0007, AC-1). The scope (feature 9) wants that link to open a sheet with the cover, name, rating and owner chips, a stats card, the description, every owner, and an "I own this" dock. The look is approved: `docs/design.md` has the full Game detail sheet section (anatomy, Cover Tint colors, frame, motion, and the rule that the sheet is an intercepting route), and `src/lib/design/cover-tint.ts` already turns a cover color into the sheet's colors with 4.5:1 text contrast guaranteed.

Slice 1 is front end first, so the sheet is built on dummy data. Today the dummy games carry only what home and the shelf need (name, tint, ratings, owners); the `games` table also has `description`, `players_min/max`, and `play_time_min/max`, so the dummy rows must grow to match. Members have a display name and an optional avatar, but avatar storage does not exist yet. Sign in (feature 6) and "I own this" (feature 7) are later, so the dock cannot do its main job yet.

The project runs Next.js 16 with Cache Components on, a `[locale]` root segment read through `next/root-params`, and shadcn in the `base-nova` style (Base UI under the hood). Only `NavLink`, the language menu, and a few small islands are client code; everything else stays a Server Component. `src/components/ui/` is edited only through the shadcn CLI, and all user text goes through next-intl in both languages.

## Requirements

**User stories**:
- As a visitor, I want to tap a game and see its details without leaving the page I was on, so I can browse quickly and go back to the same spot.
- As a visitor, I want to see who in the community owns a game, so I know who to ask to borrow it.
- As a visitor, I want a link to a game to open the full sheet when I paste it into a chat, so I can share a game with friends.
- As a visitor, I want each game to look like its own cover, so the sheets are easy to tell apart and nice to open.

**Acceptance criteria** (the contract):

*Route and open behavior*
- **AC-1**: `/en/games/{id}` and `/zh/games/{id}` render the sheet for each of the 12 dummy game ids. An id that does not exist, or is not a whole number (`/games/abc`, `/games/0`, `/games/1.5`), shows the translated 404 page with status 404, in both the overlay and the page version.
- **AC-2**: Tapping a game card on home or on the shelf opens the sheet as an overlay on that same page: the URL becomes `/{locale}/games/{id}`, the page behind stays rendered and dimmed, and its scroll position is kept. Browser Back (or Close, Esc, a tap on the dimmed area) closes the sheet and returns to the same page at the same scroll. Forward reopens it.
- **AC-3**: A direct visit or a refresh of `/{locale}/games/{id}` renders the same sheet content as a page inside the app shell (header and tab bar stay), on the sheet's tint, with no dimmed backdrop and no `role="dialog"`. Its Close button is a normal link to the shelf. Opening the page version in either language never shows the overlay.

*What the sheet shows*
- **AC-4**: Top to bottom the sheet shows: the cover area, a fade into the tint, round Close (top left) and Share (top right) glass buttons, the title (centered, clamped to 2 lines), the two chips, the stats card, the description, the owners list, and the dock. The cover area is `h-[52dvh] max-h-[30rem]` and shows the cover placeholder tile stretched (in this slice no game has a stored cover). The fade reaches solid tint before any text starts, and text never sits on the cover art or placeholder.
- **AC-5**: Every color on the sheet comes from `coverTheme()` through the `--sheet-*` variables set inline on the sheet root. A game with no `cover_tint` (Just One, 三国杀) uses one fixed neutral warm tint instead. No `#hex`, `oklch()`, or `bg-[...]` colors appear in the sheet components. The sheet ignores the device's light or dark setting. For all 12 dummy games and the neutral tint, every text and surface pair reaches 4.5:1 (checked by test through `textSurfaces`).
- **AC-6**: The chips: the rating chip shows a star and the average to exactly one decimal (`8.0`, not `8`) and is hidden when `avg_recommendation` is null; its screen reader text says "8.0 out of 10, from 5 ratings" (pluralized). The owners chip shows a `Users` icon and the owner count, with screen reader text pluralized in both languages ("1 owner", "4 owners"). Numbers go through `format.number`.
- **AC-7**: The stats card shows Players, Minutes, and Owners. Players is `min–max` (`2–4`) or a single number when min equals max (`4`); Minutes works the same way; Owners is the owner count. Any missing value, or a range with only one end known, shows `?` for the unknown end (`?–4` is not allowed: a range with one missing end shows just `?`). Values never wrap (`whitespace-nowrap`, `tabular-nums`).
- **AC-8**: The description is clamped to 4 lines. "More" appears only when the text is actually cut off, expands the full text in place, and becomes "Less". A game with no description (Just One) hides the whole description block, with no placeholder text. Description text shows as stored, in whatever language it was written.
- **AC-9**: The owners list has a heading with the count and one row per owner: a decorative initial circle (the first character of the name, on the sheet's chip fill), the display name, and a quiet "Since {month year}" through `LocalTime`. Rows are ordered oldest link first, ties by name A to Z (compared like the shelf, `compareNames`), then by member id. Every owner is shown, with no cap and no pagination. Rows are not links in this slice. A game with no owners shows one line, "Nobody owns this yet", instead of rows.
- **AC-10**: The dock floats in a blurred pill near the bottom edge, in thumb reach, and never covers the last content (the sheet body has bottom padding for it). It holds a filled "I own this" button and the Share action. In this slice "I own this" is rendered as a disabled button with a visible "Coming soon" hint beside or under it, and screen readers hear both. Nothing on the sheet reads the session; the viewer is the guest from the shell.
- **AC-11**: Share (the top right glass button and the dock action trigger the same behavior): where the browser has a share sheet, it opens with the game name and the current page link; otherwise the link is copied and a short "Link copied" message appears for about 2 seconds in an `aria-live="polite"` region. If copying fails, the message says "Could not copy, use the address bar". Cancelling the native share sheet shows nothing. The shared link is always the `/{locale}/games/{id}` URL, never an overlay-only address.

*Overlay behavior and look*
- **AC-12**: The overlay has `role="dialog"` labelled by the game name, traps focus, closes on Esc and on a tap of the dimmed area, locks the page behind from scrolling, and returns focus to the card that opened it (not to the top of the page). Every control is at least 44px, and focus rings on themed controls use the sheet ink.
- **AC-13**: In the overlay, Close (and Esc, and the dimmed area) plays the 200ms exit and then calls `router.back()`, so closing from home returns to home and from the shelf returns to the shelf. If there is no in app history to go back to, Close falls back to going to the shelf.
- **AC-14**: On phones (below `md`) the overlay is a bottom sheet (`h-[96dvh]`, `rounded-t-[32px]`, dimmed page behind); from `md` it is a centered dialog (`max-w-lg`, `rounded-[28px]`) with a soft blurred glow in the tint behind it. Open: slide up 280ms ease out, the cover settles from `scale-105`; close: 200ms. All motion sits behind `motion-safe:`, so with reduced motion the sheet appears and disappears with no movement.

*States, text, and data*
- **AC-15**: While the sheet content loads it shows a skeleton with the same frame (cover block, title bar, chip bars, stats card, text bars, dock) marked `aria-busy` with the label "Loading game". If the read throws, the sheet shows an error block (icon, "Could not load this game", one line of help, a "Try again" button that refreshes the route) inside the same frame, and a backstop `error.tsx` renders the same block. Both blocks take their strings as props so `/design` can preview them with no message provider.
- **AC-16**: All text comes from a new `game` namespace in `messages/en.json` and `messages/zh.json` with the same keys (checked by `src/i18n/messages.test.ts`). Counts use ICU plurals. Client islands get their few strings as props from the server component, so `IntlClientProvider` in the layout does not grow. Game names, descriptions, and member names show as stored.
- **AC-17**: `generateMetadata` sets the page title to the game name (through the existing title template), the description to the first 160 characters of the game's description (or the generic sheet description when there is none), and `alternates: await getAlternates("/games/{id}")`. An unknown id returns the not found metadata. No image card and no JSON-LD in this slice.
- **AC-18**: The sheet makes no database or network call. It reads through `getGameDetail(id)` in `src/lib/games/detail.ts`, built from the dummy arrays, and the row types come from `database.types.ts` so a removed or retyped column fails `pnpm typecheck`. The dummy data gains `description`, `players_min`, `players_max`, `play_time_min`, `play_time_max` for 11 games (三国杀 gets a Chinese description); Just One keeps them all null so the `?` and no description states are real data.
- **AC-19**: The 12 dummy ids are prebuilt for both languages (`generateStaticParams`), and `pnpm build` passes with Cache Components on. Any other id renders on demand and shows the 404.
- **AC-20**: Checks: Vitest covers the read layer, the stat formatters, the owner order, the neutral tint contrast, and the component states (each of AC-6 to AC-10, AC-15). Playwright at 360px and 1280px, in both languages, covers AC-1 to AC-3, AC-12 to AC-14 on the real overlay. `/design` gets previews of the real sheet in four states: complete, no tint, no description and no ratings, no owners (the states the dummy data cannot all reach on the live route), plus the skeleton and the error block. The home and shelf e2e checks that expected the 404 for card links are updated.

## Options considered

### Option 1: Intercepting route in a parallel slot (`@modal/(.)games/[id]`)

The sheet is a real route at `/games/[id]`. A parallel slot `@modal` in the `[locale]` layout intercepts that route during in app navigation and renders it as an overlay over whatever page is showing; a direct visit skips the interception and renders `games/[id]/page.tsx`. Both render one shared `GameSheet` component.

**Pros**:
- The URL, Back, Forward, refresh, and share links work with the browser's own history, with no hand written history code.
- It is the pattern `docs/design.md` and the scope already name.
- One shared sheet component and one data read serve both versions.

**Cons**:
- Parallel and intercepting routes are the trickiest part of the App Router: a `default.tsx`, a catch all to clear the slot, and the `(.)` matcher all have to be right.
- The root layout gains a `modal` prop, and every future route needs the slot's `default` to keep working.

### Option 2: Client side overlay with manual history

A client component opens the sheet from a click, calls `history.pushState` to set the URL, and fetches the data on the client. A separate `/games/[id]` page handles direct visits.

**Pros**:
- No parallel routes or slot files to learn.

**Cons**:
- Hand built Back, Forward, and refresh behavior is the usual source of bugs (a stale overlay after Back, a lost scroll).
- Needs a client data path, which feature 21 then has to mirror; duplicates the sheet in two places.

### Option 3: Full page only

`/games/[id]` is an ordinary page and no overlay exists.

**Pros**:
- Simplest to build, test, and keep working.

**Cons**:
- Drops the sheet feel and the "Back returns to the shelf at the same scroll" behavior that scope feature 9 and design.md promise.
- Every open reloads the shelf behind it on Back, losing the visitor's place on a long grid.

## Decision

**Chosen option**: Option 1: Intercepting route in a parallel slot

One shared server `GameSheet` renders at `/games/[id]`; a `@modal` slot with `(.)games/[id]` renders it in a shadcn Dialog over the current page. Read data through `getGameDetail(id)`, style from the `--sheet-*` variables, and keep only the dialog frame, Share, "More", and Close as small client islands.

**Implementation skills**: `shadcn` (`shadcn-ui/ui`, `.claude/skills/shadcn/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `vercel-composition-patterns` (`vercel-labs/agent-skills`, `.claude/skills/vercel-composition-patterns/`)

## Rationale

The visitor has to keep their place on a long grid and still be able to share a game: only the browser's own history does both without bugs, which rules out Option 2's hand built `pushState`. Option 3 is cheaper but loses the place on Back, and design.md already commits to the intercepting route, so Option 1 is the planned path rather than a new bet. The cost is real: parallel slots are the fiddly part of the App Router, which is why the build plan stands the slot up first with a bare page and proves open, Back, and refresh before any styling.

The overlay base is the shadcn Dialog (Base UI). The focus trap, Esc, scroll lock, and inert background are exactly the edge cases that are costly to get right by hand, and `components/ui` can only be extended through the shadcn CLI anyway. A native `<dialog>` was the runner up: no dependency, but the animations and focus return need more hand work. Because the overlay is route driven (no trigger button), focus return is set up on purpose: the island remembers the focused card when it mounts and hands it to the Dialog as the final focus target.

Strings reach the client islands as props rather than through the layout's `IntlClientProvider`, the same pattern the shelf error block uses. The layout keeps shipping only what every page needs.

## Feature design

**Data model sketch**: no schema change. The sheet reads existing tables.

| Piece | Source | Fields |
|---|---|---|
| `DummyGame` (new, in `types.ts`) | `ShelfGame` plus `Pick<games row, "description" \| "players_min" \| "players_max" \| "play_time_min" \| "play_time_max">` | existing shelf fields plus the five new ones |
| `GameDetail` (returned by `getGameDetail`) | built from `DummyGame`, `dummyOwners`, `dummyProfiles` | `id`, `name`, `description`, `playersMin/Max`, `playTimeMin/Max`, `coverTint`, `avgRecommendation`, `ratingCount`, `ownerCount`, `owners` |
| `GameOwner` | `game_owners` joined to `profiles` | `memberId`, `displayName`, `since` (the link's `created_at`) |

`getGameDetail(id)` returns `GameDetail`, or `null` for an id that is not a positive whole number or not in the data. `ownerCount` is derived from the owner rows. `dummyGames` is retyped as `DummyGame[]`; `ShelfGame` consumers keep working because `DummyGame` extends it. Feature 21 swaps the body of `getGameDetail` for a Supabase read, and the cover tint then comes from `games.cover_tint`.

**State transitions**: none on the server. The overlay has one client state: open until Close, then closing (200ms exit), then `router.back()`. The "More" toggle and the Share message are local component state.

**File and route shape**:
- `src/app/[locale]/games/[id]/page.tsx` (the page version), with `loading.tsx` and `error.tsx` beside it.
- `src/app/[locale]/@modal/(.)games/[id]/page.tsx` (the overlay), `@modal/default.tsx` returning `null`, and a `@modal/[...rest]/page.tsx` returning `null` so the slot clears when you navigate somewhere else in the app.
- `src/app/[locale]/layout.tsx` takes `modal` and renders it after `children` inside `AppShell`'s sibling position (the overlay must sit above the shell, so it renders outside `<main>` but inside the intl provider).
- `src/components/game-sheet/`: `game-sheet.tsx` (server), `sheet-frame.tsx` (client Dialog), `share-button.tsx`, `description.tsx` (client, "More"), `owners-list.tsx`, `stats-card.tsx`, `sheet-skeleton.tsx`, `sheet-error.tsx`, `close-button.tsx`.
- `src/lib/games/detail.ts` (`getGameDetail`, `buildGameDetail`, `formatRange`) and its test.

**API surface**:
| Surface | Kind | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/{locale}/games/{id}` | page (direct visit) | `id` (route param, whole number) | the sheet as a page | public | 404 for an unknown or invalid id |
| `@modal/(.)games/{id}` | intercepted page (in app navigation) | `id` | the sheet in a dialog | public | 404 for an unknown or invalid id |
| `getGameDetail` | server read | `id: string` | `GameDetail \| null` | public | throws on a read failure (shows the error block) |
| Share | client action | none (reads the current page link) | native share sheet or a copied link | none | clipboard refused: message shown |

There are no mutations. Nothing writes to the database in this feature.

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Open sheet | which game | `id` route param, parsed to a positive whole number |
| Open sheet | sheet colors | `coverTheme(cover_tint)`; for a null tint, the constant `NEUTRAL_SHEET_TINT` in `detail.ts` |
| Open sheet | title, description | `games.name`, `games.description` |
| Chips | rating (one decimal) | `avg_recommendation` via `format.number` |
| Chips | rating count (screen reader text) | `rating_count` |
| Chips and stats | owner count | count of the game's `game_owners` rows |
| Stats | Players, Minutes | `players_min/max`, `play_time_min/max`; `formatRange` |
| Owners list | name, initial | `profiles.display_name`; initial from `coverInitial(display_name)` |
| Owners list | "Since" date | `game_owners.created_at`, shown with `LocalTime` |
| Owners list | order | `created_at` ascending, then `compareNames`, then member id |
| Share | the shared link | `window.location.href` at the tap, which is always the `/{locale}/games/{id}` URL |
| Share | shared title | the game name (a prop from the server) |
| Close | where to go | `router.back()` in the overlay; `/shelf` link on the page; fallback to `/shelf` when there is no in app history (history length 1) |
| Metadata | page title, description | game name; first 160 characters of `description`, else the `game.meta.description` message |
| Focus return | the element to refocus | `document.activeElement` captured when the overlay mounts |

**Key invariants**:
- Every color on the sheet comes from `coverTheme()`; no other color source (AC-5).
- The route renders the same `GameSheet` component for overlay and page, so content never differs between them.
- The neutral tint passes the same contrast test as every cover tint.
- The overlay is closed by exactly one path (`closing` state then `router.back()`), so Esc, the dimmed area, and Close cannot disagree.
- Dates only through `LocalTime`; links only through `@/i18n/navigation`; client islands get strings as props.

**Security model**: public read, no sign in, no writes. Game names, descriptions, and member display names are plain text rendered by React (escaped), never as HTML. The shared link and the share title contain only public data. No personal data beyond the display name already shown on the shelf; no compliance scope. The viewer is the guest from the shell until feature 6.

**Configuration required**: none. The `NEXT_PUBLIC_SITE_URL` the metadata already uses is unchanged.

**Critical test scenarios** (each maps to an acceptance criterion):
- Happy path: from the shelf tap Wingspan, the overlay opens with its tint, 4 owners, rating `8.0`; Back returns to the shelf at the same scroll, verifies **AC-2, AC-4, AC-6, AC-9, AC-13**
- Happy path: open `/zh/games/12` directly, the page version shows 三国杀 in Chinese with the neutral tint and a Chinese description, verifies **AC-3, AC-5, AC-16, AC-18**
- Failure case: `/en/games/999`, `/en/games/abc`, `/en/games/0` show the translated 404 with status 404 in both versions, verifies **AC-1**
- Edge case: Just One shows `?` stats, no rating chip, and no description block; a game with no owners shows "Nobody owns this yet", verifies **AC-6 to AC-9**
- Edge case: tap Share with and without a native share sheet, and with the clipboard refused, verifies **AC-11**
- Accessibility: Tab stays inside the overlay, Esc closes it, and focus returns to the tapped card, verifies **AC-12**
- Motion: with reduced motion the overlay opens and closes with no movement, verifies **AC-14**
- Contrast: all 12 dummy tints plus the neutral tint pass `textSurfaces` at 4.5:1, verifies **AC-5**
- Failure case: `getGameDetail` throws, the error block shows and "Try again" refreshes, verifies **AC-15**
- Build: `pnpm build` prerenders the 12 ids in both languages, verifies **AC-19**

## Build plan

Order follows the project's Tracer Bullet approach, front end first on dummy data: prove the riskiest thread (the intercepting route inside `[locale]` with Cache Components) with a bare page, then thicken one strand at a time.

1. Thin thread: extend the dummy data and types (`DummyGame`, five new fields, 11 filled, Just One blank), add `detail.ts` with `getGameDetail`, and a bare `/games/[id]/page.tsx` that prints the game name, with the translated 404 for invalid ids and `generateStaticParams` for the 12 ids, satisfies **AC-1, AC-18, AC-19**
2. Stand up the overlay: add the `@modal` slot, `default.tsx`, the catch all, the `(.)games/[id]` page, and the layout `modal` prop; prove with a plain unstyled overlay that tapping a card from home and from the shelf opens it, Back closes it, and a refresh shows the page, satisfies **AC-2, AC-3**
3. Build the `GameSheet` server component to the full anatomy: theme variables, cover placeholder and fade, glass buttons, title, chips, stats card with `formatRange`, owners list, and the disabled dock; add the `game` messages in both languages, satisfies **AC-4 to AC-7, AC-9, AC-10, AC-16**
4. Add the client islands: the `description` clamp with "More", Share (native sheet, copy fallback, live message), satisfies **AC-8, AC-11**
5. Add the shadcn Dialog through the CLI and build `sheet-frame.tsx`: bottom sheet and centered dialog frames, glow, motion behind `motion-safe:`, labelled dialog, focus trap and return to the card, Esc and dimmed area close, Close with the exit then `router.back()` (and the `/shelf` fallback), satisfies **AC-12 to AC-14**
6. Loading skeleton and error block (`loading.tsx`, `error.tsx`, `SheetSkeleton`, `SheetError`) and `generateMetadata`, satisfies **AC-15, AC-17**
7. Tests and docs: Vitest for the read layer, formatters, owner order, neutral tint, and each component state; `/design` previews of the real sheet states; update the Game detail sheet section in `docs/design.md` (neutral tint, final component names); Playwright at 360px and 1280px in both languages; update the home and shelf e2e checks that expected the 404, satisfies **AC-20**

## Consequences

**Positive**:
- Every card on home and the shelf now goes somewhere real, in the community's own colors, and links are shareable.
- One shared sheet component serves both the overlay and the page, and feature 21 changes one read function.
- The disabled dock slots straight into feature 7: only the button's enabled state and action change.

**Negative / tradeoffs**:
- The `[locale]` layout gains a `modal` slot, and every future route must keep working with it (its `default.tsx` is now required reading for contributors).
- Closing animates before navigating, so Close takes about 200ms to go back; a very fast Back press is handled by the browser, not the animation.
- The neutral tint is a fixed constant that must be kept in step with the shelf's neutral tile by eye; `docs/design.md` says to use the `--cover-N` color instead, and the build corrects that line.
- The shadcn Dialog is a new component under `src/components/ui/` and a new Base UI surface to keep updated.

**Neutral**:
- The sheet's cover area shows the placeholder for every game until feature 21 stores real covers and the image branch is built.
- Owner rows are plain text until profiles exist; avatars show as initial circles.

## Follow-up

- [ ] Feature 7: enable "I own this" and add or remove the viewer as an owner; feature 6: swap the guest viewer for the session
- [ ] Feature 21: swap `getGameDetail` for Supabase reads, take the tint from `games.cover_tint`, and build the real cover image branch (image host settings and the `GameDetail` cover URL field) in the same change
- [ ] When avatars exist, replace the initial circle with the stored picture and make owner rows link to profiles (feature 20)
- [ ] After the build, `/sync` should add the sheet's file map and the `modal` slot rule to the root `AGENTS.md`, and note that `Link` to `/games/{id}` is now real (spec 0007 AC-1 text about the 404 is stale)
- [ ] Update `docs/design.md`, Game detail sheet section: the no cover rule now uses a fixed neutral tint, not `--cover-N` (done in build task 7)
