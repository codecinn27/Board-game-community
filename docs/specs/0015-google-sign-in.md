# 0015. Google sign in behind the invite code

**Date**: 2026-11-27
**Status**: In Progress
**Revised**: 2026-11-27, by the engineer: the auth pages change from the violet night sky to the "Cream Table" colors (cream to sand sky, terracotta button) so they match the rest of the site and sit well around Google's white button. Adds AC-14 and build task 9. Behaviour, actions, and security are unchanged.

## Summary

Members can sign in with Google as well as with email and password. A new person still needs the community invite code first. We use Google's own button and hand its proof of identity (an "ID token", a signed note from Google saying who you are) to Supabase, so Google's screen shows your site and nothing costs money. This brings back the Google option that spec 0010 removed on 2026-11-07.

## Context

> ⚠️ Premise note: this is optional. If nobody has struggled with passwords, building it later is a sound choice.

Joining today means typing a display name, username, email, and password. Some people in a community group would rather tap one button, and forgotten passwords create support work. Email addresses are also never checked today (spec 0010, accepted tradeoff), while Google hands over a checked one.

The forces: this is a free community project, so there must be no new bill. The invite code is the only thing keeping strangers out, so a second way in must not skip it. Accounts, profiles, roles, and row level security (database rules for who may read or write) already work and should not change. The app is bilingual and mobile first, and many visitors may arrive from links inside chat apps, where Google often refuses to work.

Not deciding costs little. Email sign in already works, so this is a convenience, not a gap.

## Requirements

**User stories**:
- As a member, I want to sign in with Google so that I need not remember a password.
- As an invited person, I want to join with Google after entering the invite code so that joining takes one tap.
- As the community owner, I want Google to respect the invite code so that strangers cannot join through our pages.

**Acceptance criteria**:
- **AC-1**: The Google button shows in sign in mode, and in create account mode only after a valid invite pass. It does not show on the invite code step. Email and password stay on both.
- **AC-2**: A person with a valid invite pass who uses Google for the first time gets an account, is signed in at once, lands on `next`, and the invite pass is used up.
- **AC-3**: A person with no account and no valid pass who uses Google is never signed in and the account just made is removed. They land on the invite code step with "enter the invite code first", and `next` is kept.
- **AC-4**: A returning Google member signs in with no invite code and lands on `next`.
- **AC-5**: A person who registered with email and password and then uses Google with the same email reaches the same account, with the same display name, games, and password.
- **AC-6**: A new Google member gets their Google name as display name (cut to 40 characters) and a generated username. With no name from Google, the display name is "Member", never the username. No extra form.
- **AC-7**: A new Google member gets the same welcome email as email sign up, once, in the language of the page, under the same daily cap. A returning member gets none.
- **AC-8**: A bad, expired, or replayed Google token is refused by our action with a translated error and no session.
- **AC-9**: Email and password always work. A short "use email if Google does not work" hint always shows with the button. If Google's script has not loaded after 8 seconds, the button area and divider are removed and the hint stays.
- **AC-10**: `/me` for a member with no password shows no password form and no username, keeps the display name note, and explains that they sign in with Google.
- **AC-11**: All new text is in `en.json` and `zh.json`, the Google button follows the page language, the privacy note mentions Google in both, and sign in pages have no sideways scroll at 360px.
- **AC-12**: With no `NEXT_PUBLIC_GOOGLE_CLIENT_ID` set, no Google button, hint, or script appears and the site behaves as today.
- **AC-13**: A public Terms of Service page exists at `/terms` in English and Chinese, linked from the register form line and the privacy note, so Google's consent screen can point to it.
- **AC-14**: Sign in, create account, forgot password, and reset password use the Cream Table colors (option A in [docs/design/sign-in/index.html](../design/sign-in/index.html)): a cream to warm sand sky, dark brown headings, cream clouds, a sage die and a terracotta die, terracotta links and icons, and a solid terracotta submit button. The scene's layout, art, motion, and font stay as spec 0010 describes. Colors stay `--auth-*` tokens and every text pair passes the contrast test.

## Options considered

### Option 1: Google's button with an ID token (chosen)

