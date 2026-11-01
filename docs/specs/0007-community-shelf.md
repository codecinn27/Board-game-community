# 0007. Community shelf: the All games grid and the By owner view

**Date**: 2026-11-01
**Status**: In Progress

## Summary

`/shelf` becomes the real shelf: a grid of every game the group owns, listed A to Z, with a two option switch (All games, By owner) built to the approved canvas mock. It reads the same typed dummy data as the home page, so feature 21 can later swap the reads for Supabase without touching the components. The work is split in two parts of one feature: part 1 builds the All games grid, the switch, and the empty, loading, and error states, with By owner showing a placeholder; part 2 builds the By owner view itself and is specced here so nothing is invented later.

## Context

Today `/shelf` is the tracer bullet from the first build: a bare bulleted list of names and owner counts read straight from the database. It proved the stack works, but a visitor cannot browse it. The scope (feature 8) wants every game as a mobile friendly grid of covers with name, owner count, and average recommendation, a switch to a by owner view, and empty and loading states. Home (spec 0006) already links its "See all" and "Browse the shelf" buttons here, and every card on home and the shelf points at `/games/{id}`, which feature 9 builds.

Slice 1 is front end first: the screens are built on hardcoded data until the design feels right, then feature 21 wires the database. Spec 0006 set the pattern: table shaped dummy rows (`src/lib/games/dummy-data.ts`), pure functions that compute what the page shows, and an async `get...` wrapper that feature 21 will re point. The shelf must use the same data so home and shelf always agree.

The project runs Next.js with Cache Components on (`cacheComponents: true`), so a page that reads `searchParams` (needed for a URL based switch) has to read it inside a `Suspense` boundary, or the build fails. The shell, the language menu, and the `LocalTime` rule are already in place. `docs/design.md` defines the game card and the empty, loading, and error blocks, and the canvas mock differs from it in a few small places (decided below).

## Requirements

**User stories**:
- As a visitor, I want to see every game the group owns as a grid of covers, so I can scan the whole collection before I buy.
- As a visitor, I want each card to show how many people own the game and how well it is rated, so I know what is easy to borrow and what is good.
- As a visitor, I want to switch to a by owner view, so I can see what a given member owns.
- As a visitor, I want a clear message when the shelf is empty, still loading, or failed to load, so the page never looks broken.

**Acceptance criteria** (the contract; AC-1 to AC-12 are part 1, AC-13 to AC-15 are part 2):

