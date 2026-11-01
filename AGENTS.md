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
pnpm test:e2e    # Playwright at 360px and 1280px, light and dark (starts pnpm dev, needs .env.local)
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
- Browser checks live in `e2e/` (Playwright, `playwright.config.ts`); results go to the git ignored `test-results/`.
- Style is enforced by tools, not memory: Prettier (with the Tailwind class sorter), ESLint, and TypeScript `strict` plus `noUncheckedIndexedAccess`. Use explicit guards, never `!`. Type imports are inline (`import { type X }`). Unused names start with `_`.
- The admin client (`@/lib/supabase/admin`) may be imported only from `src/lib/supabase/**`, files named `actions.ts`, `route.ts`, `src/proxy.ts`, and tests. ESLint fails anywhere else.
- Read env vars through `requireEnv` in `src/lib/supabase/env.ts`, not `process.env.X!`.
- Files and folders are lowercase kebab case. Import with `@/`. Group by feature: `src/lib/<feature>/`, `src/components/<feature>/`. `src/components/ui/` is shadcn generated, edit it only through the shadcn CLI.
- New logic and every RLS policy change need a test. No coverage gate.
- Mobile first UI; all user facing text goes through next-intl (English and Chinese).
- Messages live in `messages/en.json` and `messages/zh.json` with the same keys (checked by `src/i18n/messages.test.ts`); the locale comes from the `[locale]` URL segment (languages in `src/i18n/routing.ts`), and `src/i18n/request.ts` loads the messages, Chinese over English as a fallback.
- Pages live under `src/app/[locale]/` (`/en/...`, `/zh/...`); `src/proxy.ts` redirects unprefixed paths. Each page's `generateMetadata` returns `alternates: await getAlternates("<path>")` from `@/i18n/alternates` (canonical plus hreflang).
- Import `Link`, `redirect`, `usePathname`, and `useRouter` from `@/i18n/navigation`, never `next/link` or `next/navigation`; send messages to the browser only through `IntlClientProvider` with picked namespaces. Raw text in JSX under `src/app/` and `src/components/` fails lint (the `/design` page, `src/components/ui/`, and tests are exempt).
- Show timestamps with `LocalTime` (`src/components/time/local-time.tsx`), never format dates by hand.
- next-intl's middleware does not load under Vitest, so proxy redirects and the language cookie are tested in `e2e/two-languages.spec.ts`.
- Home reads dummy data through `src/lib/games/home.ts` (`buildHomeData`) from `src/lib/games/dummy-data.ts`, typed like the real rows; live data (scope feature 21) swaps those read functions, not the components.
- Shelf reads the same dummy data through `src/lib/games/shelf.ts` (`getShelfData`, `compareNames`); `?view=owner` is read only inside `ShelfLoader` under `Suspense` (Cache Components), never in the page. Shelf pieces live in `src/components/shelf/`; `CoverTile` is in `src/components/games/`.
- Page side padding for the header and `<main>` is the `--page-gutter` variable in `src/app/globals.css` (24, 52, 60, 80px by breakpoint); use it for anything that must line up with the page edge.
- The shadcn CLI can write `import { cn } from "cn"` and add a stray `cn` npm package; change the import to `@/lib/utils` and drop the package.
- Shell tabs come only from `src/lib/app-shell/nav.ts` (`enabled` plus `audience`); the bottom tab bar shows only at 2 or more visible tabs.

## Tooling

- Config files: `.prettierrc`, `.prettierignore`, `.gitattributes` (LF endings), `eslint.config.mjs`, `tsconfig.json`, `commitlint.config.mjs`, `.lintstagedrc`, `.husky/`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `.git-blame-ignore-revs`.
- Husky hooks: `pre-commit` runs lint-staged (ESLint fix and Prettier on staged files), `commit-msg` runs commitlint, `pre-push` runs `pnpm typecheck && pnpm test`. `--no-verify` only for an emergency, and CI still has to pass.
- CI (`checks` job) runs format check, lint, typecheck, tests, Gitleaks, and a commitlint check of the PR title. Dependabot sends grouped weekly PRs. `next build`, pgTAP, and Playwright are not in CI yet.
- Merge with squash, and write the PR title as a Conventional Commit.
- PRs use `.github/pull_request_template.md`, which asks for a native reader check of any changed Chinese text.
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

- Design system: build all UI to [docs/design.md](docs/design.md) (art direction and the build mandate); token values live in `src/app/globals.css`, and `/design` previews them.
- [src/lib/supabase/AGENTS.md](src/lib/supabase/AGENTS.md) (which Supabase client to use, and the secret key rule)
- [supabase/AGENTS.md](supabase/AGENTS.md) (migrations, pgTAP tests, seed, and running Docker for the local stack)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
