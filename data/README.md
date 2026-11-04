# Game data

`games.json` is the list of real games for the community shelf (spec 0009). It is a list of objects:

| Field                        | Required | Rule                                                      |
| ---------------------------- | -------- | --------------------------------------------------------- |
| `name`                       | yes      | 1 to 200 characters                                       |
| `description`                | no       | up to 4000 characters, shown as written                   |
| `playersMin`, `playersMax`   | no       | whole numbers above 0, min not above max                  |
| `playTimeMin`, `playTimeMax` | no       | minutes, same rules                                       |
| `coverTint`                  | no       | lowercase `#rrggbb`; empty gives the neutral sheet tint   |
| `cover`                      | no       | file name in `data/covers/` (`.jpg`, `.jpeg`, `.png`, `.webp`; lowercase letters, digits, dashes), saved as `games.cover_path` |
| `addedAt`                    | no       | a date such as `2026-11-04`, for the "Just added" order   |

Put each cover image in `data/covers/`. Each cover must be at most 150 KB (the `covers` bucket limit); `pnpm seed:games` stops and names any file over that, so compress it first (WebP or JPEG, about 800 px wide is plenty). `pnpm seed:games` uploads them to the Supabase `covers` bucket (it replaces a file of the same name), so `.env.local` needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY`; pass `--skip-upload` to write the SQL only. It runs the upload, not the SQL.

Run `pnpm seed:games` to check the file and write `supabase/games-data.sql`. Every problem is listed with the game's position and name, and nothing is written until the file is clean. Then run the SQL in the Supabase SQL editor, or locally with `supabase db query -f supabase/games-data.sql`. It is safe to run again: a game is matched by its name (capitals, spaces, and punctuation ignored), updated if found, and added if not.

The SQL adds games only. Owners, ratings, and "added by" come with member accounts (features 6, 7, and 12).
