# 0005. Two languages: locale routing, language menu, and the translated text pattern

**Date**: 2026-11-01
**Status**: Accepted

## Summary

Every page gets two addresses, one in English (`/en/...`) and one in Simplified Chinese (`/zh/...`), so each language is its own fast, prebuilt page that search engines can index. A first time visitor lands in their phone's language; a globe menu in the header switches language and stays on the same page, and a cookie remembers the choice for a year. This spec also fixes the rules every later page follows: text lives in `messages/en.json` and `messages/zh.json` by feature, a wrong key or a hardcoded English word fails the checks, links carry the language automatically, and times show in the reader's own time zone.

## Requirements

**User stories**:
- As a Chinese reading visitor, I want the site in Chinese the first time I open it on my phone so that I don't hunt for a switch in a language I read less easily.
- As any visitor, I want to switch language from any page and stay on that page so that I don't lose my place.
- As a returning visitor, I want the site to remember my language so that I don't switch every time.
- As a member sharing a link in a group chat, I want the link to open in the language I shared it in so that the reader sees what I saw.
- As the builder of later pages, I want one clear pattern for translated text, enforced by the checks, so that no page ships half in English.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: Every page lives under `/en/...` or `/zh/...`. A request to `/` or to any path without a language prefix redirects (307, temporary) to the same path under the visitor's language, keeping the query string. A path under a valid prefix that matches no page shows a translated "page not found" in that language with a real 404 status code. An unknown first segment such as `/fr/x` is treated as an unprefixed path (redirected to `/en/fr/x` or `/zh/fr/x`) and so ends in that language's 404. Paths the proxy skips (`/api/...`, `/auth/...`, paths with a dot) that match no route get Next's plain default 404. URL case and trailing slashes follow Next's defaults (`trailingSlash: false`; `/EN/x` is not a language prefix).
- **AC-2**: On a first visit (no `NEXT_LOCALE` cookie), the language comes from the browser's `Accept-Language` using next-intl's standard best match: the highest ranked language the site supports wins. `zh-CN,zh;q=0.9,en;q=0.8` gives Chinese; `en-US,en;q=0.9,zh;q=0.8` gives English. Every Chinese variant (`zh`, `zh-CN`, `zh-SG`, `zh-TW`, `zh-HK`, `zh-Hans`, `zh-Hant`) matches Chinese, which is Simplified (the only Chinese offered). No supported language in the header, or no header, gives English.
- **AC-3**: The header shows a language menu on every page, on phone and desktop. Its button shows a globe icon plus the current code (`EN` or `中`), carries `lang` matching that code, and has a translated accessible name built from `common.language.label` with the current language name (for example "Language: English", "语言：中文"). It opens a shadcn Dropdown Menu (a radio group) listing `English` and `中文`, each written in its own script with a matching `lang` attribute; the current one is marked with `aria-checked="true"` and a check icon. Choosing the other one goes to the same page (same path and query string) in that language and closes the menu. The button meets the 44px tap target, works by keyboard (Enter or Space opens, arrows move, Escape closes and returns focus to the button), and shows the design system focus ring. At 360px width the header fits the wordmark and the button on one line with no overflow.
- **AC-4**: The choice is remembered in the `NEXT_LOCALE` cookie (max age one year, `SameSite=Lax`, path `/`). Visiting any `/en/...` or `/zh/...` page updates it, so after switching to Chinese, a later visit to `/` lands on `/zh`. The cookie overrides `Accept-Language`. Opening the language menu does not change the cookie by itself (nothing is prefetched). With cookies blocked, the site still works and simply falls back to `Accept-Language` on each visit to `/`.
- **AC-5**: `<html lang>` is `en` on English pages and `zh-Hans` on Chinese pages, including the translated 404. All shell text (wordmark, tabs, nav label, language menu) and the site metadata (title template and description, under `shell.meta`) show in the page's language.
- **AC-6**: Language never makes a page dynamic. `pnpm build` output shows `/en`, `/zh`, `/en/design`, and `/zh/design` prerendered (static or partial prerender); the `[...rest]` catch all may show as partial. No server code reads cookies or headers to find the language.
- **AC-7**: Every page's metadata declares its language twins: a canonical link to itself, and `alternates.languages` for `en`, `zh-Hans`, and `x-default` (pointing to the English page), all absolute URLs with no trailing slash (`{site}/en`, `{site}/zh/games/12`), built from `NEXT_PUBLIC_SITE_URL`, also set as `metadataBase` in the root layout. The language map is the same on both twins. The 404 page declares no canonical and is `noindex`.
- **AC-8**: The text pattern is in place and enforced: messages are grouped by one top level namespace per feature plus a shared `common`; message keys are typed from `messages/en.json`, so a wrong key fails `pnpm typecheck`; `src/i18n/messages.test.ts` keeps both files on the same keys; raw text inside JSX under `src/app/` and `src/components/` fails `pnpm lint` (the `/design` preview, `src/components/ui/`, and tests are exempt); importing `next/link`, or `Link`, `redirect`, `permanentRedirect`, `usePathname`, or `useRouter` from `next/navigation`, anywhere in `src/` fails `pnpm lint` with a message pointing to `@/i18n/navigation`. Text passed as a JSX prop (`aria-label`, `placeholder`, `alt`, `title`) is not caught by the lint rule; that gap is accepted and left to review.
- **AC-9**: A `LocalTime` component renders any timestamp. The server and first render show the date (no time) in `Asia/Kuala_Lumpur` (UTC+8), formatted for the page language, with the full date and time in UTC+8 in the `title` attribute. After the page loads, it switches to the visitor's own time zone: "just now" when under one minute old or in the future (clock skew), relative text when under 7 days old ("3 hours ago", "3小时前"; next-intl picks the unit), the date when 7 days or older; the `title` becomes the full date and time in the visitor's zone. The text does not tick while the page stays open. The markup is a `<time datetime>` element. No hydration mismatch warning appears. An invalid value renders nothing (and logs in development) on both server and client.
- **AC-10**: Content people entered or fetched (game names, descriptions, member names, comments) shows exactly as stored in both languages, never translated or changed by locale.
- **AC-11**: `.github/pull_request_template.md` exists with a checkbox: "Chinese text in `messages/zh.json` reviewed by a native reader, or this PR changes no Chinese text." It works on trust; nothing checks the tick.
- **AC-12**: If a message key is ever missing in Chinese at runtime, the full English message for that key shows instead (including its plural and variable handling), never the raw key or raw ICU text, and a development build logs the missing keys once at startup. A key missing in both files cannot type check, so it never reaches runtime.

