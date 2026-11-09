# Verify: Member accounts · spec 0010 · updated 2026-11-07

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

### Dice Galaxy scene (revised 2026-11-08, replaces the clay scene)

- [ ] Open `/en/sign-in`, `?mode=register` (before and after the invite code), `/en/forgot-password`, and a reset link's `/en/reset-password` → each shows the night sky with stars, a rocket, the ringed planet, the dice, and the heading on the sky above a white card resting on the cloud bank; the header and tab bar stay cream → AC-16
- [ ] Compare `/en/sign-in` at 390px and 1280px with design D on the [Sign-in Page Options canvas](https://claude.ai/artifact/DZFyiGJt9u5mP3sL34Rfnk) → same layout, no social buttons, field reads "Email" → AC-16
- [ ] Sign in mode reads "Welcome back" / "Sign in to continue your journey"; the footer "Don't have an account? Sign up" goes to create account and keeps `?next=/shelf`; create account shows "Already a member? Sign in" → AC-17
- [ ] Each field is a rounded rectangle with its icon inside; a screen reader (or the accessibility tree) names each input; submit an empty form and the errors show under the fields → AC-18
- [ ] Press the eye on the password field → text shows and the button is pressed; press again → hidden, typed value and caret kept → AC-18
- [ ] Network tab: the scene loads no images (the art is inline SVG); one Baloo 2 font file loads on the auth pages and not on `/en/shelf` → AC-19, AC-20
- [ ] `/zh/forgot-password` → Chinese text uses the device font, Latin text uses Baloo 2 → AC-20
- [ ] `/en/me` and `/en/privacy` still use the warm site look → AC-16
- [ ] At 360px no sideways scroll; below `lg` the small rocket flies above the heading; at 1280px the card is centered about 440px wide with the big rocket on its left, its trail landing in the clouds; at 1920px the sky reaches both window edges and the card still rests on the clouds → AC-21
- [ ] Watch both rockets (390px and 1280px) → rocket and trail bob together with no gap, a gold and orange flame flickers at the nozzle, puffs leave the flame's tip and fade down the trail, a soft light slides along the trail; no dots sit still on the trail → AC-21
- [ ] Turn on reduced motion in the OS → the planet, dice, rockets, and stars stand still, and no puffs or trail light show → AC-21
- [ ] Tab through the form → every control shows a ring and is at least 44px → AC-21

## Commands

- [ ] `pnpm test` → all green, including `src/lib/auth/*.test.ts` and the `actions`, `callback`, and `confirm` tests → AC-3, 4, 5, 6, 12, 13
- [ ] `pnpm typecheck` and `pnpm lint` → clean → AC-14
- [ ] `pnpm build` → `/en/shelf`, `/en`, and `/en/games/[id]` stay partial prerender → AC-1, AC-8
- [ ] `pnpm exec playwright test e2e/member-accounts.spec.ts` (set `E2E_MAILBOX=1` for the mail run) → green at 360 and 1280 → AC-1, 2, 8, 11, 12, 14
- [ ] `supabase test db` → existing pgTAP files stay green; `git diff --stat supabase/migrations` shows no change → AC-15
- [ ] `grep -rn "getSession\|user_metadata" src` → no hit that reads a role or status → AC-15
- [ ] `pnpm test src/lib/design/contrast.test.ts` → every `--auth-*` text pair passes AA → AC-20
- [ ] `grep -rnE "#[0-9a-fA-F]{6}|oklch\(" src/components/auth` → no hit (colors only from tokens) → AC-20

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

- AC-1 … covered by steps 1, build · AC-2 … 2 to 4, e2e · AC-3 … 5 to 7 · AC-4 … 8, 9, callback tests · AC-5 … 10, 11 · AC-6 … 6, 12 · AC-7 … 13 · AC-8 … 14, build · AC-9 … 15 to 17 · AC-10 … 18, 19 · AC-11 … 20 · AC-12 … 21, 22 · AC-13 … 7, pass cookie tests · AC-14 … 23, 24 · AC-15 … pgTAP and grep commands · AC-16 to AC-21 … Clay scene steps, contrast test, and the colour grep
