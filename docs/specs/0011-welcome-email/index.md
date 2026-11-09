# 0011. Welcome email on registration, sent through Resend SMTP

**Date**: 2026-11-08
**Status**: In Progress

## Summary

When someone registers with the invite code, the app sends them a welcome email in the language they signed up in (English or Chinese). Mail goes out through Resend (a hosted email service, free up to 100 emails a day) over SMTP (the standard mail sending protocol), from `mail@tabletop.ianhee.com`. The send runs after the member is already redirected, so a mail problem never blocks sign up, and a small table caps welcome emails at 80 a day. Locally and in tests the same code sends to Mailpit (a fake inbox the local Supabase stack already runs), so a Playwright test can register a dummy account, read the email, and delete the account with no manual steps. The same Resend account also fixes password reset emails on the hosted project.

## Requirements

**User stories**:
- As a new member, I want a welcome email after I register so that I know my account is ready and where to start.
- As a Chinese speaking member, I want that email in Chinese when I registered on the Chinese pages.
- As the engineer, I want sign up to keep working even when email fails, and a hard daily limit, so that a free plan can never surprise me.
- As the engineer, I want one command to prove registration and the welcome email work, cleaning up after itself, so that I never test it by hand.

**Acceptance criteria**:
- **AC-1**: After a successful registration, the new member receives exactly one welcome email at the address they registered with, sent from `EMAIL_FROM` (`Board Game Shelf <mail@tabletop.ianhee.com>` in production) with `Reply-To` set to `EMAIL_REPLY_TO`.
- **AC-2**: The email is in the locale of the page the member registered on (`/en/...` gives English, `/zh/...` gives Chinese). Subject and every line of text come from `messages/en.json` and `messages/zh.json` (namespace `WelcomeEmail`).
- **AC-3**: The email contains a greeting with the member's display name, a short list of what members can do (browse the shelf and see who owns what, add games you own, rate games, comment, keep a top 5, grow a wishlist), and a button linking to `{NEXT_PUBLIC_SITE_URL}/{locale}/shelf`. It is sent as HTML plus a plain text version. The display name is HTML escaped, so a name like `<b>x</b>` shows as text.
- **AC-4**: Sending never delays or blocks sign up. The member is signed in and redirected exactly as today; the email is sent after the response with `after()` from `next/server`.
- **AC-5**: If sending fails for any reason (SMTP error, timeout, Resend quota reached, missing config), the account and session are untouched, the `email_sends` row is set to `failed`, and the server logs one error line naming the member's user id, a fixed reason, and the error's `code` or `name` only (never `error.message`, which can contain the address), so no email address ever appears in a log.
- **AC-6**: At most `WELCOME_EMAIL_DAILY_CAP` (80 when unset or not a positive whole number) welcome emails go out per Malaysia calendar day (midnight to midnight, `Asia/Kuala_Lumpur`). Over the cap, no email is sent and the server logs a `capped` line with the user id. Concurrent sign ups cannot push the count past the cap.
- **AC-7**: A member receives at most one welcome email (the guard row lives 30 days, and a welcome is only ever triggered by a brand new account, so in practice one per account). A sign up that fails (bad invite pass, captcha, validation, email already registered, no session returned) sends none.
- **AC-8**: Rows in `email_sends` older than 30 days are deleted the next time a slot is claimed, and a member's rows are deleted when their account is deleted.
- **AC-9**: Only the server, using the secret key client, can read or write `email_sends` or run `claim_email_slot`. Anonymous visitors and signed in members are denied both.
- **AC-10**: On the hosted project, password reset emails are sent through Resend SMTP from `mail@tabletop.ianhee.com` and reach any member address (not only Supabase team members).
- **AC-11**: `pnpm test:e2e` (with the local stack running and `E2E_REGISTER=1`) registers a dummy `e2e...@example.com` account in English and in Chinese, finds each welcome email in Mailpit, checks its subject, display name, language, and shelf link, then deletes the account and the email. A global teardown deletes any leftover `e2e...@example.com` accounts from a crashed run, and refuses to run unless `NEXT_PUBLIC_SUPABASE_URL` points at `127.0.0.1` or `localhost`.
- **AC-12**: `tabletop.ianhee.com` is verified in Resend, with SPF and DKIM passing and a DMARC record on `ianhee.com`. A welcome email received in Gmail shows `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS` under "Show original".
- **AC-13**: The `/privacy` page says that the app sends account emails through Resend, which receives the member's email address and display name for that purpose.

