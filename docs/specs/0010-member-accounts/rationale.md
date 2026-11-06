# 0010 rationale: Member accounts

_Decision history for [spec 0010](index.md). Not build input._

_Revised 2026-11-07: the engineer dropped Google sign in and email confirmation. The text below is the original reasoning; mentions of Google and the callback check no longer apply._

## Context

Features 7, 12, 13, 16, and 18 all write data as a signed in member, and the database already enforces "public read, active member write" with row level security (RLS, database rules deciding which rows each person may read or change). Spec 0001 chose Supabase Auth with Google and email plus password, Turnstile (Cloudflare's bot check), and Resend (an email sender) for confirmation mail. Spec 0002 created `profiles` (display name, role, status) and a trigger that makes a profile for every new auth user, reading `full_name` from sign up metadata and falling back to the part of the email before the `@`.

What is missing is the whole user facing layer: sign in pages, session handling in `proxy.ts` (the file that already redirects locales, with a placeholder for this), a way for the shell to know who is viewing, and a way to keep strangers from joining. The root layout renders the shell as `viewer="guest"` and the tab config has `signIn` and `me` tabs switched off.

The community is under 100 people and the maintainer is one person. Home, shelf, and game pages are cached on purpose to protect the free Vercel quota, so reading the session must not make them dynamic (computed on every request).

The privacy note must be accurate: email, display name, and Google profile name are stored, and Supabase, Vercel, Resend, and Cloudflare Turnstile handle member data.

## Options considered

### Option 1: Soft gate, code first, Google and email (chosen)

Code page sets a signed cookie; register page and Google button require it; the Google callback deletes a new account that has no pass. Supabase sign up stays open.

**Pros**:
- No schema change, no hook, works the same way for Google and email.
- The Google loophole is closed by the callback check, not by hope.

**Cons**:
- Someone calling the Supabase API directly with the public key can create an account without the code (it can write, because new accounts are `active`).

### Option 2: Pending status, a server action activates

New accounts start `pending`; a server action checks the code and flips them to `active`. Hard gate for both methods.

**Pros**:
- A direct API sign up gets a useless account.

**Cons**:
- A new enum value, a changed trigger, and edits to the seed and five pgTAP files. The engineer chose code first with no pending state.

### Option 3: Hard gate for email through a Supabase sign up hook

A signed token in the sign up metadata is checked by a database hook.

**Pros**:
- Email cannot be done by API alone.

**Cons**:
- Google stays open anyway, plus a hook function and a signing secret in the database.

### Option 4: Public sign up off, server creates every user

**Pros**:
- Strongest.

**Cons**:
- Breaks the normal Google button; biggest build for a community this size.

## Rationale

The scale (under 100 people, one maintainer) and the friendly setting make an API level bypass a low risk, while the cost of a hard gate is real: a migration that touches the seed and every pgTAP file (Option 2), or a hook that Google cannot pass through anyway (Options 3 and 4). Turnstile plus a long random code already stops casual guessing, and anything a stranger could do after joining is limited by RLS and by the admin's ability to disable an account.

The engineer wanted the code before registration for everyone, so the Google callback must police itself: a new Google user cannot carry our cookie through Google's consent screen unless the cookie is set before the redirect, which it is (the pass cookie is set when the code is accepted, and a `lax` cookie is sent on the top level return from Google). A new account with no valid pass is therefore a bypass attempt and is removed.

Reading the session in the root layout would make every page dynamic and lose the cache that protects the Vercel quota. Splitting the shell so only the nav reads the session, inside Suspense (React's loading boundary) with the guest tabs as the fallback, keeps content static.

The engineer's choices, taken as fixed: invite code, shared and changeable (an env var); open to Google and email; one `/sign-in` page with a mode switch; return to the page the member came from; Turnstile with a long random code and no attempt counter; display names need not be unique; a `/privacy` page; own Turnstile component; design from screenshots the engineer will supply.

