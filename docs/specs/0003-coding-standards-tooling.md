# 0003. Coding standards and tooling

**Date**: 2026-10-27
**Status**: In Progress

## Summary

Every file in the repo gets formatted the same way, checked by the same rules, and guarded by the same gates. Prettier formats, ESLint lints, TypeScript gets one extra strict flag, and Husky runs checks at commit and push. GitHub Actions repeats the checks on every pull request, scans for leaked secrets, and Dependabot sends grouped update PRs. A tool is only worth having if it fails loudly, so each rule below names where it is enforced.

## Context

> ⚠️ Premise note: you chose GitHub secret scanning alone to back the rule "never commit secrets". Personal private repos on the Free or Pro plan cannot use secret scanning or push protection (they need paid GitHub Secret Protection), and spec 0001 says this repo is private. Gitleaks in CI is added instead, since the cross check flagged this. The same plan limit probably applies to branch protection on a private repo, so CI may be advisory until you upgrade or make the repo public.

The project is a small TypeScript codebase (11 source files) on Next.js 16, built by one person with AI help. Today it has ESLint with `eslint-config-next` and Vitest, and nothing else: no formatter, no git hooks, no CI, no dependency updates, and no written commit style.

Without a formatter, diffs fill with whitespace noise and AI generated code drifts in style. Without hooks and CI, a type error or failing test can reach `main` and then Vercel. AGENTS.md states rules (secret key only in `admin.ts`, tests beside code, user text through next-intl) that nothing checks mechanically. The codebase is small now, so adopting standards costs almost nothing. Later it costs a migration.

The machine is Windows with `core.autocrlf=true`, and the repo holds vendored agent skill files (`.claude/`, `.agents/`) that are not app code. Both shape the setup.

## Requirements

Seeded from scope feature 2, "Done when: root `AGENTS.md` reflects the real stack, and lint, format, and pre commit run clean."

**User stories**:
- As the maintainer, I want style and quality checked automatically so that I never review formatting and bad code cannot reach `main`.
- As an AI coding agent, I want the rules enforced by tools so that I find out immediately when I break one.

