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
pnpm lint        # eslint --max-warnings=0, any warning fails
pnpm format      # prettier --write .
pnpm format:check
pnpm typecheck   # next typegen && tsc --noEmit
pnpm test        # vitest run
supabase test db # pgTAP database tests (needs Docker Desktop running)
supabase db push # apply migrations to the linked real project
```

Docker Desktop's CLI is in `C:\Users\kobe9\AppData\Local\Programs\DockerDesktop\resources\bin`. Git Bash gets it from `~/.bash_profile`; if `docker` is not found, add that folder to `PATH` (details in [supabase/AGENTS.md](supabase/AGENTS.md)).

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`. Feature scope lives in `docs/scope/scope.md`.

## Rules

- Env vars are listed in `.env.example`; real values go in `.env.local` (git ignored). Never commit secrets.
- The Supabase secret key is used only in `src/lib/supabase/admin.ts`.
- Row level security on every table; public read, member write.
- Tests sit next to the code (`*.test.ts`, Vitest).
- Style is enforced by tools, not memory: Prettier (with the Tailwind class sorter), ESLint, and TypeScript `strict` plus `noUncheckedIndexedAccess`. Use explicit guards, never `!`. Type imports are inline (`import { type X }`). Unused names start with `_`.
- The admin client (`@/lib/supabase/admin`) may be imported only from `src/lib/supabase/**`, files named `actions.ts`, `route.ts`, `src/proxy.ts`, and tests. ESLint fails anywhere else.
- Read env vars through `requireEnv` in `src/lib/supabase/env.ts`, not `process.env.X!`.
- Files and folders are lowercase kebab case. Import with `@/`. Group by feature: `src/lib/<feature>/`, `src/components/<feature>/`. `src/components/ui/` is shadcn generated, edit it only through the shadcn CLI.
- New logic and every RLS policy change need a test. No coverage gate.
- Mobile first UI; all user facing text goes through next-intl (English and Chinese).

## Tooling

- Config files: `.prettierrc`, `.prettierignore`, `.gitattributes` (LF endings), `eslint.config.mjs`, `tsconfig.json`, `commitlint.config.mjs`, `.lintstagedrc`, `.husky/`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `.git-blame-ignore-revs`.
- Husky hooks: `pre-commit` runs lint-staged (ESLint fix and Prettier on staged files), `commit-msg` runs commitlint, `pre-push` runs `pnpm typecheck && pnpm test`. `--no-verify` only for an emergency, and CI still has to pass.
- CI (`checks` job) runs format check, lint, typecheck, tests, Gitleaks, and a commitlint check of the PR title. Dependabot sends grouped weekly PRs. `next build` and pgTAP are not in CI yet.
- Merge with squash, and write the PR title as a Conventional Commit.
- Generated and vendored files are not formatted or linted: `database.types.ts`, `next-env.d.ts`, `.claude`, `.agents`, `supabase/`, and Markdown under `docs/`.

## Git

- Remote: `origin` (https://github.com/codecinn27/Board-game-community.git).
- Branch per feature, named `feat/{number}-{feature}` in kebab case, e.g. `feat/1-data-model`. The number counts feature branches in the order they are created, starting at 1.
- Create the branch once the feature is built, tested, and documented, then commit as each milestone lands.
- Ask the user before every commit, and again before any push or pull request. Never push without a fresh yes.
- Commit messages use Conventional Commits, `type(scope): subject` (types: feat, fix, docs, refactor, test, chore, ci, build, perf, style), checked by commitlint.
- End commit messages with the `Co-Authored-By` trailer from the session.

## Agent skills

- [supabase](.claude/skills/supabase/): `supabase/agent-skills`, Supabase auth, clients, and RLS
- [supabase-postgres-best-practices](.claude/skills/supabase-postgres-best-practices/): `supabase/agent-skills`, Postgres schema and query rules
- [vercel-react-best-practices](.claude/skills/vercel-react-best-practices/): `vercel-labs/agent-skills`, React and Next.js performance
- [vercel-composition-patterns](.claude/skills/vercel-composition-patterns/): `vercel-labs/agent-skills`, component composition
- [deploy-to-vercel](.claude/skills/deploy-to-vercel/): `vercel-labs/agent-skills`, deploying to Vercel
- [shadcn](.claude/skills/shadcn/): `shadcn-ui/ui`, shadcn/ui components and styling
- [playwright-cli](.claude/skills/playwright-cli/): `microsoft/playwright-cli`, browser automation and tests
- Declined: Agent Skills for Prettier, ESLint, Husky, lint-staged, and commitlint (spec 0003 follow-up)

## Context files

- [src/lib/supabase/AGENTS.md](src/lib/supabase/AGENTS.md) (which Supabase client to use, and the secret key rule)
- [supabase/AGENTS.md](supabase/AGENTS.md) (migrations, pgTAP tests, seed, and running Docker for the local stack)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
