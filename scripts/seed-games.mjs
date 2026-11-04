// `pnpm seed:games`: checks data/games.json, uploads the cover images in
// data/covers to the Supabase `covers` bucket, and writes supabase/games-data.sql
// (specs 0009 and the cover images part of feature 21). The SQL is never run
// here: you run it yourself, in the Supabase SQL editor or with `supabase db query`.
// The upload needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local;
// without them the script stops before writing anything. `--skip-upload` writes
// the SQL only (the images must already be in the bucket).
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname } from "node:path";
import {
  coverSizeProblem,
  parseGamesFile,
  toGamesSql,
} from "../src/lib/games/games-file.ts";

const INPUT = "data/games.json";
const COVERS_DIR = "data/covers";
const OUTPUT = "supabase/games-data.sql";
const BUCKET = "covers";
const TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

let raw;
try {
  raw = JSON.parse(readFileSync(INPUT, "utf8"));
} catch (error) {
  console.error(`Could not read ${INPUT}: ${error.message}`);
  process.exit(1);
}

const { games, problems } = parseGamesFile(raw);
for (const game of games) {
  if (
    game.coverPath !== null &&
    !existsSync(`${COVERS_DIR}/${game.coverPath}`)
  ) {
    problems.push(
      `Game "${game.name}": cover file ${COVERS_DIR}/${game.coverPath} does not exist`,
    );
  } else if (game.coverPath !== null) {
    const tooBig = coverSizeProblem(
      game.coverPath,
      statSync(`${COVERS_DIR}/${game.coverPath}`).size,
    );
    if (tooBig !== null) problems.push(`Game "${game.name}": ${tooBig}`);
  }
}
if (problems.length > 0) {
  console.error(
    `${INPUT} has ${problems.length} problem(s). Nothing was written:\n`,
  );
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const covers = [
  ...new Set(games.flatMap((g) => (g.coverPath ? [g.coverPath] : []))),
];

if (covers.length > 0 && !process.argv.includes("--skip-upload")) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // No .env.local: the variables may already be set in the shell.
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local to upload covers (or pass --skip-upload). Nothing was written.",
    );
    process.exit(1);
  }

  let failed = 0;
  for (const file of covers) {
    const response = await fetch(
      `${url.replace(/\/$/, "")}/storage/v1/object/${BUCKET}/${file}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
          "x-upsert": "true",
          "cache-control": "max-age=3600",
        },
        body: readFileSync(`${COVERS_DIR}/${file}`),
      },
    );
    if (response.ok) {
      console.log(`Uploaded ${file}`);
    } else {
      failed += 1;
      console.error(
        `Could not upload ${file}: ${response.status} ${await response.text()}`,
      );
    }
  }
  if (failed > 0) {
    console.error(`${failed} upload(s) failed. Nothing was written.`);
    process.exit(1);
  }
}

writeFileSync(OUTPUT, toGamesSql(games));
console.log(`Wrote ${OUTPUT} with ${games.length} game(s).`);
console.log(
  "Run it in the Supabase SQL editor, or locally: supabase db query -f supabase/games-data.sql",
);
