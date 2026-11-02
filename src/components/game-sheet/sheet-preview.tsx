"use client";

import { Star, Users } from "lucide-react";
import { useFormatter } from "next-intl";
import { CoverTile } from "@/components/games/cover-tile";
import { NEUTRAL_SHEET_TINT } from "@/lib/games/neutral-tint";
import { CloseButton } from "./close-button";
import { type SheetCard } from "./sheet-store";
import { SHEET_TITLE_ID, sheetStyle } from "./sheet-theme";

type SheetPreviewProps = {
  card: SheetCard;
  closeLabel: string;
  /** "Loading game". */
  loadingLabel: string;
};

const chip =
  "inline-flex min-h-8 items-center gap-1.5 rounded-full bg-(--sheet-chip) px-3 text-sm font-semibold tabular-nums";
const bar = "animate-pulse rounded-md bg-(--sheet-chip)";

/**
 * What the sheet shows in the first frame (spec 0008, AC-15 and AC-21): only
 * what the card already knows, in the game's own tint, with bars where the
 * rest will land. The real sheet replaces it inside the same dialog.
 */
export function SheetPreview({
  card,
  closeLabel,
  loadingLabel,
}: SheetPreviewProps) {
  const format = useFormatter();
  const rating =
    card.avgRecommendation === null
      ? null
      : format.number(card.avgRecommendation, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={loadingLabel}
      style={sheetStyle(card.coverTint)}
      className="flex flex-col bg-linear-to-b from-(--sheet-tint) from-55% to-(--sheet-deep) text-(--sheet-ink)"
    >
      <div className="relative h-[52dvh] max-h-[30rem] shrink-0 overflow-hidden">
        <CoverTile
          name={card.name}
          tint={card.coverTint ?? NEUTRAL_SHEET_TINT}
          className="aspect-auto size-full rounded-none"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-b from-transparent to-(--sheet-tint)"
        />
        <div className="absolute top-4 left-4">
          <CloseButton label={closeLabel} />
        </div>
      </div>

      <div className="flex flex-col gap-6 px-5 pb-6">
        <div className="flex flex-col items-center gap-3">
          <h1
            id={SHEET_TITLE_ID}
            className="line-clamp-2 text-center text-3xl font-bold tracking-tight"
          >
            {card.name}
          </h1>
          <div aria-hidden className="flex flex-wrap justify-center gap-2">
            {rating === null ? null : (
              <span className={chip}>
                <Star className="size-4 fill-current" />
                {rating}
              </span>
            )}
            {card.ownerCount === null ? null : (
              <span className={chip}>
                <Users className="size-4" />
                {format.number(card.ownerCount)}
              </span>
            )}
          </div>
        </div>
        <div aria-hidden className={`${bar} h-22 w-full rounded-[22px]`} />
        <div aria-hidden className="flex flex-col gap-2">
          <div className={`${bar} h-5 w-full`} />
          <div className={`${bar} h-5 w-full`} />
          <div className={`${bar} h-5 w-2/3`} />
        </div>
      </div>
    </div>
  );
}
