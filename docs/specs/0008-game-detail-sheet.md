# 0008. Game detail sheet: the tinted sheet at /games/[id]

**Date**: 2026-11-02
**Status**: In Progress
**Revised**: 2026-11-03 (client side modal, see Decision and AC-21)

## Summary

Tapping a game on home or the shelf opens its detail sheet as a modal on the same page, in the game's own colors (Cover Tint), within half a second and without leaving the page: the modal appears on the tap with the name, tint, and chips the card already has, and the rest fills in when the server answers. The page behind stays where it was, and Back or Close returns to it. A shared link or a direct visit shows the same sheet as a normal page at `/games/{id}`. It reads the same typed dummy data as home and shelf, so feature 21 can later swap the reads for Supabase without touching the components. "I own this" is visible but switched off until feature 7, and Share works now.

## Context

Every card on home and the shelf already links to `/games/{id}`, which today shows the translated 404 (spec 0007, AC-1). The scope (feature 9) wants that link to open a sheet with the cover, name, rating and owner chips, a stats card, the description, every owner, and an "I own this" dock. The look is approved: `docs/design.md` has the full Game detail sheet section (anatomy, Cover Tint colors, frame, and motion), and `src/lib/design/cover-tint.ts` already turns a cover color into the sheet's colors with 4.5:1 text contrast guaranteed.

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
- **AC-1**: `/en/games/{id}` and `/zh/games/{id}` render the sheet for each of the 12 dummy game ids. An id that does not exist, or is not a whole number (`/games/abc`, `/games/0`, `/games/1.5`), shows the translated 404 page with status 404. The modal, which only opens for real card ids, shows the same words inside its frame if its read ever answers "not found".
- **AC-2**: Tapping a game card on home or on the shelf opens the sheet as a modal on that same page, visible within 500ms of the tap (AC-21). The page does not navigate: the URL stays the same (for example `/en/shelf`), the page behind stays rendered and dimmed, and its scroll position is kept. Browser Back (or Close, Esc, a tap on the dimmed area) closes the modal and leaves the page at the same scroll. Forward does not reopen it.
- **AC-3**: A direct visit or a refresh of `/{locale}/games/{id}` renders the same sheet content as a page inside the app shell (header and tab bar stay), on the sheet's tint, with no dimmed backdrop and no `role="dialog"`. Its Close button is a normal link to the shelf. Opening the page version in either language never shows the modal.

