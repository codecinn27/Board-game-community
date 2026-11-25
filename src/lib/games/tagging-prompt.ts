// The AI prompt the admin copies from the Review page to tag games by feel,
// theme, and mechanic. Pure, so it is tested without a database.

export type PromptChoice = {
  slug: string;
  nameEn: string;
  descriptionEn?: string | null;
};

export type PromptLists = {
  feels: readonly PromptChoice[];
  themes: readonly PromptChoice[];
  mechanics: readonly PromptChoice[];
};

export type PromptGame = {
  id: number;
  name: string;
  nameZh: string | null;
  description: string | null;
  /** Slugs already saved, so the AI does not repeat or undo them. */
  feels: string[];
  themes: string[];
  mechanics: string[];
};

const DESCRIPTION_MAX = 200;

function choiceLines(choices: readonly PromptChoice[]): string {
  return choices
    .map((c) => {
      const hint = c.descriptionEn?.trim();
      return `- ${c.slug}: ${c.nameEn}${hint ? ` (${hint})` : ""}`;
    })
    .join("\n");
}

function gameLine(game: PromptGame): string {
  const parts = [`id ${game.id}: ${game.name}`];
  if (game.nameZh?.trim()) parts.push(`(Chinese: ${game.nameZh.trim()})`);
  const description = game.description?.trim().replace(/\s+/g, " ");
  if (description) {
    parts.push(
      `| about: ${
        description.length > DESCRIPTION_MAX
          ? `${description.slice(0, DESCRIPTION_MAX)}...`
          : description
      }`,
    );
  }
  const saved = [
    game.feels.length ? `feels ${game.feels.join(", ")}` : "",
    game.themes.length ? `themes ${game.themes.join(", ")}` : "",
    game.mechanics.length ? `mechanics ${game.mechanics.join(", ")}` : "",
  ].filter((s) => s !== "");
  if (saved.length > 0) parts.push(`| already tagged: ${saved.join("; ")}`);
  return `- ${parts.join(" ")}`;
}

/** The full prompt, or null when there are no games to tag. */
export function buildTaggingPrompt(
  games: readonly PromptGame[],
  lists: PromptLists,
): string | null {
  if (games.length === 0) return null;
  return [
    "You help me tag board games in my Supabase (Postgres) database. Pick tags only from the fixed lists below, using the slug exactly as written.",
    "",
    "Rules:",
    "- Each game gets exactly 1 feel, 0 to 2 themes (none if no theme fits), and 2 to 4 mechanics.",
    "- Never invent a slug. If nothing fits a group, leave it out.",
    "- Keep tags a game already has. Only add what is missing.",
    "- If you do not know a game, do not guess: list it under Questions.",
    "",
    "Game feel:",
    choiceLines(lists.feels),
    "",
    "Game theme:",
    choiceLines(lists.themes),
    "",
    "Game mechanics:",
    choiceLines(lists.mechanics),
    "",
    "Games to tag (use the id, not the name):",
    ...games.map(gameLine),
    "",
    "Give me, in this order:",
    "1. One SQL script for the Supabase SQL editor. Use three insert statements, one per group, each with a VALUES list of (game_id, 'slug') joined to the choice table by slug, and ON CONFLICT DO NOTHING. Example for feels:",
    "   insert into public.game_feels (game_id, feel_id)",
    "   select v.game_id, f.id from (values (1, 'party-games'), (2, 'strategy')) as v(game_id, slug)",
    "   join public.feels f on f.slug = v.slug on conflict do nothing;",
    "   The same shape applies to game_themes with themes (column theme_id) and game_mechanics with mechanics (column mechanic_id).",
    "2. A short table of each game and the tags you chose, with one line of reasoning for any weak fit.",
    "3. Questions, for games you are unsure about.",
  ].join("\n");
}
