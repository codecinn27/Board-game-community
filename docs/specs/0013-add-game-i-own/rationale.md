# 0013. Add a game I own: rationale

## Context

The shelf's whole point is to show what the community owns so nobody buys a duplicate. Today only you can put games on it, through `data/games.json` and `pnpm seed:games`. The game sheet already shows an "I own this" button, but it is turned off, and the Add tab is reserved in `src/lib/app-shell/nav.ts` but disabled.

The data model (spec 0002) already stores a game once, with `game_owners` as the join table, and row level security (rules inside the database that decide who can change each row) already lets active members add games and add or remove their own ownership. What is missing is the flow on top: finding the existing record, entering a new one, handling a cover picture, and keeping the record honest. Spec 0002 promised an exact match on `name_normalized` would warn about duplicates, but nothing enforces it, so two members adding the same game at the same time would create two rows.

Members join by a shared invite code, so they are trusted, but they will still type wrong player counts or pick the wrong picture. You want new games to appear at once and still be able to check each one. Covers live in a public bucket capped at 150 KB that only the server can write, while phone photos are several megabytes. The site is mobile first, in English and Chinese, and cached public reads must never read cookies (spec 0009, spec 0010).

## Options considered

### Option 1: Search first page, Server Actions over database functions, browser side cover processing, review page now

The Add page shows only a search at first; a link opens the form with the typed name. Search, add, and review are small Postgres functions called from Server Actions with the member's own session. The browser shrinks and tints the cover; the server checks and stores it with the secret key. A unique index guards names. An admin Review tab lists unreviewed games.

**Pros**:
- Steers members to the existing record before they can type a duplicate.
- Row level security still decides every member write; one place normalizes names.
- Small uploads on phone data, no new server packages.
- You can check new games from day one.

**Cons**:
- Three step cover save with manual cleanup.
- More to build now (admin page, nav audience, role on the viewer).
- The unique name rule blocks same name editions.

### Option 2: Both search and form visible, plain inserts from the action, no review

Search and the full form share one screen; the action inserts the game, then the owner, with no database functions; covers shrink on the server with sharp; no review flag.

**Pros**:
- Fewest new database objects.
- One screen, fast when you know the game is new.

**Cons**:
- Easy to skip the search, so more duplicates.
- Two separate inserts can leave a game with no owner.
- Full size photo uploads press against Vercel's request size limit.
- Wrong details go unnoticed.

### Option 3: Form first with live hints, security definer add function, review via dashboard

One form; matches appear under the name field. A `security definer` function (runs with the owner's rights, skipping row level security) saves game, owner, cover path, and tint in one transaction. You tick a review flag in the Supabase table editor.

**Pros**:
- Atomic save, no cleanup code.
- No admin page to build.

**Cons**:
- The match hint is easy to miss while filling the form.
- The function must copy every check row level security does today, and any it forgets is a hole.
- Reviewing in the table editor is slower and easy to forget.

## Rationale

The duplicate problem is the reason this feature exists, so the flow is built around stopping it at two layers: the search first page puts the existing record in front of the member before the form even appears, and the unique index catches whatever slips past, including two people saving at once. The index has a real cost (same name editions need a suffix), but for a community shelf a name collision is far more often a duplicate than a distinct edition, and an admin can rename the rare real case.

Keeping writes on the member's own session through `security invoker` functions means the policies already tested in spec 0002 keep doing the work. The secret key is used only for what members are deliberately not allowed to write (the cover columns and the bucket), after the action has checked the session. That costs a three step cover save with cleanup, which is acceptable because the likely failure, the upload, happens first and leaves nothing behind.

Shrinking the picture in the browser follows from the phone first audience and the 150 KB bucket cap: a 5 MB photo over mobile data is slow and close to Vercel's request limit, while a 120 KB WebP is not. You asked for the admin page now rather than the dashboard, and since new games go live immediately, a quick to do list is what makes "live at once" safe; it stays narrow (Looks right and undo) so it does not swallow feature 19.
