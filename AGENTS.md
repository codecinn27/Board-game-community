<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Community Board Game Shelf

## Stack

- **Language / Runtime**: TypeScript (strict), Node 22 (`.nvmrc`, `engines`)
- **Framework**: Next.js 16 App Router, React 19, Server Components by default
- **Key dependencies**: Supabase (Postgres, Auth, Storage via `@supabase/ssr`), Tailwind CSS 4 + shadcn/ui, next-intl, Vitest
- **Package manager**: pnpm (pinned in `packageManager`)
- **Hosting**: Vercel (Singapore), Supabase (Singapore)

## Build approach

Tracer Bullet (prove one real thread through every layer first, then thicken it one strand at a time).

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test        # vitest run
```

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`. Feature scope lives in `docs/scope/scope.md`.

## Rules

- Env vars are listed in `.env.example`; real values go in `.env.local` (git ignored). Never commit secrets.
- The Supabase secret key is used only in `src/lib/supabase/admin.ts`.
- Row level security on every table; public read, member write.
- Tests sit next to the code (`*.test.ts`, Vitest).
- Mobile first UI; all user facing text goes through next-intl (English and Chinese).

## Agent skills

- [supabase](.claude/skills/supabase/): `supabase/agent-skills`, Supabase auth, clients, and RLS
- [supabase-postgres-best-practices](.claude/skills/supabase-postgres-best-practices/): `supabase/agent-skills`, Postgres schema and query rules
- [vercel-react-best-practices](.claude/skills/vercel-react-best-practices/): `vercel-labs/agent-skills`, React and Next.js performance
- [vercel-composition-patterns](.claude/skills/vercel-composition-patterns/): `vercel-labs/agent-skills`, component composition
- [deploy-to-vercel](.claude/skills/deploy-to-vercel/): `vercel-labs/agent-skills`, deploying to Vercel
- [shadcn](.claude/skills/shadcn/): `shadcn-ui/ui`, shadcn/ui components and styling
- [playwright-cli](.claude/skills/playwright-cli/): `microsoft/playwright-cli`, browser automation and tests

## Context files

- [src/lib/supabase/AGENTS.md](src/lib/supabase/AGENTS.md) (which Supabase client to use, and the secret key rule)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
