# 0009. Live data for home, shelf, and game sheet

**Date**: 2026-11-04
**Status**: Accepted

## Summary

Home, the shelf, and the game sheet stop reading the hardcoded dummy file and read real rows from Supabase instead, with the game sheet built first. The one missing piece in the database is a `cover_tint` column on `games`, so the sheet keeps its per game colors. You prepare the real games in one file, `data/games.json`; a small script turns it into SQL you run against the real project. The 12 dummy games move into `supabase/seed.sql` as local sample data, so development looks the same as before, and the dummy file is deleted.

## Context

Slice 1 built home, shelf, and the sheet on one typed dummy file (`src/lib/games/dummy-data.ts`), and each screen reads it through one function: `getHomeData`, `getShelfData`, `getGameDetail`, plus `getGameIds` for the build. Those functions were written to be swapped for real queries without touching a component. Scope feature 21 is that swap.

The database already has most of what the screens need: `games` (name, players, play time, description), `game_owners`, `profiles`, `ratings`, and the `game_stats` view, which adds `owner_count`, `rating_count`, and `avg_recommendation`. Three gaps remain. `games` has no `cover_tint`, and the sheet's colors depend on it. `game_stats` is built with `g.*`, which fixes its column list when the view is created, so a new column on `games` does not appear in the view until the view is rebuilt. And there is no real data yet: no member can register until feature 6, so real owners and real ratings cannot exist, and `profiles` rows need a sign in account behind them.

The project runs Next.js 16 with Cache Components, which changes three things here. A read that is not cached makes the page dynamic. `generateStaticParams` must return at least one id or the build fails. And `src/proxy.ts` already calls `getGameDetail` to answer a real 404 for an unknown game id, so that call becomes a database read on every game visit. The secret key may be used only in `src/lib/supabase/admin.ts`, which rules out a script that writes data with it.

## Requirements

**User stories**:
- As the owner of the shelf, I want to write my real games in one file and load them into the database, so I do not retype them in a dashboard.
- As a visitor, I want home, the shelf, and the sheet to show the community's real games, so the app is useful on day one.
- As a visitor, I want every game sheet to keep its own colors, so the live app looks like the approved design.
- As a developer, I want local `supabase db reset` to give me sample games, owners, and ratings, so every state of every screen is visible without real data.

**Acceptance criteria** (the contract):

*Database*
- **AC-1**: A migration adds `games.cover_tint text null`, checked to be empty or lowercase `#rrggbb`. The database rejects `red`, `#fff`, `#ABCDEF`, and `#12345g`, and accepts null and `#f3ead2`. Anonymous and signed in readers can select it. Anonymous readers cannot change it, and neither can `authenticated` (it is not in their insert or update column grants), so only SQL or an admin tool writes it for now.
- **AC-2**: The same migration drops and recreates `game_stats` with `security_invoker = true` and the same grants, now including `cover_tint`. Every column it had before is still there with the same type. The existing pgTAP view tests still pass.
- **AC-3**: `database.types.ts` is regenerated. `cover_tint` in `ShelfGame` and `DummyGame` comes from the generated row type, not from a hand written field, so a removed or retyped column fails `pnpm typecheck`.

*The game sheet (built first)*
- **AC-4**: `getGameDetail(id)` reads one game from `game_stats` and its owners from `game_owners` joined to `profiles.display_name`, and returns the same `GameDetail` shape as today. An id that is not a positive whole number, or has no row, returns null. A failed read throws. Owner order is unchanged: oldest link first, ties by name through `compareNames`, then by member id.
- **AC-5**: With the local seed, `/en/games/{id}` and `/zh/games/{id}` render the sheet from database rows for all 12 sample games. The tint comes from `games.cover_tint`; a null tint gives the neutral tint, as Just One does today. Chips, stats, description, and owners match the old dummy sheet, except the rating averages named in AC-12. The modal opened from a card (`loadGameSheet`) shows the same content as the page.
- **AC-6**: `generateStaticParams` returns the game ids read from the database. When the database has no games it returns the single id `"0"`, so `pnpm build` still passes with Cache Components on (the page then answers its 404 for that id). An unknown id still answers status 404 through `src/proxy.ts`, now backed by a database read, in both languages. If `use cache` cannot run inside the proxy, the proxy uses a small uncached `gameExists(id)` check instead, and the page still reads through `getGameDetail`.