*Part 1: All games*
- **AC-1**: `/en/shelf` and `/zh/shelf` render an `h1` "Shelf" with the game count next to it ("12 games"), the view switch, and a grid with one card per game. Each card is one whole link (cover tile, name, and meta row) to `/games/{id}` in the current language, through `Link` from `@/i18n/navigation`. Until feature 9 ships, that path shows the translated 404.
- **AC-2**: A card shows the `CoverTile` (decorative, `aria-hidden`), the name clamped to 2 lines, and one meta row. The meta row has the owner count with a `Users` icon (visible as an icon and a number, with `sr-only` text so screen readers hear "1 owner" or "2 owners", pluralized in both languages) and, only when `avg_recommendation` is not null, a star with the average to exactly one decimal (8.0, not 8), whose visible text is `aria-hidden` and followed by `sr-only` text, so screen readers hear "8.5 out of 10". A game with no average shows no rating text at all (Just One shows only its owner count).
- **AC-3**: Cards are ordered by name A to Z: names compared by code point (not by UTF-16 unit) after lowercasing, ties by `id` ascending. The order is the same in `/en` and `/zh`. With the dummy data it is: Ark Nova, Azul, Cascadia, Codenames, Dixit, Just One, Magical Athlete, SETI, Splendor, Ticket to Ride, Wingspan, 三国杀.
- **AC-4**: The grid has 2 columns below `sm` (640px), 3 from `sm`, 4 from `md` (768px), and 6 from `lg` (1024px). Tiles are square. At 360px wide there is no horizontal page scroll in either language, and every card and switch item is at least 44px tall.
- **AC-5**: The switch is a `nav` with two links, "All games" and "By owner", styled as a two part segmented control. "All games" goes to `/shelf`, "By owner" to `/shelf?view=owner`, both in the current language. The current one has `aria-current="page"`. Any other `view` value, a repeated `view`, or no value shows All games. The language menu keeps the query, so the chosen view survives a language change.
- **AC-6**: In part 1, the By owner view shows a placeholder block (icon, title "By owner is coming soon", one line of help) and no grid. The count (still the total number of games, "12 games") and the switch stay visible. Part 2 replaces this block (AC-13).
- **AC-7**: With zero games, the page shows the `h1` and the empty block only (icon, title "The shelf is empty", a line saying members can add games and they show up here). The count and the switch are hidden, there is no button, and both views show the same empty block.
- **AC-8**: While the shelf content loads, the page shows the real `h1` (it sits outside `Suspense`), a grey bar where the count goes, a grey block shaped like the switch, and 6 grey cards with the same footprint as real cards (square tile, name line, meta line), marked `aria-busy` with the label "Loading games". This is the `Suspense` fallback, which wraps the count, the switch, and the grid. One skeleton serves both views. The same skeleton is previewed on `/design`.
- **AC-9**: If `getShelfData` throws, the shelf content catches it and shows the `h1` "Shelf" and the empty block layout with a `destructive` icon, the title "Could not load the shelf", one line of help, and a "Try again" button that refreshes the route (`router.refresh()` in a transition) so the read runs again. A backstop `error.tsx` for any other throw renders the same `ShelfError` and calls the boundary's `retry()` (Next 16 re-fetches; `reset()` would not). `ShelfError` takes its strings as props, so `/design` previews it with no message provider.
- **AC-10**: All text comes from the `shelf` namespace in `messages/en.json` and `messages/zh.json` with the same keys (listed in *Feature design*). Counts use ICU plurals and numbers go through next-intl `format.number`. `generateMetadata` keeps the title "Shelf" and the description, and returns `alternates: await getAlternates("/shelf")` (the By owner view uses the same canonical). Game and member names show as stored.
- **AC-11**: The shelf makes no database or network call. It reads `src/lib/games/dummy-data.ts` through `getShelfData()` in `src/lib/games/shelf.ts`, which replaces the tracer `getShelfGames`. Cards are built from the existing `ShelfGame` type, so a removed or retyped column fails `pnpm typecheck`.
- **AC-12**: In the light theme (the site has no dark theme), at 360px and 1280px, in both languages, the cover tint, ink, and text reach 4.5:1 (the tile rules of spec 0006, AC-6), and focus rings are visible on every link. Browser checks in `e2e/` cover AC-1 to AC-6. AC-7 to AC-9 cannot be reached in a browser on dummy data, so Vitest component tests cover them through the sync `ShelfContent` component and the `/design` previews.

*Part 2: By owner*
- **AC-13**: The By owner view lists one section per member who owns at least one game, members A to Z by `display_name` (same comparison as AC-3, ties by `id`). Each section has a heading row (a 36px round avatar with the first character of the name, the member name as an `h2`, and "5 games" pluralized) and a row of that member's games A to Z. With the dummy data: Arif (5), Jun (5), Mei (5), Sara (6). A member who owns nothing is not listed. If no member owns anything, the page shows the AC-7 empty block.
- **AC-14**: A member's row scrolls sideways inside itself at every width and never scrolls the page. Each item is a link to `/games/{id}` made of a `CoverTile` (96px square below `md`, 120px from `md`) and the name clamped to 2 lines. The avatar color is `bg-cover-N` where N is derived from the member id (sum of its character codes, modulo 6, plus 1) and picked from a static array of the six full class names, with `text-foreground` ink.
- **AC-15**: The By owner view uses the same loading skeleton and the same error handling as All games (AC-8, AC-9), and `shelf.byOwner.soon.*` is removed from both message files with the placeholder.

## Options considered

### Option 1: One client component with `useState` for the switch

A client component holds the chosen view in state and renders both panels.

**Pros**:
- Smallest change; no `Suspense` boundary around the page.
- Instant switching with no navigation.

