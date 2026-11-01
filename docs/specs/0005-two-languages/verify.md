# Verify: Two languages · spec 0005 · updated 2026-11-01
_Steps derived from spec 0005 acceptance criteria and its Value sourcing table. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] With no `NEXT_LOCALE` cookie and `Accept-Language: zh-CN,zh;q=0.9,en;q=0.8`, open `/` → 307 to `/zh`, Chinese shell (`桌游架`), `<html lang="zh-Hans">` → AC-1, AC-2, AC-5
- [x] Same with `en-US,en;q=0.9,zh;q=0.8` → `/en`; with `zh-TW`, `zh-HK`, `zh-Hant` → `/zh`; with `fr` or no header → `/en` → AC-2 (source: cookie, else Accept-Language, else `defaultLocale`)
- [x] Open `/design?x=1` with no cookie and `Accept-Language: en` → 307 to `/en/design?x=1` (path and query kept) → AC-1
- [x] Open `/zh/no-such-page` → status 404, heading `找不到页面`, `lang="zh-Hans"`, `noindex`, no canonical link → AC-1, AC-5, AC-7
- [x] Open `/fr/x` → redirected to `/en/fr/x` (or `/zh/fr/x`) and ends in a 404; `/api/nope` → Next's plain 404 → AC-1
- [x] At 360px and 1280px, the header shows the wordmark and a globe button with `EN` (or `中`) on one line, no sideways scroll, button at least 44 by 44, `lang` on the button matches → AC-3
- [x] Button accessible name is `Language: English` on `/en`, `语言：中文` on `/zh` (source: `common.language.label` with the current name) → AC-3
- [x] Open the menu: `English` and `中文`, each with its own `lang` (`en`, `zh-Hans`); the current one has `aria-checked="true"` and a check icon → AC-3 (source: `common.language.names`, `htmlLang`)
- [x] On `/en/design?x=1`, choose `中文` → lands on `/zh/design?x=1`, menu closed (source: `usePathname()` plus `window.location.search`) → AC-3
- [x] Keyboard: Tab to the button, Enter opens, ArrowDown moves, Escape closes and focus returns to the button with the focus ring → AC-3
- [x] After switching to Chinese, the `NEXT_LOCALE` cookie is `zh`, `SameSite=Lax`, path `/`, expiry about one year out; then visit `/` with an English browser → lands on `/zh` (cookie beats Accept-Language) → AC-4
- [x] Switch back to English → cookie becomes `en`; `/` then lands on `/en` → AC-4
- [x] On `/en`, open the menu and close it with Escape → cookie unchanged, no navigation (nothing prefetched) → AC-4
- [x] With cookies blocked, `/` still redirects by Accept-Language and pages render → AC-4
- [x] Shell text, tab labels, nav label, and the `<title>` show in the page's language on `/en` and `/zh` (source: `messages/{locale}.json`, namespaces `shell` and `common`) → AC-5
- [x] Head of `/zh` has canonical `{site}/zh` and alternates `en` → `{site}/en`, `zh-Hans` → `{site}/zh`, `x-default` → `{site}/en`; `/zh/design` has its own canonical `{site}/zh/design`, not the home page's; URLs come from `NEXT_PUBLIC_SITE_URL` with no trailing slash → AC-7
- [x] Browser in `Europe/London`: on `/en/design`, the `2026-10-31T17:00:00Z` sample's server HTML shows `Nov 1, 2026` with title `Nov 1, 2026, 1:00 AM` (UTC+8); after load the title is `Oct 31, 2026, 5:00 PM` and the text is relative or the date; no hydration warning in the console → AC-9 (sources: `Asia/Kuala_Lumpur` first, browser zone and `new Date()` after mount)
- [x] On `/zh/design` in the same zone, relative text is Chinese (for example `46分钟前`) and dates follow the Chinese pattern (`2026年1月15日`) → AC-9
- [ ] The tracer shelf on `/en` and `/zh` shows the same game names, unchanged (needs the local Supabase stack running) → AC-10
- [x] `.github/pull_request_template.md` has the Chinese native reader checkbox → AC-11

## Commands
- [x] `pnpm build` → `/en/design` and `/zh/design` static, `/en` and `/zh` static or partial prerender → AC-6
- [x] `pnpm typecheck` → passes; deleting `t("nope")` in `src/i18n/typed-keys.test-d.ts` makes it fail with an unused `@ts-expect-error` → AC-8
- [x] `pnpm lint` → passes; `pnpm vitest run src/i18n/lint-guards.test.ts` → raw JSX text, `next/link`, and `NextIntlClientProvider` are flagged where they should be → AC-8
- [x] `pnpm vitest run src/i18n/messages.test.ts` → both files have the same keys and the two language names are pinned → AC-3, AC-8
- [x] `pnpm vitest run src/i18n/merge-messages.test.ts` → a key missing in Chinese falls back to the full English message → AC-12
- [x] `pnpm vitest run src/i18n/alternates.test.ts src/lib/time` → hreflang URLs and LocalTime thresholds (60 seconds, 7 days) → AC-7, AC-9
- [x] `pnpm test:e2e` → `e2e/two-languages.spec.ts` and `e2e/design-system.spec.ts` pass at 360px and 1280px, light and dark → AC-1 to 5, 7, 9

## Acceptance-criteria coverage
- AC-1 redirect and 404 steps, e2e · AC-2 Accept-Language steps, e2e · AC-3 menu steps, names test · AC-4 cookie steps · AC-5 lang and shell text steps · AC-6 build step · AC-7 metadata step, alternates test · AC-8 typecheck and lint guard steps · AC-9 LocalTime steps · AC-10 tracer shelf step · AC-11 PR template step · AC-12 merge test