**Acceptance criteria** (each has a probe that proves it):
- **AC-1**: On a clean checkout, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` all pass.
- **AC-2**: `git commit` formats and lints only the staged files. A staged file with a lint error blocks the commit.
- **AC-3**: `echo "bad msg" | pnpm exec commitlint` exits non zero. `echo "feat(supabase): add seed data" | pnpm exec commitlint` exits zero. A commit with a `Co-Authored-By` footer is accepted.
- **AC-4**: `git push` is blocked when typecheck or tests fail.
- **AC-5**: A probe file importing `@/lib/supabase/admin` from an app page or component fails `pnpm lint`. The same import from each allowed place passes.
- **AC-6**: A pull request runs format check, lint, typecheck, tests, and Gitleaks in GitHub Actions. A deliberately failing change turns the check red.
- **AC-7**: `dependabot.yml` is valid and groups minor and patch updates into one PR per ecosystem per week.
- **AC-8**: Root `AGENTS.md` lists the commands, conventions, and tooling in this spec (every script name and config file named in the Standard definition appears).

## Decision

**Chosen option**: Option 2: Document, enforce with tools, and bring the existing code into line in one setup change.

Adopt the standard below as the one way to work. New rules apply immediately, and the 11 existing source files are fixed in the same setup change rather than tracked as debt.

## Standard definition

**Canonical setup**

| Area | Choice | Detail |
|---|---|---|
| Dev dependencies to add | `prettier`, `prettier-plugin-tailwindcss`, `eslint-config-prettier`, `husky`, `lint-staged`, `@commitlint/cli`, `@commitlint/config-conventional` | Also bump `@types/node` from `^20` to `^22` to match the Node 22 runtime. |
| Formatter | Prettier with `prettier-plugin-tailwindcss` | `.prettierrc`: `{ "plugins": ["prettier-plugin-tailwindcss"], "tailwindStylesheet": "./src/app/globals.css", "tailwindFunctions": ["cn", "cva"] }`. Other options stay at Prettier defaults (double quotes, semicolons, LF). Formats everything Prettier supports, YAML included. |
| `.prettierignore` | `.next`, `node_modules`, `pnpm-lock.yaml`, `.claude`, `.agents`, `skills-lock.json`, `supabase`, `public`, `out`, `build`, `coverage`, `.vercel`, `next-env.d.ts`, `src/lib/supabase/database.types.ts`, `docs`, `*.md` | Vendored, generated, and documentation files are left alone. |
| Line endings | `.gitattributes` with `* text=auto eol=lf` | Keeps Prettier and the Husky shell hooks working with `core.autocrlf=true` on Windows. Re-normalise once in the setup change. |
| Lint | Existing ESLint (`core-web-vitals`, `typescript`), then `eslint-config-prettier/flat` last | Add `.claude/**`, `.agents/**`, `supabase/**`, and `src/lib/supabase/database.types.ts` to `globalIgnores`. |
| Lint rules added | `@typescript-eslint/consistent-type-imports` (error, `fixStyle: "inline-type-imports"`), `@typescript-eslint/no-unused-vars` (error, `argsIgnorePattern`, `varsIgnorePattern`, `caughtErrorsIgnorePattern`, `destructuredArrayIgnorePattern` all `^_`, `ignoreRestSiblings: true`), `@typescript-eslint/no-non-null-assertion` (error), and the admin import rule below. | |
| Warnings | Any warning fails | `lint` script is `eslint --max-warnings=0`. lint-staged uses `eslint --fix --max-warnings=0 --no-warn-ignored`. |
| TypeScript | Existing `strict` plus `noUncheckedIndexedAccess`; `exclude` adds `.claude`, `.agents`, `supabase` | Fix style: explicit guards (`if (!row) return`), never `!`. Enabled in the same commit as its fixes. |
| Scripts | `lint`, `format` (`prettier --write .`), `format:check` (`prettier --check .`), `typecheck` (`next typegen && tsc --noEmit`), `test`, and `"prepare": "husky"` | `next typegen` creates the route types that the gitignored `next-env.d.ts` points to, so `tsc` works on a clean checkout. |
| `.husky/pre-commit` | `pnpm exec lint-staged` | |
| `.husky/commit-msg` | `pnpm exec commitlint --edit "$1"` | |
| `.husky/pre-push` | `pnpm typecheck && pnpm test` | Hook files use LF endings and need no shebang (Husky 9). |
| `.lintstagedrc` | `"*.{ts,tsx,js,mjs}": ["eslint --fix --max-warnings=0 --no-warn-ignored", "prettier --write"]`, `"*.{json,css,yml,yaml}": "prettier --write"` | |
| `commitlint.config.mjs` | Extends `@commitlint/config-conventional`; `type-enum` set to the 10 types below | Merge and revert commits are ignored by default. No `scope-enum`. |
| CI | `.github/workflows/ci.yml` on `pull_request` and push to `main` | See CI detail below. |
| Dependency updates | `.github/dependabot.yml` | See Dependabot detail below. |
| Merge strategy | Squash merge, PR title in Conventional Commits form | Commit hooks only cover local commits. The PR title becomes the commit on `main`. |
| Blame hygiene | `.git-blame-ignore-revs` lists the `style: format codebase` commit | Set `git config blame.ignoreRevsFile .git-blame-ignore-revs` locally. GitHub reads the file itself. |

**CI detail**
- `permissions: contents: read`. Concurrency group per branch with `cancel-in-progress: true`. One job named `checks` (a fixed name so it can be a required check).
- Steps in order: checkout, `pnpm/action-setup` (reads `packageManager`), `actions/setup-node` with `node-version-file: .nvmrc` and `cache: pnpm`, `pnpm install --frozen-lockfile` with `HUSKY=0`, `format:check`, `lint`, `typecheck`, `test`.
- A second step runs `gitleaks/gitleaks-action` on the full diff. Secret scanning is free for personal accounts this way.
- On PRs, a step runs `commitlint` against the PR title (`echo "$PR_TITLE" | pnpm exec commitlint`, title passed through an env var, not inlined in the script).
- Tests use placeholder Supabase env values only if a test reads `process.env` (add them in the workflow `env` then).
- `next build` and pgTAP are not in CI yet.

**Dependabot detail**
- Two ecosystems: `npm` and `github-actions`, both weekly on Monday.
- `groups: { minor-and-patch: { update-types: [minor, patch] } }` so those arrive as one PR. Majors arrive one PR each. Security updates are not grouped.
- `commit-message: { prefix: "chore", include: "scope" }` gives `chore(deps): ...`. `open-pull-requests-limit: 5`.
- `ignore` major updates for `@types/node` above 22 and for `eslint` until `eslint-config-next` supports the next major.
- Before relying on it, confirm Dependabot can read the pnpm lockfile (check the first run).

**Admin import rule** (enforces the AGENTS.md secret key rule)

```js
// eslint.config.mjs
{
  files: ["src/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [{
        group: ["@/lib/supabase/admin", "**/supabase/admin"],
        message: "Use createAdminClient only in server actions, route handlers, proxy.ts, or src/lib/supabase.",
      }],
    }],
  },
},
{
  files: [
    "src/lib/supabase/**",
    "src/**/actions.ts",
    "src/app/**/route.ts",
    "src/proxy.ts",
    "src/**/*.test.{ts,tsx}",
  ],
  rules: { "no-restricted-imports": "off" },
},
```

- Allowed places: `src/lib/supabase/**`, files named `actions.ts`, route handlers (`route.ts`), `src/proxy.ts`, and tests. A server action written inline with `"use server"` in another file must live in an `actions.ts` file instead.
- Not covered by the rule: dynamic `import()` and files outside `src/`. `admin.ts` itself is marked `server-only`, which is the second guard.
- AC-5 is proven by a lint probe: a temporary file under `src/app/` that imports the admin client must fail lint.

**Commit rules**

```text
feat(supabase): add seed data for the shelf

Co-Authored-By: <the trailer from the session>
```

- Form: `type(scope): subject`. The scope is optional. Allowed types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`, `style`.
- Guidance, not tool checked: keep the subject short, lowercase, and in the imperative, with no trailing period. The tool checks the header length (at most 100) and that the subject is not sentence case, start case, pascal case, or all caps.
- The `Co-Authored-By` trailer from AGENTS.md goes in the footer and is allowed.
- Old history is not rewritten.

**Code conventions** (recorded so they are written down, not new)
- File and folder names are lowercase kebab case (`game-card.tsx`). Imports use the `@/` alias, not long relative paths.
- Group by feature: `src/lib/<feature>/` and `src/components/<feature>/`, as `src/lib/games` already does. `src/components/ui/` is shadcn generated, so edit it only through the shadcn CLI.
- Tests sit beside the code as `*.test.ts`. New logic and every RLS policy change need a test. There is no coverage percentage gate.
- Server Components by default, `server-only` on server modules, and all user facing text through next-intl (unchanged from AGENTS.md).

**Replaces**:
- Unformatted code and per developer style choices.
- Free form commit messages such as "Update types, context files, scope, and data model review".
- Unchecked array and record indexing, non null assertions, and unused variables left as warnings.
- The admin client being kept out of the wrong files by memory alone.

**Enforcement**:
- Local: Husky hooks (`pre-commit`, `commit-msg`, `pre-push`). Hooks can be skipped with `--no-verify`, so CI is the real gate.
- Remote: GitHub Actions on every PR. Branch protection requiring the `checks` job needs a plan that supports it on a private repo (see Follow-up).
- Config files: `.prettierrc`, `.prettierignore`, `.gitattributes`, `eslint.config.mjs`, `tsconfig.json`, `commitlint.config.mjs`, `.lintstagedrc`, `.husky/`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `.git-blame-ignore-revs`.

**Rollout**:
- One setup change on this branch (`feat/2-coding-standards`). Commit 1: install tools and configs, with `.gitattributes` and line ending normalisation. Commit 2: a formatting only pass (`style: format codebase`), listed in `.git-blame-ignore-revs`. Commit 3: turn on `noUncheckedIndexedAccess` and the new lint rules together with their fixes. Then update root `AGENTS.md`.
- Commits 1 and 2 may not pass lint or typecheck on their own, so `git bisect` can land on them. Pre push only runs at the end of the branch. This is accepted.
- From then on every change meets the standard.

**Exceptions**:
- Generated files (`database.types.ts`, `next-env.d.ts`) and vendored folders (`.claude`, `.agents`, `supabase`) are not formatted or linted.
- Docs and Markdown are not formatted, so specs do not churn.
- `--no-verify` only for an emergency fix, and CI still has to pass.

## Consequences

**Positive**:
- Diffs show only real changes, and AI written code is pulled into the house style automatically.
- Type errors and failing tests are stopped on the laptop (push) and again in CI before merge.
- The secret key rule is checked by lint, and leaked secrets are scanned in CI.
- Dependency updates arrive in grouped weekly PRs instead of scattered alerts.

**Negative / tradeoffs**:
- More tools to keep current: Prettier, its Tailwind plugin, Husky, `lint-staged`, `commitlint`, Gitleaks, and several config files. Dependabot will update most of them.
- Conventional Commits adds friction on every commit and changes your older sentence style. The commit hook can block a rushed commit.
- `noUncheckedIndexedAccess` and the no non null rule add `undefined` checks across the code, and some will feel noisy.
- Pre push runs typecheck and tests, so every push waits a few seconds.
- CI does not run `next build` or the pgTAP database tests yet, so a broken build or policy bug can still reach a PR. Vercel's own build catches the first at deploy.
- Without a paid plan, branch protection cannot force CI to pass on a private repo, so the gate is advisory.
- The admin import rule has known gaps (dynamic imports, files outside `src/`).

**Neutral**:
- The first formatting commit touches most files once.
- Hooks need Node on the machine. This is already required by `.nvmrc`.

## Follow-up

- [ ] Decide the GitHub plan: Pro or Team enables branch protection on a private repo; otherwise treat CI as advisory or make the repo public. When it is available, require the `checks` job on `main`.
- [ ] Confirm Dependabot can parse the pnpm 12 lockfile after its first run. If the npm updates fail silently, switch to Renovate.
- [ ] Add `next build` and the pgTAP tests (`supabase test db`) to CI when they become worth the minutes. pgTAP needs Docker and the Supabase local stack.
- [ ] Revisit auto sorted imports and `.editorconfig` plus `.vscode` settings if style drift shows up. Not adopted now.
- [ ] Execute with `/develop coding standards & tooling`, then `/audit` or `/sync` to refresh root `AGENTS.md` (commands, conventions, tooling, and the declined Agent Skill search for these tools).
- [ ] Scope row 2 lists `/audit` as its step. The tooling install is code and config, so `/develop` should do it first.
- [ ] Your branch is 1 commit behind `origin/main`. Pull before starting the setup change.

## Rationale

Reasoning and options: see below. This is a single file spec, so the decision record stays inline.

### Options considered

**Option 1: Document and enforce going forward.** Add the tools, apply the rules to new code, and track old violations as debt. Pros: no big diff. Cons: with only 11 files, the debt costs more to track than to fix, and a repo that fails its own lint is not "run clean" as scope row 2 requires.

**Option 2: Document, enforce, and fix everything in one setup change (chosen).** Pros: the repo is clean on day one, AC-1 is true immediately, and `git blame` stays clean with a separate format commit. Cons: one larger change to review, and some `undefined` handling to add.

**Option 3: Document only.** Write conventions in AGENTS.md and rely on review. Pros: zero tooling. Cons: with AI written code and a single reviewer, nothing enforces it, and the existing secret key rule already shows the gap.

### Why Option 2

The codebase is at its smallest size it will ever be, so a one time fix is cheap now and compounds later. An AI agent writes most of the code, and tools give it fast, exact feedback that prose rules cannot. Prettier beside the existing ESLint is the boring, widely known pairing and keeps Tailwind class order stable for shadcn. Husky with `lint-staged` keeps commits fast by checking only staged files, and the heavier typecheck and tests wait for push, with CI as the check that cannot be skipped. Conventional Commits was your choice. I would have kept the current sentence style for a solo project, but the hook is cheap to remove if it annoys you, and `feat` and `fix` prefixes make later changelogs easy. Biome was the runner up for formatting: faster, but two overlapping tools and weaker Tailwind sorting.
