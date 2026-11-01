import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getAlternates } from "@/i18n/alternates";
import { getShelfGames } from "@/lib/games/shelf";

// Tracer bullet thread: one typed read from the database to the page.
// Replaced by the real shelf (feature 8). Game names show as stored in both
// languages (spec 0005, AC-10).
async function Shelf() {
  const games = await getShelfGames();
  return (
    <ul>
      {games.map((game) => (
        <li key={game.id}>
          {game.name} ({game.owner_count})
        </li>
      ))}
    </ul>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shelf.meta");
  return {
    title: t("title"),
    description: t("description"),
    alternates: await getAlternates("/shelf"),
  };
}

export default function ShelfPage() {
  return (
    <div>
      <Suspense fallback={null}>
        <Shelf />
      </Suspense>
    </div>
  );
}
