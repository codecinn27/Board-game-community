# 0005. Two languages: rationale

Decision record for [index.md](index.md). `/develop` builds from `index.md` and skips this file.

## Context

The site serves one local board game community where some members read English first and some read Chinese first. The scope (feature 5) asks for a language switch, a remembered choice, and a text pattern set before real pages exist, so every later page is built in both languages from the start. Game names and descriptions stay as fetched or typed.

Several existing decisions constrain the answer. Spec 0001 chose Next.js 16 with next-intl and promised search engine friendly public pages in both languages, and named one `proxy.ts` that will chain next-intl and the Supabase session refresh. Spec 0004 wired next-intl with the locale fixed to English and no cookies or headers read, because `cacheComponents` is on: any server read of cookies or headers turns the root layout into per request work and needs a Suspense boundary. Feature 20 (SEO) needs each public page indexable in both languages with share previews.

The installed next-intl (4.14.9) marks its header based locale lookup (`requestLocale`, `setRequestLocale`) as deprecated and points to Next's `next/root-params`, which lets any Server Component read a root URL segment such as `[locale]` without touching headers. Root params are not available in Server Actions or Route Handlers.

Not deciding now means each page from feature 6 onward invents its own way to get text, links that drop the language creep in, and moving every page under a new URL segment later touches every route, test, and shared link.

## Options considered

### Option 1: Language prefix on every URL (`localePrefix: "always"`), locale from `next/root-params`

Every page moves under `app/[locale]/`. The proxy redirects unprefixed requests to `/en` or `/zh` (cookie first, then browser language) and sets the cookie. Server code reads the locale from the URL segment through root params.

**Pros**:
- Each language prerenders as its own static page under `cacheComponents`; no request data is read.
- Search engines index both languages; hreflang is straightforward.
- Shared links carry their language.
- Symmetric: English and Chinese are handled the same way, so a third language (Malay) is one more entry.

**Cons**:
- Every URL has a prefix; the bare `/` always redirects.
- Every existing route and test path moves once.
- Root params do not reach Server Actions or Route Handlers, so those need the error code pattern.

### Option 2: English without a prefix, Chinese under `/zh` (`localePrefix: "as-needed"`)

English pages keep plain URLs (`/shelf`), Chinese pages get `/zh/shelf`. The proxy rewrites unprefixed paths to the English segment internally.

**Pros**:
- Cleaner English URLs, and no redirect for English visitors on `/`.
- Still static per language and indexable.

**Cons**:
- The two languages behave differently: a Chinese reader with the cookie set who opens a plain English link is redirected, an English reader is not; harder to reason about and test.
- `/` means "English" to search engines and "your language" to returning visitors, which muddles canonical URLs.
- More proxy rewriting, and the cookie redirect on plain URLs surprises people who shared an English link.

### Option 3: No language in the URL, cookie only (`localePrefix: "never"`)

One URL per page; the language comes from the cookie or browser language on every request.

**Pros**:
- Simplest URLs; no route move.
- Closest to how spec 0004 left things.

**Cons**:
- Every page reads a cookie, so nothing prerenders under `cacheComponents`; every visit is server work and the shell needs a Suspense boundary.
- Search engines see only one language (usually English), which breaks feature 20's goal.
- A shared link opens in the reader's language, not the sender's.

### Option 4: Separate domains or subdomains per language

`zh.example.com` and `example.com`.

**Pros**:
- Clean paths in both languages; strong language signal to search engines.

**Cons**:
- A second domain and Vercel and Supabase auth redirect configuration for each, for a small community site.
- Cookies do not cross domains, so the remembered choice and the future Supabase session need extra care.

## Rationale

The force that decides this is `cacheComponents` plus feature 20. Spec 0004 kept the shell prerenderable on purpose, and the only way to know the language without reading request data is to put it in the URL. Option 3 gives that up entirely and hides the Chinese site from search engines. Option 4 solves the same problem as Option 1 with domain and auth overhead a small community site does not need. Between Options 1 and 2, the symmetric prefix costs one redirect on `/` and buys simpler proxy behavior, unambiguous canonical URLs, and an easy third language later. You chose Option 1.

