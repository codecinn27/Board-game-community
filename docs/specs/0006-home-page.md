# 0006. Home page on dummy data, with the shelf moved to /shelf

**Date**: 2026-11-01
**Status**: In Progress

## Summary

The home page takes over `/`: a hero with how many games the group owns and how many members own them, a "Just added" row, and a "Top rated" list, built to the approved canvas mock. It reads typed dummy data (games, members, and who owns what, shaped like the real tables) through small read functions, so feature 21 can later swap those functions for real database queries without touching the page. Today's database list moves to `/shelf` unchanged, and the Home tab turns on, which also brings the phone tab bar to life.

## Context

The site has no landing page yet. `/` shows a bare tracer list (one typed database read, name and owner count) that proved the stack works. Visitors need a first screen that answers the question the whole app exists for: what does the group already own, before I buy something? The scope (feature 15) wants the game count, newest additions, and top rated games, each leading to its game sheet, at phone and desktop width, in English and Chinese.

Slice 1 is front end first: home, shelf, and the game sheet are built on hardcoded data until the design feels right, and only then wired to Supabase (feature 21). That makes the shape of the dummy data load bearing. If it drifts from the real tables, feature 21 turns into a rewrite of every component instead of a swap of a few read functions. Three features (15, 8, 9) will read it, so it must live in one shared place.

Some real data the page needs does not exist in the schema yet. There is no cover color column (feature 21 adds `games.cover_tint`) and no cover images. The game sheet route (`/games/[id]`, feature 9) is not built, so every card on home points at a page that 404s for a while. Spec 0002 deliberately left the minimum rating count for "Top rated" to this feature.

Moving the shelf off `/` also changes the shell: the nav config (`src/lib/app-shell/nav.ts`) shows the bottom tab bar only at 2 or more visible tabs, and today only Shelf is on. Existing tests (`src/lib/app-shell/nav.test.ts`, `e2e/design-system.spec.ts`) and the 404 page's "Back to the shelf" link assume that single tab world.

## Requirements

**User stories**:
- As a visitor, I want to see at a glance how many games the group owns and who owns them, so I know the shelf is worth checking before I buy.
- As a visitor, I want to see what was added recently and what the group rates highest, so I can find a game to borrow or play.
- As a visitor, I want one clear way into the full shelf, so I can look for a specific game.

