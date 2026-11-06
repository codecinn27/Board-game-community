# 0010. Member accounts: invite code gate, email sign in

**Date**: 2026-11-06
**Status**: In Progress
**Revised**: 2026-11-07, by the engineer: no email confirmation (so no SMTP for sign up) and no Google sign in. A valid invite code plus the register form signs the member in at once. Forgot password stays and uses Supabase's built in mail.

## Summary

Visitors can still browse everything without an account. To join, a person first enters the community's shared invite code, and only then can register with email and password; registering signs them in at once, with no confirmation email. Members can sign in, sign out, edit their display name, change or reset a password, and read a privacy note. The gate is "soft" (our pages enforce it, Supabase sign up stays open underneath), which is an accepted risk for a small friendly community. No database change is needed: the profile table, roles, and sign up trigger already exist.

## Requirements

**User stories**:
- As a visitor, I want to browse the shelf without an account so that I can see what the community owns.
- As an invited person, I want to enter the shared code and then register with email and password so that I become a member and am signed in straight away.
- As a member, I want to sign in and out, and land back where I was, so that signing in does not lose my place.
- As a member, I want to change my display name and password, and reset a forgotten password, so that I control my account.
- As a visitor or member, I want a plain privacy note in my language so that I know what is stored.

**Acceptance criteria** (the contract, each independently checkable):
- **AC-1**: A signed out visitor can open home, shelf, and a game sheet with no prompt to sign in, and those pages stay cached (they do not read cookies).
- **AC-2**: On `/sign-in`, the "Create account" mode first shows only an invite code field. A wrong code shows an error and no register form. A correct code reveals the register form.
- **AC-3**: Email registration takes display name (1 to 40 characters), email, password (8 or more characters), and a Turnstile check, and needs a valid invite pass. On success the member is signed in at once (no confirmation email), the profile exists with that display name, and they are sent to the page they came from. An email that already has an account shows an "already exists" message.
- **AC-4**: Removed (2026-11-07): there is no Google sign in. Every account is made through the invite code and the register form.
- **AC-5**: Email sign in works with Turnstile. Wrong credentials show one generic "email or password is wrong" message.
- **AC-6**: After sign in or registration the member lands on the page they came from (`next`). A `next` that is not a plain path on this site (another host, `//host`, a scheme) is ignored and sends them home.
- **AC-7**: Sign out on `/me` ends the session and the tabs return to the guest set.
- **AC-8**: The tabs are Home, Shelf, Sign in for guests and Home, Shelf, Me for members (Add stays off until feature 7). Only the nav reads the session; page content stays outside that read.
- **AC-9**: `/me` shows the display name and email, lets the member save a new display name (1 to 40 characters, trimmed), and shows the new name in owner lists after saving. Members can change their password. A `disabled` member sees a short notice that their account is read only.
- **AC-10**: "Forgot password" on `/sign-in` sends a reset email (same "check your email" answer whether or not the address exists). The link opens `/reset-password`, where a new password is set, and the member is signed in.
- **AC-11**: `/privacy` exists in English and Chinese, states what is stored and which services handle it, and is linked from the register form and from `/me`.
- **AC-12**: `/me` for a guest redirects to `/sign-in?next=/me`. `/sign-in`, `/forgot-password`, and `/reset-password` for a signed in member (except a recovery session) redirect away.
- **AC-13**: The invite code form, register, and sign in all require a passing Turnstile token. The code is compared in constant time. The invite pass is a signed, httpOnly cookie that expires in 30 minutes, and a tampered or expired one is rejected.
- **AC-14**: All text is in `messages/en.json` and `messages/zh.json`. Every page works at 360px with no sideways scroll, in light and dark.
- **AC-15**: No migration and no RLS change. A guest and a `disabled` member are still refused writes by the existing policies (existing pgTAP files stay green). The member role is never read from user editable `user_metadata`.

## Decision

**Chosen option**: Option 1: Soft gate, code first, email only (Google dropped 2026-11-07).