Reading the locale through `next/root-params` rather than `setRequestLocale` follows next-intl 4.14's own deprecation note, and it removes the "call `setRequestLocale` in every page and layout" chore that is easy to forget. The cost is that Server Actions and Route Handlers cannot see the locale, which is why the pattern has actions return error codes and lets components translate them; that also keeps translation in one place.

The remaining choices follow your answers: browser language on a first visit (most people land right with zero taps), a one year cookie only (no database change, works for guests; a profile column is feature 6's call), a globe plus code menu built on shadcn's Dropdown Menu (fits a 360px header, accessible, ready for Malay), and times in each visitor's own zone. Because the server cannot know a visitor's zone, `LocalTime` renders a UTC+8 date first (correct for almost every member, readable without JavaScript, and identical on server and first client render so hydration does not complain) and refines after load.

Decisions I made for you, with the runner up:
- **hreflang from page metadata only, next-intl's `Link` header off.** One source that `getAlternates` controls and feature 20 extends, and it uses `zh-Hans` consistently. Runner up: keep the automatic header too, which covers every page for free but uses the bare `zh` tag and duplicates the signal.
- **Missing Chinese key falls back to English by merging English under Chinese at load time.** A raw key like `shell.tabs.add` on screen is worse than English, and merging keeps plural and variable handling intact, which a `getMessageFallback` string cannot. The parity test should make this rare. Runner up: show the key, which is louder in development but leaks to users.
- **Root provider passes locale and time zone with an explicit empty message set, through a wrapper.** `LocalTime` and the menu need the locale on the client. next-intl 4 ships the whole message file when `messages` is left out, so a wrapper with a required `messages` prop plus a lint rule makes the safe choice the only choice. Runner up: no root provider and a `locale` prop everywhere, which spreads plumbing through every client component.
- **Menu items are radio items that call `router.replace`, not links.** A link's address is fixed at render, so a click handler cannot add the query string to it, and links in an open menu can be prefetched, which would let the proxy flip the cookie. Runner up: real links (middle click works) built with `useSearchParams` inside Suspense, which adds a fallback state to the header.
- **First visit matching follows the browser's ranking.** next-intl's standard best match respects `q` weights, which is what the browser's own setting means. Traditional Chinese readers get Simplified, the only Chinese offered. Runner up: "any Chinese anywhere in the header wins", which needs a custom matcher and overrides people who rank English first.
- **No global 404 for paths outside the language segment.** Next's `global-not-found` is still experimental; the only such paths are API, auth, and file requests, which people rarely see. Runner up: enable the experimental flag for a translated catch all page.
- **hreflang set per page, never in a layout.** A layout default would hand every page that forgets its own call the home page's canonical, a silent SEO bug.
- **English formatting uses the plain `en` locale ("Nov 1, 2026").** The month is spelled out, so it is unambiguous, and it avoids a separate formatting locale. Runner up: `en-GB` or `en-MY` for "1 Nov 2026", which needs a formatting locale mapped apart from the URL locale.
- **`react/jsx-no-literals` from the React plugin already in `eslint-config-next`.** No new dependency. Runner up: `eslint-plugin-i18next`'s `no-literal-string`, more configurable but a new package.

## Design conversation record

- URL shape: prefix every URL. Script: Simplified Chinese, `lang="zh-Hans"`, URL segment `/zh`.
- First visit: follow browser language. Remember: browser cookie only.
- Switch: menu with both languages in the top header; button is globe plus current code; shadcn Dropdown Menu.
- Times: each visitor's zone; server shows a UTC+8 date first; relative under 7 days, date after.
- Messages: one namespace per feature plus `common`; keys typed from `en.json`; ESLint `jsx-no-literals`; props first, provider only where needed; all links through next-intl navigation helpers.
- hreflang: basic tags now. Translation: AI drafts, a native reader checks before merge, tracked by a PR checklist box.
- References: none.