*Shelf and home*
- **AC-7**: `getShelfData()` reads `game_stats` and returns the same `ShelfData` as today: sorted by `compareNames`, ties by id, each card with `id`, `name`, `coverTint`, `ownerCount`, and `avgRecommendation`.
- **AC-8**: `getHomeData()` returns the same `HomeData` as today. `gameCount` is the number of games. `memberCount` is the number of distinct members who own at least one game. `newest` is the 6 newest games by `created_at`, ties by id descending, each with the name of the member who added it (null when `added_by` is null). `topRated` is the top 5 games that have an average and at least 2 ratings, ranked as `pickTopRated` ranks them today.
- **AC-9**: With zero games, with games but zero ratings, and with games but zero owners, home, the shelf, and the sheet render without an error. Top rated shows its empty state, the shelf shows its "The shelf is empty" state, a game without owners shows "Nobody owns this yet", and a game without ratings hides its rating chip.

*Caching and failure*
- **AC-10**: Every read function is a cached function (`"use cache"`) that lives 5 minutes and carries the tag `games`. The tag name is spelled in exactly one exported constant, and a small exported helper revalidates it, so features 7, 12, and 19 call one thing after a write. A read that fails is not cached.
- **AC-11**: When the database cannot be reached: the shelf shows its existing error block, the modal shows its error block with "Try again", the game page and home fall back to their route `error.tsx`, and none of them shows a half rendered page.

*Data you prepare, and local sample data*
- **AC-12**: `supabase/seed.sql` loads the 12 sample games with their tints, descriptions, players, minutes, and add dates; five active sample members; the same owners; and ratings built so each game's rating count equals the old dummy count and each average matches the old dummy figure to one decimal where a whole number rating set can make it. The old figures that cannot be reached with that many whole number ratings (for example 7.6 from 4 ratings) change to the nearest reachable one, and the e2e text that quotes them is updated. The old Catan, Azul, Pandemic seed games are replaced. pgTAP tests are unaffected, because they empty the tables first.
- **AC-13**: `data/games.json` is a list of games with the fields `name` (required), `description`, `playersMin`, `playersMax`, `playTimeMin`, `playTimeMax`, `coverTint`, and `addedAt` (all optional). `pnpm seed:games` checks every game against the same rules as the database (name 1 to 200 characters after trimming, description up to 4000, players and minutes positive whole numbers with min not above max, tint empty or lowercase `#rrggbb`, a real date) and prints every problem with the game's position and name before writing anything. On success it writes `supabase/games-data.sql`.
- **AC-14**: `supabase/games-data.sql` is safe to run twice. A game is matched by its normalized name (the same expression as `games.name_normalized`), updated if found, inserted if not, so a rerun never duplicates. It sets `source_kind = 'manual'`, leaves `added_by` null, and creates no owners or ratings. It uses no secret key and no new environment variable, and it works unchanged in the Supabase SQL editor, through `supabase db query --linked`, and against local Supabase.

*Cleanup and checks*
- **AC-15**: `src/lib/games/dummy-data.ts` and its test are deleted and nothing imports them. Unit tests of the pure builders (`buildHomeData`, `buildShelfData`, `buildGameDetail`) use a small fixtures file next to them. The `/design` page's sheet previews no longer read the database; they use the same fixtures.
- **AC-16**: Checks: Vitest covers the games file validation, the SQL it writes (including that a rerun matches by normalized name), each read function's mapping from rows to the screen types, the empty cases of AC-9, and the proxy and `generateStaticParams` fallbacks. pgTAP covers AC-1 and AC-2. The existing Playwright home, shelf, and sheet specs pass at 360px and 1280px, in both languages, against the local seed.

