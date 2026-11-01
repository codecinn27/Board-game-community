import { Star, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { CoverTile } from "@/components/games/cover-tile";
import { Link } from "@/i18n/navigation";
import { type ShelfCard as ShelfCardData } from "@/lib/games/shelf";
import { cn } from "@/lib/utils";

type ShelfCardProps = {
  game: ShelfCardData;
};

const focusRing =
  "outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function ShelfCard({ game }: ShelfCardProps) {
  const t = useTranslations("shelf.card");
  const format = useFormatter();
  const rating =
    game.avgRecommendation === null
      ? null
      : format.number(game.avgRecommendation, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });

  return (
    <Link
      href={`/games/${game.id}`}
      className={cn("flex flex-col gap-2 rounded-xl", focusRing)}
    >
      <CoverTile
        name={game.name}
        tint={game.coverTint}
        className="w-full rounded-xl"
      />
      <span className="line-clamp-2 leading-6 font-semibold">{game.name}</span>
      <span className="flex min-h-5 items-center gap-3 text-[13px] text-muted-foreground tabular-nums">
        {rating === null ? null : (
          <span className="flex items-center gap-1 font-semibold text-foreground">
            <Star aria-hidden className="size-4 fill-current text-primary" />
            <span aria-hidden>{rating}</span>
            <span className="sr-only">{t("ratingLabel", { rating })}</span>
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users aria-hidden className="size-4" />
          <span aria-hidden>{format.number(game.ownerCount)}</span>
          <span className="sr-only">
            {t("owners", { count: game.ownerCount })}
          </span>
        </span>
      </span>
    </Link>
  );
}
