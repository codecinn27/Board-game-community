# Supabase database

## Overview

The database definition: migrations, pgTAP tests, and the local seed. The local stack runs in Docker, so Docker Desktop must be running before any `supabase` command that touches the database. The data model is specced in `docs/specs/0002-data-model/`.

## Key files

| Path | Owns |
|---|---|
| `migrations/` | One SQL file per slice, named `<timestamp>_<name>.sql`. The only way the schema changes. |
| `tests/database/` | pgTAP tests, numbered `NN_<name>.test.sql`, one file per migration slice. `05_merge_readiness.test.sql` checks every foreign key to `games` cascades. |
| `seed.sql` | Local development data (four accounts with a known password, one admin). Loaded by `supabase db reset`. Never run it against the real project. |
| `config.toml` | Local stack settings. |

## Conventions

- Add a new migration file for every schema change. Never edit a migration that has already been pushed.
- Every new table gets row level security, explicit grants (the default grants are revoked), and a pgTAP test.
- After a schema change, regenerate `src/lib/supabase/database.types.ts`.

## Commands

```bash
supabase test db      # run all pgTAP tests (needs Docker running)
supabase db reset     # rebuild the local database from migrations and seed.sql
supabase db push      # apply new migrations to the linked real project
```

## Gotchas

- **Docker on Windows:** Docker Desktop's CLI lives in `C:\Users\kobe9\AppData\Local\Programs\DockerDesktop\resources\bin`. PowerShell finds it. Git Bash needs it on `PATH`, set in `~/.bash_profile`. If `docker: command not found` appears, run `export PATH="$PATH:/c/Users/kobe9/AppData/Local/Programs/DockerDesktop/resources/bin"`.
- Test files 01 to 04 clear `games` and `auth.users` inside their transaction, so they pass on a seeded database. The rollback restores the seed data.
- `supabase test db` and `supabase status` fail with a Docker error when Docker Desktop is not running. Start it first.
- The `supabase` CLI is linked to the real project (Board-game-community). `db push` changes that project, so check `supabase migration list` first.