## Options considered

### Option 1: Read each page directly from Supabase with the public client, cached for 5 minutes (chosen)

Each of the three read functions becomes a cached server function that uses the cookie free public client (`createPublicClient`), reads `game_stats`, `game_owners`, and `profiles`, maps rows to the same types as today, and is tagged `games` with a 5 minute life.

**Pros**:
- Components, pages, and the Server Action stay untouched; only the bodies of the read functions change, as slice 1 planned.
- Uses the public client the project already built for cacheable pages, and the public read policies that already exist.
- A dashboard edit shows within 5 minutes, and later write features can clear the tag at once.

**Cons**:
- Every cached function needs a cache life and tag, and the proxy read needs checking against Cache Components.
- Home and the shelf read every game on each refresh, which is fine for a community shelf and will need paging when it holds hundreds.

### Option 2: Page with `force-dynamic` reads, no caching

Same reads, uncached, so every visit asks the database.

**Pros**:
- Always current, and nothing to invalidate.

**Cons**:
- Every visit and every card hover (which prefetches the sheet) hits the database.
- Pages stop being cached or prerendered, and the proxy 404 check adds a query to every game visit.

### Option 3: Rebuild on a schedule (static data only)

Read at build time and redeploy when data changes.

**Pros**:
- Fastest pages and no runtime database load.

**Cons**:
- Your edits and later member writes stay invisible until the next deploy, which does not fit an app where members add games.

### Option 4: Load real data with a script that uses the secret key

An import script writes the games through the admin client.

**Pros**:
- One command, no SQL to run by hand.

**Cons**:
- The project rule keeps the secret key inside `src/lib/supabase/admin.ts`, and the admin client is `server-only`, so a plain script cannot import it without a lint exception.
- Writes straight to whichever project `.env.local` points at, with no SQL to read first.

## Decision

**Chosen option**: Option 1: Read directly from Supabase with the public client, cached for 5 minutes, and load real data with generated SQL (Option 4 rejected).

Each read function keeps its name and result type, and its body becomes a cached public client read tagged `games`. `data/games.json` is turned into idempotent SQL by `pnpm seed:games`, and the 12 dummy games become local sample data in `supabase/seed.sql`.

**Implementation skills**: `supabase` (`supabase/agent-skills`, `.claude/skills/supabase/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.claude/skills/supabase-postgres-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`)

## Rationale

Slice 1 was built so that this step touches read functions only, and the public client plus the public read policies were built for exactly this: anonymous, cacheable reads. Caching for 5 minutes fits the app's real rhythm. Members will change data rarely, and your own edits can wait a few minutes. The write features that arrive later clear the tag when they write, so a member never waits 5 minutes to see their own game. Option 2 spends a database round trip on every hover and every visit for data that changes a few times a day. Option 3 cannot show a member's new game.

The data load is SQL on purpose. The secret key rule exists so one file can hold that power, and the dashboard SQL editor already runs with it; a generated, readable SQL file gives you the same result with no new key handling and lets you read what will happen before you run it. Matching on the normalized name makes reruns safe without adding a unique key that the add game feature has not decided yet. The 12 dummy games stay as hand written sample data in `seed.sql` because they carry owners and ratings that real data does not have yet, and every state of every screen needs one game in it.

Ratings are not faked in the real project: the rating chip hides and Top rated shows its empty state until feature 12 lets members rate. This is correct behavior, and it keeps the community's first real numbers honest. The same holds for owners, which wait for feature 6.

## Feature design

**Data model**: one column and one view rebuild.

