# 0013. Add a game I own, ownership toggle, and admin review

**Date**: 2026-11-19
**Status**: In Progress

## Summary

Members get an Add page (`/games/new`, the Add tab) that searches the games already on the shelf first, so they mark "I own this" on the existing record instead of creating a copy; only when nothing matches do they fill a short form, with an optional cover picture that the browser shrinks to under 150 KB. The game sheet's "I own this" button starts working: one tap adds you as an owner, one tap removes you, with a short Undo. Every new game goes live at once but starts unreviewed, and a new admin only Review tab lists those games so you can check their details and mark them "Looks right". A unique name rule in the database keeps each game stored once, even when two members save at the same moment.

**Amendment 2026-11-24 (review editing)**: on the "To review" tab the admin can open any game (tap its cover, title, or description) and fix everything before approving it: name and description in English and Chinese, cover picture, players, play time, categories, and owners. "Looks right" on the card still approves at once with no editor. A reviewed game cannot be edited until it is marked "not reviewed". Every edit is written to an edit history table, and a replaced or removed cover goes to a 30 day recycle bin before it is deleted for good. This replaces the earlier plan to defer editing to feature 19 (AC-16 to AC-25, build steps 10 to 16).

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Requirements

**User stories**:
- As a member, I want to search the shelf for a game before adding it, so that I mark the existing record as mine instead of making a duplicate.
- As a member, I want to add a game nobody has entered yet, with its details and a cover picture, so that the community can see I own it.
- As a member, I want to add or remove myself as an owner from the game sheet, so that the shelf stays true when I buy or give away a game.
- As a visitor, I want "I own this" to take me to sign in and back, so that I can join and mark the game without searching again.
- As the admin, I want a list of games members added that I have not checked yet, so that I can catch wrong details early.
- As the admin, I want to open a game in the review list and fix its name, description (English and Chinese), cover, players, play time, categories, and owners, so that I approve only correct data.
- As the admin, I want every edit and every replaced cover kept for a while, so that I can find out what changed and undo a mistake.

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

**Acceptance criteria, review editing (amendment)**:
- **AC-16**: On the "To review" tab, the cover, the name, and the description of a row are each a button (min 44 px target) that opens the editor in a modal: a bottom sheet at 360 px, a centered dialog at 1280 px. "Looks right" on the card still marks the game reviewed at once, without opening the editor, and without saving anything else. On the "Reviewed" tab the cover, name, and description do not open the editor (the name keeps its link to the game page); only "Mark as not reviewed" is offered, and after it the game is editable in "To review".
- **AC-17**: The editor has these fields, filled with the saved values: name (English, required, same rules as AC-4), name (Chinese, optional, 1 to 200 characters after trimming, blank stored as null), description (English and Chinese, each optional, up to 4000 characters, blank stored as null), players min and max, play time min and max (same rules as AC-4), categories (any number, picked from the list), owners (any number of active members, picked from a member list with the current owners ticked), and cover (AC-18). English and Chinese text sit side by side in two tabs ("English", "中文") inside the editor; a field error switches to the tab that holds it.
- **AC-18**: The cover field shows the current picture with "Replace" and "Remove". A new picture goes through the same browser pipeline as AC-7 (600 px, WebP or JPEG, under 150 KB, tint saved); the server checks it again as in AC-7. "Remove" clears `cover_path` and `cover_tint` and the game shows the tint tile. Nothing changes until Save.
- **AC-19**: The editor has "Save", "Save and looks right", and "Cancel". "Save" writes every change in one transaction and keeps the game in "To review" (the row shows the new values after the page refreshes). "Save and looks right" does the same and marks the game reviewed in the same transaction (the game moves to "Reviewed"). Closing a modal with unsaved changes asks first. A field that breaks a rule shows its message next to it, nothing is saved, and every field keeps what was typed (same hand built `onSubmit` rule as the add form). Saving with no change closes the modal and writes no history row.
- **AC-20**: A name that clashes with another game (same `name_normalized`, or the same normalized Chinese name) saves nothing and shows a message naming the other game. If the game was marked reviewed by another tab while the editor was open, the save is refused with a message ("This game is already reviewed; mark it not reviewed to edit it") and the row refreshes. Only an active admin can save; anyone else is refused with `42501`.
- **AC-21**: Every successful save writes one `game_edits` row: the game id and its name at that moment, the editor (`auth.uid()`), the time, the list of changed fields, and the full before and after values of those fields (including cover path, category ids, and owner ids). Rows are readable only by admins, never changed or deleted by the app, and survive the game being deleted. The edit and its history row are written in the same transaction, so there is never one without the other.
- **AC-22**: When a save replaces or removes a cover, the old file is moved from the public `covers` bucket to the private `covers-trash` bucket and recorded in `cover_trash` (path, game id, trashed at, trashed by). A file nobody points to is never left public. If the new cover upload fails or the save fails, the new file is removed, the old cover stays, and nothing is trashed. If moving the old file fails after a successful save, the save stands, the error is logged, and the old file stays in `covers` (harmless orphan).
- **AC-23**: A daily job deletes trashed covers older than 30 days: it removes the file through the Storage API and then the `cover_trash` row. A failure on one file keeps its row so the next run retries. Within 30 days an admin can restore a cover by moving the file back and setting `cover_path` in the Supabase dashboard (no UI).
- **AC-24**: Games get optional `name_zh` and `description_zh`. On `/zh` pages (home, shelf, sheet, game page, Add search, Review) the Chinese text is shown when it exists, otherwise the English text; on `/en` pages the English text is always shown. `search_games` matches the English or the Chinese name. A game with no Chinese text behaves exactly as before.
- **AC-25**: Categories live in a `categories` table (slug, English label, Chinese label) with a `game_categories` link table. Everyone can read them; only an active admin can add or change them. The editor can add a new category (English and Chinese label required) and pick it at once. Migration seeds a starter list (Strategy, Party, Family, Co-op, Card, Dice, Deduction, Abstract, Thematic, War). Showing categories on the public shelf, home, or sheet is out of scope here (follow-up). **Replaced by spec [0014](../0014-category-groups.md)**: three fixed groups (feel, theme, mechanics), no add form.

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