**Acceptance criteria**:
- **AC-1**: `/en` and `/zh` render the home page. The hero's `h1` is the big game count plus its label ("12 games on the shelf"). Under it, the member line ("Owned by 4 members.") and the tagline ("Check here before you buy."), then a "Browse the shelf" button that links to `/shelf` in the same language. Copies are not shown. With the dummy data the numbers are 12 games and 4 members.
- **AC-2**: "Just added" lists the newest games by `created_at` (newest first, ties by `id` descending), up to 6. Below `md` (768px) it shows the first 5 in a row that scrolls sideways inside itself; from `md` up it shows all 6 in one row. With fewer games it shows what exists. Each item shows the cover tile, the name, and "added by name · when", where "when" is a `LocalTime` of `created_at`; when `added_by` is null or has no profile, only the time shows. A "See all" link goes to `/shelf`.
- **AC-3**: "Top rated" shows at most 5 games that have `rating_count >= 2` and a non null `avg_recommendation`, ordered by `avg_recommendation` descending, then `rating_count` descending, then `name` by plain code point order (the same in every language). Each shows its rank (1 to 5), cover tile, name, owner count ("1 owner", "2 owners", pluralized in both languages), and the average with exactly one decimal (8.0, not 8) and a star; screen readers hear "8.6 out of 10". Below `md` it is a ruled list; from `md` up it is a row of 5 cards with the rank on the cover. When no game qualifies, the whole section is hidden. With the dummy data the order is SETI, Ark Nova, Cascadia, Wingspan, Magical Athlete.
- **AC-4**: Every game in "Just added" and "Top rated" is one whole link (tile, name, and its text lines) to `/games/{id}` in the current language, through `Link` from `@/i18n/navigation`. Until feature 9 ships, that path shows the translated 404.
- **AC-5**: With zero games the hero `h1` reads "No games on the shelf yet", the member line and tagline are hidden, the Browse button stays, and "Just added", "Top rated", and the desktop mosaic are not rendered. With games but zero owning members, only the member line is hidden.
- **AC-6**: A cover tile with a `cover_tint` is filled with `coverTheme(cover_tint).tint` (the calmed tint, not the raw color) and its text is `coverTheme(cover_tint).ink`, which reaches 4.5:1. A tile with no tint uses the `bg-muted` and `text-foreground` tokens, which reach 4.5:1 in light and dark. On the tile sit the dice icon and the first whole character of the name, uppercased (`三国杀` shows `三`, `azul` would show `A`). Tiles are decorative (`aria-hidden`); the link text carries the name.
- **AC-7**: From `lg` (1024px) up, the hero is two equal columns and the right column shows a decorative 3 by 2 mosaic of the 6 newest games' cover tiles (`aria-hidden`). Below `lg` there is no mosaic. The repeat of the "Just added" games is accepted.
- **AC-8**: `/en/shelf` and `/zh/shelf` render today's tracer list (the `getShelfGames` database read, name and owner count) unchanged, titled "Shelf"; `/` no longer reads the database. In `nav.ts`, `home` is enabled with href `/` and `shelf` has href `/shelf`. A guest therefore sees Home and Shelf, so the bottom tab bar shows on a phone, with Home active on `/` and Shelf active on `/shelf` (and the same in the desktop header links). The 404 page's link reads "Back to home".
- **AC-9**: All page text comes from a new `home` namespace (plus `shelf.meta`) in `messages/en.json` and `messages/zh.json` with the same keys (listed in *Feature design*), counts use ICU plurals, and numbers go through next-intl `format.number`. Home's `generateMetadata` returns `title: { absolute: <brand> }` (just "Game Shelf"), a translated description, and `alternates: await getAlternates("/")`; the shelf page returns the title "Shelf" (so the layout template gives "Shelf · Game Shelf"), a description, and `getAlternates("/shelf")`. Game names and member names show as stored, untranslated.
- **AC-10**: At 360px wide there is no horizontal page scroll in either language or theme (only the "Just added" row scrolls), the last section is not hidden behind the tab bar, every link and button is at least 44px tall on a phone (`min-h-11` on text links such as "See all"), and the sizes follow *Layout* in *Feature design*, in light and dark.
- **AC-11**: The home page makes no database or network call: it reads `src/lib/games/dummy-data.ts` through `getHomeData()` in `src/lib/games/home.ts`, and prerenders as static (`pnpm build` lists `/en` and `/zh` as prerendered). The dummy game type is built from the generated `game_stats` row type, so a removed, renamed, or retyped column fails `pnpm typecheck`.
- **AC-12**: The dummy data matches the table under *Dummy data set*: 12 games, 4 profiles, and the owner links, with every profile owning at least one game and every non null `added_by` being one of that game's owners. A test checks these rules.

## Options considered

### Option 1: Flat view model per page

Hardcode exactly what home shows (name, "Mei", "3 days ago", "8.6") in a page specific array.

**Pros**:
- Fastest to write; no read functions, no joins.
- The mock's values drop straight in.

**Cons**:
- Feature 21 must change the components' inputs, not just the data source, which is the rewrite the slice plan exists to avoid.
- Shelf (8) and the game sheet (9) would each invent their own copy, and the three would drift apart.
- Relative times like "3 days ago" are hardcoded strings, which breaks the `LocalTime` rule.

### Option 2: Dummy rows that mirror the tables, behind read functions

Three typed arrays shaped like `game_stats`, `profiles`, and `game_owners`, plus a pure function that computes counts, newest, and top rated the way a query would, wrapped by an async `getHomeData`.

**Pros**:
- Feature 21 replaces the body of `getHomeData` with Supabase queries; pages and components keep their props.
- One file serves home, shelf, and the game sheet, so they agree.
- The ranking and counting rules live in pure functions that are easy to test now and stay valid later.

**Cons**:
- More code up front than the page strictly needs (joins, a members count).
- The dummy shape must carry `cover_tint`, a column that does not exist until feature 21, so the type adds one field by hand.

### Option 3: Read Supabase now with seed data

Skip dummy data and query `game_stats` on the local stack seeded with the 12 games.

**Pros**:
- No swap later; the real reads exist from day one.

