# Review, feat/6-community-shelf, 2026-11-01

**Reviewed by**: claude-opus-5-5 (fresh context, did not write the code; author model not stated)
**Scope**: 35 files, branch vs main (all uncommitted or untracked)
**Verdict**: Approve with nits

## Summary
This builds part 1 of spec 0007: `getShelfGames` becomes the pure `buildShelfData` and `compareNames` over the dummy data. The page keeps its `h1` outside `Suspense` and renders `ShelfLoader`, which shows the sync `ShelfContent` (count, URL-driven switch, grid or By owner placeholder) or `ShelfError` inside the fallback `ShelfSkeleton`. There is also a backstop `error.tsx` that uses the Next 16 `retry()`. The code is small, well layered and matches AC-1 to AC-12, apart from the deviations the user asked for. Typecheck, lint, format check and all 258 Vitest tests pass locally. There are no blockers or majors. The main issues are a swallowed error with no log, one test assertion that can never fail, and docs that now disagree with the code.

## Minor
### 🟡 Loader swallows the read error without logging it, `src/components/shelf/shelf-loader.tsx:20`
**Problem**: `catch { data = null; }` drops the error completely. The spec asks for the catch, but nothing records what went wrong.
**Why it matters**: When feature 21 swaps in Supabase reads, a failing query will show "Could not load the shelf" with no server log, digest or stack trace. Production failures will be invisible.
**Suggested fix**: Catch the error as a variable and log it on the server (`console.error`) before falling back. You could also keep the `catch` narrow, so programming errors still reach `error.tsx`.

### 🟡 Empty-state assertion can never fail, `src/components/shelf/shelf-content.test.tsx:104`
**Problem**: `/d+ games?/` is missing its backslash, so it matches a literal "d" followed by " game". It passes whether or not the count is shown.
**Why it matters**: The "no count in the empty state" part of AC-7 is not actually tested. A regression that renders "0 games" would get through.
**Suggested fix**: Use `/\d+ games?/`, or check for the count paragraph some other way.

### 🟡 Design doc and spec no longer match the built grid and gutter, `docs/design.md:73`, `docs/design.md:76`
**Problem**: `design.md` is the build mandate. It still says the page gutter is `px-4 md:px-6` and the shelf grid is `md:grid-cols-4 ... lg:grid-cols-6`. The code uses `px-(--page-gutter)` (24/52/60/80px) and `md:grid-cols-6 xl:grid-cols-10`. Line 75 (the container) was updated, but the two lines next to it were not. Spec 0007 AC-4 is also stale.
**Why it matters**: The next feature built "to design.md" will bring back the old gutter or grid and look different from the shelf and the shell.
**Suggested fix**: Update both `design.md` lines to the `--page-gutter` token and the 2/3/6/10 grid. Record the AC-4 amendment in the spec through `/architect`.

### 🟡 The grid column classes are copied into two files, `src/components/shelf/shelf-skeleton.tsx:24`
**Problem**: The responsive grid string is written out in both `ShelfGrid` and `ShelfSkeleton`. Only `ShelfGrid`'s copy is checked by a test, against the literal string.
**Why it matters**: AC-8 needs the skeleton to have the same footprint as the real grid. These columns have already changed once, and the next change can easily miss one copy, so the loading state jumps when content arrives.
**Suggested fix**: Export one shared `shelfGridClass` constant (or a small grid wrapper) and use it in both places.

## Nits
- ⚪ `src/app/globals.css:228`: the `--page-gutter` comment appears twice (two versions of the same paragraph). Delete one.
- ⚪ `src/app/[locale]/layout.tsx:151`: `shelf.heading` and `shelf.error` now go to the browser on every route. A `NextIntlClientProvider` in a `src/app/[locale]/shelf/layout.tsx` would scope them to the shelf and keep the "picked namespaces" rule tight. The payload is tiny either way. The rewrapped comment above it is also unevenly broken.
- ⚪ `src/components/shelf/shelf-loader.tsx:17`: `let data = null` plus `data = null` inside the catch is redundant. Returning `ShelfError` straight from the catch would read more simply.
- ⚪ `src/components/shelf/shelf-empty.tsx:22`: shadcn `EmptyTitle` renders a `div`, so "The shelf is empty" and "Could not load the shelf" are not headings for screen reader navigation. Consider rendering them as `h2`.

## Strengths
- Clean split between the async `ShelfLoader` (reads `searchParams` and data inside `Suspense`) and the sync `ShelfContent`. This keeps the `h1` prerenderable under Cache Components and makes AC-7 to AC-9 testable without a browser.
- `compareNames` handles code points correctly (`Array.from` rather than UTF-16 units), and a surrogate-pair test proves it. Ties are broken by `id`.
- `ShelfError` takes its strings as props and accepts an optional `onRetry`. The same component serves the loader (`router.refresh()` in a transition), the `error.tsx` backstop (`retry()`, matching the Next 16 docs) and the `/design` preview.
- Accessibility is careful: each card is one whole link, the tile is `aria-hidden`, and the visible numbers are `aria-hidden` with pluralized `sr-only` text. The switch is a `nav` with `aria-current`, and tap targets are at least 44px.
- The wider container did not break the home page: `JustAdded` now uses `-mx-(--page-gutter)` / `px-(--page-gutter)`, so its phone row still bleeds to the screen edge. `max-w-screen-2xl` resolves in Tailwind 4 through `--breakpoint-2xl`.

## Test coverage
The coverage is strong. Unit tests cover `compareNames`, `buildShelfData` (order, owner counts, null average, ties, no games, no owners), `getShelfData` and `parseShelfView`. Component tests cover the card (link in both locales, clamp, `sr-only` text, plurals, one decimal, unrated), the grid order and classes, `ShelfContent` (count, switch hrefs and `aria-current`, the By owner placeholder, the empty block in both views and both languages), the skeleton, the loader's view parsing and error path in both languages, `ShelfError` refresh versus `onRetry` and its optional `h1`, and the `error.tsx` wiring. The e2e tests cover AC-1 to AC-6 at 360px and 1280px in both languages: order, column counts, tap heights, no page overflow, switching views and back, invalid or repeated `view`, and a focus ring.

Gaps:
- The AC-7 "no count" assertion is a no-op (see Minor).
- No e2e test checks that the language menu keeps `?view=owner` (AC-5's last sentence). `language-menu.tsx` does read `searchParams`, but nothing tests it on the shelf.
- I did not run the Playwright suite. Typecheck, lint, format check and Vitest are green.
