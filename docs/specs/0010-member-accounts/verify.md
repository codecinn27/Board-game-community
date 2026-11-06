# Verify: Member accounts · spec 0010 · updated 2026-11-06

_Steps derived from spec 0010 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Setup: `supabase start` (Docker Desktop on), `.env.local` has the four new variables (local Cloudflare test keys), `pnpm dev`. For the mail steps, read mail at http://127.0.0.1:54324 (Inbucket).

## UI / manual

- [ ] Signed out, open `/en`, `/en/shelf`, and a game card → pages and the sheet open with no sign in prompt; the build output still shows them as partial prerender (no cookie read) → AC-1
- [ ] Enter a wrong code → "That code is not right" and still no register form → AC-2
- [ ] Register with a 41 character name, a bad email, a 7 character password → each field shows its own error and nothing is sent → AC-3
- [ ] Register with name "Mei", a new email, a good password → you are signed in at once and land on the page you came from (`next`); `/me` shows "Mei"; no mail is sent → AC-3, AC-6
- [ ] Wait 31 minutes (or edit the cookie value) and submit the register form again → "Enter the invite code before you register" → AC-13
- [ ] Sign in with a wrong password and with an unknown email → both show the same "The email or password is wrong." → AC-5
- [ ] Open `/en/sign-in?next=//evil.com`, `?next=https://evil.com`, `?next=/%5Cevil.com`, sign in → lands on `/en`, never off site; with `?next=/shelf` lands on `/en/shelf` → AC-6
- [ ] On `/me` press Sign out → home, tabs are Home, Shelf, Sign in → AC-7
- [ ] Signed out, tabs read Home, Shelf, Sign in; signed in, Home, Shelf, Me; no Add tab either way; the bottom bar height does not jump → AC-8
- [ ] On `/me` save a new display name with spaces around it → saved trimmed; the name shows in an owner list on a game sheet after the save (not after 5 minutes) → AC-9
- [ ] Set a profile to `disabled` in the dashboard, open `/me` → read only notice, no edit forms → AC-9
- [ ] On `/sign-in` press Forgot password, submit a real email and an unknown email → both show the same "Check your email" text → AC-10
- [ ] Open the reset mail link → `/reset-password`; set a new password; you land signed in on home and can sign in with the new password → AC-10
- [ ] Open `/en/privacy` and `/zh/privacy` → both render; linked from the register form and from `/me` → AC-11
- [ ] Signed out, open `/en/me` → redirected to `/en/sign-in?next=/me` → AC-12
- [ ] Signed in, open `/en/sign-in` and `/en/forgot-password` → redirected away; open `/en/reset-password` signed in (not from a link) → redirected home → AC-12
- [ ] Open the sign in, register, forgot, reset, `/me`, and privacy pages at 360px and 1280px, in English and Chinese → no sideways scroll → AC-14
- [ ] Have a Chinese reader check `messages/zh.json` (`auth`, `privacy`) and the Chinese half of the reset mail → AC-14

## Commands

- [ ] `pnpm test` → all green, including `src/lib/auth/*.test.ts` and the `actions`, `callback`, and `confirm` tests → AC-3, 4, 5, 6, 12, 13
- [ ] `pnpm typecheck` and `pnpm lint` → clean → AC-14
- [ ] `pnpm build` → `/en/shelf`, `/en`, and `/en/games/[id]` stay partial prerender → AC-1, AC-8
- [ ] `pnpm exec playwright test e2e/member-accounts.spec.ts` (set `E2E_MAILBOX=1` for the mail run) → green at 360 and 1280 → AC-1, 2, 8, 11, 12, 14
- [ ] `supabase test db` → existing pgTAP files stay green; `git diff --stat supabase/migrations` shows no change → AC-15
- [ ] `grep -rn "getSession\|user_metadata" src` → no hit that reads a role or status → AC-15

## Value sourcing (one step per row of the spec table)

- [ ] `verifyInvite` code: change `INVITE_CODE`, restart, old code is refused and the new one works → source is the env var
- [ ] Pass cookie: in dev tools the `invite_pass` cookie is httpOnly, `SameSite=Lax`, expires in 30 minutes; change one character of it and the register form is refused → env `INVITE_COOKIE_SECRET`, 30 minute constant
- [ ] Turnstile: with a wrong `TURNSTILE_SECRET_KEY` (Cloudflare "always fail" `2x0000000000000000000000000000000AA`) the invite form says the security check did not pass; sign in and register fail the same way through Supabase → widget token and secret
- [ ] Display name on the profile: register as "小明", confirm, `select display_name from profiles` shows "小明" → form field through `options.data.full_name`
- [ ] `locale` in actions and routes: a form posted with `locale=xx` falls back to English → `hasLocale`
- [ ] Nav viewer kind: sign in and out and watch the tab set follow the session, with the guest tabs first on a slow load → `getClaims()`
- [ ] `/me` name, email, status: edit `status` in the dashboard and reload → the notice follows the database → `profiles` row plus claim email
- [ ] Credential message: wrong password, unknown email, and a rate limit show different keys only where intended (credentials always generic) → error code mapping

## Acceptance-criteria coverage

- AC-1 … covered by steps 1, build · AC-2 … 2 to 4, e2e · AC-3 … 5 to 7 · AC-4 … 8, 9, callback tests · AC-5 … 10, 11 · AC-6 … 6, 12 · AC-7 … 13 · AC-8 … 14, build · AC-9 … 15 to 17 · AC-10 … 18, 19 · AC-11 … 20 · AC-12 … 21, 22 · AC-13 … 7, pass cookie tests · AC-14 … 23, 24 · AC-15 … pgTAP and grep commands