**Cons**:
- Breaks the agreed slice plan: Slice 1 iterates on design with no database in the loop, and feature 21 owns the real reads.
- Every design tweak then needs Docker and the local stack running.
- `cover_tint` does not exist yet, so a migration would be pulled forward into a design slice.

## Decision

**Chosen option**: Option 2: Dummy rows that mirror the tables, behind read functions.

Home reads typed, table shaped dummy data from `src/lib/games/dummy-data.ts` through `getHomeData()` (a thin async wrapper over the pure `buildHomeData`) in `src/lib/games/home.ts`, renders the approved canvas layout, and the old tracer list moves to `/shelf`.

**Implementation skills**: `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `vercel-composition-patterns` (`vercel-labs/agent-skills`, `.claude/skills/vercel-composition-patterns/`) · `shadcn` (`shadcn-ui/ui`, `.claude/skills/shadcn/`)

**Design source**: the approved mock on the [Game Detail Sheet canvas](https://claude.ai/artifact/PBVkW9skcPLVmEjDbS8Bog), artboards `HomePhone.dc.html` (390 wide) and `HomeDesktop.dc.html` (1280 wide), built with the tokens and rules in `docs/design.md`. The sizes that matter are copied into *Layout* below, so the build does not depend on opening the canvas. Where the mock and this spec differ, this spec wins: no copies count, 5 versus 6 in "Just added" as AC-2 says, cover tiles as AC-6 (no stand in shape art), and no Sign in tab yet (feature 6).

## Rationale

The slice plan only pays off if feature 21 is a swap, not a rewrite. Mirroring the real tables and hiding the joins behind one async read function is what makes it a swap: the page awaits `getHomeData()` today and will await the same function, with a Supabase body, tomorrow. A flat view model would be quicker this week and cost more in three features, and it would force fake relative times that break the project's `LocalTime` rule. Reading the real database now would put Docker and a migration into a slice meant for quick design iteration.

Owner counts are derived from the owner links, not typed into each game, because that is what the `game_stats` view does and a hand typed count would drift from the links. Members means "members who own at least one game", counted from the same links: the number a visitor cares about (people they could borrow from), and it ignores accounts that never added anything. Copies were dropped by your call; the game count already carries the main message.

"Top rated" needs at least 2 ratings, so one enthusiastic 10 cannot top the list in a small group, while a group of a few members still fills it quickly. Ties break by more ratings, then by name in code point order, so the order is stable and the same in both languages. Hiding the section when nothing qualifies is better than an empty box on a landing page.

Linking to `/games/{id}` now costs a short stretch of 404s (feature 9 is two features later in the same slice) and saves editing every link again. Cover tiles use the calmed tint plus the first character rather than the mock's shape art: the shape art is throwaway markup, and `coverTheme` only guarantees readable ink on its own calmed tint, not on the raw color.

## Feature design

**Data model sketch** (no migration; TypeScript types and arrays built from `src/lib/supabase/database.types.ts`):

```ts
// src/lib/games/types.ts
type GameStatsRow = Tables<"game_stats">; // or Database["public"]["Views"]["game_stats"]["Row"] if Tables does not cover views
type Present<K extends keyof GameStatsRow> = { [P in K]: NonNullable<GameStatsRow[P]> };

/** A game as the dummy data and feature 21 provide it. */
export type ShelfGame = Present<"id" | "name" | "created_at" | "rating_count">
  & Pick<GameStatsRow, "added_by" | "cover_path" | "avg_recommendation">
  & { cover_tint: string | null }; // feature 21 adds games.cover_tint (#rrggbb)

