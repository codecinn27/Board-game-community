# 0014. Game categories in three groups: feel, theme, mechanics

**Date**: 2026-11-25
**Status**: Accepted

## Summary

Games get tagged in three separate groups instead of one flat category list: game feel (5 choices), game theme (10), and game mechanics (20). Each group is its own table with English and Chinese names, and mechanics also carry a short plain description that the editor shows as a hint. The list is fixed: the admin ticks choices in the review editor but cannot add new ones, and only a migration changes the lists. This replaces the 10 placeholder categories from spec 0013 and drops any tags already saved on them. The game sheet shows the saved tags as three labeled chip rows (amendment, AC-11 to AC-13), and the Reviewed tab opens the sheet instead of navigating (AC-14). Tags on the shelf and home stay out of scope.

## Context

Spec [0013](0013-add-game-i-own/index.md) (AC-25) added one flat `categories` table with 10 placeholder rows (Strategy, Party, Family, Co-op, Card, Dice, Deduction, Abstract, Thematic, War), a `game_categories` link table, and an editor picker that lets the admin add new categories. Only the admin review editor reads them today. No public page shows them.

The community wants to describe a game in three different ways: how it feels to play, what it is about, and how it plays. One flat list mixes these ("Strategy" next to "Dice"), so later filters (feature 14) could not offer them as clear groups. The three lists are known and short, so they can be fixed ahead of time.

