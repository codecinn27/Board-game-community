import { Star } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { type TopGame } from "@/lib/games/home";
import { cn } from "@/lib/utils";
import { CoverTile } from "@/components/games/cover-tile";

type TopRatedProps = {
  games: TopGame[];
};

const focusRing =
  "outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export async function TopRated({ games }: TopRatedProps) {
  if (games.length === 0) return null;
  const [t, format] = await Promise.all([
    getTranslations("home.topRated"),
    getFormatter(),
  ]);

  return (
    <section aria-labelledby="top-rated" className="flex flex-col gap-3">
      <h2 id="top-rated" className="text-lg font-semibold">
        {t("title")}
      </h2>

      {/* One list, two looks: a ruled card on a phone, five cards from `md`. */}
      <Card className="gap-0 py-0 md:overflow-visible md:bg-transparent md:ring-0">
        <CardContent className="px-0">
          <ol className="divide-y md:grid md:grid-cols-5 md:gap-4 md:divide-y-0">
            {games.map((game) => {
              const rating = format.number(game.avgRecommendation, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              });
              return (
                <li
                  key={game.id}
                  className="md:rounded-2xl md:bg-card md:ring-1 md:ring-foreground/10"
                >
                  <Link
                    href={`/games/${game.id}`}
                    className={cn(
                      "relative flex min-h-15 items-center gap-3 rounded-xl px-3 py-2 md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-x-2 md:gap-y-2 md:rounded-2xl md:p-3",
                      focusRing,
                    )}
                  >
                    <Badge
                      aria-hidden
                      variant="secondary"
                      className="size-7 shrink-0 rounded-full text-sm tabular-nums md:absolute md:top-5 md:left-5 md:z-10 md:bg-foreground md:text-background"
                    >
                      {game.rank}
                    </Badge>
                    <CoverTile
                      name={game.name}
                      tint={game.coverTint}
                      className="size-11 shrink-0 rounded-lg md:col-span-2 md:aspect-[4/3] md:size-auto md:w-full md:rounded-xl"
                    />
                    <span className="flex min-w-0 flex-1 flex-col md:contents">
                      <span className="line-clamp-2 font-semibold md:col-span-2">
                        {game.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {t("owners", { count: game.ownerCount })}
                      </span>
                    </span>
                    <span
                      role="img"
                      aria-label={t("ratingLabel", { rating })}
                      className="flex shrink-0 items-center gap-1 font-semibold tabular-nums"
                    >
                      <Star
                        aria-hidden
                        className="size-4 fill-current text-primary"
                      />
                      {rating}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </section>
  );
}
