import { Star, Users } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { type ReactNode } from "react";
import { CoverTile } from "@/components/games/cover-tile";
import { NEUTRAL_SHEET_TINT, type GameDetail } from "@/lib/games/detail";
import { cn } from "@/lib/utils";
import { Description } from "./description";
import { OwnersList } from "./owners-list";
import { ShareButton, ShareProvider } from "./share-button";
import { SHEET_TITLE_ID, sheetStyle } from "./sheet-theme";
import { StatsCard } from "./stats-card";

type GameSheetProps = {
  game: GameDetail;
  /** `overlay` sits in the dialog frame; `page` sits in the app shell. */
  variant: "overlay" | "page";
  /** The Close control: a button in the overlay, a link on the page. */
  closeControl: ReactNode;
  /** The title's heading level: 1 on its own page, 3 inside `/design`. */
  headingLevel?: 1 | 3;
};

const chip =
  "inline-flex min-h-8 items-center gap-1.5 rounded-full bg-(--sheet-chip) px-3 text-sm font-semibold tabular-nums";

/**
 * The sheet (spec 0008, AC-4 to AC-11): one server component for the overlay
 * and the page, so their content cannot differ. Every color is a `--sheet-*`
 * variable set from the cover tint.
 */
export async function GameSheet({
  game,
  variant,
  closeControl,
  headingLevel = 1,
}: GameSheetProps) {
  const Title = headingLevel === 1 ? "h1" : "h3";
  const t = await getTranslations("game");
  const format = await getFormatter();
  const rating =
    game.avgRecommendation === null
      ? null
      : format.number(game.avgRecommendation, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });

  return (
    <ShareProvider
      title={game.name}
      labels={{ copied: t("share.copied"), copyFailed: t("share.copyFailed") }}
    >
      <article
        style={sheetStyle(game.coverTint)}
        className={cn(
          "relative flex flex-col bg-linear-to-b from-(--sheet-tint) from-55% to-(--sheet-deep) text-(--sheet-ink)",
          variant === "page" &&
            "mx-auto w-full max-w-lg overflow-clip rounded-[28px]",
        )}
      >
        <div className="relative h-[52dvh] max-h-[30rem] shrink-0 overflow-hidden">
          <div className="size-full origin-center in-data-starting-style:scale-105 motion-safe:transition-transform motion-safe:duration-280 motion-safe:ease-out">
            <CoverTile
              name={game.name}
              tint={game.coverTint ?? NEUTRAL_SHEET_TINT}
              className="aspect-auto size-full rounded-none"
            />
          </div>
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-b from-transparent to-(--sheet-tint)"
          />
          <div className="absolute top-4 left-4">{closeControl}</div>
          <div className="absolute top-4 right-4">
            <ShareButton variant="glass" label={t("share.label")} />
          </div>
        </div>

        <div className="flex flex-col gap-6 px-5 pb-6">
          <div className="flex flex-col items-center gap-3">
            <Title
              id={SHEET_TITLE_ID}
              className="line-clamp-2 text-center text-3xl font-bold tracking-tight"
            >
              {game.name}
            </Title>
            <div className="flex flex-wrap justify-center gap-2">
              {rating === null ? null : (
                <span className={chip}>
                  <Star aria-hidden className="size-4 fill-current" />
                  <span aria-hidden>{rating}</span>
                  <span className="sr-only">
                    {t("chips.rating", {
                      rating,
                      count: game.ratingCount,
                    })}
                  </span>
                </span>
              )}
              <span className={chip}>
                <Users aria-hidden className="size-4" />
                <span aria-hidden>{format.number(game.ownerCount)}</span>
                <span className="sr-only">
                  {t("chips.owners", { count: game.ownerCount })}
                </span>
              </span>
            </div>
          </div>

          <StatsCard
            playersMin={game.playersMin}
            playersMax={game.playersMax}
            playTimeMin={game.playTimeMin}
            playTimeMax={game.playTimeMax}
            ownerCount={game.ownerCount}
          />

          {game.description === null ? null : (
            <Description
              text={game.description}
              moreLabel={t("description.more")}
              lessLabel={t("description.less")}
            />
          )}

          <OwnersList owners={game.owners} />
        </div>

        <div
          className={cn(
            "sticky z-10 mt-auto px-4 pt-2",
            variant === "page"
              ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] pb-2 md:bottom-4"
              : "bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))]",
          )}
        >
          <div className="flex items-center gap-2 rounded-full border border-(--sheet-line) bg-(--sheet-dock) p-2 backdrop-blur-md">
            <button
              type="button"
              disabled
              className="flex min-h-12 flex-1 cursor-not-allowed flex-col items-center justify-center rounded-full bg-(--sheet-ink) px-4 leading-tight font-semibold text-(--sheet-ink-inverse)"
            >
              {t("dock.own")}
              <span className="text-xs font-medium">{t("dock.soon")}</span>
            </button>
            <ShareButton variant="dock" label={t("share.label")} />
          </div>
        </div>
      </article>
    </ShareProvider>
  );
}