## Decision

**Chosen option**: Option 1: language prefix on every URL, read through `next/root-params`.

Move every page under an `app/[locale]` root segment with `localePrefix: "always"`, let next-intl's proxy pick and remember the language, read the locale in server code from `next/root-params` so pages stay prerendered, and enforce the text pattern with typed keys and ESLint.

**Implementation skills**: `shadcn` (`shadcn-ui/ui`, `.claude/skills/shadcn/`) for adding Dropdown Menu through the CLI · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) for the server and client split · `playwright-cli` (`microsoft/playwright-cli`, `.claude/skills/playwright-cli/`) for the browser checks

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:
No database change. The language choice lives only in the `NEXT_LOCALE` browser cookie. Game names, descriptions, and comments stay single language as stored (spec 0002 unchanged). A member profile language column was considered and left out (see Follow-up).

**Routing configuration** (`src/i18n/routing.ts`, the one source of language facts):

| Setting | Value |
|---|---|
| `locales` | `["en", "zh"]` |
| `defaultLocale` | `"en"` (used when `Accept-Language` has no `zh`) |
| `localePrefix` | `"always"` |
| `localeDetection` | `true` (cookie first, then `Accept-Language`) |
| `localeCookie` | `{ maxAge: 60 * 60 * 24 * 365 }` (next-intl 4 defaults to a session cookie, which would forget the choice when the browser closes) |
| `alternateLinks` | `false` (hreflang comes from page metadata only, so there is one source; see AC-7) |

The same file exports `htmlLang` (`{ en: "en", zh: "zh-Hans" }`), used for `<html lang>`, hreflang keys, and the `lang` attribute on menu items, plus a `Locale` type and `hasLocale` guard.

