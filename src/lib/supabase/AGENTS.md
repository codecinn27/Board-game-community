# Supabase clients

## Overview

The four ways the app talks to Supabase. Every database, auth, or storage call goes through one of these, so the right client is chosen by what the caller needs (cookies, cacheability, or admin power).

## Key files

| File | Owns |
|---|---|
| [server.ts](server.ts) | `createClient()` for Server Components and server actions. Reads cookies, so it carries the signed in member into row level security. Async. |
| [browser.ts](browser.ts) | `createClient()` for client components (interactive parts only). |
| [public.ts](public.ts) | `createPublicClient()`: no cookies, no session. Use for public read paths so pages stay cacheable. |
| [admin.ts](admin.ts) | `createAdminClient()`: uses the secret key, bypasses row level security. Marked `server-only`. |
| [clients.test.ts](clients.test.ts) | Vitest checks that each factory passes the right keys and options. |

## Conventions

- Pick the client by need: signed in data uses `server.ts`; public cacheable reads use `public.ts`; client components use `browser.ts`; privileged work uses `admin.ts`.
- Keys come from `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` (see `.env.example`).
- Check the member on the server with `getClaims()` or `getUser()`, never `getSession()`, which trusts the cookie without verifying it.

## Gotchas

- `SUPABASE_SECRET_KEY` is used in `admin.ts` only. Never import `admin.ts` from a client component or use the secret key anywhere else. Admin actions must check the member's role first.
- Do not use the cookie aware `server.ts` client on public pages: reading cookies makes the page dynamic and defeats caching.
- The `setAll` catch in `server.ts` is intentional: Server Components cannot set cookies, so the session refresh in `proxy.ts` does that instead.

## Agent skills

- [supabase](../../../.claude/skills/supabase/): `supabase/agent-skills`, Supabase auth, client, and RLS usage
- [supabase-postgres-best-practices](../../../.claude/skills/supabase-postgres-best-practices/): `supabase/agent-skills`, Postgres schema, RLS, and query rules

## Related specs

- [0001 Stack and architecture](../../../docs/specs/0001-stack-architecture/index.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
