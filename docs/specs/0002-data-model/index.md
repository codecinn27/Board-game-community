# 0002. Data model for the community board game shelf

**Date**: 2026-10-23
**Status**: In Progress

## Summary

All shared data lives in eight Postgres tables on Supabase, with row level security (rules inside the database that decide who can read or change each row). A game is stored once, and a join table records who owns it, so many members can own the same game without duplicates. Anyone can read; only active signed in members can write their own rows; admins can fix shared data and every admin action is logged. Counts, averages, and "owned or wanted" are worked out when read, never stored.

## Requirements

**User stories**:
- As a visitor, I want to read games, owners, ratings, and comments without an account so that I can browse the shelf.
- As a member, I want to add a game once and let others mark they own it so that the community never holds duplicate records.
- As a member, I want one editable rating form per game, a flat comment list, a top 5, and a wishlist so that my opinions and wants are saved.
- As an admin, I want to fix games, remove comments, and disable members, with a record of what I did, so that the shelf stays tidy and accountable.
- As a member leaving, I want my personal data deleted while the shared games stay so that others lose nothing.

**Acceptance criteria** (the contract, each independently checkable):
- **AC-1**: A game is one row in `games`. Adding a second owner inserts one `game_owners` row and creates no second game. The pair (`game_id`, `member_id`) is unique.
- **AC-2**: Two games cannot share the same (`source_provider`, `source_id`). An exact match on `name_normalized` returns an existing game so the add flow can warn about a likely duplicate. Chinese names keep their characters in `name_normalized` (never collapse to an empty string).
- **AC-3**: A member has at most one rating per game. Values outside the allowed ranges are rejected by the database. Editing updates the same row and `updated_at`.
- **AC-4**: Anonymous visitors can read games, owners, ratings, comments, top picks, wishlist entries, and public profile fields (`id`, `display_name`, `avatar_path`, `created_at`). They cannot read email, `admin_actions`, or write anything.
- **AC-5**: Writes need a signed in member whose profile `status` is `active`. A member can only insert, update, or delete rows that carry their own `member_id`. A disabled member can still read but every write is refused.
- **AC-6**: A non admin cannot change `role` or `status` on any profile. An admin cannot change their own `role` or `status`. A disabled admin has no admin powers. `status` changes only through `admin_set_member_status`; `role` changes only by SQL with the secret key or the dashboard.
- **AC-7**: A game with no owners still returns from the shelf query. Its state (owned, wanted, no owners) comes from `game_stats` counts, not from a stored column.
- **AC-8**: Inserting a `game_owners` row for a member removes only that member's `wishlist_entries` row for the game. Other members' entries stay. A member who already owns a game cannot add it to their wishlist (the insert is refused).
- **AC-9**: `top_picks` holds positions 1 to 5 per member, never the same game twice. Saving a new order of up to five games runs in one transaction without a constraint error.
- **AC-10**: Deleting an account removes that member's profile, ownership, ratings, comments, top picks, wishlist entries, and avatar files. Games they added remain with `added_by` set to null. The avatar files are removed before the user is deleted, so a failed removal can be retried.
- **AC-11**: Signing up creates a `profiles` row with `display_name` taken from the Google name, else the email part before `@`, capped at 40 characters. Display names need not be unique and are editable by the owner.
- **AC-12**: Only the member in `added_by` or an admin can update a game. A non admin cannot change `added_by`, `source_kind`, `source_provider`, `source_id`, `source_url`, or `cover_path` (the server writes covers). Only admins can delete a game.
- **AC-13**: An admin can delete any comment, update or delete any game, and set another member's `status`. Each such action on another member's row writes exactly one `admin_actions` row, written by database triggers (not by the caller). An admin editing their own row writes no log row. Deleting a game logs once, not once per cascaded comment. Only admins can read the table, and no role can insert, update, or delete rows directly.
- **AC-14**: `game_stats` returns every `games` column plus: `owner_count`, `wishlist_count`, `rating_count`, `avg_time_to_learn`, `avg_luck`, `avg_strategy`, `avg_entertainment`, `avg_recommendation` (each rounded to one decimal, null when there are no ratings), and `best_players_mode` (the most voted number, ties go to the lowest, null when unrated). Counts are not inflated by joins. Nothing in it is stored.
- **AC-15**: Every table that points at a game does so through a `game_id` foreign key with a delete cascade and a known unique rule, so feature 19 can merge two games by re-pointing rows without a schema change. `admin_actions.target_id` is text, not a foreign key, and is excluded.