**Calls made in the review editing amendment** (each with the runner up):
- One Postgres function `admin_update_game(...)`, `security invoker`, writes the game, its categories, its owners, the optional review stamp, and the `game_edits` row in one transaction; the Server Action calls it with the admin's session. Runner up: several table updates from the action; a failure between them leaves a half saved game and a history row that lies.
- Cover order on save: validate, upload the new file with the admin client, call `admin_update_game` with the new path, then move the old file to trash and insert `cover_trash`. A failure before the function succeeds removes the new file; a failure after keeps the save (see AC-22). Runner up: trash first; a later failure would leave a game pointing at a trashed file.
- The recycle bin is a private bucket `covers-trash` plus a `cover_trash` table, not a folder in the public `covers` bucket (a public bucket serves any file in it to anyone who knows the URL). The move uses the Storage API (`move` with `destinationBucket`). Runner up: a `trash/` prefix in `covers`; simpler, but the "deleted" picture stays publicly reachable.
- The daily cleanup is a Supabase Edge Function `purge-cover-trash` run by `pg_cron` through `pg_net`. Deleting `storage.objects` rows in SQL does not delete the stored file, so SQL alone cannot do it; the function uses the Storage API with the service key stored as an Edge Function secret. Runner up: a Vercel cron hitting a protected route; adds a public route and a `CRON_SECRET`. To check while building: `pg_cron` and `pg_net` are enabled on the real project. If they are not, fall back to the Vercel cron and record it here.
- History is a `game_edits` table written by the same function, not the generic admin log trigger, because the admin log cannot see categories, owners, or the cover move as one edit. Runner up: rely on the admin log alone. It records only the `games` row.
- Chinese text is two new nullable columns (`name_zh`, `description_zh`), not a translations table. Runner up: a `game_translations` table, built for a third language we do not plan. Display uses one pure helper `localized(text, textZh, locale)`; cached reads take `locale` as an argument so the cache keeps one entry per language.
- Uniqueness for the Chinese name: a generated `name_zh_normalized` with its own partial unique index (`where name_zh is not null`). English and Chinese names are not compared with each other. Runner up: one shared index over both; blocks a game whose Chinese name equals another game's English name (for example both written as "Catan").
- Categories: `categories` plus `game_categories` (many to many) with English and Chinese labels. Runner up: a free text tags column; spelling drifts and each tag would need two languages.
- Owners editing needs a new admin only policy on `game_owners` (insert and delete any row). Members still change only their own rows. The picker lists active members (`profiles.status = 'active'`), loaded by the Review loader with the admin's session.
- Decisions made while writing the migration (step 10): `game_stats` is rebuilt so public reads see `name_zh` and `description_zh` (it expands `g.*` at creation; it now also shows `reviewed_at` and `reviewed_by`). The history row is written by `private.write_game_edit` (`security definer`, checks `is_admin()`), so nobody, admin included, has insert on `game_edits` and history cannot be forged over the API. `search_games` gains `name_zh` and `exact_zh` (last two columns; `exact` stays English only) so the action can name the other game on a Chinese name clash without repeating the normalizing rule. `admin_update_game` refuses null category or owner lists (`22023`) so a client bug cannot wipe them; a new owner must be an active member, but a current owner may stay even when disabled. `pg_cron` and `pg_net` are available but not installed on the real project (checked 2026-11-24), so the cron schedule is a separate migration at step 15. `game_edits` and `cover_trash` keep `game_id` with no foreign key, so `05_merge_readiness.test.sql` skips them and lists `game_categories`.
- Decisions made while building the strands (step 14): `saveGame` treats a field the form does not send as "keep the saved value" (Chinese text, category and owner lists, cover), so a partial form can never wipe data. The old cover is trashed by inserting the `cover_trash` row first and then moving the file; if the move fails the row is removed again, and if the row cannot be written the file is left in `covers`. The unsaved changes prompt is an inline "Discard your changes?" panel inside the editor (not `window.confirm`). A current owner who is read only stays in the owners list, ticked and marked. `createCategory` returns the existing category (ticked for you) when the English label is taken, and retries once with a random slug tail on a slug clash. The editor builds its own cover field (`cover-field.tsx`) from `shrinkCover` instead of reusing `CoverPicker`, because it needs the keep, replace, and remove states.
- Decisions made while building the purge (step 15): `pg_cron` and `pg_net` are available on the real project (checked 2026-11-24, not yet installed), so the Edge Function plan stands and the Vercel cron fallback is not used. The migration `20261124110000_purge_cover_trash_cron.sql` enables both extensions and schedules the job at 03:17 UTC. The job sends the shared secret in an `x-purge-secret` header and the function runs with `verify_jwt = false`, because a public JWT would let anyone call it. The URL and the secret are read from Vault (`project_url`, `purge_secret`), never from a migration. The purge logic lives in `purge.ts` with no imports so Vitest runs it with a stubbed client. A row is deleted only if it is older than 30 days by its own `trashed_at`, whatever the list returned.
- Decisions made while building Chinese display and the browser checks (steps 16 and 9): the `ShelfGame` and `GameRow` types are unchanged; `rows.ts` picks the language (`localized`) while mapping, so `name` and `description` already hold the right text and every builder and component stays as it was. `getHomeData`, `getShelfData`, and `getGameDetail` take `locale` as an argument (the cache keeps one entry per language). Add search results carry `nameZh` and the component localizes with `useLocale()`, so `searchGames` needs no locale argument. The repeatable browser checks are `e2e/review-edit.spec.ts` and `e2e/add-game.spec.ts` (local stack only, both screen sizes). They leave edit history and admin log rows that cannot be deleted through the API, so run `supabase db reset` after them and before `supabase test db`. The site is light only, so there is no dark run. The 360 px check also found and fixed a sideways scroll on the manual Add form (the cover picker's file input had no `min-w-0`).
- The editor modal reuses `cover-picker.tsx`, `shrink-cover.ts`, and `src/lib/games/cover-image.ts` from the add flow, and shadcn `Dialog` (centered) with `Sheet`/drawer behavior at small widths via the existing shadcn components. Validation reuses `validateNewGame` rules, extended in `src/lib/games/edit-game.ts` with the Chinese fields (pure, Vitest).

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

**Review editing, data model sketch** (second migration, `supabase/migrations/20261124090000_review_edit.sql`):

| Table or object | Change | Rules |
|---|---|---|
| `games` | add `name_zh text`, `description_zh text` | `name_zh` 1 to 200 chars after trim; `description_zh` at most 4000; both null by default |
| `games` | add generated `name_zh_normalized`, unique partial index `where name_zh is not null` | same normalizing expression as `name_normalized` |
| `games` | grant `update (cover_tint, name_zh, description_zh)` to `authenticated`; guard trigger refuses non admin changes to `cover_tint`, `name_zh`, `description_zh` | admin only, like the other protected columns |
| `categories` | new: `id` identity, `slug` unique, `name_en`, `name_zh`, `created_at` | RLS: public read, active admin insert and update; seeded with the starter list |
| `game_categories` | new: `game_id` (fk cascade), `category_id` (fk cascade), primary key both | RLS: public read, active admin insert and delete |
| `game_owners` | add admin only insert and delete policies | members keep their own row policies |
| `game_edits` | new: `id`, `game_id bigint` (no foreign key, history survives deletion), `game_name`, `edited_by uuid` (fk profiles on delete set null), `edited_at`, `changed text[]`, `before jsonb`, `after jsonb` | RLS: admin select only; no update or delete grant; insert only through `admin_update_game` |
| `cover_trash` | new: `id`, `path`, `game_id bigint` (no fk), `trashed_by`, `trashed_at` | RLS: admin select; written by the admin client in the action; the purge function deletes rows |
| `covers-trash` bucket | new, private, no public policies | files reachable only with the service key |
| `search_games` | also match `name_zh_normalized`; return `name_zh` | ranking unchanged: exact, prefix, rest |
| `admin_update_game(p_game_id bigint, p_name text, p_name_zh text, p_description text, p_description_zh text, p_players_min smallint, p_players_max smallint, p_play_time_min smallint, p_play_time_max smallint, p_category_ids bigint[], p_owner_ids uuid[], p_cover_path text, p_cover_tint text, p_mark_reviewed boolean) returns text` | new, `security invoker`, `set search_path = ''` | raises `42501` unless `private.is_admin()`; returns `'reviewed'` when the game is already reviewed (nothing written), `'notfound'`, `'clash'` for a `23505` on either name, else `'ok'`; in one transaction updates the game, replaces its category links and owner links with the given lists, stamps `reviewed_at`, `reviewed_by` when `p_mark_reviewed`, and inserts the `game_edits` row (only when something changed) |
| `purge-cover-trash` Edge Function | new, plus a daily `cron.schedule` | deletes files in `covers-trash` whose `trashed_at` is older than 30 days, then their rows |

Types are regenerated into `src/lib/supabase/database.types.ts`. The migration `20261119090000_add_game.sql` is not edited (it may already be pushed).

**Review editing, API surface** (Server Actions, `src/app/[locale]/admin/review/actions.ts`, all take `locale`):

| Action | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|
| `saveGame` | `FormData`: `gameId`, `name`, `nameZh`, `description`, `descriptionZh`, `playersMin`, `playersMax`, `playTimeMin`, `playTimeMax`, `categoryIds`, `ownerIds`, `cover` (File, opt), `coverTint` (opt), `removeCover`, `markReviewed` | `{ status: "ok" }` | active admin | `invalid` (field keys), `clash` (other game), `alreadyReviewed`, `notFound`, `coverInvalid`, `uploadFailed`, `forbidden`, `error` |
| `createCategory` | `nameEn`, `nameZh` | `{ status: "ok", category }` | active admin | `invalid`, `exists`, `forbidden`, `error` |

Reads: `getReviewQueue` also returns, per row, the Chinese fields, the category ids, and the owners; the loader fetches `getEditorLists()` (all categories, active members) once per page view, in `src/lib/games/review.ts`. After a save the action calls `revalidateGames()` and the client calls `router.refresh()`.

**Review editing, value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| editor | initial field values | the review row (`games`, `game_categories`, `game_owners`) |
| editor | category choices | `categories` (labels by locale, English fallback) |
| editor | owner choices | `profiles` where `status = 'active'`, `display_name` |
| `saveGame` | new cover path | server generated `{uuid}.webp` or `.jpg` in `covers` |
| `saveGame` | tint | browser `pickTint`, checked on the server as in AC-7 |
| `saveGame` | old cover path | `games.cover_path` read inside `admin_update_game` before the update; the action reads it first to know what to trash |
| `admin_update_game` | `edited_by`, `edited_at` | `auth.uid()`, `now()` |
| `admin_update_game` | `changed`, `before`, `after` | compared field by field inside the function |
| `cover_trash.trashed_at` | purge age | `now()` at insert; the purge uses `trashed_at < now() - interval '30 days'` |
| any page | shown name and description | `localized(name, nameZh, locale)` |

**Review editing, state and invariants**:
- A game is editable only while `reviewed_at` is null; the function enforces it, not just the UI.
- Every `games` change made through the editor has exactly one `game_edits` row (same transaction).
- A file in `covers-trash` has a `cover_trash` row until the purge removes both; no public path ever points at a trashed file.
- Replacing the owner list can leave a game with 0 owners (allowed, AC-11).

**Review editing, security model**:
- Only an active admin can call `admin_update_game`, create categories, change owners of others, read `game_edits` and `cover_trash`, or reach `covers-trash`. Members and guests are refused by RLS and `42501`, tested in pgTAP.
- The secret key is used in `src/app/[locale]/admin/review/actions.ts` (allowed: `actions.ts`) for the cover upload and move, only after the action checks the admin's session and active status, and inside the `purge-cover-trash` Edge Function (service key as a function secret, never in the repo).
- History holds admin and member ids and names. Admin only, no public exposure.

**Configuration required**: none for the original feature (existing Supabase keys). For the amendment: `pg_cron` and `pg_net` enabled on the real project, the `purge-cover-trash` Edge Function deployed, and its service key set as an Edge Function secret (`supabase secrets set`).

**Critical test scenarios**:
- Happy path: a member searches "brass", sees no match, adds "Brass: Birmingham" with players, time, and a cover, lands on its page as owner, and it shows on the shelf; verifies **AC-2**, **AC-4**, **AC-5**, **AC-7**.
- Duplicate: adding "catan " when "Catan" exists saves nothing and shows Catan with "I own this"; a second `add_game` with the same normalized name raises `23505` (pgTAP; the unique index is what covers two saves at the same moment, which one pgTAP session cannot run); a name of only punctuation raises `22023`; verifies **AC-4**, **AC-6**.
- Failure: a forced upload failure and a forced `add_game` failure each leave no game row and no file; a forced cover update failure keeps the game with no cover and no file; an `invalid` answer keeps every typed field; verifies **AC-4**, **AC-8**.
- Toggle: own, remove, Undo on the sheet update the owner list; adding twice returns `owned`; last owner leaving keeps the game on the shelf; verifies **AC-9**, **AC-10**, **AC-11**.
- Auth: a guest is redirected from `/games/new`; a member gets not found on `/admin/review` and `42501` from `set_game_reviewed`; a member's direct update of `reviewed_at` or `cover_path` is refused (pgTAP); verifies **AC-1**, **AC-12**, **AC-13**.
- Review: Looks right moves a game to Reviewed with the admin's name; Mark as not reviewed clears both columns; verifies **AC-14**.
- Search ranking and normalization: "CAT" ranks "Catan" before "Concatenate Cats"; a Chinese query matches a Chinese name; `%` matches only a literal percent (pgTAP and Vitest on `pickTint`, `validateNewGame`); verifies **AC-2**, **AC-7**.
- Editor happy path: the admin opens a game by tapping its title, changes the name, adds a Chinese name, sets two categories, adds an owner, replaces the cover, and taps "Save and looks right"; the game is in "Reviewed" with the new values, one `game_edits` row, and the old cover in `covers-trash`; verifies **AC-16** to **AC-19**, **AC-21**, **AC-22**.
- "Looks right" on the card marks the game reviewed without opening the editor; a Reviewed row has no editor and "Mark as not reviewed" makes it editable; verifies **AC-16**.
- Refusals (pgTAP): a member and a guest cannot call `admin_update_game`, create a category, insert someone else's `game_owners` row, or read `game_edits` and `cover_trash`; the function returns `reviewed` for a reviewed game and `clash` for a taken English or Chinese name, writing nothing; verifies **AC-20**, **AC-21**, **AC-25**.
- Failure: a failed new cover upload and a failed `admin_update_game` each leave the old cover public and no trash row; a failed move of the old file keeps the save; verifies **AC-22**.
- Purge: a `cover_trash` row 31 days old is deleted with its file, a 29 day old row stays, and a failed delete keeps its row (Edge Function test with a stubbed Storage client); verifies **AC-23**.
- Chinese display: `/zh` shows the Chinese name and description when present and the English otherwise; `/en` never shows Chinese; Vitest on `localized`, browser check on home, shelf, and sheet; verifies **AC-24**.

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
10. [x] Migration `20261124090000_review_edit.sql`: Chinese columns and indexes, guard update, `categories` and `game_categories` with seed, admin `game_owners` policies, `game_edits`, `cover_trash`, private `covers-trash` bucket, `search_games` update, `admin_update_game`. Regenerate `database.types.ts`. Satisfies **AC-17**, **AC-20**, **AC-21**, **AC-24**, **AC-25**
11. [x] pgTAP file `supabase/tests/database/10_review_edit.test.sql` for every refusal and result in the critical scenarios above; update `05_merge_readiness.test.sql` if it flags the new tables. Satisfies **AC-20**, **AC-21**, **AC-25**
12. [x] Pure code with Vitest: `src/lib/games/edit-game.ts` (validation for the editor fields), `localized()`, and the "what changed" helper if the client needs one. Satisfies **AC-17**, **AC-19**, **AC-24**
13. [x] Editor thin thread: Review loader passes editor data; clickable cover, name, and description on "To review" rows; `ReviewEditor` modal with text fields, players, minutes, `saveGame` (no cover, categories, or owners yet), "Save" and "Save and looks right", `router.refresh()`. Satisfies **AC-16**, **AC-17**, **AC-19**
14. [x] Strands: Chinese tab, categories picker with `createCategory`, owners picker, cover replace and remove with trash move and failure cleanup, unsaved changes prompt, clash and already reviewed messages. Satisfies **AC-17**, **AC-18**, **AC-19**, **AC-20**, **AC-22**, **AC-25**
15. [x] Recycle bin purge: `purge-cover-trash` Edge Function, `pg_cron` schedule through `pg_net`, secret set, test with a stubbed client. Verify `pg_cron` and `pg_net` first; if unavailable, switch to the Vercel cron and update this spec. Satisfies **AC-23**
16. [x] Chinese display on public pages: cached reads take `locale`, `localized()` in home, shelf, sheet, game page, Add search, and Review; messages in `messages/en.json` and `messages/zh.json` for the editor; browser checks at 360 px and 1280 px (editor open, save, Chinese tab). Satisfies **AC-24**, **AC-15**
9. [x] Messages in `messages/en.json` and `messages/zh.json` (`addGame`, `review`, `shell.tabs.review`, dock additions), metadata with alternates and `robots: { index: false }`, Vitest for nav audiences and `authRedirect`, browser checks for add, toggle, and review at 360 px and 1280 px. Satisfies **AC-1**, **AC-13**, **AC-15**

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
- (Amendment) The admin edits a game's details in the Review editor (replaces the earlier "fix in the Supabase dashboard until feature 19" note). Only unreviewed games are editable; a reviewed game must be marked not reviewed first.
- (Amendment) Chinese display touches every public read, so the cached reads now cache once per language.
- (Amendment) The recycle bin purge depends on `pg_cron`, `pg_net`, and an Edge Function, which is more moving parts than the rest of the app.
- (Amendment) A trashed cover can only be restored by hand in the dashboard within 30 days.
- The admin not found page may stream with status 200.

- Search and the own toggle share the one at a time Server Action queue, so a slow search can delay a tap by a moment.

**Neutral**:
- New folder patterns: `src/components/add-game/`, `src/components/review/`, `src/app/[locale]/admin/`.
- The admin log records every review an admin makes on another member's game, with the full row; marking and unmarking writes two entries. Accepted.
- Reviewing bumps `games.updated_at`; nothing reads it today.
- `game_stats` keeps its current columns.

## Follow-up

- [ ] Feature 19 (Admin tools): merging duplicates, deleting junk, and cleaning orphan cover files. (Editing game details from the Review page moved into this spec, AC-16 to AC-25.)
- [ ] Show categories on the shelf, home, and game sheet, and filter by category (not in this spec).
- [ ] A UI to restore a trashed cover and to read `game_edits`.
- [ ] Features 10 and 11 must reuse `add_game` (with `source_kind` set) and respect the unique name rule.
- [ ] Check on a real iPhone that Safari shrinks HEIC photos; if `createImageBitmap` cannot read them, the message tells the member to pick a JPEG or PNG.
- [ ] Spec 0012 (shelf owner filter) is still `Assumed`; unrelated to this feature, but still owed.