**Cons**:
- The view resets on reload and a link cannot point at By owner.
- Both views ship in the client bundle, and the switch loses the prefetch and Back button behavior of links.

### Option 2: The view in the URL (`?view=owner`), rendered on the server

The switch is two links; the page reads `searchParams` and renders one view as a Server Component, inside `Suspense`.

**Pros**:
- Shareable and reload safe; the Back button works.
- Views stay Server Components, no client JavaScript for the grid.
- The `Suspense` fallback is a real, visible loading state, which the scope asks for.

**Cons**:
- With Cache Components on, reading `searchParams` needs the `Suspense` boundary, and the content part is rendered per request instead of fully prerendered.
- A query string, not a clean path.

### Option 3: Separate routes (`/shelf` and `/shelf/owners`)

Two pages sharing a layout that holds the heading and the switch.

**Pros**:
- Clean URLs and each page is its own static route.

**Cons**:
- A shared layout means the switch must read the pathname on the client to mark the active tab.
- More files for a two option switch, and `/shelf/owners` has to be added to alternates, the sitemap, and the nav tests.

## Decision

**Chosen option**: Option 2: The view in the URL, rendered on the server.

The shelf page reads `?view` on the server inside `Suspense`, renders the All games grid or the By owner view from typed dummy data through `getShelfData()`, and keeps the switch as two plain links. The build is split into part 1 (All games and the states) and part 2 (By owner).

**Implementation skills**: `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `vercel-composition-patterns` (`vercel-labs/agent-skills`, `.claude/skills/vercel-composition-patterns/`) · `shadcn` (`shadcn-ui/ui`, `.claude/skills/shadcn/`)

**Design source**: the approved mock on the [Game Detail Sheet canvas](https://claude.ai/artifact/PBVkW9skcPLVmEjDbS8Bog), boards `ShelfPhone.dc.html` (390 wide), `ShelfDesktop.dc.html` (1280 wide), and `ShelfStates.dc.html` (loading and empty), built with `docs/design.md`. The sizes that matter are copied into *Layout* below. Where the mock and this spec differ, this spec wins: names clamp to 2 lines (the mock cuts at 1), unrated games show no text (the mock says "No ratings yet"), cover tiles are `CoverTile` (the mock draws throwaway shapes), the owner count is an icon and a number with an accessible label, the order is A to Z by code point, the empty block has no "Sign in" button (feature 6 owns sign in), and the Sign in tab is not part of this feature.

## Rationale

The scope wants "every game, then the by owner view" and the project wants the switch to feel like a normal web page. A URL param gives a shareable, reload safe switch with no client state, and it makes the `Suspense` fallback a real loading state instead of a state nobody can ever see on dummy data. Separate routes would cost a client side active tab check and more routing to maintain for two options. A client `useState` switch is the smallest, but it throws away the URL, and a by owner link is exactly the kind of thing a group chat wants to share.

Reading from the same dummy data as home keeps three features (15, 8, 9) in agreement and keeps feature 21 a swap of read function bodies. Owner counts are derived from the owner links, never typed into each game, because that is what the `game_stats` view does. The tracer `getShelfGames` has no caller after this change and is removed; feature 21 writes the real reads again, on purpose, behind the same `getShelfData` signature.

A to Z by code point is the same rule in both languages, easy to test, and the same family as the tie break in spec 0006. Its cost is that Chinese names sort by character number, not pinyin, and sit after the Latin names. With one Chinese game that is invisible; if the group grows many, switching to a locale aware comparison is a change in one function (`compareNames`), noted in *Follow-up*. Showing no text for an unrated game follows `docs/design.md` and keeps the meta row short on a 360px phone in two languages.

No pagination, on purpose. The rule "every list paginates" is about endpoints that can return unbounded rows; this page reads a small, hand made collection from dummy data, and the real read in feature 21 decides paging against a measured size. Splitting the work into parts keeps the first pass to what the scope's "done when" asks for, while the By owner rules are decided now so part 2 is a build, not a design.

## Feature design

**Data model sketch** (no migration, no schema change; types come from `src/lib/games/types.ts`):

```ts
// src/lib/games/shelf.ts (replaces the tracer query)
export type ShelfCard = {
  id: number;
  name: string;
  coverTint: string | null;
  ownerCount: number;
  avgRecommendation: number | null;
};
// part 2
export type OwnerGame = { id: number; name: string; coverTint: string | null };
export type OwnerShelf = { memberId: string; name: string; games: OwnerGame[] };