export type DummyProfile = Pick<Tables<"profiles">, "id" | "display_name">;
export type DummyOwner = Pick<Tables<"game_owners">, "game_id" | "member_id" | "created_at">;
```

`owner_count` is not stored in the dummy rows; `buildHomeData` derives it from the owner links. Relationships: owner `game_id` → game `id` (N:1), owner `member_id` → profile `id` (N:1), game `added_by` → profile `id` (N:1, nullable for a deleted account). Every `cover_path` is null.

**Dummy data set** (`src/lib/games/dummy-data.ts`; names, tints, ratings, and owners from the canvas shelf mock; profile ids are fixed uuids; dates are fixed ISO strings, and owner link `created_at` equals the game's):

| id | name | cover_tint | created_at | added_by | rating_count | avg_recommendation | owners |
|---|---|---|---|---|---|---|---|
| 1 | Wingspan | `#f3ead2` | 2026-08-02T11:00:00Z | Sara | 5 | 8.0 | Mei, Arif, Jun, Sara |
| 2 | Codenames | `#1f2a44` | 2026-08-09T11:00:00Z | Mei | 4 | 7.6 | Mei, Arif, Jun |
| 3 | Cascadia | `#f4cfa3` | 2026-08-23T11:00:00Z | Mei | 4 | 8.2 | Mei, Sara |
| 4 | Ticket to Ride | `#c9a46a` | 2026-09-06T11:00:00Z | null | 2 | 7.4 | Arif, Sara |
| 5 | SETI | `#3fa6c2` | 2026-09-20T11:00:00Z | Jun | 3 | 8.6 | Jun |
| 6 | Magical Athlete | `#e0452e` | 2026-10-04T11:00:00Z | Arif | 3 | 7.9 | Arif, Sara |
| 7 | Azul | `#2f5d8a` | 2026-10-11T11:00:00Z | Arif | 3 | 7.8 | Arif, Sara |
| 8 | Splendor | `#4b3a6b` | 2026-10-18T11:00:00Z | Jun | 2 | 7.4 | Jun |
| 9 | Dixit | `#9fc3db` | 2026-10-26T11:00:00Z | Mei | 1 | 7.7 | Mei |
| 10 | Ark Nova | `#e9b44c` | 2026-10-29T11:00:00Z | Jun | 2 | 8.5 | Jun |
| 11 | Just One | null | 2026-10-31T09:00:00Z | Sara | 0 | null | Sara |
| 12 | 三国杀 | null | 2026-11-01T02:00:00Z | Mei | 2 | 7.2 | Mei |