| Entity | Change |
|---|---|
| `games` | add `cover_tint text null`, `check (cover_tint is null or cover_tint ~ '^#[0-9a-f]{6}$')`. Select for everyone through the existing table grant. Not added to the `authenticated` insert or update column grants. |
| `game_stats` (view) | `drop view` then `create view ... with (security_invoker = true)`, same select as migration 3 so it picks up `cover_tint`, then `grant select ... to anon, authenticated`. |
| `game_owners`, `profiles`, `ratings` | unchanged |

Migration 5 does both. `g.*` is expanded when the view is created, so `create or replace` would not pick up the new column in the right position; drop and recreate is required.

**Read functions** (all `"use cache"`, `cacheLife` 5 minutes, `cacheTag("games")`, public client, server only):

| Function | Reads | Returns |
|---|---|---|
| `getGameDetail(id)` | `game_stats` by id (single or none) and `game_owners` with `profiles(display_name)` for that game, in parallel | `GameDetail` or null |
| `getShelfData()` | `game_stats`: id, name, cover_tint, owner_count, avg_recommendation | `ShelfData` |
| `getHomeData()` | `game_stats` (id, name, cover_tint, created_at, added_by, rating_count, avg_recommendation, owner_count), `profiles` (id, display_name) for the added by names, `game_owners` (member_id) for the member count | `HomeData` |
| `getGameIds()` | `game_stats` ids | `string[]`, or `["0"]` when empty |

The pure builders (`buildGameDetail`, `buildShelfData`, `buildHomeData`, `pickNewest`, `pickTopRated`, `compareNames`) stay as they are and keep their tests; the `get*` functions fetch rows and hand them over. A row type is derived from `Tables<"game_stats">`, so the builders keep their typed input.

**Data you prepare** (`data/games.json`):

| Field | Required | Rule |
|---|---|---|
| `name` | yes | 1 to 200 characters after trimming |
| `description` | no | up to 4000 characters, shown as written, any language |
| `playersMin`, `playersMax` | no | whole numbers above 0; min not above max; an empty end shows as `?` |
| `playTimeMin`, `playTimeMax` | no | minutes, same rules |
| `coverTint` | no | lowercase `#rrggbb`; empty gives the neutral tint |
| `addedAt` | no | an ISO date, for the "Just added" order; defaults to the time you load |

Cover images are out of scope: every game still shows the placeholder cover. Real games load without owners, ratings, or an "added by".

**State transitions**: none.

**API surface**: no new endpoints. `loadGameSheet` and the page keep their contracts; only `getGameDetail` behind them changes.

| Surface | Change |
|---|---|
| `pnpm seed:games` | new local command: reads `data/games.json`, validates, writes `supabase/games-data.sql` |
| `revalidateGames()` | new exported helper (calls `revalidateTag("games")`) for later write features |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Sheet, shelf, home | game name, description, players, minutes | `games` columns through `game_stats` |
| Sheet, shelf, home | cover tint | `games.cover_tint` (new); null gives the neutral tint |
| Sheet, shelf, home | owner count | `game_stats.owner_count` |
| Sheet, shelf, home | rating average, rating count | `game_stats.avg_recommendation`, `game_stats.rating_count` (from `ratings`; null and 0 when no ratings) |
| Sheet | owner names and "Since" date | `profiles.display_name`, `game_owners.created_at` |
| Home | member count | distinct `game_owners.member_id` |
| Home | added by name | `profiles.display_name` for `game_stats.added_by`; null if none |
| Home | "Just added" order | `game_stats.created_at` descending, then id descending |
| Build | ids to prerender | `game_stats.id`; `"0"` when empty |
| Cache | freshness | 5 minute life, tag `games`, cleared by `revalidateGames()` |
| `games-data.sql` | which row a game updates | `regexp_replace(lower(name), '[[:punct:][:space:]]', '', 'g')`, the same expression as `games.name_normalized` |
| `games-data.sql` | `created_at` | `addedAt` if given, else left to the column default on insert and unchanged on update |
| `games-data.sql` | `added_by`, owners, ratings | none (null / not created) |
| Seed ratings | other rating fields (best players, learn time, luck, strategy, entertainment) | fixed plausible values in `seed.sql`; only `recommendation` is chosen to hit the target average |