export type ShelfData = { games: ShelfCard[] };            // part 1
// part 2 adds: owners: OwnerShelf[]

/** Name A to Z: `toLowerCase()` (not the locale version), then compare `Array.from(name)` by `codePointAt(0)` one character at a time (the shorter wins a tie). Ties by id ascending are broken by the caller. */
export function compareNames(a: string, b: string): number;
/** Pure: everything the shelf shows, from the row sets. */
export function buildShelfData(games: ShelfGame[], profiles: DummyProfile[], owners: DummyOwner[]): ShelfData;
/** Today: buildShelfData over the dummy arrays. Feature 21 swaps this body for Supabase reads. */
export async function getShelfData(): Promise<ShelfData>;
```

Relationships: owner `game_id` to game `id` (N:1), owner `member_id` to profile `id` (N:1). The dummy set is the one in spec 0006 (12 games, 4 profiles, 21 owner links). `ownerCount` counts owner links per game. No new columns.

**State transitions**: none. The only state is the `view` search param: absent or `all` means All games, `owner` means By owner, anything else means All games.

**Surface** (no HTTP API; one route, read functions, and components):

| Piece | Kind | Inputs | Outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/{locale}/shelf` | Page (Server Component) | `searchParams` promise, passed down unread | `h1` plus `Suspense` around `ShelfLoader` (a page level `await` would fail the build under Cache Components) | public | any other throw goes to `error.tsx` |
| `getShelfData()` | async read | none | `ShelfData` | public | throws on a read failure (feature 21) |
| `buildShelfData()` | pure | games, profiles, owners | `ShelfData` | n/a | none |
| `compareNames()` | pure | two names | number for `sort` | n/a | none |
| `ShelfContent({ data, view })` | sync Server Component | `ShelfData`, parsed `view` | count, switch, and the view | n/a | none |
| `ShelfLoader({ searchParams })` | async Server Component | the unread `searchParams` promise | awaits `view` and `getShelfData()`, renders `ShelfContent` or `ShelfError` | public | catches a read failure, shows `ShelfError` |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Header | game count "12 games" | `ShelfData.games.length` |
| Card | name, cover tint | `ShelfGame.name`, `ShelfGame.cover_tint` |
| Card | owner count | derived: count of `DummyOwner` rows with that `game_id` |
| Card | average, one decimal | `ShelfGame.avg_recommendation`, formatted by `format.number` with 1 fixed decimal; hidden when null |
| Card | link target | `/games/{ShelfGame.id}` through `@/i18n/navigation` |
| Card | tile letter and colors | `coverInitial(name)` and `coverTheme(cover_tint)` through `CoverTile` (spec 0006, AC-6) |
| Order | A to Z | `compareNames(name)`, then `id` ascending |
| Switch | active view | `searchParams.view`, parsed server side (unknown value means All games) |
| Switch | link targets | `/shelf` and `/shelf?view=owner`, locale from the current URL |
| Part 2 member heading | member name, game count | `DummyProfile.display_name` joined by `member_id`; count of that member's links |
| Part 2 member avatar | first character, color | `coverInitial(display_name)`; one of six full class names (`bg-cover-1` to `bg-cover-6`) held in a static array and indexed by N from the member id (AC-14); Tailwind cannot generate a class built at runtime |
| Part 2 member games | their games A to Z | owner links filtered by `member_id`, joined to games, sorted by `compareNames` |
| Empty and error text | titles and help | `shelf.*` messages (below) |

**Key invariants**:
- `getShelfData` never calls the database or the network in this slice.
- A game appears once in the grid, even with several owners; the count is the number of owner links.
- Order is deterministic: the same input gives the same list in both languages.
- The page never awaits `searchParams`; only `ShelfLoader`, inside `Suspense`, does (Cache Components rule).
- A cover tile is decorative (`aria-hidden`); the link text carries the name.
- Part 2 only: a member is listed only if they own at least one game, and each of their games appears once.