Every new account must come through the invite code page; our pages enforce it, and the residual API bypass is accepted and recorded here.

**Implementation skills**: `supabase` (`supabase/agent-skills`, `.claude/skills/supabase/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.claude/skills/supabase-postgres-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `shadcn` (`shadcn-ui/ui`, `.claude/skills/shadcn/`)

## Feature design

**Data model sketch**: no change. Uses existing `auth.users` and `public.profiles` (`id`, `display_name` 1 to 40, `avatar_path`, `role`, `status` active or disabled, `created_at`). The sign up trigger reads `raw_user_meta_data.full_name`; the email register action passes `options.data.full_name = displayName`. Profile update is already granted for `display_name` and `avatar_path` only, with a guard that blocks `role` and `status` changes by members.

**State transitions**: none stored. Session states in the UI: guest, invite pass held (cookie, 30 minutes), signed in, recovery session (after a reset link).

**Routes and pages** (`src/app/[locale]/`):
- `/sign-in`: modes Sign in and Create account (`?mode=register`); `?next=` and `?error=` supported.
- `/forgot-password`, `/reset-password`, `/me`, `/privacy`.
- `src/app/auth/confirm/route.ts` (the password reset link, type recovery); unprefixed, because the proxy matcher skips `auth`. It takes `locale` and `next` as query values.

**Server actions** (`actions.ts` beside each page; locale passed in as an argument, return plain data):
| Action | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `verifyInvite` | form post | code, turnstileToken, locale | sets pass cookie; ok or error | public | bad code, captcha failed |
| `signUpWithEmail` | form post | displayName, email, password, turnstileToken, next, locale | signed in, redirect to safe `next` | needs valid pass cookie | no pass, weak password, email taken, captcha failed |
| `signInWithEmail` | form post | email, password, turnstileToken, next, locale | redirect to safe `next` | public | invalid credentials, captcha failed |
| `requestPasswordReset` | form post | email, turnstileToken, locale | same "check email" state always | public | captcha failed |
| `updatePassword` | form post | password, confirm | ok | signed in or recovery session | weak password, mismatch |
| `updateDisplayName` | form post | displayName | ok; calls `revalidateGames()` | active member (RLS) | length, not allowed |
| `signOut` | form post | locale | redirect home | member | none |

**Route handlers**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/auth/confirm` | GET | `token_hash`, `type` (recovery), `next`, `locale` | session set, redirect to `/reset-password` | public | expired or used link, sent to `/sign-in?error=link` |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| `verifyInvite` | The correct code | env `INVITE_CODE`, compared as SHA-256 hashes with `timingSafeEqual` |
| `verifyInvite` | Pass cookie `invite_pass` | HMAC SHA-256 of an expiry timestamp using env `INVITE_COOKIE_SECRET`; expiry is now plus 30 minutes (constant in `src/lib/auth/invite-pass.ts`); httpOnly, `sameSite=lax`, `secure` in production, path `/` |
| `verifyInvite`, sign in, sign up, reset | Turnstile pass or fail | the widget token posted with the form. A token works once, so `verifyInvite` (no Supabase call) checks it with Cloudflare `siteverify` using env `TURNSTILE_SECRET_KEY`; sign in, sign up, and reset hand it to Supabase as `captchaToken`, which checks it with the same secret |
| `signUpWithEmail` | Display name saved on the profile | form field, sent as `options.data.full_name`, read by the existing trigger |
| All redirects | `next` | query value, passed through `safeNext()` (must start with one `/`, no `//`, no `\`, no scheme; otherwise `/`) |
| Locale in actions and handlers | `locale` | action argument or query value, validated with `hasLocale` (no `next/root-params` in actions) |
| Shell nav | Viewer kind | `getClaims()` on the cookie aware server client (guest if no verified claims) |
| `/me` | Display name, email, status | `profiles` row for `auth.uid()` plus the claim email |
| `/me` | Show the password section? | identities include provider `email` |
| Wrong credential message | Which error text | mapped from the Supabase error code to a translation key; always generic for credentials |

**Key invariants**:
- A session is checked with `getClaims()` or `getUser()`, never `getSession()`.
- No page under `[locale]` other than the nav and the auth pages reads cookies.
- The admin client is not used by this feature.
- `next` is validated at every use, not only where it is read.
- The credential and password reset messages never reveal whether an email has an account.
- Role and status are never taken from user editable metadata.

**Security model**: Public: browse, the invite page, sign in and register pages, privacy. Members (`profiles.status = active`): `/me`, display name update (own row only, RLS). Disabled members can sign in but every write is refused by RLS. The invite code lives only in env; the pass cookie cannot be forged without `INVITE_COOKIE_SECRET`. Personal data in scope: email, display name; no sensitive categories, no compliance regime beyond a plain privacy note. Bot defence: Turnstile on every form that creates load or accounts. Accepted risk: a direct call to the Supabase sign up API bypasses the invite code (Option 1). Rotating the code means changing `INVITE_CODE`; passes already issued expire within 30 minutes.

**Shell structure**: `AppShell` keeps `<main>` and children outside any session read. A new async `ShellNav` (header tabs and bottom bar) calls `getViewer()` inside `Suspense` with the guest tabs as the fallback. Guest and member both show three tabs, so the bottom padding does not shift.

**UI source**: screenshots the engineer will supply, to be placed in `docs/` (for example `docs/design/member-accounts/`) before the page tasks start. Until then, build to `docs/design.md` tokens and the shadcn form parts already in the repo. Required states: idle, submitting, field error, form error, "check your email" success, locked or expired link, disabled notice.

**Configuration required**:
- `INVITE_CODE`: the shared invite code (12 or more random characters).
- `INVITE_COOKIE_SECRET`: 32 or more random bytes for signing the pass cookie.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`: Cloudflare keys (local and browser tests use Cloudflare's published always pass test keys).
- Supabase Auth settings per project (see Follow-up): Site URL and redirect allowlist, captcha with the Turnstile secret, email confirmation off, minimum password length 8 (also in `supabase/config.toml`).
- Add all four env names to `.env.example`; read them through `requireEnv`.

**Critical test scenarios**:
- Happy path: wrong code is refused, right code reveals the form, email register signs the member in and lands on `next`, tabs show Me, sign out returns guest tabs, verifies **AC-2, 3, 6, 7, 8**.
- Failure case: expired or tampered pass cookie sent to `signUpWithEmail` is rejected; an email that already exists shows its own message; an expired reset link shows the link message, verifies **AC-3, 13**.
- Auth and permission: guest on `/me` is redirected with `next`; `safeNext` rejects `//evil.com`, `https://evil.com`, `/\evil`; a disabled member sees the notice and RLS still refuses writes, verifies **AC-6, 12, 15**.
- Cache: home, shelf, and game pages still prerender static after the shell change, verifies **AC-1, 8**.
- Privacy and language: `/privacy` renders in both languages, and message keys match, verifies **AC-11, 14**.

## Build plan

Tracer Bullet: the thinnest real thread first (email sign in through proxy, viewer, nav, and sign out), then registration and the gate, then the rest.

1. Config and env: `.env.example`, `supabase/config.toml` (site URL, redirect allowlist, password length 8, email confirmation off), `requireEnv` reads for the four new variables, satisfies **AC-15**.
2. Session plumbing: chain the `@supabase/ssr` session refresh in `src/proxy.ts` on the intl response (replace the placeholder comment, keep any `// YC:` notes); `getViewer()` in `src/lib/auth/viewer.ts`; `safeNext()` in `src/lib/auth/safe-next.ts` with tests, satisfies **AC-6, AC-8**.
3. Shell split: `ShellNav` under `Suspense` with guest fallback; flip `enabled` for `signIn` and `me` in `src/lib/app-shell/nav.ts` and update its tests; remove the `viewer="guest"` hardcode; check home, shelf, and game still prerender static, satisfies **AC-1, AC-8**.
4. Thread: `/sign-in` sign in mode with email and password, Turnstile component (`src/components/auth/turnstile.tsx`) and server verify (`src/lib/auth/turnstile.ts`), `signInWithEmail`, error mapping, `/me` shell with `signOut`, `/me` guard and `/sign-in` redirect for signed in members, satisfies **AC-5, AC-7, AC-12, AC-13**.
5. Invite gate: `src/lib/auth/invite-pass.ts` (sign, verify, expiry, constant time compare) with tests; `verifyInvite`; Create account mode step one, satisfies **AC-2, AC-13**.
6. Email registration: `signUpWithEmail` (pass required, signs the member in) and the register form; `/auth/confirm` serves the reset link, satisfies **AC-3, AC-6, AC-13**.
7. Removed (2026-11-07): Google sign in and the `/auth/callback` route are dropped.
8. Password: `/forgot-password`, `requestPasswordReset`, `/reset-password`, `updatePassword`, recovery redirect via `/auth/confirm`, satisfies **AC-10**.
9. Account page: display name form with `updateDisplayName` and `revalidateGames()`, password section only for email members, disabled notice, satisfies **AC-9**.
10. Privacy page: `/privacy` in both languages, links from the register form and `/me`, noindex on the other auth pages and `getAlternates` on `/privacy`, satisfies **AC-11, AC-14**.
11. Messages and design pass: `auth` and `privacy` namespaces in both files (same keys), `/design` previews of the form states if the engineer wants them, build to the supplied screenshots, satisfies **AC-14**.
12. Tests: Vitest for `safeNext`, invite pass, Turnstile verify (fetch mocked), error mapping, actions with mocked clients, component states; Playwright `e2e/member-accounts.spec.ts` at 360 and 1280, light and dark (the register test makes a real account, so it runs only with `E2E_REGISTER=1`), satisfies **AC-1 to AC-3, AC-5 to AC-14**.
13. Docs: nested `AGENTS.md` for `src/lib/auth/`, root `AGENTS.md` rules (via `/sync`), satisfies **AC-15**.

## Consequences

**Positive**:
- No migration, so no risk to the seed or the existing pgTAP files.
- Public pages stay cached; only the nav is dynamic.
- One flow for the invite code covers every new account, with no mail needed to join.

**Negative / tradeoffs**:
- A technical person can skip the code by calling the Supabase API directly; the damage is limited to what an active member can do, and an admin can disable the account.
- The nav tabs appear a moment after the page loads (guest fallback, then member tabs).
- A shared code cannot tell who invited whom, and leaking it means changing the env var and redeploying.
- No email check: a person can register with an email address they do not own. The invite code is the only gate, and an admin can disable the account.
- Chinese email templates and Chinese UI text need a native reader check.

**Neutral**:
- Four new env variables and several dashboard settings (Turnstile, redirects) must exist in local, staging, and production.
- `/me` is a minimal page now; the full profile page is feature 17.
- Self service account deletion is not in this feature; the privacy note points to the admin (feature 19 has deletion).

## Follow-up

- [ ] Supply the screenshots for sign in, create account, forgot and reset, `/me`, and `/privacy` before tasks 4 to 11 start.
- [ ] Set up outside services before inviting members: Turnstile widget keys and the secret in Supabase; email confirmation off in the hosted project; redirect allowlists for production and the Vercel preview pattern. Forgot password uses Supabase's built in mail, which is rate limited; add custom SMTP (Resend, SPF and DKIM) only if reset mails become a problem.
- [ ] Decide the contact line in the privacy note for deleting an account (an email address or "ask the group admin").
- [ ] Supabase email templates are one language per project: write them bilingual (English and Chinese in the same mail).
- [ ] Wire the "I own this" button for guests to `/sign-in?next=<game>` in feature 7.
- [ ] Add `src/lib/auth/AGENTS.md` and list it in root `AGENTS.md` (via `/sync`); the `supabase` skill conventions for auth are already listed in root.
- [ ] Revisit the soft gate (Option 2 or 3) if the invite code leaks or strangers appear.