## Decision

**Chosen option**: Resend as the provider, reached over SMTP with nodemailer in every environment, with a plain HTML string template, a send log table that enforces a daily cap, and Mailpit as the inbox for local runs and Playwright.

The welcome email is sent from the `signUpWithEmail` Server Action inside `after()`, through one code path whose only difference between production and tests is the `SMTP_URL` value.

**Implementation skills**: `email-best-practices` (`resend/email-best-practices`, `.agents/skills/email-best-practices/`, symlinked into `.claude/skills/`) · `supabase` (`supabase/agent-skills`, `.claude/skills/supabase/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.claude/skills/supabase-postgres-best-practices/`) · `playwright-cli` (`microsoft/playwright-cli`, `.claude/skills/playwright-cli/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch** (one new table, one function, one migration):

`public.email_sends`

| Column | Type | Rule |
|---|---|---|
| `id` | `bigint generated always as identity` | primary key |
| `user_id` | `uuid not null` | references `auth.users(id) on delete cascade` |
| `kind` | `text not null` | `check (kind in ('welcome'))`; widen the check when a new kind arrives |
| `sent_at` | `timestamptz not null default now()` | when the slot was claimed |
| `status` | `text not null default 'sent'` | `check (status in ('sent', 'failed'))` |

- Unique `(user_id, kind)`: the one welcome per member guard (AC-7).
- Index on `(kind, sent_at)`: the daily count and the 30 day delete.
- RLS enabled, no policies. `revoke all on public.email_sends from anon, authenticated`. This is a deliberate exception to "public read, member write": it is server bookkeeping, not member data.

`public.claim_email_slot(p_user_id uuid, p_kind text, p_cap int) returns text`

- `language plpgsql`, `security invoker`, `set search_path = ''`.
- Steps, in one transaction:
  1. `perform pg_advisory_xact_lock(hashtext('email_sends:' || p_kind));` so two sign ups at the same moment queue instead of both passing the count (AC-6).
  2. `delete from public.email_sends where sent_at < now() - interval '30 days';` (AC-8).
  3. If a row for `(p_user_id, p_kind)` already exists, return `'duplicate'` (checked before the cap, so a repeat is never reported as capped).
  4. Count rows for `p_kind` with `sent_at >= (date_trunc('day', now() at time zone 'Asia/Kuala_Lumpur') at time zone 'Asia/Kuala_Lumpur')`. If the count is `>= p_cap`, return `'capped'`. Failed rows count too (intended: a failed send used an attempt, and there are no retries).
  5. `insert ... on conflict (user_id, kind) do nothing`. Return `'claimed'` if a row was inserted, else `'duplicate'`.
- `revoke execute on function public.claim_email_slot from public, anon, authenticated; grant execute ... to service_role;` and an explicit `grant select, insert, update, delete on public.email_sends to service_role;` (`markEmailFailed` needs update) (AC-9).

**State transitions**: an `email_sends` row is born `sent` when its slot is claimed (read `sent` as "claimed and sending"), and moves to `failed` if the SMTP send then throws. No other transitions. A claim that returns `capped` or `duplicate` writes nothing.

**Interface surface** (no new routes or pages):

| Piece | Kind | Inputs | Output | Who calls it | Errors |
|---|---|---|---|---|---|
| `signUpWithEmail` (existing, `src/app/[locale]/sign-in/actions.ts`) | Server Action | form data (unchanged) | `FormState` or redirect (unchanged) | the register form | unchanged; after a session exists it reads `const userId = result.user?.id` and, only when `userId` is set, calls `after(() => sendWelcomeEmail(...))` just before `return goTo(locale, next)`. The sign in page exports `maxDuration = 30` so `after()` has room for three 10 s SMTP timeouts plus two database calls |
| `sendWelcomeEmail` (`src/lib/email/send-welcome.ts`, `server-only`) | function | `{ userId, email, displayName, locale }` | `Promise<void>`, never throws | the action, inside `after()` | catches everything, logs per AC-5 and AC-6 |
| `buildWelcomeEmail` (`src/lib/email/welcome.ts`, pure) | function | `{ displayName, locale, siteUrl, t }` (`t` is the `WelcomeEmail` translator) | `{ subject, html, text }` | `sendWelcomeEmail` | none |
| `escapeHtml` (`src/lib/email/escape.ts`, pure) | function | `string` | escaped `string` (`& < > " '`) | `buildWelcomeEmail` | none |
| `sendMail` (`src/lib/email/transport.ts`, `server-only`) | function | `{ to, subject, html, text }` | `Promise<void>` | `sendWelcomeEmail` | throws on SMTP error; nodemailer `connectionTimeout`, `greetingTimeout`, `socketTimeout` all 10 s; `ignoreTLS: true` when the `SMTP_URL` host is `127.0.0.1` or `localhost` (Mailpit); omits `replyTo` when `EMAIL_REPLY_TO` is unset |
| `claimEmailSlot`, `markEmailFailed` (`src/lib/supabase/email-sends.ts`) | functions using `createAdminClient()` | `(userId, kind, cap)` / `(userId, kind)` | `'claimed' \| 'capped' \| 'duplicate'` / `void` | `sendWelcomeEmail` | throw on a Supabase error (caught by the caller) |
| `readDailyCap` (`src/lib/email/cap.ts`, pure) | function | `string \| undefined` | positive integer, 80 by default | `sendWelcomeEmail` | none |

The admin client stays inside `src/lib/supabase/**`, as the ESLint rule requires.

`sendWelcomeEmail` flow: read the cap → `claimEmailSlot` → on `capped` or `duplicate`, log and stop → build the translator with next-intl's `createTranslator({ locale, messages, namespace: "WelcomeEmail" })`, importing `messages/en.json` or `messages/zh.json` directly (no request config needed inside `after()`, and tests use the real messages) → `buildWelcomeEmail` → `sendMail` → on any throw after the claim, `markEmailFailed` and log.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| `sendWelcomeEmail` | recipient address | `email.value` already validated in `signUpWithEmail` |
| `sendWelcomeEmail` | user id (log line, `email_sends.user_id`) | `result.user?.id` from `supabase.auth.signUp`; no id means no `after()` call |
| `buildWelcomeEmail` | display name in the greeting | `name.value` from `checkDisplayName` in the action, escaped by `escapeHtml` |
| `buildWelcomeEmail` | language of all text | `locale` from `localeOf(data)` in the action |
| `buildWelcomeEmail` | subject, greeting, list items, button label, sign off, footer | `messages/{en,zh}.json`, namespace `WelcomeEmail` |
| `buildWelcomeEmail` | shelf link | `siteUrl()` from `src/lib/auth/actions-support.ts` (trailing slash stripped) + `/${locale}/shelf`, passed in as `siteUrl` |
| `buildWelcomeEmail` | HTML `lang` | `en` for English, `zh-Hans` for Chinese |
| `buildWelcomeEmail` | site name in footer | `WelcomeEmail.siteName` message |
| `sendMail` | From header | `EMAIL_FROM` env |
| `sendMail` | Reply-To header | `EMAIL_REPLY_TO` env |
| `sendMail` | SMTP host, port, TLS, user, password | `SMTP_URL` env (one connection string) |
| `claim_email_slot` | the cap | `WELCOME_EMAIL_DAILY_CAP` env via `readDailyCap`, default 80 |
| `claim_email_slot` | "today" | `now()` in `Asia/Kuala_Lumpur`, fixed in the function |

**Message keys** (`WelcomeEmail`, same keys in both files, checked by `src/i18n/messages.test.ts`): `siteName`, `subject`, `preheader`, `greeting` (`"Welcome, {name}!"`), `ready`, `canDoHeading`, `canDoBrowse`, `canDoAddGames`, `canDoRate`, `canDoComment`, `canDoTopFive`, `canDoWishlist`, `button`, `signoff`, `footer` (`"You are receiving this because you created an account at {site}."`). Final wording is a build detail; the Chinese text needs the native reader check from the PR template.

**HTML template rules**: one table based layout, inline styles only, max width 560px, system font stack, the button as a styled `<a>` (no images, so nothing to host or block), `lang` set to `en` or `zh`, a hidden preheader span. Every interpolated value goes through `escapeHtml`. The plain text version has the same lines and the full shelf URL.

**Key invariants**:
- At most one welcome email per member within the 30 day retention window (unique `(user_id, kind)`); only a new account triggers one.
- The welcome count per Malaysia day never exceeds the cap (advisory lock plus count in one transaction).
- `sendWelcomeEmail` never throws and never runs before a session exists.
- No email address appears in any log line.
- The same transport code runs in production, local dev, and Playwright; only `SMTP_URL` changes.

**Security model**:
- `email_sends` and `claim_email_slot`: service role only (AC-9). Members cannot read who registered or when.
- `SMTP_URL` holds the Resend API key, so it is a server secret (no `NEXT_PUBLIC_` prefix). Use a Resend key with "sending access" only, limited to `tabletop.ianhee.com`.
- Abuse: someone could register with another person's address, and that person gets one welcome email. Accepted: the invite code and Turnstile already gate sign up, and the cap bounds the worst case at 80 a day.
- Header injection: nodemailer encodes headers, and the display name only appears in the body, escaped.
- Personal data sent to a processor (Resend): email address and display name. Disclosed on `/privacy` (AC-13).

**Configuration required**:
- `SMTP_URL`: nodemailer connection string. Production: `smtps://resend:<RESEND_API_KEY>@smtp.resend.com:465`. Local and e2e: `smtp://127.0.0.1:54325` (Mailpit, no auth).
- `EMAIL_FROM`: `Board Game Shelf <mail@tabletop.ianhee.com>` in production; any value locally (Mailpit accepts all).
- `EMAIL_REPLY_TO`: an inbox you read. Optional: unset means no Reply-To header.
- `WELCOME_EMAIL_DAILY_CAP`: optional, defaults to 80.
- `MAILPIT_URL`: e2e only, defaults to `http://127.0.0.1:54324` (the Mailpit web and API port; `54325` is its SMTP port).
- `supabase/config.toml`: under `[local_smtp]`, uncomment `smtp_port = 54325` so the app can send into Mailpit.
- Add all four to `.env.example` with a comment pointing at this spec. Set them in Vercel for Production and Preview.

**Critical test scenarios**:
- Happy path (Playwright): register at `/en/sign-in?mode=register`, land on `/en/shelf`, find exactly one Mailpit message to the address, subject is the English subject, HTML contains the display name and `/en/shelf`; then delete the user and the message. Verifies **AC-1**, **AC-3**, **AC-4**, **AC-11**.
- Chinese (Playwright): same at `/zh/...`, subject is the Chinese subject and the link is `/zh/shelf`. Verifies **AC-2**, **AC-11**.
- Escaping (Vitest): `buildWelcomeEmail` with name `<script>x</script>` produces `&lt;script&gt;` and no raw tag. Verifies **AC-3**.
- Failure (Vitest): `sendMail` rejects, so `markEmailFailed` is called, one log line has the user id and no `@`, and `sendWelcomeEmail` resolves. Verifies **AC-5**.
- Cap (pgTAP): with cap 2, two claims return `claimed`, the third `capped`; a row at 23:59 Malaysia time yesterday is not counted. Verifies **AC-6**.
- Duplicate (pgTAP + Vitest): a second claim for the same user returns `duplicate` and no mail is sent. Verifies **AC-7**.
- Failed sign up (Vitest, `actions.test.ts`): `signUp` returns an error, so `after` is not called. Verifies **AC-7**.
- Retention (pgTAP): a 31 day old row is gone after a claim; deleting the auth user removes their row. Verifies **AC-8**.
- Permission (pgTAP): as `anon` and as `authenticated`, selecting from `email_sends` and executing `claim_email_slot` both fail. Verifies **AC-9**.
- Sweeper (manual once): kill a run midway, run teardown, no `e2e...@example.com` users remain; with a hosted URL in env, teardown exits with an error and deletes nothing. Verifies **AC-11**.
- Log safety (Vitest): `sendMail` rejects with a message containing `someone@example.com`; the logged line contains no `@`. Verifies **AC-5**.

**Test setup details** (settled so the build does not guess):
- **Vitest, actions**: `vi.mock("next/server", () => ({ after: (f: () => unknown) => void f() }))` and mock `@/lib/email/send-welcome`. Change the existing success mock to `user: { id: "u1" }`. "No email on failed sign up" is `expect(sendWelcomeEmail).not.toHaveBeenCalled()`.
- **Vitest, email**: `buildWelcomeEmail` tests use a real `createTranslator` over the real message files; `sendWelcomeEmail` tests mock `src/lib/supabase/email-sends.ts` and `src/lib/email/transport.ts`.
- **Playwright env**: Playwright does not load `.env.local` (only the dev server does). At the top of `playwright.config.ts` and `e2e/global-teardown.ts`, call `process.loadEnvFile(".env.local")` inside try/catch (Node 22 built in).
- **Stale dev server**: `reuseExistingServer` keeps an already running `pnpm dev` with its old env. The Mailpit helper's timeout error says "no email arrived: restart pnpm dev after setting SMTP_URL in .env.local".
- **e2e admin client**: `e2e/support/admin.ts` creates its own client with `createClient` from `@supabase/supabase-js` and `SUPABASE_SECRET_KEY` (the app's `createAdminClient` is `server-only` and lint restricted). This adds a third allowed place for the secret key; `/sync` updates the AGENTS.md rule.
- **Test addresses**: `e2e${Date.now()}${locale}${projectName}@example.com` with the project name lowercased and stripped of non letters, so English and Chinese runs never collide. Each test captures the user id (via `listUsers` lookup right after registering, matched on the exact address) and deletes it in `afterEach`. The sweeper pages `auth.admin.listUsers({ perPage: 1000 })` and deletes every address matching `/^e2e\d+[a-z]+@example\.com$/`.
- **Mailpit API** (confirm against the installed version when building): search `GET {MAILPIT_URL}/api/v1/search?query=to:"<addr>"` returns `{ messages: [{ ID, Subject }] }`; read `GET /api/v1/message/{ID}` returns `HTML` and `Text`; delete `DELETE /api/v1/messages` with body `{ "IDs": [...] }`. Poll search every 500 ms for up to 10 s.
- **Chinese e2e labels**: the test imports `messages/zh.json` and uses its strings in `getByLabel` and `getByRole`, never hard coded Chinese.
- **pgTAP time**: `now()` is fixed per transaction and cannot be faked. Compute `d0 := date_trunc('day', now() at time zone 'Asia/Kuala_Lumpur') at time zone 'Asia/Kuala_Lumpur'`, insert rows as `postgres` with explicit `sent_at` of `d0 - interval '1 second'` (not counted), `d0` (counted), and `now() - interval '31 days'` (purged). Test users are raw `auth.users` inserts (as in existing pgTAP files). Claims run under `set local role service_role`; anon and authenticated checks use `throws_ok(..., '42501')`.

## Build plan

Tracer Bullet: first one thin English email from the action to Mailpit, proven by Playwright, then thicken it strand by strand, then the production setup.

1. Local mail path: uncomment `smtp_port = 54325` in `supabase/config.toml`, add `nodemailer` and `@types/nodemailer`, write `src/lib/email/transport.ts` (`sendMail`, timeouts, `server-only`), add the env vars to `.env.example` and `.env.local`. Satisfies **AC-1**.
2. Migration `supabase/migrations/<timestamp>_email_sends.sql`: table, unique, index, RLS, revokes, `claim_email_slot`, grants. pgTAP `supabase/tests/database/email_sends.test.sql` for cap, Malaysia day boundary, duplicate, 30 day delete, cascade, and denied roles. Run `supabase db reset` and `supabase test db`. Satisfies **AC-6**, **AC-7**, **AC-8**, **AC-9**.
3. Thin thread: `src/lib/supabase/email-sends.ts`, `src/lib/email/cap.ts`, a minimal English `buildWelcomeEmail` (greeting plus link), `sendWelcomeEmail`, and the `after()` call in `signUpWithEmail`. Satisfies **AC-1**, **AC-4**.
4. Playwright thread: `e2e/support/mailpit.ts` (search by recipient with polling up to 10 s, read a message, delete by recipient) and `e2e/support/admin.ts` (find a user by email, delete it), then extend the existing register test in `e2e/member-accounts.spec.ts` to check the email and clean up in `afterEach`. Satisfies **AC-1**, **AC-11**.
5. Thicken content: full `WelcomeEmail` messages in English and Chinese, the members can do list, the button, the plain text version, `escapeHtml`, the HTML template rules. Add the Chinese Playwright case. Vitest for `buildWelcomeEmail` and `escapeHtml`. Satisfies **AC-2**, **AC-3**, **AC-11**.
6. Failure and cap handling in `sendWelcomeEmail`: `capped` and `duplicate` logs, `markEmailFailed` on throw, logs with user id only. Vitest for `sendWelcomeEmail`, `readDailyCap`, and the `after` cases in `actions.test.ts` (mock `next/server` `after` to run its callback). Satisfies **AC-5**, **AC-6**, **AC-7**.
7. Sweeper: `e2e/global-teardown.ts`, registered in `playwright.config.ts`, with the localhost guard. Satisfies **AC-11**.
8. Privacy text: add a seventh bullet, message key `Privacy.resend`, in both languages, and update the privacy check in `e2e/member-accounts.spec.ts` from `toHaveCount(6)` to `toHaveCount(7)`. Satisfies **AC-13**.
9. Production email setup (engineer, dashboards): create the Resend account, add the domain `tabletop.ianhee.com`, copy the DNS records Resend shows (a DKIM TXT at `resend._domainkey.tabletop`, an MX and an SPF TXT at `send.tabletop`) into the Shinjiru DNS editor for `ianhee.com`, add `_dmarc.ianhee.com` TXT `v=DMARC1; p=none; rua=mailto:<your inbox>` if none exists, wait for "Verified", create a sending only API key, set the four env vars in Vercel, redeploy, register one real test account, and check Gmail "Show original". Satisfies **AC-1**, **AC-12**.
10. Hosted Supabase SMTP (engineer, dashboard): Authentication, SMTP Settings: enable custom SMTP, host `smtp.resend.com`, port 465, user `resend`, password the API key, sender `mail@tabletop.ianhee.com`, sender name `Board Game Shelf`. Raise the email rate limit under Authentication, Rate Limits (for example 30 an hour). Send one reset email to a non team address. Satisfies **AC-10**.

## Consequences

**Positive**:
- New members get a clear start point in their own language.
- Password reset works for real members on the hosted project for the first time.
- The full register, email, and cleanup path is tested by one command, with the exact production code.
- A runaway loop or abuse can send at most 80 welcome emails a day, and the free plan can never bill.

**Negative / tradeoffs**:
- SMTP from a serverless function opens a fresh connection each send (roughly a few hundred milliseconds). Hidden by `after()`, but it uses function time.
- A plain HTML string template means you handle email client quirks yourself (Outlook in particular), with no preview tool.
- The members can do list names features that are not built yet (rating, comments, top 5, wishlist). New members will look for them. Revisit the list when the email ships if that feels misleading.
- A sign up that skips your page and calls Supabase directly (the accepted soft gate risk from spec 0010) gets no welcome email.
- `after()` work is lost if the function instance dies mid send; the row stays `sent` with no email. Rare, and accepted at this tier.
- One more vendor (Resend) to keep an account and API key for, and four more env vars.

**Neutral**:
- `email_sends` is the first table with no policies at all; future server only bookkeeping can follow the same pattern.
- Resend's own daily window may not line up with Malaysia midnight; the 20 email margin under Resend's 100 covers that and leaves room for reset emails.
- Local Supabase auth mail already goes to Mailpit, so reset emails are also visible there during dev.

## Migration plan

**Strategy**: no migration needed for existing data. One additive migration (a new table and function); no existing table changes.
**Phases**:
1. Apply the migration with `supabase db push`, then deploy the code with the env vars set.
**Rollback**: revert the commit that adds the `after()` call; the table can stay (it is harmless) or be dropped in a follow up migration.
**Risks**: deploying the code before the migration makes every claim fail, which only logs errors (sign up still works, per AC-5).

## Follow-up

- [ ] Add a GitHub Actions job that runs `supabase start`, then `pnpm test:e2e` with `E2E_REGISTER=1` and the Cloudflare Turnstile test keys, so every PR proves registration and email (CI runs no Playwright or pgTAP yet).
- [ ] `email-best-practices` (`resend/email-best-practices`) conventions are not yet captured. They belong in a new `src/lib/email/AGENTS.md` (area specific, not root), with a one line pointer in root `AGENTS.md` `## Agent skills`.
- [ ] Optional MCP server: the official Resend MCP (`resend-mcp`, `resend/resend-mcp`) would let the agent check sends, domains, and quota in your Resend account. Add it yourself with `claude mcp add` and a `RESEND_API_KEY` once the account exists.
- [ ] Record in root `AGENTS.md` that the nodemailer and Mailpit skill searches found nothing credible, so they are not offered again.
- [ ] `/sync`: amend the root `AGENTS.md` secret key rule to allow `e2e/support/admin.ts` and `e2e/global-teardown.ts` (local stack only, guarded).
- [ ] Optional simplification: at a few sign ups a week, the advisory lock could be dropped (overshooting 80 by one or two is harmless under Resend's 100). Kept for now because AC-6 promises concurrent sign ups cannot pass the cap.
- [ ] Consider turning on email confirmation later (spec 0010 has it off); the welcome email does not prove an address is real.
- [ ] Watch Resend's free plan limits; if the community outgrows 100 a day, the paid plan or Amazon SES are the next steps, and only `SMTP_URL` changes.