**Security model**: public read, no sign in. The dummy data has no personal data beyond first names that are already on the home page. No write paths. When feature 21 reads the real tables, row level security already allows public read (spec 0002).

**Configuration required**: none. No env vars, no new packages. Two shadcn components (`empty`, `skeleton`) are added with the shadcn CLI (never by hand, because `src/components/ui/` is generated).

**Messages** (new `shelf` keys, same in `en.json` and `zh.json`; Chinese wording is a draft for the native reader check; `shelf.meta.*` already exists):

| Key | English | Chinese (draft) |
|---|---|---|
| `shelf.heading` | Shelf | 游戏架 |
| `shelf.count` | `{count, plural, one {# game} other {# games}}` | `{count, plural, other {# 款游戏}}` |
| `shelf.switch.label` | Show games | 显示方式 |
| `shelf.switch.all` | All games | 全部游戏 |
| `shelf.switch.owner` | By owner | 按主人 |
| `shelf.card.owners` | `{count, plural, one {# owner} other {# owners}}` | `{count, plural, other {# 位主人}}` |
| `shelf.card.ratingLabel` | `{rating} out of 10` | `{rating} 分（满分 10）` |
| `shelf.empty.title` | The shelf is empty | 游戏架还是空的 |
| `shelf.empty.body` | Nobody has added a game yet. Members can add the games they own, and they show up here. | 还没有人添加游戏。成员可以添加自己拥有的游戏，它们会显示在这里。 |
| `shelf.loading` | Loading games | 正在加载游戏 |
| `shelf.error.title` | Could not load the shelf | 无法加载游戏架 |
| `shelf.error.body` | Something went wrong on our side. Try again in a moment. | 我们这边出了点问题，请稍后再试。 |
| `shelf.error.retry` | Try again | 重试 |
| `shelf.byOwner.soon.title` (part 1 only) | By owner is coming soon | 按主人查看即将上线 |
| `shelf.byOwner.soon.body` (part 1 only) | Soon you will see each member's games here. | 很快就能在这里看到每位成员的游戏。 |
| `shelf.byOwner.count` (part 2) | `{count, plural, one {# game} other {# games}}` | `{count, plural, other {# 款游戏}}` |

The average goes through `format.number(avg, { minimumFractionDigits: 1, maximumFractionDigits: 1 })`, with the accessible label on its wrapper and the star `aria-hidden`. `ShelfError` is presentational and takes its title, body, and retry label as props; `ShelfLoader` passes them from the server translations. The backstop `error.tsx` is a client component, so the `shelf.error` namespace is added to the picked namespaces the existing `IntlClientProvider` in `src/app/[locale]/layout.tsx` already sends (alongside `common.time`). No nested provider is created, because a nested one replaces its parent's messages and would drop `common.time`.

**Layout** (from the mock; Tailwind values are the intent, `/develop` may round to the scale):
- Page wrapper: the shell already provides the gutter, `max-w-6xl`, and the bottom padding for the tab bar. Sections use `gap-4` on a phone and `gap-6` from `md`.
- Heading row: `h1` 24px semibold on a phone, 30px from `md`; the count is a sibling `<p>` beside it (not inside the `h1`) in `text-muted-foreground`, 14 to 15px. From `md` the switch sits right on the same row, 300px wide; on a phone it is full width on its own row.
- Switch: a `nav` with `aria-label` from `shelf.switch.label`, container `rounded-xl bg-muted p-1`, two equal items each `min-h-11 rounded-lg` with the current one `bg-card shadow-sm` and `font-semibold`; items are links, so focus rings follow the project style.
- Grid: `grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 md:gap-x-4 lg:grid-cols-6`.
- Card: `CoverTile` `rounded-xl`, `gap-2`; name `font-semibold` clamped to 2 lines and given room for 2 lines so a row of cards stays level; meta row 13px `text-muted-foreground`, tabular numbers, rating in `text-foreground` semibold with a primary colored star.
- Empty and error blocks: shadcn `Empty`, about 96px below the heading on a phone, centered, text centered, icon in a 72px round `bg-muted` (error: `destructive` icon).
- Part 2 sections: `gap-7` between members; heading row with 36px avatar; strip `gap-2.5` on a phone and `gap-3.5` from `md`, bleeding to the screen edge on a phone like `JustAdded`.

