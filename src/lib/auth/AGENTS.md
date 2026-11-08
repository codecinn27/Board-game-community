# Member accounts (auth)

## Overview

Sign in, registration, and the shared invite code gate (spec 0010). Supabase Auth holds the accounts; this folder holds the rules around it. The gate is soft: our pages enforce the invite code, Supabase sign up stays open underneath (accepted risk, spec 0010 Option 1).

## Key files

| File | Owns |
|---|---|
| [safe-next.ts](safe-next.ts) | `safeNext()` (the only way a `next` value reaches a redirect) and `localePath()` |
| [invite-pass.ts](invite-pass.ts) | Constant time code compare, and the signed `invite_pass` cookie value (30 minutes) |
| [invite-cookie.ts](invite-cookie.ts) | `hasInvitePass()`: reads the cookie on the server (keeps `Date.now()` out of components) |
| [guards.ts](guards.ts) | Pure `authRedirect()` and `sessionFromClaims()`: which auth page sends whom where |
| [session.ts](session.ts) | `updateSession()`: the `@supabase/ssr` refresh that `src/proxy.ts` chains on the intl response |
| [viewer.ts](viewer.ts) | `getViewer()`: guest or member from `getClaims()`; call only under `Suspense` |
| [turnstile.ts](turnstile.ts) | Server side Cloudflare check, used by `verifyInvite` only |
| [errors.ts](errors.ts) | Supabase error code to a message key; credential failures are always the one generic key |
| [validation.ts](validation.ts) | Display name, email, and password rules shared by actions and forms |
| [state.ts](state.ts) | `FormState`, what every form action returns |
| [actions-support.ts](actions-support.ts) | `localeOf`, `nextOf`, `authLink`, `goTo` for Server Actions |
| [password.ts](password.ts) | `changePassword()`, shared by `/me` and `/reset-password` |

Pages: `src/app/[locale]/{sign-in,forgot-password,reset-password,me,privacy}/`. Route: `src/app/auth/confirm/route.ts` (reset link) (unprefixed, the proxy matcher skips `auth`). Forms: `src/components/auth/`.

## Conventions

- Check the session with `getClaims()` or `getUser()`, never `getSession()`.
- Only the nav (`ShellHeader`, `ShellBottomBar`) and the auth pages read the session, each under `Suspense`; cached pages must not read cookies.
- `next` has no language prefix and goes through `safeNext()` at every use, not only where it is read.
- A Turnstile token works once. When Supabase also checks it (sign in, sign up, reset), do not call `verifyTurnstile` too; `verifyInvite` has no Supabase call, so it does. Forms remount the widget after each answer (`useAuthForm`).
- Role and status are never read from user editable metadata.
- `/sign-in`, `/forgot-password`, and `/reset-password` render inside `AuthScene` (`src/components/auth/auth-scene.tsx`); `/me` and `/privacy` keep `AuthColumn` (`auth-layout.tsx`). Scene colors are `--auth-*` tokens that exist only inside `.auth-scene` (`src/app/globals.css`), so scene components write no literal colors.

## Gotchas

- The reset mail uses `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery` (`supabase/templates/recovery.html`). The hosted project needs the same template, the redirect allowlist, and email confirmation turned off.
- `proxy.ts` does the guest and signed in redirects (AC-12); the `/me` page keeps its own backstop redirect.
- A reset link session is told apart by an `otp` entry in the token's `amr` claim.
- `getViewer()` awaits `connection()` before `getClaims()`. `getClaims()` reads the clock to check the token's expiry, and with Partial Prefetching the clock is off limits during the runtime prefetch (cookies are not).
- Local Supabase reads the Turnstile secret from `supabase/.env` (git ignored); `.env.example` lists the four new app variables.

## Related specs

- [0010 Member accounts](../../../docs/specs/0010-member-accounts/index.md)
- [0001 Stack and architecture](../../../docs/specs/0001-stack-architecture/index.md)
