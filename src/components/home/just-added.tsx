import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LocalTime } from "@/components/time/local-time";
import { Link } from "@/i18n/navigation";
import { type HomeGame } from "@/lib/games/home";
import { cn } from "@/lib/utils";
import { CoverTile } from "./cover-tile";

type JustAddedProps = {
  games: HomeGame[];
};

const focusRing =
  "outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export async function JustAdded({ games }: JustAddedProps) {
  const t = await getTranslations("home.justAdded");

  return (
    <section aria-labelledby="just-added" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 id="just-added" className="text-lg font-semibold">
          {t("title")}
        </h2>
        <Link
          href="/shelf"
          className={cn(
            "-mr-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-primary hover:underline",
            focusRing,
          )}
        >
          {t("seeAll")}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>

      {/* A phone row scrolls inside itself and bleeds to the screen edge; from
          `md` all six sit in a grid. The sixth is hidden below `md`. */}
      <ScrollArea className="-mx-4 md:mx-0">
        <ul className="flex w-max gap-3 px-4 pb-2 md:grid md:w-full md:grid-cols-6 md:gap-4 md:px-0 md:pb-0">
          {games.map((game, index) => (
            <li
              key={game.id}
              className={cn(
                "w-31 shrink-0 md:w-auto",
                index >= 5 && "hidden md:block",
              )}
            >
              <Link
                href={`/games/${game.id}`}
                className={cn("flex flex-col gap-2 rounded-xl", focusRing)}
              >
                <CoverTile
                  name={game.name}
                  tint={game.coverTint}
                  className="w-full rounded-xl"
                />
                <span className="line-clamp-2 font-semibold">{game.name}</span>
                <span className="text-sm text-muted-foreground">
                  {game.addedByName !== null ? (
                    <>
                      {game.addedByName} <span aria-hidden>·</span>{" "}
                    </>
                  ) : null}
                  <LocalTime value={game.addedAt} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </section>
  );
}