**Key invariants**:
- A component never queries Supabase; only the `get*` functions in `src/lib/games/` do.
- Every read goes through `createPublicClient()` (no cookies), inside a cached function with the `games` tag.
- `cover_tint` is null or lowercase `#rrggbb`, enforced by the database; the sheet's colors still come only from `coverTheme()`.
- The pure builders keep their signatures, so their tests stay valid.
- The generated SQL never creates owners, ratings, or members, and never uses the secret key.
- `docs/scope` and `docs/design.md` are updated in the same change; the dummy file does not survive it.

**Security model**: public read, no writes. All three screens read with the anonymous publishable key under the existing row level security: `games`, `game_owners`, `ratings` are public, and `profiles` exposes only `id`, `display_name`, `avatar_path`, `created_at` to anonymous readers, so no email or role leaks. `game_stats` is `security_invoker`, so it enforces the caller's policies. The new column is writable only by SQL (postgres, the dashboard) or an admin tool, never by `authenticated` in this feature. The data file has no personal data. No compliance scope.

**Configuration required**: none new. The reads use the existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Vercel must have them at build time (it already needs them), because `generateStaticParams` now reads the database. Migration 5 must be pushed to the real project (`supabase db push`) before the new code is deployed there.

**Critical test scenarios** (each maps to an acceptance criterion):
- Happy path: local `db reset`, then open Wingspan from the shelf; the modal shows the DB tint, 4 owners, `8.0`, verifies **AC-4, AC-5, AC-7**
- Happy path: `/zh/games/12` direct visit shows the neutral tint and the Chinese description from the database, verifies **AC-5**
- Edge case: insert `cover_tint` values `red`, `#fff`, `#ABCDEF` (rejected) and `null`, `#f3ead2` (accepted); an `authenticated` update of it is refused; `game_stats` has every old column, verifies **AC-1, AC-2**
- Edge case: games with no ratings, no owners, no description, and an empty database render home, the shelf, and the sheet without error, verifies **AC-9**
- Failure case: `/en/games/999`, `/en/games/abc`, `/en/games/0` still answer status 404 through the proxy, verifies **AC-6**
- Build: `pnpm build` passes against the seeded database and against an empty one (the `"0"` fallback), verifies **AC-6**
- Failure case: point the client at an unreachable URL; shelf shows its error block, the modal shows "Try again", home falls back to `error.tsx`, verifies **AC-11**
- Cache: after `revalidateGames()` the next read returns a new row; a failed read is not cached, verifies **AC-10**
- Data file: a file with a bad tint, min above max, and a blank name reports all three with positions and writes no SQL; a good file writes SQL that, run twice on local Supabase, leaves the same number of games, verifies **AC-13, AC-14**
- Typecheck: temporarily removing `cover_tint` from the generated types fails `pnpm typecheck`, verifies **AC-3**
- Cleanup: no import of `dummy-data` remains; Playwright home, shelf, and sheet specs pass at 360px and 1280px in both languages, verifies **AC-15, AC-16**

## Build plan

Order follows the project's Tracer Bullet approach, and you said to start with the game sheet: prove one real thread (database column, view, read function, cached, sheet on screen, proxy 404, build) before the shelf and home, then thicken the data file last.

