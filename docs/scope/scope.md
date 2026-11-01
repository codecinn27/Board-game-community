# Scope: Community Board Game Shelf

A shared, public board game shelf for your local community: it shows every game the group owns and who owns it, so nobody buys a duplicate. Members register to add their games, fill in a standard rating form, comment, keep a top 5, and grow a wishlist of games still to conquer. Mobile first, desktop second, in English and Chinese.

**Build approach:** Tracer Bullet (prove one real thread through every layer first, then thicken it one strand at a time).
**Workflow:** Beta (after `/develop`: `/check verify`, then `/test`). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack & architecture | Foundation | done |
| 2 | Coding standards & tooling | Foundation | done |
| 3 | Data model | Foundation | done |
| 4 | Design system & mobile first UI | Foundation | done |
| 5 | Two languages (English + Chinese) | Foundation | done |
| 6 | Member accounts | Slice 1 | planned |
| 7 | Add a game I own | Slice 1 | planned |
| 8 | Community shelf | Slice 1 | planned |
| 9 | Game page with owners | Slice 1 | planned |
| 10 | Online game lookup | Slice 2 | planned |
| 11 | Paste a link to auto fill | Slice 2 | planned |
| 12 | Rating form | Slice 3 | planned |
| 13 | Comments | Slice 3 | planned |
| 14 | Search & filters | Slice 4 | planned |
| 15 | Home page | Slice 5 | planned |
| 16 | Top 5 favorites | Slice 6 | planned |
| 17 | Member profile page | Slice 6 | planned |
| 18 | Wishlist (games to conquer) | Slice 7 | planned |
| 19 | Admin tools | Slice 8 | planned |
| 20 | SEO & share previews | Slice 9 | planned |

## Foundations

### 1. Stack & architecture · done
Decide the stack and scaffold a runnable project so every later slice builds on real structure.
**Done when:** the stack is recorded in a spec (it must support search engine friendly public pages, two languages, and fetching game data from outside sites), and the empty scaffold boots locally and passes build.
- [x] Decide the stack (spec): `/architect stack & architecture`
- [x] Scaffold from the decision: `/develop stack & architecture`
- [x] Verify it: `/check verify stack & architecture`
- [x] Test it: `/test stack & architecture`
Spec [0001](../specs/0001-stack-architecture/index.md) · code in `src/`

### 2. Coding standards & tooling · done
Capture conventions, then install lint, format, and pre commit checks from the real scaffolded project.
**Done when:** root `AGENTS.md` reflects the real stack, and lint, format, and pre commit run clean.
- [x] Decide the standard (spec): `/architect coding standards & tooling`
- [x] Install it and fix existing code: `/develop coding standards & tooling`
- [x] Refresh root `AGENTS.md` with the real commands and tooling: `/audit`
- [x] Verify it: `/check verify coding standards & tooling`
- [x] Test it: `/test coding standards & tooling`
Spec [0003](../specs/0003-coding-standards-tooling.md) · code in repo root configs, `.husky/`, `.github/`

### 3. Data model · done
Core entities every feature builds on: members and roles, games (with where their data came from), who owns which game, rating form entries, comments, top 5 picks, wishlist entries.
**Done when:** the model supports every later slice (ratings, comments, top 5, wishlist, admin) without a breaking migration, and one game can have many owners without being stored twice.
- [x] Design it (spec): `/architect data model`
- [x] Build it: `/develop data model`
  - [x] Foundation thread: local Supabase, first migration, typed read, and its policy tests (AC-1, 2, 4, 5, 6, 7, 11, 12)
  - [x] Ratings, comments, and game stats (AC-3 done; AC-14 finishes with `wishlist_count` in the next milestone)
  - [x] Top 5 and wishlist (AC-8, 9, and AC-14 now complete with `wishlist_count`)
  - [x] Admin tools data, log, buckets, and account deletion (AC-6, 10, 12, 13; pgTAP file 04 passes)
  - [x] Seed data and merge readiness check (AC-13, 15; `seed.sql` loads and pgTAP file 05 passes)
- [x] Verify it: `/check verify data model`
- [x] Test it: `/test data model`
Spec [0002](../specs/0002-data-model/index.md) · code in `supabase/` and `src/lib/supabase/`