Google Identity Services (Google's sign in script) draws the button, returns an ID token to the page, and a Server Action passes it to Supabase `signInWithIdToken` (basis: Supabase "Sign in with Google" guide).

**Pros**:
- Google's screen names your own site at no cost.
- No redirect route, and the invite check runs on the server before the sign in is saved.

**Cons**:
- Loads a script from Google on sign in pages.
- The button's look is mostly Google's, so it will not match the auth scene's style exactly.

### Option 2: Redirect sign in with our own button

`signInWithOAuth` sends the person to Google and back through a callback route.

**Pros**:
- Our own button style, no Google script.

**Cons**:
- Google's screen shows a `supabase.co` address unless you pay for a custom domain.
- A callback route is needed, and the invite check happens after the person returns.

### Option 3: Do nothing

**Pros**:
- No setup, nothing new to maintain.

**Cons**:
- Passwords stay the only way in, and emails stay unchecked.

## Decision

**Chosen option**: Option 1: Google's button with an ID token.

Add Google as a second sign in method on the existing sign in page, gated by the existing invite pass, with no database migration.

**Implementation skills**: `supabase` (`supabase/agent-skills`, `.claude/skills/supabase/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`)

## Rationale

Free and trustworthy both matter here. Option 1 is the only one that shows your own site to people without a monthly fee. Doing the check inside one Server Action keeps the invite rule in the same place as email sign up. The cost is a Google script and less control over the button, which is acceptable for a small community site (basis: your answers on 2026-11-27; spec 0010 soft gate).

## Feature design

**Data model sketch**: no migration. Uses `auth.users`, `auth.identities`, and `public.profiles`. The existing sign up trigger reads `full_name` and generates `member_xxxxxxxxxxxx` when no username is given. One new value lives in `auth.users.app_metadata` (account data only the server can write): `invited: true`.

**Server actions** (`src/app/[locale]/sign-in/actions.ts`):

| Action | Inputs | Output | Auth | Key errors |
|---|---|---|---|---|
| `startGoogleSignIn` | none | the SHA-256 (lowercase hex) of a new nonce | public | none |
| `signInWithGoogle` | credential, next, locale | redirect, or `{ error }` | public | `google`, `rateLimit`, `generic`; no invite redirects |

- **Nonce** (one time value that ties a token to one attempt): `startGoogleSignIn` makes it with `crypto.randomBytes`, stores the raw value in an httpOnly, `sameSite=lax` cookie `google_nonce` (secure in production, 10 minutes), and returns only the hash. `signInWithGoogle` reads and deletes the cookie before anything else. The button asks for a new one on mount and after every attempt.
- No Turnstile (the bot check) on these actions.

**Order of `signInWithGoogle`** (the person is signed in only at the last step):

1. Empty credential or missing nonce cookie: `google`.
2. Exchange the token on a Supabase client that saves nothing (`@supabase/supabase-js`, `persistSession: false`).
3. Read the account fresh with the admin client (`getUserById`).
4. Decide with the table below.
5. Only on pass, write the session to the cookie client with `setSession`.

Any error in steps 2 to 5 means no session cookie is written.

| Fresh account facts | Result |
|---|---|
| Has an `email` identity, or `app_metadata.invited` | Member: save session, go to `next` |
| Neither, valid invite pass | New member: set `invited` first. If that fails, return `generic` and keep the pass. Then fix the display name if needed, delete the pass cookie, save session, send welcome mail, go to `next` |
| Neither, no valid pass | Refuse: sign out the unsaved session, read the account again, delete it only if it still has neither fact and was created in the last 5 minutes. Redirect to `/sign-in?mode=register&error=googleInvite&next=…` |

A failed delete still refuses; log the user id only. The rule reads stored facts, so a later try is refused again. The button ignores further Google callbacks while one is pending.

**Error mapping** (in `src/lib/auth/errors.ts`): status 429 is `rateLimit`; status 400, 401, or 403 from the token exchange is `google`; anything else is `generic`. `FormState.error` gains `google`.

**Button** (`src/components/auth/google-button.tsx`, client):
- Placement: under the email form's submit button after an "or" divider, above the footer line.
- Options: `text: continue_with`, `theme: outline`, `shape: pill`, `size: large`, popup mode, no One Tap (`prompt()`), no auto select. Width is the measured container width, at most 400.
- Language: `renderButton` `locale` (`zh` maps to `zh_CN`); check it follows a language switch.
- Initialize again on every mount, so mode, language, `next`, and nonce are never stale.
- States: a 44px placeholder while loading; disabled with a spinner after the callback; errors in the form notice style directly above the button; the 8 second give up of AC-9.

**Messages** (both files): `auth.google.or`, `auth.google.hint`, `auth.errors.google`, `auth.errors.googleInvite` (shown on the invite step; add to `NOTICES`), `privacy.handlers.google` (add `google` to `HANDLERS`). Reword `auth.errors.emailTaken` to mention signing in with Google, and `auth.me.googleNote` to cover AC-10.

**Value sourcing**:

| Action | Value | Source |
|---|---|---|
| Button | client ID | env `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, passed from the server page |
| Button | language | page locale |
| Button | nonce hash | `startGoogleSignIn` |
| `signInWithGoogle` | credential | Google's callback |
| `signInWithGoogle` | raw nonce | `google_nonce` cookie |
| `signInWithGoogle` | `next`, `locale` | page props, checked by `safeNext()` and `hasLocale` |
| `signInWithGoogle` | member or new | `getUserById`: `identities`, `app_metadata.invited` |
| `signInWithGoogle` | invite pass | `invite_pass` cookie checked with `verifyInvitePass` |
| `signInWithGoogle` | account age | `getUserById`: `created_at` |
| Profile | display name | trigger from `full_name`; if missing, the action sets Google `name`, else "Member" (cut to 40) |
| Profile | username | generated by the trigger |
| Welcome mail | user id, email | the account read; no email means no mail |
| Welcome mail | locale, site URL | action locale, `siteUrl()` |
| Welcome mail | display name | `profiles.display_name`, read with the admin client inside `after()`; if the read fails, the Google name, else "Member" |
| `/me` | show password and username | identities include `email` |

**Key invariants**:
- Our pages never save a session for a Google account without an `email` identity, `invited`, or a valid pass.
- Never delete a user who has an `email` identity or `invited`.
- `invited` is written only with the admin client, never from `user_metadata`.
- Never log the token, nonce, email, or name.
- `next` goes through `safeNext()`.
- The admin client stays in `actions.ts` or `src/lib/supabase/**`.

**Security model**: Public: the button and both actions. Roles and row level security are unchanged. Supabase checks the token's signature, audience (our client ID), expiry, and nonce. Linking by email is automatic in Supabase (basis: Supabase Identity Linking guide).

Accepted risks:
- **Direct calls skip the gate.** Someone calling Supabase directly with a Google token gets an account that can write under row level security, with no invite code and probably no bot check. This is the soft gate of spec 0010, now with a second door.
- **Shared account by email** (accepted by the engineer on 2026-11-27). Email sign up never checks addresses, and a direct call needs no invite code. Someone can register with another person's email first. If the real owner later uses Google, they join that account, and the first person keeps the password, username, and any live session. Admin remedy: in the Supabase dashboard, delete the account, or reset its password and revoke its sessions. Disabling alone would lock out the real owner.

Personal data: Google gives name, email, and picture link. We use name and email; the picture link stays in Supabase account data and is not shown.

**Configuration required**:
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google web client ID (public). Optional; empty turns the feature off. Add to `.env.example`. In Vercel set it for Production only (not Preview), then redeploy.
- Google Cloud: a project, consent screen (app name, support email, privacy link to your live `/en/privacy`), scopes `openid`, `email`, `profile` only, and a Web client with authorized JavaScript origins `http://localhost`, `http://localhost:3000`, and your live address (the Production `NEXT_PUBLIC_SITE_URL`). Publish the app (not "testing").
- Supabase (hosted): enable the Google provider with that client ID.
- Local: `[auth.external.google]` in `supabase/config.toml` with `client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"`; `supabase start` must still work when it is unset. Keep the nonce check on. The file's own comment says local Google sign in needs it skipped: if so, skip it locally only and check the nonce on the hosted project.
- No custom domain and no paid plan needed.

**Critical test scenarios**:
- Happy path: pass held, new Google user is signed in, `invited` set, one welcome mail, lands on `next`, verifies **AC-2, 6, 7**.
- Gate: no pass, new user gets no cookie and is deleted; an older unmarked user is refused but kept; a failed `invited` write or account read saves no session, verifies **AC-3**.
- Returning and linked: marked user and email identity user pass with no pass and no mail, verifies **AC-4, 5, 7**.
- Failure: missing nonce cookie, second use of a token, Supabase rejects the token, verifies **AC-8**.
- Page: Playwright with a dummy client ID and the Google request blocked shows the hint and no gap; Vitest covers the unset variable, verifies **AC-9, 12**.
- Real Google by hand (cannot be automated): new, returning, and same email linking on the hosted site, in English and Chinese, at 360px, verifies **AC-1, 5, 10, 11**.

## Build plan

Tracer Bullet (one real thread through every layer, then thicken).

1. Setup: Google Cloud client, Supabase provider, `config.toml`, `.env.example`, satisfies **AC-12**.
2. Thread: button, both actions, returning members only, proven with real Google on localhost. Check three things, and return to `/architect` if one fails: Supabase asks for no captcha token here; the nonce check works; what identities a Google member has after "forgot password" (if they can sign in with a password but have no `email` identity, AC-10 and the gate need a decision). Satisfies **AC-4, 8, 10, 12**.
3. Invite gate: unsaved exchange, fresh read, three outcomes, admin mark and delete, redirect notice, tests, satisfies **AC-2, 3, 5**.
4. New member: check the trigger receives `full_name`, name fallback, welcome mail, satisfies **AC-6, 7**.
5. Page states: placement, divider, hint, timeout, `/me` username hidden with the display name note kept, satisfies **AC-1, 9, 10**.
6. Words and privacy: the message keys above and the privacy bullet, satisfies **AC-11**.
7. Checks: Vitest, Playwright, hand test list, `src/lib/auth/AGENTS.md`, satisfies **AC-1 to AC-12**.
8. Terms of Service page, both languages, links and a browser check (built 2026-11-27, ahead of the rest), satisfies **AC-13**.
9. Cream Table colors: new `--auth-*` values in `globals.css`, `--auth-star` and `--auth-die*` tokens, `--auth-magenta` renamed `--auth-fin`, the `/design` preview, and `docs/design.md` (built 2026-11-27), satisfies **AC-14**.

## Consequences

**Positive**:
- One tap joining and sign in, with a checked email for new Google members.
- No migration, no new monthly cost.

**Negative / tradeoffs**:
- One more outside service and setup to look after.
- Google often refuses to work inside chat app browsers (WhatsApp, WeChat, Instagram) and is blocked in mainland China, so email sign in must stay.
- The button does not work on Vercel preview addresses or a phone using your computer's number address, because Google needs each address listed.
- A Google only member has no username sign in.
- The two accepted risks above.
- Spec 0010 AC-4 and AC-16 ("no social sign in buttons") no longer hold.

**Neutral**:
- Forgot password also works for a Google only member and can add a password to their account.

## Follow-up

- [ ] Create the Google Cloud project and client (you, before build task 2).
- [ ] Optional: submit Google brand verification so the screen shows your app name and logo.
- [ ] Native reader check of the new Chinese text, including the Terms of Service.
- [ ] Read the Terms of Service yourself. It is a plain starting draft, not legal advice.
- [ ] After deploy, add `https://tabletop.ianhee.com/en/terms` to the Google branding page.

## References

**Project sources**:
- Spec 0010 (member accounts, soft gate) and spec 0011 (welcome email)
- `src/lib/auth/AGENTS.md`, `src/app/[locale]/sign-in/actions.ts`, `supabase/migrations/20261109090000_username.sql`

**Practices & standards**:
- OpenID Connect ID token with a server issued nonce

**Links**:
- Supabase, Sign in with Google: https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- Supabase, Identity Linking: https://supabase.com/docs/guides/auth/auth-identity-linking
- Supabase pricing: https://supabase.com/pricing
- Google verification requirements: https://support.google.com/cloud/answer/13464321


## Own setup (own notes)
1. Google console
2. create new project
3. sidebar-> client-> get started-> use personal email->external 
4. update branding:

Home page: https://tabletop.ianhee.com
Privacy policy: https://tabletop.ianhee.com/en/privacy
Authorised domain: ianhee.com (without the tabletop)
Application terms of services: https://tabletop.ianhee.com/en/terms

5. Create clients

Application type: Web application
Name: Board Game Shelf web
Authorised JavaScript origins:
https://tabletop.ianhee.com
http://localhost:3000
http://localhost
Authorised redirect URIs: leave empty

6. setup supabase to link to google console

Supabase-> Authentication-> Sign in/provider -> Google

1. Turn it on, paste the ID into Client IDs
2. keep "Skip nonce checks" off, and save. 
3. allow users without an email : "OFF"

If it insists on a client secret, paste the one from Google there, 

callback url (for OAuth): https://ffyqahbrutreghgzntwy.supabase.co/auth/v1/callback


7. Save ID into the computer
.env.local
```json
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id
```
you-client-id both the same one use from the client id from google auth platform clients


It's the same Client ID as NEXT_PUBLIC_GOOGLE_CLIENT_ID, so you paste one value into both lines.

To find it, go to Google Cloud, switch to your Board Game Shelf project (not "My First Project"), open Google Auth Platform, then Clients, and click the copy icon next to your client. It looks like 123456789-abc123.apps.googleusercontent.com.


NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
There are two names because two things read it: the first is for your website's button, and the second is for the local Supabase on your computer. Neither does anything until the code is built.