Profiles: Mei, Sara, Jun, Arif. This gives 12 games, 4 members, newest 6 = 三国杀, Just One, Ark Nova, Dixit, Splendor, Azul, and top 5 = SETI, Ark Nova, Cascadia, Wingspan, Magical Athlete (Dixit's single rating is excluded, Just One has none). Tie breaking and the null `added_by` branch are covered by fixtures in `home.test.ts`, not by this set.

**Read layer** (`src/lib/games/home.ts`, server only):

```ts
type HomeGame = { id: number; name: string; coverTint: string | null; addedAt: string; addedByName: string | null };
type TopGame = { id: number; name: string; coverTint: string | null; ownerCount: number; avgRecommendation: number; rank: number };
type HomeData = { gameCount: number; memberCount: number; newest: HomeGame[]; topRated: TopGame[] };

export const HOME_NEWEST_LIMIT = 6;
export const HOME_TOP_LIMIT = 5;
export const HOME_TOP_MIN_RATINGS = 2;

/** Pure: everything the page shows, from the three row sets. */
export function buildHomeData(games: ShelfGame[], profiles: DummyProfile[], owners: DummyOwner[]): HomeData;
/** Today: buildHomeData over the dummy arrays. Feature 21 replaces this body with Supabase reads. */
export async function getHomeData(): Promise<HomeData>;
// pure helpers, exported for tests:
export function pickNewest(games: ShelfGame[], limit: number): ShelfGame[];
export function pickTopRated(games: ShelfGame[], ownerCounts: Map<number, number>, minRatings: number, limit: number): TopGame[];
export function countMembers(owners: { member_id: string }[]): number; // distinct member_id
```

`src/lib/games/cover-initial.ts`: `coverInitial(name: string): string` returns `Array.from(name.trim())[0]?.toLocaleUpperCase("en") ?? ""` (first whole code point; grapheme clusters such as emoji with joiners are out of scope for game names).

**Messages** (new keys, same in `en.json` and `zh.json`; Chinese wording is a draft for the native reader check):

| Key | English | Chinese (draft) |
|---|---|---|
| `home.meta.description` | See every board game our group owns, and who owns it, before you buy. | 看看我们群组拥有的所有桌游和主人，买之前先查一查。 |
| `home.hero.label` | `{count, plural, one {game on the shelf} other {games on the shelf}}` | `{count, plural, other {款游戏在架上}}` |
| `home.hero.members` | `{count, plural, one {Owned by # member.} other {Owned by # members.}}` | `{count, plural, other {由 # 位成员拥有。}}` |
| `home.hero.tagline` | Check here before you buy. | 买之前先来这里看看。 |
| `home.hero.empty` | No games on the shelf yet | 架上还没有游戏 |
| `home.hero.browse` | Browse the shelf | 浏览游戏架 |
| `home.justAdded.title` | Just added | 最新加入 |
| `home.justAdded.seeAll` | See all | 查看全部 |
| `home.topRated.title` | Top rated | 最高评分 |
| `home.topRated.owners` | `{count, plural, one {# owner} other {# owners}}` | `{count, plural, other {# 位主人}}` |
| `home.topRated.ratingLabel` | `{rating} out of 10` | `{rating} 分（满分 10）` |
| `shelf.meta.title` | Shelf | 游戏架 |
| `shelf.meta.description` | Every board game the group owns. | 群组拥有的所有桌游。 |
| `common.notFound.home` (changed) | Back to home | 返回首页 |

Composition rules: the big count is `format.number(gameCount)` in its own span, next to `t("hero.label", { count })`, both inside the `h1`. The "added by" line is composed in JSX as `{name} · <LocalTime/>` (the dot is a non text separator in an `aria-hidden` span with a visible space either side), never one ICU string with a component inside. The rating shows `format.number(avg, { minimumFractionDigits: 1, maximumFractionDigits: 1 })` with `aria-label={t("topRated.ratingLabel", { rating })}` on its wrapper; the star icon is `aria-hidden`. The rank number is `aria-hidden` (the `ol` already gives the position).

**Layout** (from the mock; Tailwind values in brackets are the intent, `/develop` may round to the scale):
- Page: gutter `px-4 md:px-6`, content `max-w-6xl` (1152px) centered, sections `gap-6` on a phone and `gap-12` from `lg`.
- Hero card: `rounded-2xl` with `bg-secondary`-like surface and border, padding 20px on a phone, 36px by 40px from `lg`. Count 52px bold on a phone, 88px from `lg`, primary color, tabular numbers; label 22px then 30px semibold. Browse button full width, 48px tall on a phone; auto width from `md`.
- Mosaic (from `lg`): `grid-cols-3 gap-3`, 6 square tiles, `rounded-xl`, soft shadow, in the hero's right column.
- Just added, phone: items 124px wide, tile 124px square `rounded-xl`, `gap-3`, row scrolls with `overflow-x-auto` and keeps the 16px gutter; from `md`: `grid-cols-6 gap-4`, square tiles filling the column.
- Top rated, phone: one card with `rounded-xl` border, rows at least 60px tall, rank 18px column, tile 44px `rounded-lg`, name and owner line, rating on the right; from `md`: `grid-cols-5 gap-4` cards with 12px padding, `rounded-2xl`, a 4:3 tile with the rank in a 28px round dark badge at the top left, name, then owners left and rating right.
- Phone main area has bottom padding at least the tab bar height (64px) plus 24px, so the last section is never under the bar.

**Component inventory** (all new, Server Components, in `src/components/home/`):
- `home-hero.tsx`: count, label, member line, tagline, Browse button, optional mosaic.
- `cover-tile.tsx`: the tile (tint or neutral, icon, initial), sized by `className`. Shelf (8) and the sheet (9) reuse it, so it may move to `src/components/games/` when feature 8 lands.
- `just-added.tsx`: the section; the 6th item gets `hidden md:flex` (no JavaScript).
- `top-rated.tsx`: the section; phone list and desktop cards from one list via responsive classes.
- Reused: `LocalTime`, `Link` from `@/i18n/navigation`, shadcn `Button` (`asChild` over `Link`) for Browse, lucide `Dices`, `ArrowRight`, `Star`, `coverTheme` from `src/lib/design/cover-tint.ts`.

**Asset strategy**: no image files. Covers are tint tiles until real covers arrive (features 10, 11, 21).

**API surface** (internal functions and routes; no HTTP endpoints):

| Surface | Kind | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/[locale]` (home) | page, static | `locale` param | the page | public | unknown locale → existing 404 |
| `/[locale]/shelf` | page, moved tracer | `locale` param | name and owner count list | public | Supabase error → thrown, caught by the existing error boundary |
| `getHomeData()` | async function | none | `HomeData` | none (public data) | none today; feature 21 throws on query error |
| `buildHomeData(...)` | pure function | games, profiles, owners | `HomeData` | n/a | none |
| `/games/{id}` links | link target | game `id` | feature 9's page | public | 404 until feature 9 |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Hero | game count | `games.length` in `buildHomeData`, shown with `format.number` |
| Hero | member count | `countMembers(owners)` (distinct `member_id`) |
| Hero | empty state, member line shown | `gameCount === 0`; `memberCount === 0` |
| Just added | which games, order | `pickNewest(games, 6)`: `created_at` desc, `id` desc |
| Just added | 5 vs 6 shown | CSS: 6th item `hidden md:flex` (768px, `docs/design.md`) |
| Just added | added by name | `added_by` joined to `profiles.display_name`; null or missing → `addedByName: null`, time only |
| Just added | when | `LocalTime value={created_at}` (UTC+8 date on the server, relative after load, spec 0005) |
| Top rated | owner count | count of owner links per `game_id` |
| Top rated | which games, order, rank | `pickTopRated`: `rating_count >= 2`, non null avg; avg desc, `rating_count` desc, name code point asc; first 5; rank = index + 1 |
| Top rated | rating text, screen reader label | `format.number` one decimal; `home.topRated.ratingLabel` |
| Cover tile | fill and ink | `coverTheme(cover_tint).tint` and `.ink`; null → `bg-muted`, `text-foreground` |
| Cover tile | initial | `coverInitial(name)` |
| Mosaic | tiles | the same 6 from `pickNewest` |
| Card link | href | `/games/${id}` via `@/i18n/navigation` `Link` |
| Metadata | titles, descriptions | `shell.brand` (absolute title), `home.meta.description`, `shelf.meta.*` |
| Nav | Home, Shelf tabs | `nav.ts` entries (`enabled`, `href`) |

**Key invariants**:
- The home page imports nothing from `@/lib/supabase`; only `src/lib/games/home.ts` knows where data comes from.
- Components take `HomeData` pieces as props and never import `dummy-data.ts` directly.
- Every profile owns at least one dummy game; every non null `added_by` is an owner of that game.
- `pickTopRated` never returns a game with fewer than 2 ratings or a null average, and its order does not depend on locale or input order.
- The home render reads no clock, cookie, or header (static prerender under `cacheComponents`); relative time happens only inside `LocalTime` after load.
- Every visible string is a message key with the same keys in English and Chinese.

**Security model**: public, read only, no personal data beyond member display names, which the data model already treats as public (spec 0002). No auth, no writes, no new RLS. The `/shelf` read keeps using the public client.

**Critical test scenarios**:
- Happy path (Vitest, `home.test.ts`): `buildHomeData` over the dummy arrays gives 12 games, 4 members, the newest 6 and top 5 in the orders above, verifies **AC-1**, **AC-2**, **AC-3**
- Ranking rule (Vitest fixtures): excludes 0 and 1 rating games and null averages, breaks an avg tie by rating count and then by name (code point), caps at 5, and returns `[]` when nothing qualifies, verifies **AC-3**
- Empty and edge (Vitest): zero games gives `gameCount 0` and empty lists; games with no owners give `memberCount 0`; a null or unknown `added_by` gives `addedByName: null`; fewer than 6 games returns what exists, verifies **AC-2**, **AC-5**
- Cover (Vitest): `coverInitial("三国杀") === "三"`, `coverInitial(" azul") === "A"`; `coverTheme(tint).ink` against `coverTheme(tint).tint` meets 4.5:1 for every dummy tint; the existing token contrast test covers `foreground` on `muted` in both themes, verifies **AC-6**
- Data (Vitest, `dummy-data.test.ts`): ids unique, every owner link points at a real game and profile, every profile owns a game, every non null `added_by` is an owner, verifies **AC-12**
- Browser (Playwright, `e2e/home.spec.ts`, both languages, 360px and 1280px, light and dark): counts, order of names, card hrefs (no clicking into the 404), `time[datetime]` present (never relative text), no horizontal scroll, 44px targets, last section clear of the tab bar, mosaic only at 1280, Home and Shelf tabs active on the right pages, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-7**, **AC-8**, **AC-10**
- Build: `pnpm build` lists `/en` and `/zh` home as prerendered; `pnpm typecheck` passes (run locally, build is not in CI), verifies **AC-11**

## Build plan

Tracer Bullet: first a thin thread from the dummy data through the read function to a translated page at `/`, with the shelf moved so nothing breaks; then thicken section by section; checks last.

1. Move the tracer list: create `src/app/[locale]/shelf/page.tsx` with today's `Shelf` component, `shelf.meta` title and description, and `getAlternates("/shelf")`. In `nav.ts` set `shelf.href` to `/shelf`, enable `home` at `/`, and replace the stale "moves to `/`" comments. Update `nav.test.ts` ("only the shelf today" becomes Home and Shelf for a guest and a member). Change `common.notFound.home` to "Back to home" in both languages, satisfies **AC-8**
2. Thin thread: `src/lib/games/types.ts`, `dummy-data.ts` with the table above, `home.ts` with `buildHomeData` and `getHomeData` returning the counts, and a `/` page showing only the hero (`h1` count and label, member line, tagline, Browse button), with the `home` namespace in both message files and the metadata, satisfies **AC-1**, **AC-9**, **AC-11**
3. Tests for the read layer: `home.test.ts` (happy path, ranking fixtures, empty and edge cases) and `dummy-data.test.ts`, satisfies **AC-2**, **AC-3**, **AC-5**, **AC-12**
4. `cover-initial.ts` with its test, and `cover-tile.tsx` (calmed tint and ink, neutral fallback, dice icon, initial), plus the tint contrast test over every dummy tint, satisfies **AC-6**
5. "Just added" section per *Layout*: newest 6, 5 below `md`, sideways scroll on a phone, whole item links, added by, `LocalTime`, See all, satisfies **AC-2**, **AC-4**
6. "Top rated" section per *Layout*: phone list and desktop cards, ranks, owner plurals, one decimal rating with its label, hidden when empty, whole item links, satisfies **AC-3**, **AC-4**
7. Desktop hero with two columns and the mosaic from `lg`; the empty hero and the zero member state; phone bottom padding above the tab bar, satisfies **AC-5**, **AC-7**, **AC-10**
8. Browser checks: add `e2e/home.spec.ts`; in `e2e/design-system.spec.ts`, replace "the phone shelf has no bottom bar with a single tab" with a check that the bar shows Home and Shelf, and recheck its `/en` screenshot and "Game Shelf" link assumptions against the new home; confirm the `/design` nav previews (built from `navItems`) still render as expected, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-7**, **AC-8**, **AC-10**
9. Update the scope's Slice 1 note from `src/lib/shelf/dummy-data.ts` to `src/lib/games/dummy-data.ts`, and run `pnpm build` to confirm `/en` and `/zh` prerender as static, satisfies **AC-11**

## Consequences

**Positive**:
- Visitors get a real landing page; the "check before you buy" message is on the first screen.
- Shelf (8) and the game sheet (9) start with shared, typed data, a cover tile, and a tested read pattern to copy.
- Feature 21 becomes a function body swap plus a `cover_tint` migration.
- With two tabs the phone tab bar appears, so the shell is exercised for real.

**Negative / tradeoffs**:
- Game links 404 until feature 9 ships.
- The dummy dates are fixed, so "Just added" times drift older ("5 weeks ago") the longer Slice 1 runs; tests avoid asserting that text.
- `ShelfGame` adds `cover_tint` by hand ahead of the migration; feature 21 must add exactly that column or the type and the table disagree.
- `/shelf` is still the bare tracer list until feature 8, so the Browse button leads somewhere plain for a while.
- On wide screens the mosaic repeats the "Just added" games.

**Neutral**:
- The mock's Sign in tab is not shown yet; it arrives with feature 6 through `nav.ts`.
- `cover-tile.tsx` may move to `src/components/games/` once a second feature uses it.

## Follow-up

- [ ] Feature 21: add `games.cover_tint` (and expose it in `game_stats`), replace the body of `getHomeData` with Supabase reads that feed `buildHomeData` (or the view's `owner_count` directly), seed the same 12 games, then delete `dummy-data.ts`.
- [ ] Feature 9: once `/games/[id]` exists, the 404 note in AC-4 no longer applies; confirm the home links open the sheet.
- [ ] Feature 8: replace the moved tracer list at `/shelf` with the real shelf, reusing `dummy-data.ts` and `cover-tile.tsx`.
- [ ] Get a native reader to check the new Chinese strings (PR template).