### 4. Design system & mobile first UI · done
Visual language, layout primitives, and the app shell, designed for a phone screen first and stretched to desktop second. The game card, score input, form fields, and state blocks are specified here and built by the features that first use them (8, 12, 6 or 7).
**Done when:** `docs/design.md` covers type, color, spacing, and the rules for every base component; the app shell works one handed on a phone and scales up cleanly on desktop.
- [x] Design it (spec): `/architect design system & mobile first UI`
- [x] Build it: `/develop design system & mobile first UI`
  - [x] Thin thread: next-intl without routing, translated header shell on `/`, metadata (AC-8, part of AC-5, 6)
  - [x] Tokens, pure CSS dark mode, font stack, and the contrast test (AC-2, 3, 4)
  - [x] Navigation: nav config, bottom tab bar, desktop links, tap targets and focus (AC-5, 6, 7, 9)
  - [x] `/design` preview, `docs/design.md`, and the Playwright check (AC-1, 10, 11)
  - [x] Cover Tint: `cover-tint.ts` color rules and test, `/design` preview, and the game detail sheet rules in `docs/design.md` (AC-1, AC-12, amended 2026-11-01)
- [x] Verify it: `/check verify design system & mobile first UI`
- [x] Test it: `/test design system & mobile first UI`
Spec [0004](../specs/0004-design-system-mobile-ui/index.md) · code in `src/components/app-shell/`, `src/components/design/`, `src/lib/app-shell/`, `src/lib/design/`, `src/app/globals.css`, `messages/`

### 5. Two languages (English + Chinese) · done
A language switch and a pattern for translated text, set before pages exist so every page is built bilingual from the start.
**Done when:** a visitor can switch between English and Chinese, the choice is remembered, and the UI text pattern is in place for every later page (game names and descriptions stay as fetched).
- [x] Design it (spec): `/architect two languages`
- [x] Build it: `/develop two languages`
  - [x] Thin thread: proxy, `[locale]` segment, root params, translated 404, both languages prerender (AC-1, 2, 5, 6)
  - [x] Language menu in the header and the one year cookie (AC-3, 4)
  - [x] Text pattern guards: typed keys, English fallback merge, lint rules and their tests (AC-8, 10, 12)
  - [x] hreflang per page, `LocalTime`, and the PR template (AC-7, 9, 11)
  - [x] Playwright checks for both languages at 360px and 1280px (AC-1 to 5, 7, 9)
- [x] Verify it: `/check verify two languages`
- [x] Test it: `/test two languages`
Spec [0005](../specs/0005-two-languages/index.md) · code in `src/i18n/`, `src/proxy.ts`, `src/app/[locale]/`, `src/components/app-shell/`, `src/components/time/`, `src/lib/time/`, `messages/`

## Slice 1: Core loop (shelf + who owns it)

### 6. Member accounts · needs a decision
Register, sign in, sign out. Anyone can browse without an account; only members can add games, rate, and comment.
**Done when:** a visitor can register and sign in, signed out visitors can only view, and a simple privacy note explains what personal data is stored.
- [ ] Design it (spec): `/architect member accounts`

### 7. Add a game I own · needs a decision
A member searches your own database first; if the game is there they mark "I own this", if not they enter it manually. Seeing who already owns a game helps avoid duplicate buys, but it is information only, never a block.
**Done when:** a member can add a game they own; the search shows if the community already owns it (and who), and the member can still add themselves as an owner; the game's details are stored once and shared by all its owners.
- [ ] Design it (spec): `/architect add a game I own`

### 8. Community shelf · needs a decision
The "all board games" section: every game the community owns, as a mobile friendly grid of covers, with a switch between all games and games grouped by owner.
**Done when:** a visitor sees every owned game with cover, name, and owner count, can switch to the by owner view, and empty and loading states render.
- [ ] Design it (spec): `/architect community shelf`

### 9. Game page with owners · needs a decision
Tap a game on the shelf to open its page: details plus the list of members who own it.
**Done when:** the game page shows its details and every owner, and a member can add or remove themselves as an owner from there.
- [ ] Design it (spec): `/architect game page with owners`

## Slice 2: Fill game details from online

### 10. Online game lookup · needs a decision
When a game is not in your own database, search an online board game source and copy the chosen result (cover, player count, play time, description) into your own database.
**Done when:** a member can search online, pick the right game, and its details are saved locally; if the online source fails, manual entry still works.
- [ ] Design it (spec): `/architect online game lookup`

### 11. Paste a link to auto fill · needs a decision
A member pastes a link to a game's page on a board game site and the form fills itself from that page, with manual entry as the last fallback.
**Done when:** a pasted link pre fills the add game form for supported sites, the member can correct any field before saving, and an unreadable link falls back to manual entry with a clear message.
- [ ] Design it (spec): `/architect paste a link to auto fill`

