import { Suspense } from "react";
import { getShelfGames } from "@/lib/games/shelf";

// Tracer bullet thread: one typed read from the database to the page.
// Replaced by the real shelf (feature 8) and translated text (feature 5).
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

export default function Home() {
  return (
    <main className="p-4">
      <Suspense fallback={null}>
        <Shelf />
      </Suspense>
    </main>
  );
}
