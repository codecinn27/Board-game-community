// `pnpm seed:games`: checks data/games.json and writes supabase/games-data.sql
// (spec 0009). It never touches a database and uses no secret key; you run the
// SQL yourself, in the Supabase SQL editor or with `supabase db query`.
import { readFileSync, writeFileSync } from "node:fs";
import { parseGamesFile, toGamesSql } from "../src/lib/games/games-file.ts";

const INPUT = "data/games.json";
const OUTPUT = "supabase/games-data.sql";

let raw;
try {
  raw = JSON.parse(readFileSync(INPUT, "utf8"));
} catch (error) {
  console.error(`Could not read ${INPUT}: ${error.message}`);
  process.exit(1);
}

const { games, problems } = parseGamesFile(raw);
if (problems.length > 0) {
  console.error(
    `${INPUT} has ${problems.length} problem(s). Nothing was written:\n`,
  );
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

writeFileSync(OUTPUT, toGamesSql(games));
console.log(`Wrote ${OUTPUT} with ${games.length} game(s).`);
console.log(
  "Run it in the Supabase SQL editor, or locally: supabase db query -f supabase/games-data.sql",
);