## Slice 3: Rate and discuss

### 12. Rating form · needs a decision
The standard form every member can fill once per game: best player count, time to learn (1 to 5), luck, strategy, entertainment, personal recommendation (each 1 to 10), and a comment. The game page and shelf show the community averages.
**Done when:** a member can submit and edit their own form for any game, the game page shows each member's answers and the community averages, and the shelf card shows the average recommendation.
- [ ] Design it (spec): `/architect rating form`

### 13. Comments
Free discussion under each game, separate from the rating form comment.
**Done when:** members can post, edit, and delete their own comments on a game page; visitors can read them.
- [ ] Build it: `/develop comments`

## Slice 4: Find games fast

### 14. Search & filters · needs a decision
Search the shelf by name and filter by player count, owner, time to learn, luck, strategy, and recommendation.
**Done when:** search and filters narrow the shelf, filters combine, the URL reflects them so a filtered view can be shared, and a no results state renders.
- [ ] Design it (spec): `/architect search & filters`

## Slice 5: Front door

### 15. Home page · needs a decision
The landing section: how many games the community owns, newest additions, top rated games, and a way into the shelf.
**Done when:** a visitor lands on a home page showing the game count, recent additions, and top rated games, each linking to its game page.
- [ ] Design it (spec): `/architect home page`

## Slice 6: Personal touches

### 16. Top 5 favorites
Each member picks and orders their personal top 5 games.
**Done when:** a member can choose up to 5 games, reorder them, and change them later.
- [ ] Build it: `/develop top 5 favorites`

### 17. Member profile page · needs a decision
A page per member showing the games they own, their ratings, and their top 5.
**Done when:** anyone can open a member's profile from a game page or the shelf and see their games, ratings, and top 5.
- [ ] Design it (spec): `/architect member profile page`

## Slice 7: Games to conquer

### 18. Wishlist (games to conquer)
Members add games they want but nobody owns yet; the shelf can switch between owned and wanted.
**Done when:** a member can add a wanted game (same lookup as adding an owned one), the shelf filters owned vs wanted, and a wanted game moves to owned when someone marks it as theirs.
- [ ] Build it: `/develop wishlist`

## Slice 8: Keep it tidy

### 19. Admin tools · needs a decision
Admins fix wrong game data, merge duplicate games, remove bad comments, and manage members.
**Done when:** an admin can edit or merge games, remove comments, and disable a member; normal members cannot reach any of it.
- [ ] Design it (spec): `/architect admin tools`

## Slice 9: Be found

### 20. SEO & share previews · needs a decision
Public pages are friendly to search engines and show a rich preview (cover, name) when shared in group chats or social media.
**Done when:** each public page has its own title and description, a sitemap lists every game page, game pages carry structured data, and shared links show a cover preview, in both languages.
- [ ] Design it (spec): `/architect SEO & share previews`

## Deferred
Out of scope for the current build pass, kept so the plan stays honest.
- **Lending tracker**: mark games as lent out and returned · not needed for now, you only want to show what the community has
- **Big catalog import**: preload thousands of games from online · you chose to list only games members add
- **Malay language**: a third language · needs a decision
- **Usage analytics**: see how often the site is used · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally, `Decide the stack (spec)` on Stack & architecture), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it` Alpha+, `Test it` Beta+, `Review it` + `Document it` GA); any surfaced follow up enrolled |
| `in-progress` (building) | `/develop` | milestone sub boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | **you, when you decide it is** (any skill sets it when you say so); `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped; the tier's last stage (`Prototype` → after `/develop`; `Alpha` → after `/check verify`; `Beta`/`GA` → after `/test`) is the suggested point to call it done; `/sync` captures conventions |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop` (or `/audit` for standards & tooling). The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre workflow) and `dropped` (de scoped, kept for history).
- **Approach tag** beside a heading (e.g. `· Facade`) overrides the project default for that feature; no tag = inherits it.
- **Workflow tier tag** beside a heading (e.g. `· GA`, `· Prototype`) sets that one feature's rigor above or below the project default; no tag inherits the default. It decides the feature's check boxes and each skill's next suggestion.
- **Workflow** (header line) is the project default, what runs after `/develop`: **Prototype** = nothing (trust develop's own build time self check); **Alpha** = `/check verify`; **Beta** = `/check verify` then `/test`; **GA** = adds a fresh model `/check review` then `/document`. A feature built on an unratified decision (an `Assumed` spec) stays flagged, but that never blocks `done`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