*What the sheet shows*
- **AC-4**: Top to bottom the sheet shows: the cover area, a fade into the tint, round Close (top left) and Share (top right) glass buttons, the title (centered, clamped to 2 lines), the two chips, the stats card, the description, the owners list, and the dock. The cover area is `h-[52dvh] max-h-[30rem]` and shows the cover placeholder tile stretched (in this slice no game has a stored cover). The fade reaches solid tint before any text starts, and text never sits on the cover art or placeholder.
- **AC-5**: Every color on the sheet comes from `coverTheme()` through the `--sheet-*` variables set inline on the sheet root. A game with no `cover_tint` (Just One, 三国杀) uses one fixed neutral warm tint instead. No `#hex`, `oklch()`, or `bg-[...]` colors appear in the sheet components. The sheet ignores the device's light or dark setting. For all 12 dummy games and the neutral tint, every text and surface pair reaches 4.5:1 (checked by test through `textSurfaces`).
- **AC-6**: The chips: the rating chip shows a star and the average to exactly one decimal (`8.0`, not `8`) and is hidden when `avg_recommendation` is null; its screen reader text says "8.0 out of 10, from 5 ratings" (pluralized). The owners chip shows a `Users` icon and the owner count, with screen reader text pluralized in both languages ("1 owner", "4 owners"). Numbers go through `format.number`.
- **AC-7**: The stats card shows Players, Minutes, and Owners. Players is `min–max` (`2–4`) or a single number when min equals max (`4`); Minutes works the same way; Owners is the owner count. Any missing value, or a range with only one end known, shows `?` for the unknown end (`?–4` is not allowed: a range with one missing end shows just `?`). Values never wrap (`whitespace-nowrap`, `tabular-nums`).
- **AC-8**: The description is clamped to 4 lines. "More" appears only when the text is actually cut off, expands the full text in place, and becomes "Less". A game with no description (Just One) hides the whole description block, with no placeholder text. Description text shows as stored, in whatever language it was written.
- **AC-9**: The owners list has a heading with the count and one row per owner: a decorative initial circle (the first character of the name, on the sheet's chip fill), the display name, and a quiet "Since {month year}" through `LocalTime`. Rows are ordered oldest link first, ties by name A to Z (compared like the shelf, `compareNames`), then by member id. Every owner is shown, with no cap and no pagination. Rows are not links in this slice. A game with no owners shows one line, "Nobody owns this yet", instead of rows.
- **AC-10**: The dock floats in a blurred pill near the bottom edge, in thumb reach, and never covers the last content (the sheet body has bottom padding for it). It holds a filled "I own this" button and the Share action. In this slice "I own this" is rendered as a disabled button with a visible "Coming soon" hint beside or under it, and screen readers hear both. Nothing on the sheet reads the session; the viewer is the guest from the shell.
- **AC-11**: Share (the top right glass button and the dock action trigger the same behavior): where the browser has a share sheet, it opens with the game name and the game's own link (`/{locale}/games/{id}`, built from the game id, so it is right even from inside the modal on the shelf); otherwise the link is copied and a short "Link copied" message appears for about 2 seconds in an `aria-live="polite"` region. If copying fails, the message says "Could not copy, use the address bar". Cancelling the native share sheet shows nothing. The shared link is always the `/{locale}/games/{id}` URL, never the address of the page behind the modal.

*Modal behavior and look*
- **AC-12**: The modal has `role="dialog"` labelled by the game name, traps focus, closes on Esc and on a tap of the dimmed area, locks the page behind from scrolling, and returns focus to the card that opened it (not to the top of the page). Every control is at least 44px, and focus rings on themed controls use the sheet ink.
- **AC-13**: Close (and Esc, and the dimmed area) closes the modal at once with the 200ms exit, and when the exit ends gives back the history entry the modal added when it opened (`history.back()`, kept off the animation so the router's re-sync cannot make it stutter), so the page behind is exactly as it was and the browser's Back button has nothing extra to undo. The browser's own Back, pressed while the modal is open, closes it the same way. No router navigation happens in either case.
- **AC-14**: On phones (below `md`) the modal is a bottom sheet (`h-[96dvh]`, `rounded-t-[32px]`, dimmed page behind); from `md` it is a centered dialog (`max-w-lg`, `rounded-[28px]`) with a soft blurred glow in the tint behind it. Open: the tapped card grows into the modal (340ms, ease out): the modal starts squeezed into the card's cover box (one uniform scale, so text is never stretched, with its bottom cropped to the card's height by `clip-path`) and animates to its real box, while the backdrop fades in with it. Close: it shrinks back into the card (260ms) and the backdrop fades out in step, then the modal unmounts. The card's box is read when the motion starts, so it works after the page has scrolled; if the card is not in view, the modal slides 40px and fades instead. This is the FLIP technique written with the Web Animations API (`sheet-motion.ts`), with no animation library. With reduced motion the modal appears and disappears with no movement.

*States, text, and data*
- **AC-15**: While the sheet loads, the modal shows the preview of AC-21 (cover block in the card's tint, the title, and the chips from the card, then bars for the stats card, text, and dock) marked `aria-busy` with the label "Loading game". On a direct visit to `/games/{id}` that takes a moment, `loading.tsx` shows the plain skeleton with the same frame. If the read fails or takes more than 10 seconds, the modal shows an error block (icon, "Could not load this game", one line of help, a "Try again" button that asks the server again) in the same frame; on the page version a "Try again" button refreshes the route, and a backstop `error.tsx` renders the same block. Both blocks take their strings as props so `/design` can preview them with no message provider.
- **AC-16**: All text comes from a new `game` namespace in `messages/en.json` and `messages/zh.json` with the same keys (checked by `src/i18n/messages.test.ts`). Counts use ICU plurals. Client islands get their few strings as props from the server component, so `IntlClientProvider` in the layout does not grow. Game names, descriptions, and member names show as stored.
- **AC-17**: `generateMetadata` sets the page title to the game name (through the existing title template), the description to the first 160 characters of the game's description (or the generic sheet description when there is none), and `alternates: await getAlternates("/games/{id}")`. An unknown id returns the not found metadata. No image card and no JSON-LD in this slice.
- **AC-18**: The sheet makes no database call in this slice. It reads through `getGameDetail(id)` in `src/lib/games/detail.ts`, built from the dummy arrays, and the row types come from `database.types.ts` so a removed or retyped column fails `pnpm typecheck`. The dummy data gains `description`, `players_min`, `players_max`, `play_time_min`, `play_time_max` for 11 games (三国杀 gets a Chinese description); Just One keeps them all null so the `?` and no description states are real data.
- **AC-19**: The 12 dummy ids are prebuilt for both languages (`generateStaticParams`), and `pnpm build` passes with Cache Components on. Any other id renders on demand and shows the 404.
- **AC-21**: Instant, same page open. Every game card on home and the shelf is a `SheetLink`: it still renders a normal link to `/{locale}/games/{id}` (so open in new tab, copy link, and no JavaScript all work), and a plain left tap does not navigate: it opens the modal. A small client store records the card's `id`, `name`, `coverTint`, `ownerCount`, and `avgRecommendation`, and a single client `SheetHost` in the `[locale]` layout owns the one Dialog. It opens in the same frame as the tap, with no wait for the server, and shows the preview of AC-15. The full sheet is read in the background through one Server Action, `loadGameSheet(id, locale)`, which renders the same `GameSheet` server component on the server and returns it; the host swaps it in for the preview inside the same open dialog, with no second animation and no flicker. Pointer hover, keyboard focus, and touch start on a card start that read early, a result is remembered for the visit (per language), and a repeat open of the same game shows the sheet in the first frame. The modal adds one history entry with the same address when it opens (AC-13), and the URL never changes. Command or Ctrl click, middle click, and Shift click keep the normal link behavior. Timing is checked by Playwright: the modal is visible within 500ms of the tap, and the sheet is in place within 1500ms on a cold open, at 360px and 1280px, in both languages, on `pnpm dev` and on a production build.
- **AC-22**: A clean close. Closing the modal by a tap on the dimmed area, by Esc, or by Close must look and feel smooth, with no glitch in the page behind it. In the 1 second after the close starts: the page behind does not move, shift, or flicker (the page's layout shift score stays 0, the page width does not change, and `scrollY` is the same as before the modal opened); the modal does not reopen (the dialog count stays 0), and the tap does not also activate a card under the pointer; no network request is made; and the browser console shows no error or warning. The same holds on a mouse and keyboard desktop with classic scrollbars (Windows) and on a phone, in `pnpm dev` and on a production build. The dimmed backdrop fades out in step with the sheet (same duration and easing) and never gets darker again while the modal is closing, and on phones the sheet slides out (it does not vanish). Found by the owner on 2026-11-03 as a visible flash when closing, on the client only, with no request returned. Cause, measured: the stock backdrop fade ended at about 170ms and then snapped back to full dark for a frame before unmount, and the phone sheet had no slide because its transition named `transform` while Tailwind 4 animates the `translate` property. Fixed with a backdrop timed like the sheet and `transition-[translate,opacity]`; both later moved into the card to modal motion (AC-14), where the backdrop fades with the same timing and only the modal's own animation moves it.
- **AC-20**: Checks: Vitest covers the read layer, the stat formatters, the owner order, the neutral tint contrast, and the component states (each of AC-6 to AC-10, AC-15, and the store, `SheetLink`, and preview of AC-21). Playwright at 360px and 1280px, in both languages, covers AC-1 to AC-3, AC-12 to AC-14, and AC-21 on the real modal. `/design` gets previews of the real sheet in four states: complete, no tint, no description and no ratings, no owners (the states the dummy data cannot all reach on the live route), plus the skeleton and the error block. The home and shelf e2e checks that expected the 404 for card links are updated.

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

### Option 4: Client side modal with a server rendered sheet (added 2026-11-03, chosen)

A tap does not navigate. A client store opens one Dialog from the card's own data, and a Server Action renders the same `GameSheet` server component and returns it for the modal to show. The modal adds one history entry with the same URL so Back closes it. `/games/[id]` stays as a plain page for direct visits and shared links, with no parallel slot and no interception.

**Pros**:
- The modal appears in one frame on the tap, whatever the server does, and the URL and the page behind never change.
- There is still one `GameSheet`: the Server Action renders it, so there is no second client copy of the sheet, and feature 21 changes one read function.
- No parallel routes, slot files, or layout `modal` prop; nothing for future routes to keep working with.
- Details are fetched on hover, focus, and touch, so many opens are instant, and a card list stays light (it carries only name, tint, owner count, and rating).

**Cons**:
- The history entry (the same URL pushed on open, `history.back()` on close) is hand written, the part Option 2 warned about. It is small and one way (open pushes, close pops), and it is covered by the Playwright checks for Back, Esc, and refresh.
- Forward does not reopen the modal, and a refresh while it is open shows the shelf, not the sheet. Both are accepted: the shareable address is `/games/{id}`.
- A Server Action has no route, so the language is passed in as an argument (`next/root-params` does not work there).
- Server Actions run one at a time per browser, so many early reads queue; each one is small.

### Why Option 4 (2026-11-03)

The first build (Option 1) opened the overlay only after a server round trip and a page transition, which the owner found too slow (about 3 seconds in `pnpm dev`) and not what they wanted: they asked for a pop-up on the same page, not a move to another link. A hybrid that kept the intercepting route (open at once, then wait for the route) was drafted and dropped for the same reason. Option 4 is the owner's choice: a modal on the same page, fetching details on demand.

## Decision

**Chosen option**: Option 4: Client side modal with a server rendered sheet

One shared server `GameSheet` renders both as the page at `/games/[id]` (direct visit, refresh, shared link) and inside the modal. A card tap does not navigate: a `SheetLink` records the card in a small client store, one `SheetHost` in the `[locale]` layout opens a shadcn Dialog at once with a preview, and the Server Action `loadGameSheet(id, locale)` returns the rendered `GameSheet` for the host to show. Read data through `getGameDetail(id)`, style from the `--sheet-*` variables, and keep only the host, the store, `SheetLink`, Share, "More", and Close as small client code.

**Implementation skills**: `shadcn` (`shadcn-ui/ui`, `.claude/skills/shadcn/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `vercel-composition-patterns` (`vercel-labs/agent-skills`, `.claude/skills/vercel-composition-patterns/`)

## Rationale

The visitor has to keep their place on a long grid and still be able to share a game, and the owner wants a pop-up that opens at once on the same page. A modal that never navigates keeps the page, its scroll, and its state untouched, and a game's own address (`/games/{id}`) still works for sharing and for a direct visit. The cost is a small hand written history entry, which one way push and pop keeps simple. Option 1 (the intercepting route) was built first and dropped: every open waited on the server and a page transition. Option 3 (page only) loses the place on Back.

The modal base is the shadcn Dialog (Base UI). The focus trap, Esc, scroll lock, and inert background are exactly the edge cases that are costly to get right by hand, and `components/ui` can only be extended through the shadcn CLI anyway. A native `<dialog>` was the runner up: no dependency, but the animations and focus return need more hand work. Because the Dialog is opened from a store (no trigger button), focus return is set up on purpose: the tap records the card link and the host hands it to the Dialog as the final focus target.

Strings reach the client islands as props rather than through the layout's `IntlClientProvider`, the same pattern the shelf error block uses. The layout keeps shipping only what every page needs.

## Feature design

**Data model sketch**: no schema change. The sheet reads existing tables.

| Piece | Source | Fields |
|---|---|---|
| `DummyGame` (new, in `types.ts`) | `ShelfGame` plus `Pick<games row, "description" \| "players_min" \| "players_max" \| "play_time_min" \| "play_time_max">` | existing shelf fields plus the five new ones |
| `GameDetail` (returned by `getGameDetail`) | built from `DummyGame`, `dummyOwners`, `dummyProfiles` | `id`, `name`, `description`, `playersMin/Max`, `playTimeMin/Max`, `coverTint`, `avgRecommendation`, `ratingCount`, `ownerCount`, `owners` |
| `GameOwner` | `game_owners` joined to `profiles` | `memberId`, `displayName`, `since` (the link's `created_at`) |

`getGameDetail(id)` returns `GameDetail`, or `null` for an id that is not a positive whole number or not in the data. `ownerCount` is derived from the owner rows. `dummyGames` is retyped as `DummyGame[]`; `ShelfGame` consumers keep working because `DummyGame` extends it. Feature 21 swaps the body of `getGameDetail` for a Supabase read, and the cover tint then comes from `games.cover_tint`.

**State transitions**: none on the server. The host has one client state: closed, then open with the preview (loading), then open with the real sheet (ready), or open with the error or not found block, then closing (200ms exit) and cleared. Open pushes one history entry (same URL); Close pops it with `history.back()`; the browser's Back that pops it closes the modal. The "More" toggle and the Share message are local component state.
**File and route shape**:
- `src/app/[locale]/games/[id]/page.tsx` (the page version for direct visits and shared links), with `loading.tsx` and `error.tsx` beside it. No parallel slot and no intercepting route.
- `src/app/[locale]/layout.tsx` renders `SheetHost` after the app shell (the modal must sit above the shell, so it renders outside `<main>` but inside the intl provider), with its few strings as props.
- `src/components/game-sheet/`: `sheet-motion.ts` (the card to modal motion), `game-sheet.tsx` (server, shared by the page and the modal), `actions.tsx` (the Server Action `loadGameSheet`), `sheet-store.ts` (the client store: open, close, prefetch, result cache, history entry), `sheet-link.tsx` (client link used by `ShelfCard`, `JustAdded`, and `TopRated`), `sheet-host.tsx` (client: owns the Dialog), `sheet-preview.tsx` (the first frame from card data), `share-button.tsx`, `description.tsx` (client, "More"), `owners-list.tsx`, `stats-card.tsx`, `sheet-skeleton.tsx`, `sheet-error.tsx`, `close-button.tsx` (modal), `close-link.tsx` (page), and `intl.ts` (translations with an explicit language for the action).
- `src/lib/games/detail.ts` (`getGameDetail`, `buildGameDetail`, `formatRange`) and its test; `src/lib/games/neutral-tint.ts` (the neutral tint constant, safe for client code).

**API surface**:
| Surface | Kind | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/{locale}/games/{id}` | page (direct visit, refresh, shared link) | `id` (route param, whole number) | the sheet as a page | public | 404 for an unknown or invalid id |
| `loadGameSheet` | Server Action | `id: number`, `locale: string` | the rendered `GameSheet` plus its tint, or `notfound`, or `error` | public | any throw becomes `error` (shows the error block) |
| `getGameDetail` | server read | `id: string` | `GameDetail \| null` | public | throws on a read failure |
| Share | client action | none (the game id gives the link) | native share sheet or a copied link | none | clipboard refused: message shown |

There are no mutations. Nothing writes to the database in this feature.

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Open sheet | which game | the tapped card's `id` (modal), or the `id` route param parsed to a positive whole number (page) |
| Open sheet | language of the sheet text | the page's language through `useLocale()` at the tap, passed to the action; the page version reads it from the URL |
| Open sheet | sheet colors | `coverTheme(cover_tint)`; for a null tint, the constant `NEUTRAL_SHEET_TINT` in `detail.ts` |
| Open sheet | title, description | `games.name`, `games.description` |
| Chips | rating (one decimal) | `avg_recommendation` via `format.number` |
| Chips | rating count (screen reader text) | `rating_count` |
| Chips and stats | owner count | count of the game's `game_owners` rows |
| Stats | Players, Minutes | `players_min/max`, `play_time_min/max`; `formatRange` |
| Owners list | name, initial | `profiles.display_name`; initial from `coverInitial(display_name)` |
| Owners list | "Since" date | `game_owners.created_at`, shown with `LocalTime` |
| Owners list | order | `created_at` ascending, then `compareNames`, then member id |
| Share | the shared link | `/{locale}/games/{id}` built from the game id and language, made absolute with `window.location.origin` (on the page version this equals the current URL) |
| Share | shared title | the game name (a prop from the server) |
| Close | where to go | modal: stay on the page and pop the history entry the modal added; page version: a `/shelf` link |
| Metadata | page title, description | game name; first 160 characters of `description`, else the `game.meta.description` message |
| Focus return | the element to refocus | the tapped `SheetLink`, captured in the store on the tap |
| Instant preview | name, tint, owner count, rating | the card's `name`, `coverTint`, `ownerCount`, `avgRecommendation`, recorded by `SheetLink` on the tap |

**Key invariants**:
- Every color on the sheet comes from `coverTheme()`; no other color source (AC-5).
- The page and the modal render the same `GameSheet` server component, so content never differs between them.
- The neutral tint passes the same contrast test as every cover tint.
- The modal closes by exactly one path (`closeSheet`: close the dialog, pop the history entry), so Esc, the dimmed area, and Close cannot disagree. The browser's Back reaches the same state through `closeFromBack`.
- There is exactly one Dialog. The preview and the real sheet are two children of it, never two dialogs, so the open motion plays once.
- The modal never navigates and never changes the URL; it only adds and removes one history entry that has the same address.
- The preview shows only what the card already shows (name, tint, owner count, rating). Nothing in it comes from a second source, so it can never disagree with the real sheet.
- Dates only through `LocalTime`; links only through `@/i18n/navigation`; client code gets strings as props.

**Security model**: public read, no sign in, no writes. Game names, descriptions, and member display names are plain text rendered by React (escaped), never as HTML. The shared link and the share title contain only public data. No personal data beyond the display name already shown on the shelf; no compliance scope. The viewer is the guest from the shell until feature 6.

**Configuration required**: none. The `NEXT_PUBLIC_SITE_URL` the metadata already uses is unchanged.

**Critical test scenarios** (each maps to an acceptance criterion):
- Happy path: from the shelf tap Wingspan, the modal opens within 500ms with its tint, 4 owners, rating `8.0`, the URL still `/en/shelf`; Back closes it and the shelf is at the same scroll, verifies **AC-2, AC-4, AC-6, AC-9, AC-13, AC-21**
- Happy path: open `/zh/games/12` directly, the page version shows 三国杀 in Chinese with the neutral tint and a Chinese description, verifies **AC-3, AC-5, AC-16, AC-18**
- Failure case: `/en/games/999`, `/en/games/abc`, `/en/games/0` show the translated 404 with status 404, verifies **AC-1**
- Edge case: Just One shows `?` stats, no rating chip, and no description block; a game with no owners shows "Nobody owns this yet", verifies **AC-6 to AC-9**
- Edge case: tap Share with and without a native share sheet, and with the clipboard refused, verifies **AC-11**
- Accessibility: Tab stays inside the modal, Esc closes it, and focus returns to the tapped card, verifies **AC-12**
- Motion: with reduced motion the modal opens and closes with no movement, verifies **AC-14**
- Contrast: all 12 dummy tints plus the neutral tint pass `textSurfaces` at 4.5:1, verifies **AC-5**
- Failure case: `getGameDetail` throws, the error block shows and "Try again" asks again, verifies **AC-15**
- Build: `pnpm build` prerenders the 12 ids in both languages, verifies **AC-19**
- Timing: tap Wingspan on the shelf; the modal is visible within 500ms and the real sheet within 1500ms, in both languages at 360px and 1280px, verifies **AC-2, AC-21**
- Edge case: a tap with Cmd or Ctrl, or a middle click, opens the game page in a new tab and does not open the modal; hovering a card starts the read early and a repeat open shows the sheet in the first frame; a slow or failed read keeps the preview and then shows the error block, verifies **AC-15, AC-21**
- Clean close: open a game, then close it by a tap on the dimmed area, by Esc, and by Close; for 1 second after each, record layout shifts (a `layout-shift` performance observer), the page width, `scrollY`, network requests, console messages, and the dialog count, and compare screenshots of the page behind before and after, verifies **AC-22**. Headless Chromium hides scrollbars by default, so this check runs with scrollbars shown to cover the Windows case.
- Edge case: open the modal, press the browser's Back, and the page is unchanged; open it again and press Close, and the next Back leaves the page as normal, verifies **AC-13**

## Build plan

Order follows the project's Tracer Bullet approach, front end first on dummy data: prove the riskiest thread (a client modal that opens from a card, with a Server Action returning the server rendered sheet, inside `[locale]` with Cache Components) before styling, then thicken one strand at a time.

1. Thin thread: extend the dummy data and types (`DummyGame`, five new fields, 11 filled, Just One blank), add `detail.ts` with `getGameDetail`, and a bare `/games/[id]/page.tsx` that prints the game name, with the translated 404 for invalid ids and `generateStaticParams` for the 12 ids, satisfies **AC-1, AC-18, AC-19**
2. Stand up the modal: add the client store, `SheetLink`, and `SheetHost` with a plain dialog, and the Server Action `loadGameSheet(id, locale)`; prove that tapping a card from home and from the shelf opens the modal on the same page with the URL unchanged, Back closes it, and a direct visit shows the page, satisfies **AC-2, AC-3, AC-21**
3. Build the `GameSheet` server component to the full anatomy: theme variables, cover placeholder and fade, glass buttons, title, chips, stats card with `formatRange`, owners list, and the disabled dock; add the `game` messages in both languages, satisfies **AC-4 to AC-7, AC-9, AC-10, AC-16**
4. Add the client islands: the `description` clamp with "More", Share (native sheet, copy fallback, live message), satisfies **AC-8, AC-11**
5. Add the shadcn Dialog through the CLI and build the frame in `sheet-host.tsx`: bottom sheet and centered dialog, glow, motion behind `motion-safe:`, labelled dialog, focus trap and return to the card, Esc and dimmed area close, Close popping the history entry, satisfies **AC-12 to AC-14**
6. Loading skeleton and error block (`loading.tsx`, `error.tsx`, `SheetSkeleton`, `SheetError`) and `generateMetadata`, satisfies **AC-15, AC-17**
6c. Card to modal motion (added 2026-11-03): `sheet-motion.ts` (the FLIP frames and `animateOpen`/`animateClose`), a `closing` phase in the store so the modal stays mounted while it shrinks back, and the host starting the motion from the tapped card's current box; test the frame maths and that the modal starts on the card and returns to it, satisfies **AC-14, AC-22**
6b. Instant open (added 2026-11-03): the preview from card data, hover, focus, and touch prefetch, the per language result cache, the 10 second timeout, and switching `ShelfCard`, `JustAdded`, and `TopRated` to `SheetLink`; measure the time to the modal and to the sheet and fix anything above the AC-21 limits, satisfies **AC-2, AC-15, AC-21**
7. Tests and docs: Vitest for the read layer, formatters, owner order, neutral tint, and each component state; `/design` previews of the real sheet states; update the Game detail sheet section in `docs/design.md` (neutral tint, final component names); Playwright at 360px and 1280px in both languages; update the home and shelf e2e checks that expected the 404, satisfies **AC-20**

## Consequences

**Positive**:
- Every card on home and the shelf now opens a real sheet on the same page, in the community's own colors, and each game has a shareable link.
- One shared sheet component serves both the modal and the page, and feature 21 changes one read function.
- The disabled dock slots straight into feature 7: only the button's enabled state and action change.

**Negative / tradeoffs**:
- The modal's history entry is hand written. A refresh while the modal is open shows the page behind it (not the sheet), and Forward does not reopen the modal.
- Home and shelf cards gain a small client link wrapper (`SheetLink`), and a Server Action returns rendered UI, so the sheet's language must be passed in by hand (`next/root-params` does not work in a Server Action).
- Server Actions run one at a time per browser, so early reads on hover queue. Each read is small, and a result is cached for the visit.
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
- [x] Close glitch (AC-22): measured and fixed (backdrop flash and the phone slide). Layout shift, reopen, requests, and console were measured clean on a desktop with scrollbars shown, but the shelf was too short to scroll there, so a taller page with a scrollbar is still unmeasured.
- [x] After build task 6b, update the Game detail sheet section of `docs/design.md`: it still names an intercepting route; it should describe the client modal (`SheetLink`, `SheetHost`, the preview, `loadGameSheet`)
- [ ] When the shelf holds hundreds of games, render only the cards in view (a virtualized or lazily rendered grid). Not needed for the 12 dummy games, and feature 21 is the natural time
- [ ] Update `docs/design.md`, Game detail sheet section: the no cover rule now uses a fixed neutral tint, not `--cover-N` (done in build task 7)