1. Thin thread, the database: migration 5 (`games.cover_tint` and the `game_stats` rebuild), a pgTAP test file for it, `supabase db reset`, and regenerate `database.types.ts`; retype `ShelfGame` and `DummyGame` from the generated rows, satisfies **AC-1, AC-2, AC-3**
2. Thin thread, local sample data: replace the games, owners, and ratings in `supabase/seed.sql` with the 12 sample games, five sample members, owners, and ratings from AC-12 (hit each old average to one decimal where reachable), and `db reset` once to prove it loads, satisfies **AC-12**
3. Thin thread, the sheet: rewrite `getGameDetail` and `getGameIds` as cached public client reads with the `games` tag and the `"0"` fallback; prove the sheet page, the modal (`loadGameSheet`), and the proxy 404 work with Cache Components, and decide the `gameExists` fallback if the proxy cannot run a cached function; run `pnpm build` once with data and once with an empty database, satisfies **AC-4, AC-5, AC-6, AC-10**
4. Thicken, the shelf and home: rewrite `getShelfData` and `getHomeData` the same way, check the empty cases (zero games, ratings, owners), satisfies **AC-7, AC-8, AC-9**
5. Failure handling: confirm the shelf error block, the modal error block, and the `error.tsx` fallbacks for home and the game page with an unreachable database, satisfies **AC-11**
6. The data file: `data/games.json` (starts as an empty list with one commented example in the docs), validation and SQL writer in `src/lib/games/` with Vitest tests, the `pnpm seed:games` command, and a short README line in `data/`, satisfies **AC-13, AC-14**
7. Clean up: add the fixtures file, move the builder tests and the `/design` previews onto it, delete `dummy-data.ts` and its test, update the e2e text that quoted old averages, satisfies **AC-15, AC-16**
8. Tests and docs: finish Vitest and pgTAP coverage, run the Playwright specs at both sizes in both languages, update `docs/design.md` and `docs/scope/scope.md` (feature 21), and add the new rules to `src/lib/supabase/AGENTS.md` and the root `AGENTS.md` through `/sync`, satisfies **AC-16**

## Consequences

**Positive**:
- The three screens show real rows with no component change, as slice 1 planned, and one tag clears all of them after any write.
- You fill one JSON file and get SQL you can read and rerun, with every mistake reported before anything runs.
- Local development keeps all the states the real data cannot show yet (owners, ratings, a game with no tint).

**Negative / tradeoffs**:
- Until features 6 and 12, the real project shows no owners, no ratings, no "added by", and an empty Top rated. This is correct, but it looks emptier than the dummy design.
- A rating average is computed from rating rows, so a few sample averages (for example 7.6, 7.9, 8.6, 7.7) cannot be reproduced exactly with that few whole number ratings and move to the nearest reachable one.
- Your edits made directly in the dashboard take up to 5 minutes to show.
- The generated SQL matches games by name, so two different games that normalize to the same name would be treated as one. Feature 7's duplicate check needs the same rule.
- The proxy now reads the database for each game visit (cached, but a new dependency); the build now needs the Supabase environment variables.

**Neutral**:
- Covers stay as placeholders; real cover images and `cover_path` are a later feature.
- `memberCount` on home still means "members who own a game" and is cheap to change when profiles can be counted.

## Follow-up

- [ ] Run migration 5 on the real project with `supabase db push` before deploying this change, then run `supabase/games-data.sql` there once you have filled `data/games.json`
- [ ] Features 7, 12, and 19: call `revalidateGames()` after any write that changes a game, an owner, or a rating
- [ ] Feature 7 or 19: decide who may write `games.cover_tint` (it is not in the `authenticated` grants yet)
- [ ] When the shelf holds hundreds of games, page the reads and render only the cards in view
- [ ] Feature 10: decide whether a cover tint is picked automatically from a downloaded cover
- [ ] `/sync` after the build: root `AGENTS.md` lines about "Home reads dummy data", "Shelf reads the same dummy data", and "The game sheet reads the same dummy data" become stale and should describe the live reads and `pnpm seed:games`
- [ ] The scope's feature 21 line "move the dummy games into `supabase/seed.sql`" is adjusted: the sample games go to the seed, your real list goes through `data/games.json`
