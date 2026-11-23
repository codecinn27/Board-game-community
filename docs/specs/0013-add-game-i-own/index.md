# 0013. Add a game I own, ownership toggle, and admin review

**Date**: 2026-11-19
**Status**: In Progress

## Summary

Members get an Add page (`/games/new`, the Add tab) that searches the games already on the shelf first, so they mark "I own this" on the existing record instead of creating a copy; only when nothing matches do they fill a short form, with an optional cover picture that the browser shrinks to under 150 KB. The game sheet's "I own this" button starts working: one tap adds you as an owner, one tap removes you, with a short Undo. Every new game goes live at once but starts unreviewed, and a new admin only Review tab lists those games so you can check their details and mark them "Looks right". A unique name rule in the database keeps each game stored once, even when two members save at the same moment.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Requirements

**User stories**:
- As a member, I want to search the shelf for a game before adding it, so that I mark the existing record as mine instead of making a duplicate.
- As a member, I want to add a game nobody has entered yet, with its details and a cover picture, so that the community can see I own it.
- As a member, I want to add or remove myself as an owner from the game sheet, so that the shelf stays true when I buy or give away a game.
- As a visitor, I want "I own this" to take me to sign in and back, so that I can join and mark the game without searching again.
- As the admin, I want a list of games members added that I have not checked yet, so that I can catch wrong details early.

**Acceptance criteria**:
- **AC-1**: The Add tab is turned on for members and admins and opens `/{locale}/games/new`. A signed out visitor who opens that path is sent to `/{locale}/sign-in?next=/games/new` and comes back to it after signing in. `/games/new` never answers the game 404 (the proxy rewrite skips it).
- **AC-2**: On the Add page, typing in the search box (after a 250 ms pause, once the trimmed text is not blank) shows up to 10 games whose `name_normalized` contains the typed text normalized the same way (in the database only; text that is only spaces and punctuation returns no results). An exact match comes first, then names that start with the text, then the rest in `name_normalized` order. An answer for text the box no longer holds is dropped. Chinese names match by their characters. Each result shows its cover tile, its name, and its owners' display names ("Owned by Arif and Jun"; more than 3 shows "Owned by Arif, Jun and 3 others"), or "Nobody owns this yet". An empty box shows no results.
- **AC-3**: Each search result has "I own this". One tap adds the viewer as an owner without leaving the page; the result then reads "You own this" and the viewer's display name joins its owner names. A result the viewer already owns shows "You own this" from the start. Each result also links to its game page, and a sheet for that game opened later in the same visit shows the new owner.
- **AC-4**: Below the results, "Not here? Add it yourself" opens the manual form with the search text (trimmed) as the name. Fields: name (required, 1 to 200 characters after trimming, and at least one character that is not a space or punctuation), players min and max (optional whole numbers 1 to 99, min not above max), play time min and max in minutes (optional whole numbers 1 to 1440, min not above max), description (optional, trimmed, up to 4000 characters, blank stored as null), cover picture (optional). A field that breaks a rule shows its message next to it, nothing is saved, and every field keeps what was typed.
- **AC-5**: Saving a valid new game creates exactly one `games` row (`source_kind` `manual`, `added_by` the viewer, `reviewed_at` null) and one `game_owners` row for the viewer, in one transaction. The member lands on `/{locale}/games/{id}` and sees themselves as the owner. Home and shelf show the game on the next view, not after the 5 minute cache life.
- **AC-6**: When the name matches an existing game exactly (same `name_normalized`), nothing is saved. The form shows that game with its owners and "I own this" (or "You own this"). The same answer comes back when two members save the same new name at the same moment: the database refuses the second, and that member sees the existing game.
- **AC-7**: A chosen cover picture is shrunk in the browser to at most 600 px wide, saved as WebP (JPEG when the browser cannot write WebP), and kept under 150 KB (153600 bytes). Its main colour is saved as `cover_tint` (`#rrggbb`, lowercase). The server checks the file again (real WebP or JPEG bytes, at most 153600 bytes) before storing it in the `covers` bucket. The cover then shows on the game page, sheet, shelf, and home. With no picture, `cover_path` and `cover_tint` stay null and the game shows the neutral tint tile.
- **AC-8**: A picture the browser cannot read, a file over 15 MB, or one that cannot get under 150 KB shows a message at the cover field; the rest of the form is kept. If storing the picture or saving the game fails, nothing is left behind (no game row, no owner row, no file in the bucket); the form keeps everything typed and says what to try. If the game is saved but setting its cover then fails, the game is kept without a cover, the file is removed, and the member lands on the game page as usual (the game may already have other owners by then, so it is never deleted).
- **AC-9**: On the game sheet (modal and page), a member who does not own the game sees "I own this"; one tap adds them. A member who owns it sees "You own this"; one tap removes them, and the dock shows "Removed" with Undo for 5 seconds; Undo adds them back. After each change the open sheet's owner list and owner count update, and shelf and home show the change on their next view.
- **AC-10**: A signed out visitor's "I own this" is a link to `/{locale}/sign-in?next=/games/{id}`. A disabled (read only) member sees the button turned off with the read only note, and the Add page shows the read only message instead of the search. Tapping add twice, or removing a game you no longer own, is harmless: the end state is the same and no error shows.
- **AC-11**: When the last owner removes themselves, the game stays: it still shows on shelf and home with 0 owners, and its page still opens.
- **AC-12**: `games` gains `reviewed_at` and `reviewed_by`. The migration marks every existing game reviewed; `supabase/seed.sql` and the SQL `pnpm seed:games` writes mark their games reviewed; a game a member or an admin adds through the app starts unreviewed (the same rule for everyone). Among app users, only an active admin can change these two columns (SQL as postgres and the secret key still can). Members and visitors see nothing about review anywhere in the UI.
- **AC-13**: A Review tab (`/{locale}/admin/review`) shows in the bottom bar and the desktop header only for active admins, with no count badge. Anyone else who opens that path, guest or member, gets the not found page.
- **AC-14**: The Review page has two tabs. "To review" lists unreviewed games, oldest added first. "Reviewed" lists reviewed games, latest reviewed first. Each row shows the cover tile, name, players, play time, description, who added it and when, and a link to the game page; Reviewed rows also show who reviewed it and when. "Looks right" moves a game to Reviewed (stamps `reviewed_at` and `reviewed_by`); "Mark as not reviewed" moves it back (clears both). Each tab shows 30 rows, with "Show more" for the next 30, and its own empty state ("All games are reviewed", "Nothing reviewed yet").
- **AC-15**: Every new piece of text exists in English and Chinese. `/games/new` and `/admin/review` set `alternates: await getAlternates(...)` and `robots: { index: false }`. Both pages and the dock work at 360 px wide with no sideways page scroll, and the five tab bottom bar fits at 360 px for admins.

