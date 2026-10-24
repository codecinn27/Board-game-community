# 0002. Data model: rationale

## Context

Feature 3 sits under every later slice: accounts, adding games, the shelf, ratings, comments, search, favorites, wishlist, and admin tools. The scope asks for a model that supports all of them without a breaking migration, and for one game to have many owners without being stored twice.

The forces that shaped the choice:
- One maintainer and under 100 members, so the design must be simple to run and test.
- The stack is fixed by spec 0001: Supabase Postgres with row level security, Singapore region, free plan (500 MB database).
- The site is public to read and member write, so the database is reachable directly from the browser through the Data API. Access rules must live in the database.
- Game data comes from three places (typed by hand, an online source, a pasted link), so provenance and duplicate detection matter.
- Members can leave, admins can fix data, and both must work without orphaned or lost shared records.
- No accounts or database exist yet, so nothing needs migrating.

## Options considered

### Option 1: Normalized relational model with a join table, row level security, and read time views

A `games` table holds each game once. `game_owners`, `ratings`, `comments`, `top_picks`, and `wishlist_entries` point at games and members. Counts and averages come from a view. Policies and a few triggers enforce access and invariants in the database.

**Pros**:
- Matches the shape of the data; the database enforces uniqueness, ranges, and cascades.
- Nothing derived is stored, so nothing goes stale.
- Same protection for every client.

**Cons**:
- More SQL, policies, and tests up front.
- Averages are computed on read.

### Option 2: A game row per owner, deduplicated in queries

Each owner adds their own copy of the game. The shelf groups copies by name or source id.

**Pros**:
- Simplest add flow; no join table.

**Cons**:
- Violates the "stored once" requirement; edits and ratings drift between copies.
- Grouping by name is fragile (editions, spelling, Chinese and English names).
- Admin merge becomes a permanent chore.

### Option 3: Normalized model plus stored counters

Same as Option 1, with `owner_count`, `rating_count`, and averages stored on `games` and kept current by triggers.

**Pros**:
- Fast reads with no aggregate query.

**Cons**:
- Every write path must keep counters right; drift is a quiet bug.
- Solves a speed problem that does not exist at this scale.

## Rationale

Option 1 is the only one that meets the scope's two hard requirements (supports every later slice, one game stored once) without carrying a known bug class. The Data API exposes tables directly, so row level security is not optional; putting the rules in the database also keeps server actions simple. Option 2 fails the stored once rule outright. Option 3 adds triggers and stale value risk to save queries that a community of under 100 people will never feel; a view can be indexed or materialized later if measurement ever asks for it.

Smaller calls made while writing this spec, each with the runner up:
- **Ids**: `bigint` identity for games, ratings, comments, and the log; `uuid` only for profiles because it must match the auth user. The installed Postgres skill advises identity over random UUIDs. Runner up: UUIDv7 (needs an extension, no gain here).
- **Role storage**: a `role` column in `profiles`, read by helper functions. Runner up: `app_metadata` in the token, rejected because claims can be stale until refresh and the role needs to change instantly (disabling a member).
- **Protected columns**: before update triggers block `role`, `status`, `added_by`, and `source_*` for non admins. Runner up: column grants alone, which cannot tell an admin from a member because both use the `authenticated` role.
- **Top 5 reorder**: primary key (`member_id`, `position`) with a plain unique on (`member_id`, `game_id`), saved through one RPC that deletes then inserts in a transaction, which never trips the unique rule. Runner up: a deferrable unique with per position updates, rejected as needless.
- **Wishlist cleanup**: a security definer trigger in the `private` schema on `game_owners` insert, so the rule holds for every writer, including an admin merge. Runner up: do it in the server action, which any other writer could skip.
- **Admin log**: written by database triggers, not by the server action, so a forgetful or failed caller cannot skip it. Runner up: the action inserts the row itself, rejected because it is a second, non atomic call.
- **Member status change**: a security definer function, because admins share the `authenticated` role and the column grants block a direct update. Runner up: a second database role for admins, too heavy here.
- **Cross check**: a different model reviewed this spec and found 15 gaps and a few soundness points; the recommended fixes were applied on your choice.
- **Migrations**: imperative files from `supabase migration new`. Runner up: declarative schemas, which suit a larger schema; revisit if the table count grows.
- **Policy tests**: pgTAP through `supabase test db`, which runs next to the migrations in CI. Runner up: Vitest against the local stack with real tokens.
- **Text limits**: name 200, display name 40, description 4000, comment 2000, rating note 1000, `best_players` 1 to 20. Chosen to stop abuse and keep the 500 MB free plan healthy; easy to raise by migration.
- **No soft deletes**: you chose hard delete for comments and the admin log covers who did what. A soft delete column would pollute every query and unique rule.

Where your answers shaped it: games with no owners stay visible (so "no owners" is a derived state beside owned and wanted); the wishlist loses only the new owner's own entry; display name and avatar are public with the avatar uploaded to Storage; the game's adder may edit it alongside admins; display names are not unique; and admin actions are logged.

## Engineer's answers (recorded)

- Game identity: source id plus name match, admin merges.
- Roles: member and admin.
- Member leaves: delete personal data, keep games.
- Last owner leaves: game stays visible as "no owners".
- Game fields: player count and play time (min and max), plus description.
- Best player count on a rating: one whole number.
- Top 5: any game in the database.
- Wishlist on owning: remove only that member's own entry.
- Comments: flat list, newest first.
- Member privacy: display name and avatar, avatar uploaded to Storage.
- Data source: kind, id, link, and who added it.
- Disable member: `status` column.
- Comment removal: hard delete.
- Admin log: a simple log table.
- Display name source: Google name, else email prefix, editable.
- Edit games: the member who added it, plus admins.
- Display names unique: no.
- References: none.