Spec 0013 is still In Progress and its editor code is uncommitted on branch `feat/12-add-game-i-own`. This spec builds on that code and changes it in place. No category data worth keeping exists (engineer's call: drop all old links).

## Requirements

**User stories**:
- As the admin, I want to tag a game by feel, theme, and mechanics from fixed lists, so that every game is described the same way.
- As the admin, I want a short hint under each mechanic, so that I pick the right one without guessing.
- As a Chinese reader, I want every tag name and hint in Chinese on `/zh`, so that the lists make sense to me.

**Acceptance criteria**:
- **AC-1**: Three tables exist: `feels`, `themes`, `mechanics`. Each row has a `bigint generated always as identity` id, a unique `slug`, `name_en`, `name_zh` (both required, 1 to 60 characters after trimming), and a `position` (`not null`, unique within its table, greater than 0). The seed gives explicit positions and never supplies ids. Seeded content matches the **Seed data** tables below exactly: 5 feels, 10 themes, 20 mechanics.
- **AC-2**: `mechanics` also has `description_en` and `description_zh` (each 1 to 200 characters after trimming). They are set together or both null, and all 20 seeded mechanics have both. `feels` and `themes` have no description columns.
- **AC-3**: Three link tables, `game_feels`, `game_themes`, `game_mechanics`, connect a game to any number of choices in that group (zero is allowed). Deleting a game removes its links.
- **AC-4**: The review editor shows three stacked sections in this order: "Game feel", "Game theme", "Game mechanics". Each lists its choices as tick boxes in `position` order, with the label in the page language (Chinese on `/zh`, English elsewhere). A mechanic's description shows as small hint text under its label in the page language. The saved ticks are filled in when the editor opens. Each group is a `fieldset` with a `legend`. The unsaved changes check compares the three tick lists without regard to order.
- **AC-5**: Saving writes the three tick lists in the same transaction as the rest of the game (through `admin_update_game`). A changed list adds the key `feels`, `themes`, or `mechanics` to the `game_edits` row (in that order, where `category_ids` was, before `owner_ids`), with before and after values written as sorted arrays of slugs (stable and readable even if a choice is later removed). A list that did not change is not recorded.
- **AC-6**: The lists are fixed. The "Add a category" form, the `createCategory` action, and its validation code are removed. Nobody can insert, update, or delete rows in `feels`, `themes`, or `mechanics` through the API (no write policies and no write grants for `anon` and `authenticated`, and writes revoked from `service_role` too, as `cover_trash` does). Everyone can read them.
- **AC-7**: Only an active admin can insert or delete rows in the three link tables. Members and guests are refused. Everyone can read links.
- **AC-8**: The old `categories` and `game_categories` tables and the old `admin_update_game` signature are dropped, and all old links are discarded. Existing `game_edits` rows that mention `category_ids` stay unchanged.
- **AC-9**: `admin_update_game` refuses a null feel, theme, or mechanic list with error `22023`. The `saveGame` action treats a list the form did not send as "keep the saved value", the same rule 0013 uses for owners.
- **AC-10**: All of 0013 AC-16 to AC-24 (opening, locking a reviewed game, covers, history) still hold. Home and shelf are unchanged. The game sheet changes only as AC-11 to AC-13 say.
- **AC-11** (amendment): The game sheet (modal and `/games/[id]` page, one `SheetView`) shows three chip rows under the Description and above Owners, in this order: Game feel, Game theme, Game mechanics. Each row has a small label (the same group titles as the editor, without "(optional)") and the game's saved choices as chips, in `position` order, with the name in the page language (`choiceLabel`). A group with no saved choices shows nothing, not even its label. If all three are empty the sheet looks as it does today. A game with no description still shows the rows above Owners.
- **AC-12** (amendment): Chips show no hint text and are not tappable. Each row is a list (`ul`) named by its label, so a screen reader reads "Game mechanics, list, 3 items". Chip colors come only from the `--sheet-*` variables (the folder rule).
- **AC-13** (amendment): `getGameDetail` returns the three lists of choices (already in position order, each with `slug`, `nameEn`, `nameZh`). They come from the same cached read, so a saved tag change shows after `revalidateGames()`, which `saveGame` already calls. A failed link read throws like the other reads and is not cached.
- **AC-14** (amendment): On the Reviewed tab the game title opens the game sheet modal on the same page (the existing `SheetLink`), and does not navigate. A modifier click or open in new tab still goes to `/games/[id]`. The To review tab is unchanged.
- **AC-15** (amendment): The three group titles in the editor read "Game feel (optional)", "Game theme (optional)", and "Game mechanics (optional)" (Chinese: add "（可选）"). The `legend` carries the full text.

## Options considered

### Option 1: Three tables and three link tables
Each group has its own table and link table (the engineer's pick).
**Pros**:
- Each list can have its own columns (only mechanics get descriptions).
- A wrong id from the wrong group is impossible by construction.
**Cons**:
- Three of everything: policies, link tables, editor props, history keys.
- A fourth group later means another table and a function change.

### Option 2: One table with a `kind` column
One `categories` table, `kind` limited to feel, theme, or mechanic, one link table.
**Pros**:
- Smallest change from 0013, one link table, one id list in `admin_update_game`.
- A fourth group is one new allowed value.
**Cons**:
- Columns that only fit one group (descriptions) sit empty for the others.
- Stopping a feel id being used as a mechanic needs a composite key on id and kind.

### Option 3: A `category_groups` table plus categories
Groups become rows with names and order.
**Pros**: Group titles are editable data.
**Cons**: One more table to join, and the three groups are fixed, so the flexibility is unused.

## Decision

**Chosen option**: Option 1: Three tables and three link tables.

Create `feels`, `themes`, `mechanics` with `game_feels`, `game_themes`, `game_mechanics`, replace the flat categories from 0013, and make the lists fixed and migration managed.

**Implementation skills**: `supabase` (`supabase/agent-skills`, `.claude/skills/supabase/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.claude/skills/supabase-postgres-best-practices/`) · `shadcn` (`shadcn-ui/ui`, `.claude/skills/shadcn/`)

## Rationale

The engineer chose separate tables, and it fits the facts in Context: the three lists are small and known, only mechanics need a description, and mixing them is exactly the problem being fixed. The cost (three of everything) is real but mechanical, and `admin_update_game` already takes lists, so it grows by two arguments. A fixed list also removes the add form and its duplicate and slug handling, which is the largest part of the old picker, so the code gets smaller on the editor side. Runner up: Option 2, which would be less code, if a fourth group ever appears often.

## Feature design

**Data model**:

| Table | Columns | Rules |
|---|---|---|
| `feels` | `id` bigint identity pk, `slug` text unique, `name_en`, `name_zh`, `position` smallint not null unique | slug matches `^[a-z0-9]+(-[a-z0-9]+)*$`, max 60; names 1 to 60 trimmed; `position > 0`; unique on `lower(btrim(name_en))`; RLS: public read, no write policies |
| `themes` | same as `feels` | same |
| `mechanics` | same as `feels` plus `description_en`, `description_zh` text null | both set or both null; each 1 to 200 trimmed |
| `game_feels` | `game_id` bigint fk `games` cascade, `feel_id` bigint fk `feels` cascade, pk both | index on `feel_id`; RLS: public read, active admin insert and delete |
| `game_themes` | `game_id`, `theme_id` | same pattern |
| `game_mechanics` | `game_id`, `mechanic_id` | same pattern |

Grants: `select` on all six to `anon, authenticated`; `insert, delete` on the three link tables to `authenticated`; nothing else. `insert, update, delete` on `feels`, `themes`, `mechanics` is revoked from `service_role`. Choice ids and slugs are never reused or renamed once seeded. Slugs are kept for stable history and for the feature 14 filter URLs.

**Seed data** (migration inserts these in `position` order, 1 upward; Chinese is for the engineer's approval):

Game feel:

| # | Slug | English | Chinese |
|---|---|---|---|
| 1 | `party-games` | Party Games | 派对游戏 |
| 2 | `competitive` | Competitive | 竞技对抗 |
| 3 | `strategy` | Strategy | 策略 |
| 4 | `abstract-strategy` | Abstract Strategy | 抽象策略 |
| 5 | `cooperative` | Cooperative | 合作 |

Game theme:

| # | Slug | English | Chinese |
|---|---|---|---|
| 1 | `fantasy` | Fantasy | 奇幻 |
| 2 | `science-fiction` | Science Fiction | 科幻 |
| 3 | `horror` | Horror | 恐怖 |
| 4 | `mythology` | Mythology | 神话 |
| 5 | `historical` | Historical | 历史 |
| 6 | `adventure` | Adventure | 冒险 |
| 7 | `animals` | Animals | 动物 |
| 8 | `nature` | Nature | 自然 |
| 9 | `medieval` | Medieval | 中世纪 |
| 10 | `exploration` | Exploration | 探索 |

Game mechanics (the first descriptions marked ★ are your own words; the others I drafted):

| # | Slug | English | Chinese | English hint | Chinese hint |
|---|---|---|---|---|---|
| 1 | `trading` | Trading | 交易 | Swap goods or make deals with other players. | 与其他玩家交换物品或达成交易。 |
| 2 | `resource-management` | Resource Management | 资源管理 | Spend and save limited resources wisely. | 合理使用和储存有限的资源。 |
| 3 | `engine-building` ★ | Engine Building | 引擎构建 | Build a setup that helps you generate passive resources. | 搭建能帮你持续产出被动资源的体系。 |
| 4 | `combo-building` | Combo Building | 组合构建 | Chain cards or actions so they boost each other. | 把卡牌或行动串联起来，让它们互相增强。 |
| 5 | `area-control` | Area Control | 区域控制 | Compete to hold more of the board than the others. | 争夺并占据比对手更多的地图区域。 |
| 6 | `social-deduction` | Social Deduction | 社交推理 | Work out who is hiding their role from talk and behavior. | 通过交谈和行为推断谁在隐藏身份。 |
| 7 | `bluffing` | Bluffing | 虚张声势 | Mislead others about what you hold or plan. | 对他人隐瞒或误导你的手牌与计划。 |
| 8 | `guessing` | Guessing | 猜测 | Guess a hidden answer, word, or number. | 猜出隐藏的答案、词语或数字。 |
| 9 | `storytelling` | Storytelling | 讲故事 | Tell stories or give clues based on pictures and prompts. | 根据图片或提示讲故事、给线索。 |
| 10 | `memory` | Memory | 记忆 | Remember what was shown or played earlier. | 记住之前出现或打出过的内容。 |
| 11 | `speed-and-reflexes` | Speed & Reflexes | 速度与反应 | Act fast; the quickest hands or eyes win. | 比谁反应快、出手快。 |
| 12 | `set-collection` ★ | Set Collection | 套组收集 | Collect things that form a valuable combination. | 收集能组成高价值组合的物品。 |
| 13 | `deck-building` ★ | Deck Building | 牌组构建 | Gradually build and improve your personal deck of cards. | 逐步构建并改进你自己的牌组。 |
| 14 | `worker-placement` ★ | Worker Placement | 工人放置 | Place your workers on spaces to perform actions. | 把你的工人放到空位上来执行行动。 |
| 15 | `drafting` ★ | Drafting | 轮选 | Choose cards or items from a shared selection. | 从共享的选择中挑选卡牌或物品。 |
| 16 | `push-your-luck` | Push Your Luck | 搏运气 | Keep going for a bigger reward, but risk losing it all. | 继续冒险可得更多，但也可能全部失去。 |
| 17 | `voting` | Voting | 投票 | Players vote to decide the outcome. | 玩家通过投票决定结果。 |
| 18 | `dice-rolling` | Dice Rolling | 掷骰子 | Roll dice to decide what happens. | 掷骰子来决定结果。 |
| 19 | `bidding` | Bidding | 竞标 | Offer a price or value to win something. | 出价竞争以赢得物品。 |
| 20 | `route-building` | Route Building | 路线构建 | Connect places by building routes. | 修建路线来连接各个地点。 |

Your list named Engine Building twice and had one empty slot; both are merged and dropped. Lowercase entries (voting, dice rolling, bidding, route building) are written in title case.

**State transitions**: none. Reviewed games stay locked (0013 AC-20).

**Database function** `admin_update_game`: same as 0013 with `p_category_ids bigint[]` replaced by `p_feel_ids bigint[]`, `p_theme_ids bigint[]`, `p_mechanic_ids bigint[]` (placed where `p_category_ids` was). It remains `security invoker`, `set search_path = ''`, written as three plain blocks (no dynamic SQL). For each list it dedupes, compares to the saved links, and on change replaces the links and records `feels`, `themes`, or `mechanics` in `v_changed`, with before and after as sorted slug arrays. A null list raises `22023`. An id that does not exist raises the foreign key error `23503`, which the action reports as `error` (the editor only sends ids it loaded, so this means a stale or forged request). A null list can never come from `saveGame` (the keep rule fills it), so the existing `22023` to name error mapping stays; do not render the editor with a fallback empty list.

The migration drops the old function by its full old signature (`drop function public.admin_update_game(bigint, text, text, text, text, smallint, smallint, smallint, smallint, bigint[], uuid[], text, text, boolean)`) first, then `game_categories`, then `categories`, then creates the new tables and the new function. For the new function it runs `revoke all ... from public, anon` and `grant execute ... to authenticated` with the full new argument list, as 0013 does. `game_stats`, `search_games`, and the admin log trigger do not read categories or sit on link tables, so they need no change. A save that changes only tags still runs the no op `games` update, as it does today.

**Code shape**: `EditorCategory` becomes `EditorChoice { id, slug, nameEn, nameZh, descriptionEn?, descriptionZh? }`. `src/lib/games/categories.ts` keeps only the label helper (renamed `choiceLabel`) and adds `choiceHint(choice, locale)` with the same Chinese then English fallback; it is renamed `choices.ts`. The shared picker is `src/components/review/choice-group.tsx` with props `legend`, `choices`, `selected`, `onChange` (it replaces `category-picker.tsx`). `ReviewRow` and `EditorGame` carry `feelIds`, `themeIds`, `mechanicIds`; `EditSnapshot` and `isEditDirty` compare each with `sameSet`. The review query embeds `game_feels(feel_id), game_themes(theme_id), game_mechanics(mechanic_id)`, and so does the read before save in `actions.ts`. `review-loader.tsx` loads `{ feels, themes, mechanics, members }`.

**Amendment: tags on the sheet.**
- `GameDetail` gets `feels`, `themes`, `mechanics`: each `{ id, slug, nameEn, nameZh }[]`. A new read `fetchGameChoices(client, id)` in `rows.ts` selects `game_feels(feels(id, slug, name_en, name_zh, position))` and the same for themes and mechanics from `games`, and sorts each by `position`, then `id`. `readGameDetail` runs it in the same `Promise.all` as the game and owners. `buildGameDetail` stays pure and takes the choices as an argument; the fixtures get empty lists.
- `SheetData` gets `choiceGroups: { key: "feel" | "theme" | "mechanic"; label: string; chips: string[] }[]`, built in `sheet-data.ts` with `choiceLabel(choice, locale)`; empty groups are left out, so the view just maps the array. Labels come from new messages `game.choices.feel`, `game.choices.theme`, `game.choices.mechanic` (en and zh), read through `sheetT`. The locale is the one `buildSheetData` already gets.
- `sheet-view.tsx` draws the rows between Description and the Owners section. Each is a `section`/`ul` with a small muted label and wrapped chips in the existing chip style (`bg-(--sheet-chip)`). No new color. No hint text.
- Reviewed tab: in `review-loader.tsx`, the `Link` around `shownName` becomes `SheetLink` with the same `card` shape `EditableRow` uses (`avgRecommendation: null`, `ownerCount` from `row.owners.length`). The "View game page" link on To review already does this.
- Editor titles: change the three `review.editor.groups.*.title` strings in `messages/en.json` and `messages/zh.json`. `choice-group.tsx` needs no change.

**Message keys** (same in `en.json` and `zh.json`; `review.editor.categories.*` is deleted): `review.editor.groups.feel.title`, `review.editor.groups.theme.title`, `review.editor.groups.mechanic.title`, and `review.editor.groups.none` for an empty list.

**Interface**:

| Action or read | Inputs | Output | Auth | Key errors |
|---|---|---|---|---|
| `saveGame` (changed from 0013) | `FormData` as before, but `categoryIds` is replaced by `feelIds`, `themeIds`, `mechanicIds` (each a JSON array of numbers) | `{ status: "ok" }` | active admin | as 0013 |
| `createCategory` | removed | none | none | none |
| `getEditorLists` (changed) | none | `{ feels, themes, mechanics, members }` | admin session, not cached | throws on a database error |

`getReviewQueue` returns `feelIds`, `themeIds`, `mechanicIds` per row, read from the three link tables in place of `game_categories`.

**Value sourcing**:

| Action | Value | Source |
|---|---|---|
| Editor | choices and their order | `feels`, `themes`, `mechanics`, ordered by `position`, then `id` |
| Editor | label and hint language | page locale (`useLocale`), Chinese when `name_zh` or `description_zh` is set on `/zh`, else English (same fallback as `categoryLabel` today) |
| Editor | group titles ("Game feel", "Game theme", "Game mechanics") | next-intl messages, both languages |
| Editor | ticked boxes at open | the three link tables for this game |
| `saveGame` | the three id lists | form fields, or the saved links when a field is not sent |
| History row | before and after lists (slugs) | read inside `admin_update_game`, joined to the three choice tables |

**Key invariants**:
- A link row points to a choice in its own group only (the foreign key of each link table enforces it).
- The seeded lists change only through a new migration.
- A game and its links, plus the history row, change in one transaction.

**Security model**: reads are public. Link writes are active admin only through RLS (`private.is_admin()`) and the function also checks it (`42501`). Choices are write protected for everyone. No new secret or env var. No personal data.

**Critical test scenarios** (amendment cases at the end):
- Seed: counts are 5, 10, 20; slugs unique; every mechanic has both hints; `feels` and `themes` pass `hasnt_column` for descriptions; a mechanic with only one hint is refused, verifies **AC-1**, **AC-2**.
- Admin saves a game with two feels, one theme, three mechanics; reopening shows the same ticks; one `game_edits` row lists only the three changed keys, verifies **AC-3**, **AC-4**, **AC-5**.
- Editor on `/zh` shows Chinese labels and Chinese hints; on `/en` English, verifies **AC-4**.
- Editor has no "Add a category" form and `createCategory` is gone, verifies **AC-6**.
- A member and a guest cannot insert or delete links; nobody, admin included, can insert, update, or delete a choice row, verifies **AC-6**, **AC-7**.
- Old tables are gone and the old function name with the old signature is gone, verifies **AC-8**.
- A null list raises `22023`; a missing field in `saveGame` keeps saved ticks, verifies **AC-9**.
- A reviewed game still cannot be saved, verifies **AC-10**.
- Sheet of a game with two feels, no themes, three mechanics shows two rows (feel, mechanics) in that order between Description and Owners; the theme label is absent; on `/zh` the names are Chinese, verifies **AC-11**, **AC-13**.
- Sheet of a game with no tags and no description shows no chip rows, verifies **AC-11**.
- Reviewed tab: tapping the title opens the modal and the URL stays `/admin/review?tab=done`; ctrl click keeps the link, verifies **AC-14**.
- Editor legends end in "(optional)" on `/en` and "（可选）" on `/zh`, verifies **AC-15**.

## Build plan

Approach: Tracer Bullet (the project default). The thin thread is the feel group end to end (table, link, function, editor section), then the other two groups and the hints thicken it. Because the function signature changes once, the migration holds all three groups from the start.

- [x] 1. Migration `20261125090000_category_groups.sql`: drop the old function, `game_categories`, and `categories`; create the six tables with RLS and grants; seed the three lists; create the new `admin_update_game` with its grants. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-6**, **AC-7**, **AC-8**, **AC-9**.
- [x] 2. pgTAP: new file for the three groups (seed, RLS, function, null list, history keys, service role cannot write choices). Update `10_review_edit.test.sql` (the `tests.cat` helper, the exact `changed` array, the plan count) and `05_merge_readiness.test.sql` (the expected list becomes `comments, game_feels, game_mechanics, game_owners, game_themes, ratings, top_picks, wishlist_entries`, eight not six; record the link merge rule, primary key with `on conflict do nothing`, for feature 19). `seed.sql` needs no sample tags. Satisfies **AC-1**, **AC-5** to **AC-9**.
- [x] 3. Regenerate `database.types.ts`. Satisfies **AC-3**.
- [x] 4. Thin thread in code: `getEditorLists`, `getReviewQueue`, the `edit-game.ts` types and dirty check, and `saveGame` pass the feel list through; the editor shows the "Game feel" section from the new picker. Satisfies **AC-4**, **AC-5**.
- [x] 5. Thicken: theme and mechanic lists and the mechanic hint text; one shared group picker component (replacing `category-picker.tsx`); remove `createCategory`, `validateCategory`, `slugify` and their tests; keep the label helper. Satisfies **AC-4**, **AC-6**, **AC-9**.
- [x] 6. Messages in `messages/en.json` and `messages/zh.json`: replace `review.editor.categories` with the three group titles and hints (same keys in both files). Satisfies **AC-4**.
- [x] 7. Update the unit tests (`edit-game.test.ts` including the dirty check, `actions.test.ts`, `categories.test.ts` becomes `choices.test.ts` for the label and hint helpers) and `e2e/review-edit.spec.ts` (tick in all three groups, Chinese labels and hints on `/zh`, no add form, the history check expects `feels`, `themes`, `mechanics` instead of `category_ids`). Satisfies **AC-4** to **AC-6**, **AC-10**.
- [x] 8. Docs: add a one line pointer under 0013 AC-25 ("replaced by spec 0014"), update `supabase/AGENTS.md` if it names categories, remove the `categories` mention in `docs/scope/scope.md`, and tick the scope sub task. Satisfies **AC-10**.
- [x] 9. Data: add `fetchGameChoices` and the three lists on `GameDetail` (and fixtures); extend `rows` and `detail` tests (order by position, empty lists). Satisfies **AC-13**.
- [x] 10. Sheet: `choiceGroups` in `SheetData` and `buildSheetData`, the rows in `sheet-view.tsx`, messages `game.choices.*` in both languages; update `game-sheet.test.tsx` (rows in order, empty group hidden, none shown when all empty, no hint text), the `/design` preview data, and `src/components/game-sheet/AGENTS.md` with one line. Satisfies **AC-11**, **AC-12**.
- [x] 11. Reviewed tab: `SheetLink` for the title; e2e in `e2e/review-edit.spec.ts` (click a Reviewed title, the dialog opens, URL unchanged; the sheet shows the saved chips). Satisfies **AC-14**, **AC-11**.
- [x] 12. Editor titles: add "(optional)" and "（可选）" to the three group titles; update the e2e and unit tests that read the titles. Satisfies **AC-15**.

## Migration plan

**Strategy**: big bang, on purpose. The data is placeholder, the editor is not live for members, and the engineer chose to drop old links.
**Phases**:
1. One migration creates the new tables and function, then drops the old ones.
2. Code ships in the same commit so the editor and function agree on the signature.
**Rollback**: revert the code and restore the 0013 tables from a new migration; old links cannot be restored, which was accepted.
**Risks**: pushing the migration without the code (or the reverse) breaks saving in the editor (the old code gets "function not found"), so push the migration right before the deploy and do not review games in that gap. This is acceptable for an admin only editor. Check `supabase migration list` before `supabase db push`.

## Consequences

**Positive**:
- Every game can be described the same three ways, ready for filters in feature 14.
- The editor loses the add form and its duplicate and slug handling.
- Choices cannot drift because nobody can write them through the API.

**Negative / tradeoffs**:
- Three of everything (tables, links, props, history keys), and a fourth group needs another migration and function change.
- Adding or fixing a choice needs a migration, not a click.
- Old tags are lost and old `game_edits` rows keep `category_ids` keys that no longer match any table.
- Chinese names and hints for the 15 drafted mechanics are a first draft.

**Neutral**:
- Hints show in the editor only (the sheet shows names only, by design).

## Follow-up

- [ ] Native Chinese reader checks all Chinese names and hints above (the PR template asks for it).
- [ ] Show the tags on the shelf and home, and filter by them (feature 14, not in this spec). The sheet already shows them (AC-11).
- [ ] Native Chinese reader checks the three new chip row labels and the "（可选）" suffix.
- [ ] Decide whether a game must have at least one feel before it can be marked reviewed (not required now).