**Component inventory** (Server Components unless noted; new unless marked):
- `src/components/games/cover-tile.tsx`: moved from `src/components/home/` (spec 0006 said it would move when feature 8 landed), with its test; home imports updated.
- `src/components/shelf/shelf-card.tsx`: one card, one link.
- `src/components/shelf/shelf-grid.tsx`: the list and the cards.
- `src/components/shelf/shelf-switch.tsx`: the `nav` with two links.
- `src/components/shelf/shelf-skeleton.tsx`: the loading shape, one for both views.
- `src/components/shelf/shelf-content.tsx`: sync; takes `data` and `view` and renders the count, switch, and grid, empty block, or placeholder (testable in Vitest).
- `src/components/shelf/shelf-loader.tsx`: async; awaits `searchParams` and `getShelfData()`, catches a failure.
- `src/components/shelf/shelf-empty.tsx`: the empty block.
- `src/components/shelf/shelf-error.tsx` (client): the error block (with the `h1`) and the Retry button; strings come in as props; Retry calls `router.refresh()` from `@/i18n/navigation` in a transition.
- `src/components/shelf/by-owner-placeholder.tsx` (part 1 only, deleted in part 2).
- `src/components/shelf/owner-shelves.tsx` (part 2): sections and strips.
- Reused: `CoverTile`, `Link`, `ScrollArea`, lucide `Users`, `Star`, `Dices`, the current lucide warning icon, shadcn `Empty`, `Skeleton`, `Button`.

**Assets**: no image files; covers are tint tiles until real covers arrive (features 10, 11, 21).

**Critical test scenarios**:
- Happy path, unit: `buildShelfData` over the dummy set returns 12 cards in the AC-3 order with the right owner counts and averages, verifies **AC-2, AC-3, AC-11**.
- Happy path, unit: `compareNames` ignores case, orders by code point, and puts `三国杀` after Latin names, and the id breaks ties, verifies **AC-3**.
- Happy path, component: a card renders the link, a clamped name, "2 owners", and "8.5 out of 10", and a game with a null average renders no rating, verifies **AC-1, AC-2**.
- Happy path, browser: `/en/shelf` and `/zh/shelf` show 12 cards in order, the count, and the switch; the By owner link goes to `?view=owner` and shows the placeholder; an invalid `?view=x` shows All games, at 360px and 1280px in the light theme, verifies **AC-1, AC-3 to AC-6, AC-12**.
- Failure case, component and unit: `ShelfLoader` with a throwing `getShelfData` renders `ShelfError` with the `h1`; Try again calls `router.refresh`; the backstop `error.tsx` calls `retry`, verifies **AC-9**.
- Empty case, component: `ShelfContent` with zero games renders the empty block, hides the count and switch, and has no button, in both views, verifies **AC-7**.
- Loading case, component: the skeleton has 6 placeholders with `aria-busy` and the "Loading games" label, verifies **AC-8**.
- Messages: `src/i18n/messages.test.ts` keeps `en` and `zh` keys equal, verifies **AC-10**.
- Part 2: members A to Z (Arif, Jun, Mei, Sara) with 5, 5, 5, 6 games, each strip A to Z, a member with no games is absent, no horizontal page scroll at 360px, and a shelf with games but no owner links shows the empty block, verifies **AC-13, AC-14**.

## Build plan

Order follows the project default, Tracer Bullet: the thin thread (read layer, then a real page with cards) comes first, then each strand thickens it. No migration: this slice touches no schema.

