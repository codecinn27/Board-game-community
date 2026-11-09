# 0010. Member accounts: invite code gate, email sign in

**Date**: 2026-11-06
**Status**: In Progress
**Revised**: 2026-11-07, by the engineer: no email confirmation (so no SMTP for sign up) and no Google sign in. A valid invite code plus the register form signs the member in at once. Forgot password stays and uses Supabase's built in mail.
**Revised**: 2026-11-07, by the engineer: the auth pages get a new look, the "clay scene" (soft pastel purple, 3D clay group of members leaning over the form card, glass and clay surfaces). Reference image: [docs/design/member-accounts/sign-in-reference.png](../../design/member-accounts/sign-in-reference.png); illustration brief: `docs/design/member-accounts/brief.md` (removed 2026-11-08 with the clay scene). Adds AC-16 to AC-21 and build plan tasks 14 to 18. Behaviour, actions, and security are unchanged.
**Revised**: 2026-11-08, by the engineer: the clay scene is replaced by the "Dice Galaxy" look (a night sky with stars, a clay rocket with a cloud trail, clay dice, a ringed planet, and a cloud bank the white form card rests on), picked as design D on the [Sign-in Page Options canvas](https://claude.ai/artifact/DZFyiGJt9u5mP3sL34Rfnk). All art is drawn in code, so the illustration brief and the picture files are dropped (the earlier clay reference image stays in `docs/design/member-accounts/` for history). The header and tab bar keep their cream look; text uses Baloo 2 on these pages only. Rewrites AC-16, AC-18 to AC-21, the scene design, and build plan tasks 14 to 18. Behaviour, actions, and security are unchanged.
**Revised**: 2026-11-08, by the engineer: both rockets get trail design 5, "Exhaust puffs + flame", picked on the [Rocket trail picker](https://claude.ai/artifact/Bp7G64GWmaKvzdfEH8oFHg): the rocket and trail bob as one, a gold and orange flame flickers at the nozzle, five puffs stream from the flame's tip, and a light slides along the trail; the static trail dots are dropped. Adds the `--auth-flame` token and updates AC-21.

## Summary

Visitors can still browse everything without an account. To join, a person first enters the community's shared invite code, and only then can register with email and password; registering signs them in at once, with no confirmation email. Members can sign in, sign out, edit their display name, change or reset a password, and read a privacy note. The gate is "soft" (our pages enforce it, Supabase sign up stays open underneath), which is an accepted risk for a small friendly community. No database change is needed: the profile table, roles, and sign up trigger already exist. The sign in, create account, forgot, and reset pages share one "clay scene": a lavender backdrop with clouds, plants, and flowers, a glass card with a "Welcome back" heading, a clay illustration of a group of members leaning over the form, and rounded pill inputs. It is a scoped theme, like the game sheet's Cover Tint: the rest of the site keeps its warm terracotta tokens.

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
- **AC-16** (Dice Galaxy scene): `/sign-in` (both modes, including the invite step), `/forgot-password`, and `/reset-password` render inside the Dice Galaxy scene: a night sky (a violet glow at the top fading to deep indigo) with stars, a clay rocket with a cloud trail, a pink ringed planet, a pink die and a white die, sparkles, and a bank of white clouds along the bottom. The heading and subheading sit on the sky above a white form card that rests on the clouds. The site header and bottom tab bar keep their normal cream look. No social sign in buttons, and "Email" instead of "Email or Username". `/me` and `/privacy` keep the normal site look.
- **AC-17** (copy and mode switch): sign in mode shows "Welcome back" over "Sign in to continue your journey"; create account and the invite step, forgot, and reset each have their own heading and subheading. The segmented Sign in / Create account tabs are replaced by a footer line under the form: "Don't have an account? Sign up" (goes to `?mode=register`) and, in create account mode, "Already a member? Sign in". Both keep `next`. "Forgot password?" sits right aligned under the password field. All copy is in both message files.
- **AC-18** (fields): inputs are rounded rectangles (`rounded-xl`, 52px tall) with the icon inside the field on the left (`Mail` for email, `Lock` for passwords, `User` for display name, `KeyRound` for the invite code). Each input keeps a real `<label>` (visually hidden, matching the placeholder text), and errors and hints still show under the field with `aria-describedby`. Every password input has a show or hide button (an `Eye` / `EyeOff` icon, 44px, `aria-pressed`, translated `aria-label`) that switches the input type without losing the value or the caret.
- **AC-19** (art in code): every piece of scene art (stars, rocket and trail, planet, dice, sparkles, clouds) is inline SVG drawn in code with `--auth-*` fills and hidden from assistive tech. There are no image files, so the art stays sharp at every screen size and adds no image requests. Below `lg` a small rocket flies above the heading; from `lg` a large rocket with a long cloud trail sits to the left of the card.
- **AC-20** (theme, font, and contrast): the scene's colors are `--auth-*` tokens in `src/app/globals.css`, used only inside the scene wrapper; components write no literal colors. Every text pair passes WCAG 2.2 AA in `src/lib/design/contrast.test.ts`: heading and subheading on every sky stop, ink and muted ink on the card and the field, links, button text on both ends of the pink to violet gradient, and field errors; the field outline, focus ring, and field icon reach 3:1. Decoration colors (clay, rose, gold, haze, glow) are fills only, never text. Text uses Baloo 2, loaded with `next/font` on these pages only (Latin); Chinese falls back to the device font, as on the rest of the site.
- **AC-21** (responsive and motion): at 360px the scene fills the space between the header and the bottom bar with no sideways scroll and the card is near full width. Decorations are placed from the page center, so they never cover the card at any width, and the sky reaches both page edges even past the 1536px content width. From `md` the card is centered at about 440px wide. The planet and dice float a few pixels and some stars twinkle; each rocket bobs together with its trail, a small gold and orange flame flickers at its nozzle, five exhaust puffs stream from the flame's tip down the trail, and a soft light slides along the trail (trail design 5 on the [Rocket trail picker](https://claude.ai/artifact/Bp7G64GWmaKvzdfEH8oFHg)). All of it runs only under `motion-safe`; with reduced motion nothing moves and the puffs and light are hidden. Every control stays at least 44px with a visible focus ring.

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

**UI source**: design D, "Dice Galaxy", on the [Sign-in Page Options canvas](https://claude.ai/artifact/DZFyiGJt9u5mP3sL34Rfnk) (phone and desktop artboards) for the auth pages (the scene below), and `docs/design.md` tokens for `/me` and `/privacy`. Required states: idle, submitting, field error, form error, "check your email" success, locked or expired link, disabled notice.

**Dice Galaxy scene** (the auth pages' look, revised 2026-11-08; replaces the clay scene):

| Part | Build |
|---|---|
| `AuthScene` (`src/components/auth/auth-scene.tsx`, server) | Replaces `AuthColumn` on the auth pages. Full bleed inside `<main>` (cancels `--page-gutter`, `--main-pt`, and `--main-pb`, then pads itself back so nothing hides behind the bottom bar). The sky layer is `100vw` wide and centered, so it reaches both page edges past `max-w-screen-2xl`; the body clips the sideways overflow. Night sky: a radial glow from `--auth-sky` at the top through `--auth-sky-mid` to `--auth-sky-deep`. Carries the `auth-scene` class that scopes the `--auth-*` tokens and the Baloo 2 font. Holds the decorations and centers the column. |
| Decorations (`auth-decor.tsx`, server) | All `aria-hidden`, inline SVG, fills from tokens. Stars (an SVG that fills the sky, a few twinkle), a ringed planet top right, a pink die and a white die, sparkles, and a cloud bank along the bottom (an SVG of overlapping circles, about 120px tall on phones, 200px from `lg`). From `lg` a large rocket with a long cloud trail sits left of the card. Every piece is placed from the page center (`calc(50% ± …)`), so none covers the card at any width. |
| Heading block (`AuthCard`) | Below `lg`: a small rocket with its trail and two sparkles above the heading. The heading (`text-4xl md:text-5xl font-bold`, `--auth-on-sky`) and the subheading (`--auth-on-sky-muted`) sit on the sky, centered. |
| Form card | White `--auth-card`, `rounded-[32px]`, a deep soft shadow (`--auth-shadow`). It rests on the cloud bank: the scene's bottom padding is shorter than the clouds, so the card's lower edge sits in them. Holds the notices, the form, and the footer line. |
| Field (`AuthField`, restyled) | `h-13 rounded-xl`, `--auth-field` fill, a 1px `--auth-field-line` border (3:1), 16px text, placeholder in `--auth-ink-muted`. Left, inside the field: a 20px lucide icon in `--auth-icon`. Label: `sr-only`, same text as the placeholder. Focus: a `--auth-ring` ring. Error: `aria-invalid` 2px border in `--auth-danger`, message under it. |
| Password toggle (`password-toggle.tsx`, client) | A 44px icon button inside the field's right end. `aria-pressed`, `aria-label` "Show password", `aria-controls` the input. Switching keeps focus and value. |
| Submit button | `h-14 rounded-full`, a left to right gradient from `--auth-button-from` (pink) to `--auth-button-to` (violet), white bold text (4.5:1 on both ends), a soft glow shadow, a 150ms press scale under `motion-safe:`. Same pending spinner and disabled rules as before. |
| Turnstile | Sits between the last field and the button, `flexible` size so it fits a 360px card. |
| Footer line | "Don't have an account? Sign up" (or the create account variant), muted text plus a bold `--auth-link` link, 44px tall target. |
| States | Form errors and `?error=` notices: a `rounded-xl` notice in `--auth-danger` on `--auth-danger-bg` with a `CircleAlert` icon. The "check your email" success: the same card with an envelope in a gradient circle. The loading skeleton (`AuthSkeleton`) keeps the sky, light bars for the heading, and the white card with field shaped bars in `--auth-field`. |

Tokens (`src/app/globals.css`, defined on `.auth-scene`, values in `oklch` like the rest): sky `--auth-sky`, `--auth-sky-mid`, `--auth-sky-deep`, `--auth-glow`, `--auth-haze`; text on the sky `--auth-on-sky`, `--auth-on-sky-muted`; card `--auth-card`, `--auth-field`, `--auth-field-line`, `--auth-icon`, `--auth-ink`, `--auth-ink-muted`, `--auth-link`, `--auth-ring`, `--auth-danger`, `--auth-danger-bg`, `--auth-shadow`; button `--auth-button-from`, `--auth-button-to`, `--auth-on-button`; art `--auth-clay`, `--auth-clay-shade`, `--auth-clay-deep`, `--auth-pip`, `--auth-rose-light`, `--auth-rose`, `--auth-rose-deep`, `--auth-magenta`, `--auth-window`, `--auth-gold`, `--auth-spark`, `--auth-flame`. Map them to Tailwind with `@theme inline` names (`bg-auth-card`, `fill-auth-clay`) so components stay on classes. The rest of the site stays light only; the night sky exists only inside the scene.

**Not taken from the references**: the Google, Apple, and Facebook buttons and the "or continue with" divider (spec has no social sign in) and "Email or Username" (sign in is by email only). The Login wording stays "Sign in" to match the nav tab and the rest of the site.

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
- Dice Galaxy scene: every auth page renders the scene at 360 and 1280 with no sideways scroll, every `--auth-*` text pair passes the contrast test, nothing animates with reduced motion, the password toggle switches type and `aria-pressed`, inputs are still found by their label, and the footer switch keeps `next`, verifies **AC-16 to AC-21**.

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

Dice Galaxy scene (revised 2026-11-08, replaces the clay scene; the flows above are built, this changes only the look). The heading keys per mode, the footer mode switch, and `PasswordToggle` from the clay build carry over unchanged.

14. Remove the clay scene: `src/lib/auth/scene-art.ts` and its test, the clay stand ins and plant and flower code, `docs/design/member-accounts/brief.md`, and the clay picture prompts in `docs/design.md`, satisfies **AC-19**.
15. Tokens and font: the Dice Galaxy `--auth-*` tokens on `.auth-scene` and their `@theme inline` names in `globals.css`, the float and twinkle keyframes, every text pair in `contrast.test.ts`, Baloo 2 through `next/font` scoped to the scene, and the `/design` block, satisfies **AC-20**.
16. Scene and art: `AuthScene` (full width sky), `auth-decor.tsx` (stars, planet, dice, sparkles, cloud bank, large rocket), `AuthCard` (small rocket, heading on the sky, white card), `AuthSkeleton`, satisfies **AC-16, AC-19, AC-21**.
17. Form parts: the rounded `AuthField` with the icon inside, the gradient `SubmitButton`, notices, and the check email badge; update their component tests (labels still found by role and name, toggle switches type and `aria-pressed`), satisfies **AC-18, AC-20**.
18. Checks: Playwright in `e2e/member-accounts.spec.ts` at 360 and 1280 (no sideways scroll, heading visible, nothing animates with reduced motion, toggle works, footer link keeps `next`), screenshots of each auth page for the engineer, and the "Auth Dice Galaxy scene" section in `docs/design.md`, satisfies **AC-16 to AC-21**.

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
- The auth pages look different from the rest of the site (a night sky between the cream header and tab bar). This is deliberate, recorded as a second scoped theme in `docs/design.md`, but a member moving from the shelf to sign in sees a change of mood.
- Baloo 2 adds one Latin font file to the first auth page visit. The art is code, so changing it means editing SVG, not generating new pictures.

**Neutral**:
- Four new env variables and several dashboard settings (Turnstile, redirects) must exist in local, staging, and production.
- `/me` is a minimal page now; the full profile page is feature 17.
- Self service account deletion is not in this feature; the privacy note points to the admin (feature 19 has deletion).

## Follow-up

- [x] Supply the screenshots for sign in, create account, forgot and reset before tasks 4 to 11 start (reference image added 2026-11-07; `/me` and `/privacy` follow `docs/design.md`).
- [x] Clay illustration pictures: dropped 2026-11-08. The Dice Galaxy art is drawn in code, so no image files are needed.
- [ ] Set up outside services before inviting members: Turnstile widget keys and the secret in Supabase; email confirmation off in the hosted project; redirect allowlists for production and the Vercel preview pattern. Forgot password uses Supabase's built in mail, which is rate limited; add custom SMTP (Resend, SPF and DKIM) only if reset mails become a problem.
- [ ] Decide the contact line in the privacy note for deleting an account (an email address or "ask the group admin").
- [ ] Supabase email templates are one language per project: write them bilingual (English and Chinese in the same mail).
- [ ] Wire the "I own this" button for guests to `/sign-in?next=<game>` in feature 7.
- [ ] Add `src/lib/auth/AGENTS.md` and list it in root `AGENTS.md` (via `/sync`); the `supabase` skill conventions for auth are already listed in root.
- [ ] Revisit the soft gate (Option 2 or 3) if the invite code leaks or strangers appear.