## Decision

**Chosen option**: Option 1: Search first page, Server Actions over small database functions, cover processed in the browser, admin review page in this feature.

Build the add flow as a search first page backed by three Postgres functions (`search_games`, `add_game`, `set_game_reviewed`) called through Server Actions with the member's own session; covers are shrunk and tinted in the browser and stored by the server with the secret key; a unique index on `name_normalized` enforces "stored once".

**Implementation skills**: `supabase` (`supabase/agent-skills`, `.claude/skills/supabase/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.claude/skills/supabase-postgres-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `shadcn` (`shadcn-ui/ui`, `.claude/skills/shadcn/`)

**Calls made in this spec** (each with the runner up):
- Search runs in Postgres (`search_games` normalizes the query with the same expression as the generated column, so JavaScript and SQL can never disagree on punctuation). Runner up: send every game name to the browser and filter there; fine at 12 games, wrong once the shelf grows, and it duplicates the normalizing rule.
- `add_game` is `security invoker` (row level security still applies) and inserts the game and the owner in one statement. Runner up: two inserts from the action, which can leave a game with no owner when the second fails.
- Cover order: check for an exact name match first (`search_games`), then upload, then `add_game`, then set `cover_path` and `cover_tint` with the admin client. A failure before the game exists removes the file; a failure after keeps the game without a cover (never delete a game another member may already own). Upload before insert means the most likely failure (the upload) leaves nothing to undo. Runner up: a `security definer` function taking `cover_path`, one transaction but it bypasses row level security and must copy every check.
- The add form submits through `onSubmit` with `startTransition`, building the `FormData` by hand (the shrunk cover blob must be appended anyway), with controlled fields. React 19 resets uncontrolled fields after a `<form action>` finishes, which would lose the typing AC-4 and AC-8 promise to keep. Runner up: `useActionState` with `defaultValue` from the returned state; works for text but cannot restore a file input.
- Search stays a Server Action. Server Actions from one tab run one at a time, so a search can briefly delay an "I own this" tap; at a 250 ms debounce on a small shelf that is acceptable, and the client tags each request with its text and drops answers that no longer match the box. Runner up: a GET `route.ts` for search, which runs in parallel but adds a public facing route to protect.
- Sorting uses `name_normalized`, then `id`, so the order does not depend on the database collation.
- Tint is the average colour of the shrunk picture at 24 × 24, skipping see through, near white (all channels above 240), and near black (all below 16) pixels; if every pixel is skipped, use them all. Runner up: the biggest bucket of a colour histogram, more vivid but more code for little gain, since `coverTheme()` already adjusts lightness.
- Own state on the sheet comes from a small Server Action (`getOwnState`) called by the dock when it mounts, so the cached sheet data never reads cookies. Runner up: send owner ids with `SheetData` and the viewer id to the client; leaks member ids to every visitor and still needs the viewer id.
- Undo is an inline "Removed · Undo" message inside the dock for 5 seconds, no toast library. Runner up: shadcn `sonner`, a new dependency for one message.
- Validation is hand written in one shared pure module (`src/lib/games/new-game.ts`), like `src/lib/auth/validation.ts`. Runner up: add zod; not in the project, and the rules are few.
- The admin not found is `notFound()` from the page's loader under `Suspense`. Streaming may send status 200 with the not found UI; acceptable for a page nobody links to. Runner up: a role check in `src/proxy.ts`, which adds a database read to every request.
- Review lists page by 30 with `?tab=` and `?shown=` read inside the loader under `Suspense`.

## Feature design

**Data model sketch** (one migration, `supabase/migrations/20261119090000_add_game.sql`):

| Table | Change | Rules |
|---|---|---|
| `games` | replace index `games_name_normalized_idx` with unique index `games_name_normalized_key` on `(name_normalized)` | The migration first fails with a clear message if two rows already share a `name_normalized` |
| `games` | add `reviewed_at timestamptz` null | null means not reviewed |
| `games` | add `reviewed_by uuid` null, constraint named `games_reviewed_by_fkey`, references `profiles(id)` on delete set null | check `reviewed_by is null or reviewed_at is not null` (a backfilled game is reviewed with no reviewer) |
| `games` | backfill `update public.games set reviewed_at = now()` | runs as postgres, so the guard and the admin log skip it; it also bumps `updated_at` (accepted, nothing reads it) |
| `game_owners` | no change | primary key (`game_id`, `member_id`) already makes adding twice impossible |

Other database changes in the same migration:
- `private.guard_game_update()`: add `reviewed_at` and `reviewed_by` to the columns a non admin may not change.
- `grant update (reviewed_at, reviewed_by) on public.games to authenticated` (the existing update policy plus the guard leave only admins able to use it). No insert grant: new rows always start null.
- `public.search_games(q text) returns table (id bigint, name text, cover_path text, cover_tint text, owner_names text[], mine boolean, exact boolean)`: `security invoker`, `stable`, `set search_path = ''`. Normalizes `q` with `regexp_replace(lower(q), '[[:punct:][:space:]]', '', 'g')`; returns nothing when that is empty; matches with `strpos(name_normalized, nq) > 0` (no `like`, so `%` and `_` are plain text); `exact` is `name_normalized = nq`; `mine` is whether `auth.uid()` owns it; `owner_names` sorted A to Z; `order by exact desc, (left(name_normalized, char_length(nq)) = nq) desc, name_normalized, id`; limit 10. Execute granted to `authenticated` only.
- `public.add_game(p_name text, p_players_min smallint, p_players_max smallint, p_play_time_min smallint, p_play_time_max smallint, p_description text) returns bigint`: `security invoker`, `set search_path = ''`. One statement: `with g as (insert into public.games (name, players_min, ..., source_kind) values (btrim(p_name), ..., 'manual') returning id) insert into public.game_owners (game_id) select id from g returning game_id`. Raises `22023` first when the name normalizes to an empty string. A name clash raises `23505`. Execute granted to `authenticated` only.
- `public.set_game_reviewed(p_game_id bigint, p_reviewed boolean) returns text`: `security invoker`. Raises `42501` unless `private.is_admin()`. Updates only a row whose state changes (`where id = p_game_id and reviewed_at is null` when marking, `is not null` when clearing), setting `reviewed_at = case when p_reviewed then now() end`, `reviewed_by = case when p_reviewed then auth.uid() end`. Returns `'ok'` when it changed a row or the game already had that state (a double tap keeps the first reviewer and time), `'notfound'` when no game has that id. The update bumps `updated_at` (accepted). Execute granted to `authenticated` only.
- Existing test `supabase/tests/database/01_foundation_thread.test.sql` lines 225 to 233 insert `Catan!` beside `Catan` and two spellings of 卡坦岛 and expect both to exist; rewrite them to expect `23505` on the second spelling while keeping the normalization checks.
- `game_stats` is not rebuilt: no public read needs the review columns.

**State transitions**:
- Game review: `unreviewed` (reviewed_at null) → `reviewed` (Looks right) → `unreviewed` (Mark as not reviewed). Admin only. Existing and seeded games start `reviewed`.
- Ownership (per member and game): `not owner` → `owner` (I own this) → `not owner` (You own this, or Undo after add). Both directions are idempotent.

**API surface** (Server Actions; all take `locale` as an argument, return plain data):

| Action (file) | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|
| `searchGames` (`src/app/[locale]/games/new/actions.ts`) | `query: string` (req), `locale` | `{ status: "ok", results: { id, name, coverPath, coverTint, ownerNames, mine, exact }[] }` | member (session) | `guest` (session gone), `error` |
| `addGame` (same file) | `FormData`: `name` (req), `playersMin`, `playersMax`, `playTimeMin`, `playTimeMax`, `description`, `cover` (File, opt), `coverTint` (opt), `locale` | redirect to `/{locale}/games/{id}` on success | active member | `invalid` (field keys), `exists` (the existing game, shaped like a search result), `coverInvalid`, `uploadFailed`, `readOnly`, `guest`, `error` |
| `markOwned` (`src/components/game-sheet/own-actions.ts`, its own file beside `actions.tsx` because these return plain status data and are shared with the Add page) | `gameId: number`, `locale` | `{ status: "owned" }` | active member | `guest`, `readOnly`, `notFound` (FK `23503`), `error`; `23505` counts as `owned` |
| `unmarkOwned` (same file) | `gameId`, `locale` | `{ status: "notOwned" }` | active member | `guest`, `readOnly`, `error`; deleting nothing counts as `notOwned` |
| `getOwnState` (same file) | `gameId` | `{ status: "guest" \| "readOnly" \| "owned" \| "notOwned" }` | anyone | `error` (dock falls back to the guest link) |
| `markReviewed`, `markUnreviewed` (`src/app/[locale]/admin/review/actions.ts`) | `gameId`, `locale` | `{ status: "ok" }` | active admin | `notFound`, `forbidden` (`42501`), `error` |

Reads (only `get*` functions query, per `AGENTS.md`):
- `getReviewQueue(tab: "todo" | "done", shown: number)` in `src/lib/games/review.ts`: server client with the admin's session, not cached (admin only, must be live). Embeds both people with explicit hints (`adder:profiles!games_added_by_fkey(display_name)`, `reviewer:profiles!games_reviewed_by_fkey(display_name)`). Returns rows plus the total for "Show more". The loader clamps `?shown` to a multiple of 30 between 30 and 300 (else 30) and treats any `?tab` other than `done` as `todo`.
- `getViewer()` in `src/lib/auth/viewer.ts` gains `role` and `status` on the member kind (one `profiles` read by id), so the nav and the pages know admin and read only. A missing profile row counts as an active member, never an admin.
- After Looks right or Mark as not reviewed succeeds, the client calls `router.refresh()` (the page is not cached, so no tag to clear; public reads do not use these columns, so no `revalidateGames()`).

Pages and wiring:
- `src/app/[locale]/games/new/page.tsx`: static shell; the member check, read only check, and the client `AddGame` island sit under `Suspense`. Components in `src/components/add-game/` (`add-game.tsx`, `search-results.tsx`, `new-game-form.tsx`, `cover-picker.tsx`).
- `src/app/[locale]/admin/review/page.tsx` with a `ReviewLoader` under `Suspense` that calls `getViewer()` (not an active admin → `notFound()`), reads `?tab` and `?shown`, then `getReviewQueue`. Components in `src/components/review/`.
- `src/components/game-sheet/own-button.tsx` (client) replaces the disabled dock button in `sheet-view.tsx`; it gets its labels through `SheetData.dock` and the game id and path as props.
- `src/lib/app-shell/nav.ts`: `Viewer` becomes `"guest" | "member" | "admin"`; an item with `audience: "member"` shows for members and admins; `add` gets `enabled: true`; a new item `{ key: "review", href: "/admin/review", icon: "ShieldCheck", labelKey: "review", audience: "admin", raised: false, enabled: true }` sits between `add` and `me`.
- `src/proxy.ts`: the game path rewrite skips the id `new`. `src/lib/auth/guards.ts` `authRedirect`: a guest on `/games/new` goes to `/sign-in?next=/games/new`.
- After `addGame`, `markOwned`, and `unmarkOwned` succeed: `revalidateGames()`. `sheet-store.ts` gains `invalidateSheet(id)`, which drops that game's cached results in every language. After an own toggle the dock calls it and loads the sheet again (modal) or calls `router.refresh()` (page), so owners update (AC-9); the Add page calls it after "I own this" on a result (AC-3).

**Cover pipeline** (`src/components/add-game/cover-picker.tsx` in the browser, pure helpers in `src/lib/games/cover-image.ts`):
1. Accept `image/*`. Over 15 MB → `coverTooBig`. `createImageBitmap(file, { imageOrientation: "from-image" })`; a throw → `coverUnreadable`.
2. Draw at width `min(600, natural width)`, keeping the ratio, on a canvas. `toBlob("image/webp", q)` for q in 0.82, 0.72, 0.62, 0.52, 0.42; stop at the first blob at most 153600 bytes. If the blob type is not `image/webp`, run the same loop with `image/jpeg`. Still too big → repeat at width 480. Still too big → `coverTooDetailed`.
3. Tint: draw the bitmap at 24 × 24 and apply `pickTint(pixels)` (rule in Decision). Show a preview with the tint behind it.
4. On save, the form sends the blob as `cover` and the tint as `coverTint`.
5. Server (`addGame`), in this order: check the session and active status; `validateNewGame`; `search_games(name)` and return `exists` when a row has `exact`; check the cover (size ≤ 153600, first bytes `RIFF....WEBP` or `FF D8 FF`) and `coverTint` (`^#[0-9a-f]{6}$`, else drop the tint and keep the cover); upload with the admin client to `covers/{crypto.randomUUID()}.webp|.jpg`, `upsert: false`, matching `contentType`; `add_game` with the member's client (on any error remove the file; on `23505` look the game up again and return `exists`, or `error` if no exact row comes back); admin client `update games set cover_path, cover_tint where id` (on error remove the file and carry on without a cover); `revalidateGames()`; then `redirect()` to the game page, outside every try/catch, because `redirect()` works by throwing.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| `searchGames` | matching games, order | `games.name_normalized` vs `q` normalized in `search_games` |
| `searchGames` | owner names | `profiles.display_name` via `game_owners`, sorted A to Z; first 3 shown, the rest as a count |
| result after "I own this" | viewer's name in the owners | `getViewer()` display name passed to the Add island as a prop, added to the list on the client |
| `searchGames` | "You own this" | `mine` = `game_owners` row for `auth.uid()` |
| `searchGames` | duplicate warning | `exact` = equal `name_normalized` |
| search result | cover tile | `cover_path` via `coverUrl()`, `cover_tint`, `CoverTile` |
| "Owned by A and B" | joined names | next-intl `format.list` in the viewer's locale |
| `addGame` | `added_by`, `member_id` | column defaults `auth.uid()`, checked by the insert policies |
| `addGame` | `source_kind` | constant `manual` in `add_game` |
| `addGame` | `reviewed_at`, `reviewed_by` | default null (no insert grant) |
| `addGame` | `cover_path` | server generated `{uuid}.webp` or `.jpg` |
| `addGame` | `cover_tint` | browser `pickTint`, checked on the server |
| `addGame` | existing game on clash | `search_games(name)` row where `exact` |
| `addGame` | redirect target | id returned by `add_game`, `locale` argument |
| dock | button state | `getOwnState`: claims (guest), `profiles.status` (read only), `game_owners` (owned) |
| dock | sign in link | `/{locale}/sign-in?next=/games/{id}`, through `safeNext()` |
| dock | owner list after a toggle | `loadGameSheet` again (modal) or `router.refresh()` (page) |
| Review tab visible | admin | `getViewer()`: `profiles.role = 'admin'` and `status = 'active'` |
| review row | added by and when | `profiles.display_name` of `added_by` (or "Unknown member" when null), `games.created_at` via `LocalTime` |
| review row | reviewed by and when | `profiles.display_name` of `reviewed_by` (or "Set at import" when null), `reviewed_at` via `LocalTime` |
| review list | total for Show more | `count: "exact"` on the same query |

**Key invariants**:
- A game name exists once: unique index on `games.name_normalized`.
- Every game a member adds has that member as an owner from the same transaction.
- `reviewed_by` set implies `reviewed_at` set; only an active admin changes either.
- Ownership is the presence of a `game_owners` row; add and remove are idempotent.
- No file in `covers` without a game pointing to it, from this flow (the action cleans up on failure).
- Components never query; reads stay in `get*` functions; client code never imports `@/lib/games/shelf`.

**Security model**:
- Guests: read games and owners (unchanged). Cannot call `search_games`, `add_game`, `set_game_reviewed` (the default privileges in migration 1 revoke execute on new functions, and only `authenticated` gets it back). `/games/new` redirects them; `/admin/review` is not found.
- Active members: search, add a game, add or remove only their own `game_owners` rows (existing policies). Cannot set `cover_tint` (no grant), `cover_path` (granted for update since migration 1, but the guard trigger refuses it for non admins), or `reviewed_*` (guard trigger).
- `reviewed_at` and `reviewed_by` (an admin's id) are readable by anyone through the existing table wide select grant on `games`. Accepted: profile ids are already public through `game_owners`, and nothing in the UI shows them.
- Disabled members: every write refused by `private.is_active_member()` in the policies; the UI shows the read only note.
- Active admins: everything members can, plus `set_game_reviewed`. Admin updates to games added by someone else land in the admin log (existing trigger); that is expected.
- The secret key is used only in `src/app/[locale]/games/new/actions.ts` (allowed: a file named `actions.ts`) for the cover upload, the cover columns, and cleanup, always after the action has checked the member's session and active status.
- No new personal data. Display names were already public.

**Configuration required**: none (existing Supabase keys).

**Critical test scenarios**:
- Happy path: a member searches "brass", sees no match, adds "Brass: Birmingham" with players, time, and a cover, lands on its page as owner, and it shows on the shelf; verifies **AC-2**, **AC-4**, **AC-5**, **AC-7**.
- Duplicate: adding "catan " when "Catan" exists saves nothing and shows Catan with "I own this"; a second `add_game` with the same normalized name raises `23505` (pgTAP; the unique index is what covers two saves at the same moment, which one pgTAP session cannot run); a name of only punctuation raises `22023`; verifies **AC-4**, **AC-6**.
- Failure: a forced upload failure and a forced `add_game` failure each leave no game row and no file; a forced cover update failure keeps the game with no cover and no file; an `invalid` answer keeps every typed field; verifies **AC-4**, **AC-8**.
- Toggle: own, remove, Undo on the sheet update the owner list; adding twice returns `owned`; last owner leaving keeps the game on the shelf; verifies **AC-9**, **AC-10**, **AC-11**.
- Auth: a guest is redirected from `/games/new`; a member gets not found on `/admin/review` and `42501` from `set_game_reviewed`; a member's direct update of `reviewed_at` or `cover_path` is refused (pgTAP); verifies **AC-1**, **AC-12**, **AC-13**.
- Review: Looks right moves a game to Reviewed with the admin's name; Mark as not reviewed clears both columns; verifies **AC-14**.
- Search ranking and normalization: "CAT" ranks "Catan" before "Concatenate Cats"; a Chinese query matches a Chinese name; `%` matches only a literal percent (pgTAP and Vitest on `pickTint`, `validateNewGame`); verifies **AC-2**, **AC-7**.

## Build plan

Ordered as Tracer Bullet (the project approach): one thin thread from the database to a saved game first, then each strand thickened.

1. [x] Migration `20261119090000_add_game.sql`: duplicate check, unique name index, `reviewed_at`, `reviewed_by` (named constraint), backfill, guard update, grants, `search_games`, `add_game`, `set_game_reviewed`. Rewrite lines 225 to 233 of `01_foundation_thread.test.sql` for the unique rule. Regenerate `database.types.ts`. Satisfies **AC-5**, **AC-6**, **AC-12**
2. [x] pgTAP file `supabase/tests/database/09_add_game.test.sql`: search normalization and order, `%` as plain text, `mine` and `exact`, `add_game` makes game plus owner, same name `23505`, punctuation only `22023`, guest no execute, disabled member refused, adder cannot write `reviewed_*` or `cover_path` (`42501`), admin `set_game_reviewed` both ways and a double mark keeping the first reviewer, backfill marked existing rows. Satisfies **AC-2**, **AC-4**, **AC-5**, **AC-6**, **AC-10**, **AC-12**, **AC-14**
3. [x] Thin thread: `src/proxy.ts` skips `new`, `authRedirect` guards `/games/new`, Add tab `enabled: true`, `/games/new` page with the search box, `searchGames`, results with names and owners, "Add it yourself" with a name only form, `addGame` (no cover) redirecting to the new game page, `revalidateGames()`. Satisfies **AC-1**, **AC-2**, **AC-4**, **AC-5**
4. [x] Full form: `validateNewGame` (shared, Vitest), all fields with field messages, the `exists` answer showing the existing game with "I own this", result "I own this" via `markOwned`. Satisfies **AC-3**, **AC-4**, **AC-6**
5. [x] Cover: `cover-image.ts` (`pickTint`, quality steps, byte checks, Vitest), `cover-picker.tsx` with preview, server checks, upload, cover columns, cleanup on each failure. Satisfies **AC-7**, **AC-8**
6. [x] Sheet dock: `getViewer` gains `role` and `status`; `own-actions.ts` (`getOwnState`, `markOwned`, `unmarkOwned`); `own-button.tsx` with guest link, read only state, Undo for 5 seconds, sheet reload or `router.refresh()`; read only message on the Add page. Satisfies **AC-9**, **AC-10**, **AC-11**
7. [x] Admin: nav `admin` audience and the Review item; `getReviewQueue`; `/admin/review` page, loader with `notFound()`, tabs, rows, Show more, Looks right and Mark as not reviewed actions. Satisfies **AC-13**, **AC-14**
8. [x] Seeds: `supabase/seed.sql` and `src/lib/games/games-file.ts` (the SQL `pnpm seed:games` writes) set `reviewed_at = now()` on insert, and `reviewed_at = coalesce(reviewed_at, now())` in the update branch (a file entry you wrote counts as checked); update their tests. Satisfies **AC-12**
9. [ ] Messages in `messages/en.json` and `messages/zh.json` (`addGame`, `review`, `shell.tabs.review`, dock additions), metadata with alternates and `robots: { index: false }`, Vitest for nav audiences and `authRedirect`, browser checks for add, toggle, and review at 360 px and 1280 px. Satisfies **AC-1**, **AC-13**, **AC-15**

## Consequences

**Positive**:
- The "stored once" promise from spec 0002 is now enforced by the database, not by hope.
- The sheet's main action finally works, and the shelf can grow without you typing every game.
- You see every member added game before it can mislead anyone for long.

**Negative / tradeoffs**:
- Two genuinely different games with the same name (a reprint, a regional edition) cannot both exist; the second needs a different name, such as "Catan (2015)". Features 10 and 11 must live with the same rule.
- Admins get a fifth bottom tab, so tabs are narrower at 360 px for you only.
- The cover goes through three steps (upload, insert, cover update) with manual cleanup instead of one transaction; a crash between steps can leave an orphan file in the bucket (no game points to it, harmless, removable later).
- `getViewer()` now reads `profiles` on every nav render (one indexed row, under `Suspense`).
- A wrong detail can only be fixed in the Supabase dashboard until editing arrives with feature 19.
- The admin not found page may stream with status 200.

- Search and the own toggle share the one at a time Server Action queue, so a slow search can delay a tap by a moment.

**Neutral**:
- New folder patterns: `src/components/add-game/`, `src/components/review/`, `src/app/[locale]/admin/`.
- The admin log records every review an admin makes on another member's game, with the full row; marking and unmarking writes two entries. Accepted.
- Reviewing bumps `games.updated_at`; nothing reads it today.
- `game_stats` keeps its current columns.

## Follow-up

- [ ] Feature 19 (Admin tools): editing game details from the Review page, merging duplicates, deleting junk, and cleaning orphan cover files.
- [ ] Features 10 and 11 must reuse `add_game` (with `source_kind` set) and respect the unique name rule.
- [ ] Check on a real iPhone that Safari shrinks HEIC photos; if `createImageBitmap` cannot read them, the message tells the member to pick a JPEG or PNG.
- [ ] Spec 0012 (shelf owner filter) is still `Assumed`; unrelated to this feature, but still owed.
