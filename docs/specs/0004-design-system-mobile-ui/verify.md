# Verify: Design system & mobile first UI · spec 0004 · updated 2026-11-01
_Steps derived from spec 0004 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Open `docs/design.md` → it covers color tokens (light and dark), typography (Latin and Chinese stacks, type scale), spacing and layout (gutter, max widths, breakpoints, shelf grid), radius, elevation, motion, icons, and components (app shell, game card, cover tile, score input, form fields, state blocks) → AC-1
- [x] Open `docs/design.md` → it has a *Visual reference* section (Overboard link, what is and isn't borrowed) and a *Game detail sheet* section (anatomy, Cover Tint color rules, sheet frame, motion, route, accessibility, data) → AC-1
- [x] At 360px and 1280px, load `/design` → a Cover Tint block shows four sample sheets (green, red, teal, cream); the cream one has black text, the others white; every text is easy to read → AC-12
- [x] `pnpm test` → `src/lib/design/cover-tint.test.ts` passes, including the color sweep → AC-12
- [x] Set the OS or devtools to dark, hard reload `/` with JavaScript disabled → the page paints warm charcoal straight away, no light flash; no toggle anywhere → AC-2
- [x] Devtools → Network, filter "font", load `/design` → only Geist files load, no Chinese font; the Chinese sample text in the type scale still renders → AC-3
- [x] At 360px wide, load `/` → slim sticky header with dice icon and "Game Shelf", no bottom bar (one tab today), no sideways scroll → AC-5
- [x] At 360px, load `/design` → both previews show the bottom bar with safe area padding; the member bar has a raised round Add in the center → AC-5, AC-7
- [x] At 1280px, load `/design` → previews show the tabs as inline header links, the member Add as a terracotta button, Shelf underlined with `aria-current="page"`; content is centered at max 72rem → AC-6, AC-7
- [x] In `src/lib/app-shell/nav.ts`, set `home` to enabled → at 360px `/` now shows a bottom bar (2 tabs) and the page content is not hidden behind it; at 1280px the tabs appear in the header. Revert after → AC-5, AC-6, AC-7
- [x] In `src/i18n/request.ts`, change the locale and import to `zh` → header shows 桌游架, tab title is 桌游架, `<html lang="zh">`. Revert after → AC-8
- [x] At 1280px on `/design`, press Tab from the top → focus lands on the wordmark with a visible ring, then moves through each header link in order → AC-9
- [x] Turn on "reduce motion" in the OS, press the raised Add in the `/design` preview → no scale animation → AC-9
- [x] View source on `/design` → `<meta name="robots" content="noindex, nofollow">` → AC-10

## Commands
- [x] `pnpm test` → all pass, including every contrast pair in light and dark (`src/lib/design/contrast.test.ts`) and message key parity → AC-4, AC-8
- [x] Lower `--muted-foreground` lightness in `globals.css` to 0.7, run `pnpm test` → contrast tests fail; revert → AC-4
- [x] `VERCEL_ENV=production pnpm build && pnpm start`, then open `/design` → 404; `/` → 200 → AC-10
- [x] `pnpm test:e2e` (needs `.env.local`) → 18 pass at 360px and 1280px in light and dark; screenshots in `test-results/` look right → AC-11

## Value sourcing
- [x] Wordmark, tab labels, browser title come from `messages/*.json` (`shell.*`): edit `shell.brand` in `en.json` → header and title change → AC-8
- [x] Locale comes from `src/i18n/request.ts` (fixed `en`) → `<html lang="en">` → AC-8
- [x] Which tabs show comes from `enabled` plus `audience` in `nav.ts`: a member only item never shows for the guest viewer → AC-7
- [x] Viewer is `"guest"` from `src/app/layout.tsx`: change it to `"member"` with every tab enabled → Add and Me appear, Sign in goes → AC-7
- [x] Active tab comes from the URL: on `/` the Shelf tab (href `/`) is active, nothing else → AC-7
- [x] Bottom bar shows only at 2 or more visible tabs → AC-5
- [x] Light or dark comes from the device `prefers-color-scheme` only → AC-2
- [x] Browser chrome color: `<meta name="theme-color">` has `#fefaf1` (light) and `#18120f` (dark) with matching media → AC-2
- [x] `/design` production check reads `VERCEL_ENV`; unset locally counts as not production → AC-10

## Acceptance-criteria coverage
- AC-1 design.md step · AC-2 dark first paint, theme color, e2e background check · AC-3 network font check · AC-4 `pnpm test` contrast, lowered token · AC-5 360px `/` and `/design`, enable Home · AC-6 1280px `/design` · AC-7 previews, nav value sourcing · AC-8 zh switch, messages test · AC-9 Tab order, reduced motion · AC-10 production 404, noindex · AC-11 `pnpm test:e2e` · AC-12 cover-tint test sweep, `/design` Cover Tint block
