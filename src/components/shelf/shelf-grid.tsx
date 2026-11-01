import { type ShelfCard as ShelfCardData } from "@/lib/games/shelf";
import { ShelfCard } from "./shelf-card";

type ShelfGridProps = {
  games: ShelfCardData[];
};

export function ShelfGrid({ games }: ShelfGridProps) {
  return (
    <ul className="grid w-full grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-6 md:gap-x-4 xl:grid-cols-10">
      {games.map((game) => (
        <li key={game.id}>
          <ShelfCard game={game} />
        </li>
      ))}
    </ul>
  );
}