**File layout after the move**:

| File | Role |
|---|---|
| `src/proxy.ts` | Next 16 proxy (formerly middleware). Runs `createMiddleware(routing)`. Written as a small function that calls the intl handler and returns its response, with a comment marking where feature 6 chains the `@supabase/ssr` session refresh (spec 0001). `config.matcher = ["/((?!api|auth|_next|_vercel|.*\\..*).*)"]`, which skips API and auth routes, Next internals, and any path with a dot (static files). A dotted path under a prefix (`/en/x.txt`) also skips the proxy, which is harmless: it already carries its language and 404s normally. |
| `src/i18n/routing.ts` | `defineRouting` config above, plus `htmlLang`, `Locale`, `hasLocale`. |
| `src/i18n/request.ts` | `getRequestConfig(async ({ locale: override }) => ...)`: uses the explicit `override` when a caller passes `{ locale }`, else `await locale()` from `next/root-params`; calls `notFound()` when the value is not a known locale. Never reads `requestLocale` (deprecated in next-intl 4.14 and it reads headers). Returns `locale`, `messages`, and `timeZone: "Asia/Kuala_Lumpur"`. For Chinese, `messages` is `deepMerge(en, zh)` (English underneath, Chinese on top) so a missing key renders the full English ICU message (AC-12); a small `src/i18n/merge-messages.ts` holds the merge and a `missingKeys(en, zh)` helper, and in development `request.ts` logs the missing keys once per process. `onError` only logs. |
| `src/i18n/navigation.ts` | `createNavigation(routing)` exporting `Link`, `redirect`, `permanentRedirect`, `usePathname`, `useRouter`, `getPathname`. The only allowed way to link or redirect inside the app. |
| `src/i18n/global.d.ts` | `declare module "next-intl" { interface AppConfig { Locale: Locale; Messages: typeof en } }` with `en` imported from `messages/en.json`. |
| `src/i18n/alternates.ts` | `getAlternates(path: string)` takes the page path without prefix and without query (`/`, `/games/12`; dynamic segments already URL encoded by the caller) and returns `{ canonical, languages: { en, "zh-Hans", "x-default" } }`: canonical is the current locale's URL, the languages map is identical on both twins, `/` maps to `{site}/en` and `{site}/zh` (no trailing slash). Absolute via `NEXT_PUBLIC_SITE_URL` read through `requireEnv`, which `.env.example` already defaults to `http://localhost:3000`. Called from each page's metadata, never from a layout (a layout default would hand every page that forgets its own call the home page's canonical). |
| `src/i18n/intl-client-provider.tsx` | `IntlClientProvider`, a thin wrapper around `NextIntlClientProvider` whose `messages` prop is required (a picked object, `{}` when none). next-intl 4 ships the whole message file when `messages` is left out, so app code uses this wrapper, and ESLint `no-restricted-imports` blocks importing `NextIntlClientProvider` elsewhere in `src/`. |
| `src/app/[locale]/layout.tsx` | The root layout (moved from `src/app/layout.tsx`, carrying its fonts, `viewport` with the theme colors, and `globals.css` import). `generateStaticParams` returns both locales and `export const dynamicParams = false`. `<html lang={htmlLang[await locale()]}>`. Wraps the shell in `IntlClientProvider` with `messages={{}}` (locale and time zone flow through). `generateMetadata` sets `metadataBase` from `NEXT_PUBLIC_SITE_URL` and keeps the translated title template and description from `shell.meta`; it sets no `alternates`. No `loading.tsx` or Suspense boundary sits above page content, so `notFound()` still returns a 404 status. |
| `src/app/[locale]/page.tsx` | The current tracer page, moved. Its `generateMetadata` spreads `getAlternates("/")`. |
| `src/app/[locale]/design/page.tsx` | The `/design` preview, moved. Gains a language menu sample and a `LocalTime` sample. Still hidden in production. Spreads `getAlternates("/design")` next to its `noindex`. |
| `src/app/[locale]/not-found.tsx` | Translated 404 (`common.notFound.title`, `common.notFound.body`, `common.notFound.home`), inside the shell, metadata `robots: { index: false }`, no canonical. `<html lang>` comes from the layout as usual. |
| `src/app/[locale]/[...rest]/page.tsx` | Calls `notFound()`, so unknown paths under a valid prefix get the translated 404 (AC-1). `generateStaticParams` returns `[]`. If the step 1 build reports the header's `usePathname` as blocking on this route, wrap the nav link group and the language menu in Suspense with a static fallback (the same fallback spec 0004 planned for dynamic routes). |
| `src/app/globals.css`, `src/app/favicon.ico` | Stay where they are; the layout imports `../globals.css`. |
| `src/components/app-shell/language-menu.tsx` | The language menu (client component). |
| `src/components/app-shell/site-header.tsx` | Gains a right side group holding the inline nav (desktop) and the language menu (always). |
| `src/components/app-shell/nav-link.tsx`, `bottom-tab-bar.tsx`, `site-header.tsx` | Import `Link` and `usePathname` from `@/i18n/navigation`. `nav.ts` keeps plain paths like `/`; `isActiveTab` receives the path without the language prefix. |
| `src/components/time/local-time.tsx` and `src/lib/time/format-local-time.ts` | `LocalTime` client component and its pure formatting function. |
| `messages/en.json`, `messages/zh.json` | Gain `common` (language menu, not found, time words if any) next to `shell`. |
| `.github/pull_request_template.md` | The Chinese review checkbox (AC-11). |

**API surface** (no HTTP endpoints; these are the request paths and the module interfaces later features call):

| Surface | Kind | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| Any request without a language prefix, for example `/` or `/shelf?q=x` | Proxy | path, query, `NEXT_LOCALE` cookie, `Accept-Language` | 307 to `/{locale}{path}?{query}` | public | none |
| Any request under `/en` or `/zh` | Proxy then page | path | page, `Set-Cookie: NEXT_LOCALE` when it differs | public | 404 translated for unknown paths |
| `getTranslations(namespace)` / `useTranslations(namespace)` | Server / client function | typed namespace and key | translated string | n/a | wrong key fails typecheck |
| `getAlternates(path)` | Server function | path without prefix, for example `/games/12` | `{ canonical, languages }` absolute URLs | n/a | throws if `NEXT_PUBLIC_SITE_URL` unset (via `requireEnv`) |
| `<LanguageMenu current label options />` | Client component | `current: Locale`, `label: string` (full accessible name, already built on the server from `common.language.label` and the current name), `options: { locale: Locale, name: string, lang: string }[]` (built on the server in `site-header.tsx` from `routing.locales`, `common.language.names`, and `htmlLang`) | dropdown radio group | n/a | none |
| `<LocalTime value className? />` | Client component | `value: string` (ISO 8601 timestamp, as Supabase returns `timestamptz`), `className?: string` | `<time>` element | n/a | invalid date renders nothing and logs in development |
| `formatLocalTime(value, { now, timeZone, format })` | Pure function | `value: Date`, `now: Date \| null` (`null` means first render: date only), `timeZone: string \| undefined` (`undefined` means the browser's zone), next-intl `format` object | `{ text, title }` | n/a | none |

**Language menu behavior**: a client component (it needs `usePathname`, `useRouter`, and the open state). Labels arrive as props from the server (props first rule). The menu is a `DropdownMenuRadioGroup` whose value is the current locale; items are menu items, not links, so nothing is prefetched and the cookie never changes until a real choice (AC-4). On choosing the other language, the handler calls `router.replace(pathname + window.location.search, { locale })` with `pathname` from `@/i18n/navigation`, then the menu closes and focus returns to the button. The navigation hits the proxy at `/zh/...`, which updates the cookie. Reading `window.location.search` at choose time keeps the query string without `useSearchParams` (which would need a Suspense boundary under `cacheComponents`). Opening in a new tab by middle click is not supported, and the menu needs JavaScript; with JavaScript off, the visitor can still switch by changing the URL. At 360px the button shows only the globe and code (no text label), so it fits beside the wordmark.

**LocalTime behavior**: renders `formatLocalTime(value, { now: null, timeZone: "Asia/Kuala_Lumpur" })` on the server and first client render (identical output, so no hydration mismatch). In `useEffect` it reads `new Date()` (never `Date.now()` during render, which `cacheComponents` rejects in prerendered output) and sets state to `formatLocalTime(value, { now, timeZone: undefined })`. Rules: `now - value < 60s` or negative → `common.time.justNow`; under 7 days (`< 7 * 24h`) → `format.relativeTime(value, now)`; 7 days or more → `format.dateTime(value, { dateStyle: "medium" })`. `title` is `format.dateTime(value, { dateStyle: "medium", timeStyle: "short", timeZone })`. Only `className` is configurable; a feature that needs a date only or absolute variant adds a `mode` prop then.

**Translated text pattern** (what every later page follows):
- **Namespaces**: one top level key per feature, named in camelCase after the feature (`shell`, `shelf`, `gameDetail`, `addGame`, `auth`, `rating`, `comments`, ...), plus `common` for words used across features (Save, Cancel, Retry, generic errors, not found, the language menu). Never nest one feature's keys inside another.
- **Server components** call `getTranslations("<namespace>")` and pass finished strings to client components as props.
- **Client components** that need many messages or ICU formatting (a form with validation text) get an `IntlClientProvider` placed around that component only, passing `pick(messages, ["<namespace>"])`. Never pass the whole message file to the browser.
- **Plurals, numbers, and variables** use ICU message syntax in the JSON (`"{count, plural, one {# player} other {# players}}"`), never string concatenation in code.
- **Server Actions and Route Handlers** cannot read root params. They return typed error codes (for example `{ error: "nameTaken" }`, where the code is a key under that feature's `errors` namespace) and the component translates them. When an action truly needs translated text (for example an email in feature 6), the form sends the locale as a hidden field, the action checks it with `hasLocale`, and calls `getTranslations({ locale, namespace })`.
- **Metadata**: each page's `generateMetadata` uses `getTranslations` for its title and description and spreads `getAlternates("<its path>")`. Layouts never set `alternates`.
- **Content**: data from the database (names, descriptions, comments) is rendered as is (AC-10), with no `lang` attribute of its own, since the site cannot know which language a member typed. Only interface text goes through messages.
- **Authoring**: `/develop` writes both `en.json` and `zh.json` for every key it adds; a native reader checks the Chinese before the PR merges (AC-11).

**Lint rules** (`eslint.config.mjs`):
- `react/jsx-no-literals` set to `["error", { noStrings: false, ignoreProps: true, allowedStrings: ["·", "(", ")", "/", ":", ",", "+"] }]` for `src/app/**` and `src/components/**`, turned off for `src/components/ui/**`, `src/app/[locale]/design/**`, `src/components/design/**`, and `**/*.test.{ts,tsx}`.
- `no-restricted-imports` gains `paths` entries for `next/link` and for `next/navigation` with `importNames: ["redirect", "permanentRedirect", "usePathname", "useRouter"]`, each with the message "Import from @/i18n/navigation so links keep the language." (`notFound` and `useSearchParams` stay allowed.) A third `paths` entry blocks `NextIntlClientProvider` from `next-intl` ("Use IntlClientProvider so messages are always picked."), exempt only in `src/i18n/intl-client-provider.tsx`. ESLint replaces, not merges, a rule set again in a later block, so: the existing `src/**` block holds both the admin `patterns` and these `paths`, and the admin exemption block (`actions.ts`, `route.ts`, `proxy.ts`, `src/lib/supabase/**`, tests) re-declares the rule with only the `paths` part instead of `"off"`. `src/i18n/navigation.ts` needs no exemption (it imports `next-intl/navigation`). Confirm `src/components/ui/` has no `next/link` import after adding Dropdown Menu.

**Guard tests** (how AC-8's checks are proven): `src/i18n/lint-guards.test.ts` runs ESLint's Node API (`new ESLint({ overrideConfigFile: "eslint.config.mjs" })` with `lintText`) on small in memory snippets, each given a `filePath` inside `src/components/` or `src/app/`: raw JSX text fails, an allowed punctuation string passes, a `next/link` import fails, the same import under `src/components/design/` for the literal rule passes. `src/i18n/typed-keys.test-d.ts` (picked up by `tsc --noEmit` in `pnpm typecheck`) holds `// @ts-expect-error` above `t("shell.nope")`, so a key check that stops working fails the type check.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Redirect from an unprefixed path | target language | `NEXT_LOCALE` cookie if valid, else `Accept-Language` matched against `routing.locales`, else `defaultLocale` (next-intl proxy) |
| Redirect from an unprefixed path | target path and query | the request URL (path and search kept by the proxy) |
| Any page render | current locale | `locale()` from `next/root-params` (the `[locale]` segment), checked by `hasLocale` |
| `<html lang>`, hreflang keys, menu item `lang` | BCP 47 tag | `htmlLang[locale]` in `src/i18n/routing.ts` |
| Shell text, menu label, 404 text, metadata | translated strings | `messages/{locale}.json`, namespaces `shell` and `common` |
| Language menu items | display names `English`, `中文` | `common.language.names.en` and `.zh` (identical in both files, since each name is in its own script; a unit test asserts the exact values, because the parity test cannot catch a wrong one) |
| Language menu items | `lang` attribute | `htmlLang[locale]`, passed in `options` from the server |
| Language menu button | accessible name | `common.language.label` with `{name}` = current language name, built on the server |
| Language menu destination | path without prefix | `usePathname()` from `@/i18n/navigation` |
| Language menu destination | query string | `window.location.search` at choose time |
| Remembered choice | cookie value and lifetime | set by the proxy on any prefixed visit, attributes from `routing.localeCookie` |
| Missing Chinese key | fallback text | `deepMerge(en, zh)` in `request.ts` (English message underneath) |
| Missing key log (development) | list of keys | `missingKeys(en, zh)` computed once per process |
| `metadataBase`, hreflang and canonical | absolute URLs | `NEXT_PUBLIC_SITE_URL` (already in `.env.example`) plus `/{locale}` plus the page path passed to `getAlternates` (`/` becomes no suffix) |
| `LocalTime` first render | date text and title | `value` formatted in `Asia/Kuala_Lumpur` with the page locale (date only for text, date and time for title), locale and time zone from the layout's `IntlClientProvider` |
| `LocalTime` after load | visitor's zone | the browser's own `Intl` default time zone (`timeZone: undefined`) |
| `LocalTime` after load | current time | `new Date()` read in `useEffect` once at mount |
| `LocalTime` after load | just now, relative, or date | thresholds in *LocalTime behavior* (60 seconds, 7 days); units from `useFormatter().relativeTime` |
| `LocalTime` "just now" | words | `common.time.justNow` |
| `LocalTime` title after load | full date and time | `dateStyle: "medium", timeStyle: "short"` in the visitor's zone |
| Date format per language | pattern | the locale's own `Intl` default: English gives "Nov 1, 2026", Chinese gives "2026年11月1日" |

**Key invariants**:
- `messages/en.json` and `messages/zh.json` always have exactly the same keys and no empty strings (existing test).
- No server code reads cookies or headers to decide the language; the URL segment is the only source once inside a page.
- Every internal link and redirect in `src/` goes through `@/i18n/navigation` (lint enforced).
- No raw interface text in JSX outside the exempt paths (lint enforced).
- The full message file never ships to the browser; only picked namespaces do (enforced by the `IntlClientProvider` wrapper and its lint rule).
- No layout sets `alternates`; every page sets its own.
- User entered and fetched content is never passed through a translation function.

**Security model**: All pages stay public read (no change). The `NEXT_LOCALE` cookie holds only `en` or `zh`; it is a functional preference cookie (no personal data), not readable as anything else, and an invalid value is ignored by next-intl and replaced. The language segment is validated with `hasLocale` before any message import, so `/../` style values never reach a dynamic import. The query string is passed through unchanged, never interpreted. The proxy matcher excludes `/auth` and `/api` so feature 6's callback routes are not redirected.

**Configuration required**:
- No new environment variables. `NEXT_PUBLIC_SITE_URL` (already listed) now feeds hreflang and canonical URLs, so it must be set to the real domain on Vercel production and to the preview URL or left at the default on previews.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: a browser with `Accept-Language: zh-CN` opens `/`, lands on `/zh` with Chinese shell text and `lang="zh-Hans"`; it opens the menu, picks English, lands on `/en` on the same page; it closes and opens `/` again and lands on `/en`. Verifies **AC-2**, **AC-3**, **AC-4**, **AC-5**
- First match: `Accept-Language: en-US,en;q=0.9,zh;q=0.8` on `/` lands on `/en`; `zh-TW` lands on `/zh`. Verifies **AC-2**
- Redirect: `/design?x=1` with no cookie and `Accept-Language: en` goes to `/en/design?x=1` with status 307; `/zh/no-such-page` returns status 404 with Chinese not found text and `lang="zh-Hans"`; `/fr/x` ends in a 404. Verifies **AC-1**, **AC-5**
- Query kept: switching language on `/en/design?x=1` lands on `/zh/design?x=1`, the menu closes. Verifies **AC-3**
- Cookie: after switching, the `NEXT_LOCALE` cookie is `zh` with an expiry about one year out; on `/en`, opening the menu and closing it with Escape leaves the cookie at `en` (no prefetch). Verifies **AC-4**
- Build: `pnpm build` output shows `/en`, `/zh`, `/en/design`, `/zh/design` prerendered (static or partial). Verifies **AC-6**
- Metadata: the head of `/zh` contains canonical `{site}/zh` and alternates for `en`, `zh-Hans`, `x-default` pointing at `{site}/en`; `/zh/design` has its own canonical, not the home page's. Verifies **AC-7**
- Guards: `lint-guards.test.ts` (raw JSX text in `src/components` fails, `next/link` in `src/app` fails, direct `NextIntlClientProvider` fails) and the `@ts-expect-error` type test. Verifies **AC-8**
- Time: `formatLocalTime` cases: 30 seconds and a future value give "just now"; 3 hours gives "3 hours ago" in English and "3小时前" in Chinese; exactly 7 days gives the date; `now: null` with `2026-10-31T17:00:00Z` in UTC+8 gives Nov 1; an invalid date gives nothing. Playwright with `timezoneId: "Europe/London"` shows the London based text after load and no hydration warning in the console. Verifies **AC-9**
- Fallback: `deepMerge(en, zhWithAKeyRemoved)` in a Vitest case returns the English message for that key, and a plural message formats with its count. Verifies **AC-12**
- Content: a game named in English shows the same name on `/zh` (once feature 8 renders names; until then the tracer list on `/` shows `name` unchanged in both languages). Verifies **AC-10**

## Build plan

Tracer Bullet: first prove the thinnest thread through every layer (proxy, `[locale]` segment, root params, messages, shell, static build) on the real pages, then thicken it.

1. **Thin thread**: add `src/i18n/routing.ts`, `src/i18n/navigation.ts`, `src/i18n/intl-client-provider.tsx`, and `src/proxy.ts` (exact matcher above); move `layout.tsx` (with fonts, `viewport`, and the CSS import), `page.tsx`, and `design/` under `src/app/[locale]/` with `generateStaticParams` and `dynamicParams = false`; rewrite `src/i18n/request.ts` to read `next/root-params` (with the explicit locale override and `notFound` guard) and set the time zone; set `<html lang>` from `htmlLang`; switch `nav-link.tsx`, `bottom-tab-bar.tsx`, and `site-header.tsx` to `@/i18n/navigation`; add the `[...rest]` catch all and translated `not-found.tsx` with the `common.notFound` keys. Run `pnpm build` and confirm the four routes prerender; add the Suspense fallback around the nav only if the build asks for it. Satisfies **AC-1**, **AC-2**, **AC-5**, **AC-6**
2. **Language menu**: add Dropdown Menu through the shadcn CLI (`pnpm dlx shadcn@latest add dropdown-menu`), build `language-menu.tsx` as a radio group calling `router.replace`, build its `options` in `site-header.tsx`, place it in the header's right group, add `common.language` keys (with a unit test pinning the two names), set `localeCookie.maxAge` to one year. Satisfies **AC-3**, **AC-4**
3. **Text pattern guards**: add `src/i18n/global.d.ts` (typed keys) and `typed-keys.test-d.ts`; add `merge-messages.ts` (deep merge and missing keys, with Vitest cases) and use it in `request.ts`; add the `react/jsx-no-literals` rule and the restricted imports for navigation and `NextIntlClientProvider` (restructuring the existing `no-restricted-imports` blocks as described) with `lint-guards.test.ts`; fix anything the new rules flag. Satisfies **AC-8**, **AC-10**, **AC-12**
4. **Language twins in metadata**: add `src/i18n/alternates.ts` with a unit test, set `metadataBase` in the layout, call `getAlternates` from `/` and `/design` page metadata, mark the 404 `noindex`. Satisfies **AC-7**
5. **Local time**: add `formatLocalTime` with the Vitest cases above, the `LocalTime` component, `common.time.justNow`, and a sample in `/design`. Satisfies **AC-9**
6. **Review gate**: add `.github/pull_request_template.md` with the Chinese review checkbox. Satisfies **AC-11**
7. **Browser checks**: update `e2e/design-system.spec.ts` paths to `/en` and `/en/design`, and add `e2e/two-languages.spec.ts` covering the redirect by `Accept-Language` (Playwright `locale` option and an explicit header for the ranked cases), switching on the same page with the query kept, the cookie value, expiry, and the no prefetch check, `<html lang>`, the 404 status codes, the canonical on `/zh` and `/zh/design`, and `LocalTime` with a non UTC+8 `timezoneId`, at 360px and 1280px. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-7**, **AC-9**

## Consequences

**Positive**:
- Every page is prerendered once per language, so phones on mobile data get the same fast static page in either language.
- Search engines see both languages as separate, linked pages, which feature 20 builds on.
- Shared links keep their language.
- Later pages cannot drift: a missing translation, a wrong key, a hardcoded English word, or a link that drops the language fails a check before merge.

**Negative / tradeoffs**:
- Every URL carries `/en` or `/zh`, including the bare home page, which always costs one redirect on a first visit to `/`.
- Opening a shared `/zh` link updates the reader's cookie to Chinese (next-intl's behavior), so an English reader who opens a Chinese link will land in Chinese next time they visit `/` until they switch back.
- `next/root-params` cannot be used in Server Actions or Route Handlers, so actions return error codes instead of translated text; one extra mapping step per form.
- Times show a UTC+8 date first and may shift by one day for a visitor far from Malaysia when the browser refines it.
- The language menu needs JavaScript to open.
- `react/jsx-no-literals` will occasionally flag harmless punctuation (the allowed list grows as needed), and it does not catch English in props such as `aria-label` or `placeholder`.
- The language menu cannot be middle clicked into a new tab.
- Requests the proxy skips (`/api`, `/auth`, dotted paths) that match nothing get Next's plain, untranslated 404 page, outside the shell.
- A native reader review on every PR with Chinese changes adds a human step that can delay merges.

**Neutral**:
- Feature 6's `proxy.ts` work becomes "chain the Supabase session refresh after the intl handler", and its auth callback routes live outside `[locale]` (excluded from the matcher).
- The e2e suite's paths change from `/` to `/en`.
- English dates use the `en` pattern ("Nov 1, 2026"), not the day first British pattern.

## Follow-up

- [ ] Feature 6 (Member accounts): Supabase auth emails need a language. Decide there whether to pass the locale at sign up (hidden form field, `getTranslations({ locale })`) and whether to store a profile language column so the choice follows a member across devices.
- [ ] Feature 8 (Community shelf): sorting a mix of English and Chinese game names (alphabetical vs pinyin order) is a decision for that spec.
- [ ] Feature 20 (SEO & share previews): add the sitemap with both languages and Open Graph locale tags on top of `getAlternates`.
- [ ] Malay (deferred in the scope): adding a third locale means a third message file, one more `htmlLang` entry, and the menu already lists any number of options.
- [ ] `/sync`: record the translated text pattern (namespaces, props first, error codes from actions, `@/i18n/navigation`) in a nested `src/i18n/AGENTS.md`, and update the root `AGENTS.md` rule that says the locale is set in `src/i18n/request.ts`.
- [ ] next-intl still has no installed Agent Skill (also noted in specs 0001 and 0002); consider one if the pattern drifts.