*Part 1: All games (build now)*
1. [x] Move `CoverTile` and its test to `src/components/games/`, update home imports. Behavior unchanged, satisfies **AC-12**.
2. [x] Replace the tracer in `src/lib/games/shelf.ts` with `compareNames`, `buildShelfData`, and `getShelfData` over the dummy data, with unit tests; remove `getShelfGames`, satisfies **AC-3**, **AC-11**.
3. [x] Add shadcn `empty` and `skeleton` with the shadcn CLI, satisfies **AC-7**, **AC-8**, **AC-9**.
4. [x] Add the `shelf` messages to `en.json` and `zh.json` (the keys above, part 1 set), satisfies **AC-10**.
5. [x] Thin thread: `ShelfCard`, `ShelfGrid`, and the page rendering the heading, count, and grid from `getShelfData`, with the responsive columns and card tests, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**.
6. [x] Page: the `h1` outside, then `Suspense` (fallback `ShelfSkeleton`) around `ShelfLoader`, which awaits the `searchParams` promise passed down unread and parses `view`; split rendering into the sync `ShelfContent`; add `ShelfSwitch` and `ByOwnerPlaceholder`, satisfies **AC-5**, **AC-6**, **AC-8**.
7. [x] `ShelfEmpty` (both views), `ShelfError`, the catch in `ShelfLoader`, the backstop `error.tsx` using `retry()`, and adding the `shelf.error` namespace to the locale layout's provider, satisfies **AC-7**, **AC-9**.
8. [x] Keep `generateMetadata` and `getAlternates("/shelf")`; add previews of the skeleton, empty, and error blocks to `/design`, satisfies **AC-8**, **AC-9**, **AC-10**.
9. [x] Vitest component tests for AC-7 to AC-9; browser checks in `e2e/shelf.spec.ts` (360px and 1280px, light theme, both languages) for AC-1 to AC-6; update `e2e/home.spec.ts` where it expects the tracer page, satisfies **AC-1** to **AC-9**, **AC-12**.

*Part 2: By owner (later strand of this feature)*
10. Extend `buildShelfData` with `owners: OwnerShelf[]` (members A to Z, games A to Z, members with no games left out) and tests, satisfies **AC-13**.
11. `OwnerShelves` (sections, avatar, strips); delete `by-owner-placeholder.tsx` and its two messages; add `shelf.byOwner.count`, satisfies **AC-13**, **AC-14**, **AC-15**.
12. Browser checks for the By owner view at both widths, light theme, both languages, satisfies **AC-13**, **AC-14**.

## Consequences

**Positive**:
- The shelf becomes a real browsing page, in both languages, and ties straight to the home page links.
- The view is in the URL, so By owner can be shared, and Back works.
- Feature 21 only replaces the body of `getShelfData`; the page and components keep their props.
- Loading, empty, and error states exist as real components, previewable on `/design` (the error block needs no provider), and are reused by later features.

**Negative / tradeoffs**:
- Because the page reads `searchParams`, the content under the heading is rendered per request, not fully prerendered like home. The shell and heading still prerender.
- Cards link to `/games/{id}`, which shows the 404 page until feature 9 ships, as on home.
- Chinese names sort by character number, after the Latin names, not by pinyin.
- In part 1, By owner is a placeholder, so the switch has one empty option for a while.
- No pagination: the whole collection renders at once.

**Neutral**:
- `CoverTile` moves folders and two shadcn components are added.
- The tracer database read leaves the app; the local Supabase stack is not needed to view the shelf.
- `shelf.byOwner.soon.*` messages exist only until part 2.

## Follow-up

- [ ] Native reader check of the Chinese `shelf.*` wording before the PR (the pull request template asks for it).
- [ ] When the group grows many Chinese names, consider a locale aware comparison (pinyin) in `compareNames`.
- [ ] Feature 21: decide paging for the shelf read once the real collection size is known.
- [ ] The loading fallback shows on a full page load, not when clicking the switch (React keeps the old view during that transition). If a loading state on switch is wanted later, key the `Suspense` on the view.
- [ ] Verify the `searchParams` plus `Suspense` pattern against `node_modules/next/dist/docs/` for Cache Components before building step 6.
- [ ] `docs/design.md` "Cover placeholder tile" still describes the older `bg-cover-N` tile for games; home and shelf use the tint tile (spec 0006). Align that paragraph when `/sync` runs.
- [ ] Once part 1 ships, `/sync` should add the new `src/components/shelf/` and `src/components/games/` folders to `AGENTS.md`.