## Decision

**Chosen option**: Option 1: Normalized relational model with a join table, row level security, and read time views

Eight tables in the `public` schema (`profiles`, `games`, `game_owners`, `ratings`, `comments`, `top_picks`, `wishlist_entries`, `admin_actions`), one `game_stats` view, two Storage buckets, and a small set of triggers and helper functions in a private schema.

**Implementation skills**: `supabase` (`supabase/agent-skills`, `.claude/skills/supabase/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.claude/skills/supabase-postgres-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch** (all tables have row level security on; `bigint` ids are `generated always as identity`):

| Table | Primary key | Columns | Relationships and constraints |
|---|---|---|---|
| `profiles` | `id uuid` | `display_name text` required, check `char_length(btrim(display_name))` between 1 and 40 · `avatar_path text` null, check it starts with `id || '/'` · `role` enum `member` or `admin`, default `member` · `status` enum `active` or `disabled`, default `active` · `created_at timestamptz` | `id` references `auth.users(id)` on delete cascade. Created by a trigger at sign up. Email is never copied here. |
| `games` | `id bigint` | `name text` required, 1 to 200 · `name_normalized text` generated from `name` as `regexp_replace(lower(name), '[[:punct:][:space:]]', '', 'g')` (keeps Chinese characters), plain index · `cover_path text` null · `players_min`, `players_max`, `play_time_min`, `play_time_max` `smallint` null · `description text` null, up to 4000 · `source_kind` enum `manual`, `lookup`, `link` · `source_provider text` null · `source_id text` null · `source_url text` null · `added_by uuid` null · `created_at`, `updated_at timestamptz` | `added_by` defaults to `auth.uid()` and references `profiles(id)` on delete set null. Unique (`source_provider`, `source_id`) where both are not null. Checks: min at most max for players and time, both above 0. `lookup` and `link` may carry provider and id (a parsed link then gets duplicate detection); `lookup` requires provider and id; `link` requires `source_url`; `manual` requires all three null. The allowed `source_provider` values are fixed by features 10 and 11 (a check list added then) so a member cannot squat a real import's slot. |
| `game_owners` | (`game_id`, `member_id`) | `created_at` | Both columns reference their tables on delete cascade. `member_id` defaults to `auth.uid()`. Index on `member_id`. |
| `ratings` | `id bigint` | `game_id`, `member_id` (default `auth.uid()`) · `best_players smallint` 1 to 20 · `time_to_learn smallint` 1 to 5 · `luck`, `strategy`, `entertainment`, `recommendation` `smallint` 1 to 10 · `comment text` null, up to 1000 · `created_at`, `updated_at` | All rating columns are `not null`; only `comment` is optional. Unique (`game_id`, `member_id`). Cascade from both. Index on `member_id`. Update is granted on the value columns and `comment` only, so a rating cannot move to another game or member. |
| `comments` | `id bigint` | `game_id`, `member_id` (default `auth.uid()`) · `body text` required, 1 to 2000 · `created_at`, `updated_at` | Cascade from both. Index on (`game_id`, `created_at` desc) and on `member_id`. Flat, no parent link. Members may edit their own body (sets `updated_at`); update is granted on `body` only. |
| `top_picks` | (`member_id`, `position`) | `game_id` · `position smallint` 1 to 5 | Plain unique (`member_id`, `game_id`). Cascade from both. Index on `game_id`. |
| `wishlist_entries` | (`member_id`, `game_id`) | `created_at` | `member_id` defaults to `auth.uid()`. Cascade from both. Index on `game_id`. An insert is refused if the member already owns the game. |
| `admin_actions` | `id bigint` | `admin_id uuid` null · `action text` · `target_table text` · `target_id text` · `details jsonb` (includes the admin's `display_name` at the time) · `created_at` | `admin_id` references `profiles(id)` on delete set null. Append only. Rows are written only by the log triggers. |

**Views and derived state**:
- `game_stats` (created `with (security_invoker = true)`): selects every `games` column plus `owner_count`, `wishlist_count`, `rating_count`, `avg_time_to_learn`, `avg_luck`, `avg_strategy`, `avg_entertainment`, `avg_recommendation` (rounded to one decimal, null when unrated), and `best_players_mode` (`mode()`, so ties go to the lowest; null when unrated). Each aggregate is its own subquery, so joining owners, wishlist, and ratings never inflates a count. The shelf, home page, and sorting read this one view. Owned means `owner_count > 0`; wanted means `owner_count = 0` and `wishlist_count > 0`; otherwise no owners.

**Storage buckets**:
- `covers`: public read. Written by the server with the secret key after the cover is resized (spec 0001). Path stored in `games.cover_path`.
- `avatars`: public read. Insert, select, update, and delete policies for an active member, only where `(storage.foldername(name))[1] = (select auth.uid())::text` (replacing a file needs insert, select, and update). Size limit (2 MB) and allowed types (jpeg, png, webp) are set on the bucket in the migration. Path stored in `profiles.avatar_path`.

**State transitions**:
- Profile `status`: `active` ↔ `disabled`, changed only by an admin on another member.
- Game state is derived (above), never stored.

**API surface** (the data layer is Supabase tables through row level security; no custom REST routes in this spec):

| Surface | Kind | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `private.is_admin()` | helper function, security definer, `search_path = ''` | none (reads the caller's id) | true only if the caller's profile is `admin` and `active` | policies only; usage on `private` and execute granted to `authenticated` | none |
| `private.is_active_member()` | helper function, same settings | none | true if the caller's profile is `active` | same | none |
| `private.handle_new_user()` | trigger on `auth.users` insert | new auth row | creates `profiles` row (name via `nullif(btrim(...), '')`) | database only | none |
| `private.guard_profile_update()` | before update trigger on `profiles`, security invoker | old and new row | blocks `role` or `status` changes; returns at once if `current_user` is not `authenticated` (SQL, auth admin, cascades pass) | database only | raises `42501` |
| `private.guard_game_update()` | before update trigger on `games`, security invoker | old and new row | blocks changes to `added_by`, `cover_path`, and `source_*` by non admins; same `current_user` bypass | database only | raises `42501` |
| `private.on_owner_added()` | after insert trigger on `game_owners`, security definer, `search_path = ''` | new row | deletes only (`new.member_id`, `new.game_id`) from `wishlist_entries` | database only | none |
| `private.block_owned_wishlist()` | before insert trigger on `wishlist_entries` | new row | refuses if the member already owns the game | database only | raises `23514` |
| `public.admin_set_member_status(target uuid, new_status)` | RPC, security definer, `search_path = ''` | target id, `active` or `disabled` | updates `profiles.status` | admin (checks `is_admin()` and `target <> auth.uid()`; execute revoked from `anon`) | `42501` not allowed |
| `private.log_admin_action()` | after triggers on `comments` delete, `games` update and delete, `profiles` status update; security definer | old and new row | inserts one `admin_actions` row when the actor is an admin acting on another member's row; skipped when `pg_trigger_depth() > 1` | database only | none |
| `public.save_top_picks(game_ids bigint[])` | RPC, security invoker | up to 5 distinct game ids in order; empty array clears | deletes then inserts the caller's rows in one transaction | active member (execute revoked from `anon` and `public`) | `22023` null, duplicate, or more than 5 ids |
| `game_stats` | view | none | games plus counts and averages | public read | none |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Add a game | `id`, `created_at`, `updated_at` | database defaults |
| Add a game | `added_by` | caller's auth id (`auth.uid()`), checked by the insert policy |
| Add a game | `name_normalized` | generated column from `name` |
| Add a game | `source_kind`, `source_provider`, `source_id`, `source_url` | the add flow: `manual` for typed entry; `lookup` and `link` values come from features 10 and 11 |
| Sign up | `profiles.display_name` | `raw_user_meta_data->>'full_name'` (Google), else `split_part(email, '@', 1)`, trimmed to 40, fallback `Member`. Used for display only, never for authorization |
| Sign up | `role`, `status` | defaults `member`, `active` |
| Game page | owner names and avatars | `game_owners` joined to `profiles` |
| Game page, shelf | cover image URL | public Storage URL built from `NEXT_PUBLIC_SUPABASE_URL`, bucket `covers`, and `games.cover_path` |
| Anywhere a member appears | avatar | `avatars` bucket and `avatar_path`; if null, initials from `display_name` |
| Shelf card | owner count, average recommendation | `game_stats` |
| Game page | community favourite player count | `game_stats.best_players_mode` |
| Shelf, wishlist switch | owned or wanted | derived from `game_stats.owner_count` and `wishlist_count` |
| Home page | newest additions | `games.created_at` descending |
| Home page | top rated | `game_stats.avg_recommendation` with `rating_count` so feature 15 can set a minimum |
| Rating edit | `updated_at` | set by a shared `set_updated_at` trigger |
| Admin action | `admin_id`, `created_at` | caller's auth id; database default |
| Admin action | `action`, `target_table`, `target_id`, `details` | the log trigger: action from the operation (`delete_comment`, `update_game`, `delete_game`, `set_status`), target from the changed row, `details` holds the admin's `display_name` and the old and new values |
| Game page, shelf | stats, owned or wanted | `game_stats` (one row per game, rounded and null rules as in AC-14) |
| Role check in policies | caller's role and status | `profiles` row read by the helper functions, never `user_metadata` or JWT claims |

**Key invariants**:
- One game row per real game; ownership is a join row. Rating, owner, wishlist, and top pick pairs are unique.
- Ranges and lengths in the table above are enforced by check constraints, not only by forms.
- Hard delete everywhere. No soft delete columns. Removing a game cascades to its owners, ratings, comments, top picks, and wishlist rows.
- Guard triggers only restrict the `authenticated` role. SQL run as `postgres`, the auth service, `service_role`, and foreign key actions (account delete setting `added_by` to null) pass through.
- Nothing derived is stored. Counts, averages, and states are read from `game_stats`.
- An admin cannot change their own `role` or `status`, so the last admin cannot lock themselves out.
- Every foreign key column has an index.
- Policies call `(select auth.uid())` and the helper functions as `(select private.is_active_member())` so the value is cached per query.

**Security model**:
- Roles: `anon` (visitor), `authenticated` (signed in), with `member` or `admin` kept in `profiles.role`.
- Select: `anon` and `authenticated` can read every table except `admin_actions`. `anon` gets column grants on `profiles` limited to `id`, `display_name`, `avatar_path`, `created_at`. Signed in members can read all `profiles` columns, so `role` and `status` are visible to members.
- Insert and update on `game_owners`, `ratings`, `comments`, `top_picks`, `wishlist_entries`: `to authenticated`, `(select private.is_active_member())` and `member_id = (select auth.uid())` in both `using` and `with check`.
- Delete: members delete their own rows in `game_owners`, `ratings`, `comments`, `top_picks`, and `wishlist_entries`. Admins delete any `comments` and any `games`. Only admins delete games (an adder's delete would wipe other members' ratings and comments).
- `games`: insert by active members with `added_by = auth.uid()`. Update by `added_by` or admin, with matching `with check`; the guard trigger blocks protected columns for non admins.
- `profiles`: update own row only for `display_name` and `avatar_path` (column grants). `role` and `status` are never updated through the table by members. An admin changes another member's `status` only through `admin_set_member_status`; `role` changes by SQL only.
- `admin_actions`: select for admins only. No insert, update, or delete policy exists; the log triggers write it.
- **Grants first.** Supabase grants all rights on `public` tables to `anon` and `authenticated` by default, which would defeat column grants. The first migration revokes everything from `anon` and `authenticated` on every table and grants back only what is listed here: `select` to both (limited columns on `profiles` for `anon`), and per table `insert`, `update` (listed columns), and `delete` to `authenticated`. No `insert` or `delete` on `profiles` for `authenticated`. Nothing but `select` for any role on `admin_actions`, and `update`, `delete`, `truncate` revoked from `service_role` too.
- Reads of `profiles` always name their columns (`select *` fails for `anon` under column grants), with a test. If this proves awkward, expose a `public_profiles` view instead.
- Helper functions are `security definer` with `set search_path = ''`, live in the `private` schema, and have `execute` revoked from `public`. `authenticated` gets `usage` on `private` and `execute` on `is_admin` and `is_active_member` only, because policies and Storage policies call them. No policy uses `auth.role()`.
- A disabled admin loses admin powers (`is_admin()` requires `active`).
- Deleting an account: remove the files under `avatars/<id>/` first (retry if it fails), then delete the auth user with the secret key (`src/lib/supabase/admin.ts` only). A stale access token cannot write afterwards because no profile row remains.
- Compliance: stores a name and avatar publicly; email stays in Supabase Auth. Covered by the privacy note in feature 6.

**Configuration required**:
- No new environment variables. Uses the keys already in `.env.example`.
- Prerequisite: the first admin is set once by an SQL update on `profiles.role` (dashboard or secret key script), since no member can promote themselves.

**Critical test scenarios** (policy tests with pgTAP, run by `supabase test db`, using one small local helper that sets `role` and `request.jwt.claims` to act as a given user):
- Happy path: member A adds a game, member B marks it owned; one `games` row, two `game_owners` rows, `game_stats.owner_count = 2`, verifies **AC-1**, **AC-7**, **AC-14**.
- Failure case: second game with the same `source_provider` and `source_id` is rejected; rating of 11 is rejected; a sixth top pick is rejected, verifies **AC-2**, **AC-3**, **AC-9**.
- Failure case: marking a game owned deletes only the caller's wishlist row, verifies **AC-8**.
- Failure case: deleting a user removes their rows and keeps their games with `added_by` null, verifies **AC-10**.
- Auth/permission: anon can select games but gets permission denied on insert and on `admin_actions`, verifies **AC-4**, **AC-5**.
- Auth/permission: a disabled member's insert on `comments` is refused; a member updating their own `role` is refused, verifies **AC-5**, **AC-6**.
- Auth/permission: a member who is not `added_by` cannot update a game; the adder cannot change `source_id`, verifies **AC-12**.
- Auth/permission: an admin deletes another member's comment and one `admin_actions` row appears; the log cannot be updated, verifies **AC-13**.
- Sign up: new auth user yields a profile with the right display name, verifies **AC-11**.
- Reorder: saving top picks in a new order succeeds in one call; null, duplicate, and six ids are refused; an empty array clears, verifies **AC-9**.
- Bootstrap and delete: setting `role = 'admin'` by SQL works; deleting an auth user passes the guard triggers and nulls `added_by`, verifies **AC-6**, **AC-10**.
- Admin status: `admin_set_member_status` works for an active admin on another member, fails on self, on a non admin, and for a disabled admin, verifies **AC-6**, **AC-13**.
- Log: deleting a game with 20 comments writes one log row; an admin editing their own game writes none; direct insert into `admin_actions` is refused, verifies **AC-13**.
- Grants: `anon` `select *` on `profiles` fails while explicit columns work; `anon` has no write on any table, verifies **AC-4**, **AC-5**.
- Chinese name: a game named in Chinese gets a non empty `name_normalized` and an exact match finds it, verifies **AC-2**.
- Wishlist: adding an owned game to the wishlist is refused, verifies **AC-8**.
- Stats: a game with two owners, one wishlist entry, and three ratings returns correct counts, null averages when unrated, and the lowest number on a tie, verifies **AC-14**.
- Storage: a member cannot write another member's avatar folder; a disabled member cannot write their own, verifies **AC-5**.

## Build plan

Build approach is Tracer Bullet, so the first migration proves one real thread through every layer (database, policies, generated types, app query), and later migrations thicken it. Migrations are imperative files made with `supabase migration new`, no declarative schema folder.

1. Set up the Supabase local stack in the repo (`supabase init`, `config.toml`, a `supabase/tests/` folder with the local role and JWT test helper) and add `supabase test db` to the project commands; the setup is proven by task 4, satisfies **AC-1**
2. Migration 1 (thread): revoke the default grants and grant back only what the spec lists; `private` schema and the two helper functions (with grants); `profiles` with checks, the sign up trigger, and the guard trigger; `games` with checks, the `name_normalized` column and index, and the unique source index; `game_owners`; row level security and policies for those tables; `set_updated_at` trigger; the guard on `games`; and `game_stats` with `owner_count` first, satisfies **AC-1**, **AC-2**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-11**, **AC-12** (non admin half)
3. Generate TypeScript types (`supabase gen types`) into `src/lib/supabase/database.types.ts` and pass the `Database` type to the four client factories; add one typed read of games from `game_stats` in a Server Component, with explicit profile columns, satisfies **AC-4**, **AC-7**
4. pgTAP tests for migration 1 (anon read and no anon write, grants and `select *` on profiles, member write, disabled member, role guard, SQL bootstrap of the first admin, game edit guard, duplicate source id, Chinese name match, sign up profile including a blank Google name), satisfies **AC-2**, **AC-4**, **AC-5**, **AC-6**, **AC-11**, **AC-12**
5. Migration 2: `ratings` and `comments` with checks, defaults, column grants, indexes, and policies; extend `game_stats` to the full contract in AC-14; tests for ranges, one rating per member, no moving a rating, flat comments, and stats correctness, satisfies **AC-3**, **AC-14**
6. Migration 3: `top_picks` (plain unique), `wishlist_entries` with the owned refusal trigger, the `private.on_owner_added` trigger, and `save_top_picks` (with revokes); tests for limits, reorder, clearing, and wishlist cleanup, satisfies **AC-8**, **AC-9**
7. Migration 4: `admin_actions` (select only), the admin policies for comments, games, and game delete, `admin_set_member_status`, the log triggers with the depth guard, `is_admin` requiring `active`, and the `avatars` and `covers` buckets with limits and policies; tests for admin powers, log rules, status changes, and avatar folder rules, satisfies **AC-6**, **AC-12** (admin half), **AC-13**
8. Account deletion tests: deleting an auth user cascades correctly and leaves games with `added_by` null; document the delete order (remove avatar files, then delete the user) for feature 6, satisfies **AC-10**
9. Seed script for local development with a few members, games, owners, ratings, and one admin; and the first admin bootstrap note, satisfies **AC-13**
10. Merge readiness check: a test that lists every foreign key to `games` and confirms each cascades, so a new table cannot be forgotten, satisfies **AC-15**

## Consequences

**Positive**:
- One source of truth per game; no duplicate records; later slices add UI, not tables.
- Rules sit in the database, so every client (server, browser, a future script) gets the same protection.
- No stored counters, so nothing goes stale.
- Account deletion and admin merges are covered by cascades and known unique rules.

**Negative / tradeoffs**:
- Row level security plus triggers is more work to write and test than app level checks. The pgTAP suite is part of the cost.
- `game_stats` computes averages on read. Fine at community scale; if the shelf ever slows, add an index or a materialized view rather than counters.
- Members can see which other members are disabled (`status` is readable by signed in members).
- Hard deletes cannot be undone. The admin log records who deleted what, but not the deleted text.
- More database code to maintain: five trigger functions, two helpers, and two RPCs. The pgTAP tests are what keep them safe.
- The log omits an admin editing their own game, and skips cascaded deletes, by design.
- Avatars in Storage need upload limits and cleanup on delete, which Google picture links would have avoided.
- Sequential `bigint` ids reveal rough game counts in URLs. Accepted for a public shelf; feature 20 may add slugs.

**Neutral**:
- Merging two games in feature 19 must decide what happens when one member rated both. This spec only guarantees the rows can be re pointed.
- Ids on `games` are `bigint` identity, not UUID, following the installed Postgres skill.
- A reviewing model cross checked this spec on 2026-10-23; its findings are applied above.

## Follow-up

- [ ] Feature 19 (admin tools): design the merge function and its rating clash rule, using the cascade and unique rules in AC-15.
- [ ] Feature 6 (member accounts): follow the account delete order in build task 8, and write the privacy note about the public name and avatar.
- [ ] Features 10 and 11: define the allowed `source_provider` values and the cover resize path that writes `cover_path`.
- [ ] Features 5 and 20: slugs and per language game text are not in this model; decide there if needed.
- [ ] Set avatar upload limits (size, type, resize) in feature 17 or 6, since the bucket exists from this spec.
- [ ] `next-intl` and `vitest` have no installed Agent Skill; consider one if conventions drift.
