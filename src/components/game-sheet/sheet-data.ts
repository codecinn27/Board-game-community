import { type Locale } from "@/i18n/routing";
import { coverInitial } from "@/lib/games/cover-initial";
import { formatRange, type GameDetail } from "@/lib/games/detail";
import { sheetFormat, sheetT } from "./intl";

/**
 * Everything the sheet shows, already translated and formatted (spec 0008).
 * Plain data, so a Server Action can send it to the modal and the page can
 * hand it to the same `SheetView`: one sheet, two places.
 */
export type SheetData = {
  id: number;
  name: string;
  /** `#rrggbb`, or null for the neutral tint. */
  tint: string | null;
  /** Shown text and the spoken sentence; null with no ratings. */
  rating: { text: string; label: string } | null;
  ownerChip: { text: string; label: string };
  stats: { label: string; value: string }[];
  description: { text: string; more: string; less: string } | null;
  owners: {
    heading: string;
    none: string;
    /** "Since " and "" around the date, so the date can be a `LocalTime`. */
    sinceBefore: string;
    sinceAfter: string;
    rows: { memberId: string; initial: string; name: string; since: string }[];
  };
  dock: { own: string; soon: string };
  share: { label: string; copied: string; copyFailed: string };
  closeLabel: string;
  /** The game's own address, such as `/en/games/1`. Absent: the current page. */
  sharePath?: string;
};

/** A route reads the language from the URL; a Server Action passes `locale`. */
export async function buildSheetData(
  game: GameDetail,
  locale?: Locale,
  sharePath?: string,
): Promise<SheetData> {
  const [t, tStats, tOwners, format] = await Promise.all([
    sheetT("game", locale),
    sheetT("game.stats", locale),
    sheetT("game.owners", locale),
    sheetFormat(locale),
  ]);

  const rating =
    game.avgRecommendation === null
      ? null
      : format.number(game.avgRecommendation, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });

  function range(min: number | null, max: number | null): string {
    const value = formatRange(min, max);
    if (value.kind === "unknown") return tStats("unknown");
    if (value.kind === "single") return format.number(value.value);
    return `${format.number(value.min)}–${format.number(value.max)}`;
  }

  // The message holds one {date} slot; split around it with a marker.
  const marker = "\u0000";
  const [sinceBefore = "", sinceAfter = ""] = tOwners("since", {
    date: marker,
  }).split(marker);

  return {
    id: game.id,
    name: game.name,
    tint: game.coverTint,
    rating:
      rating === null
        ? null
        : {
            text: rating,
            label: t("chips.rating", { rating, count: game.ratingCount }),
          },
    ownerChip: {
      text: format.number(game.ownerCount),
      label: t("chips.owners", { count: game.ownerCount }),
    },
    stats: [
      {
        label: tStats("players"),
        value: range(game.playersMin, game.playersMax),
      },
      {
        label: tStats("minutes"),
        value: range(game.playTimeMin, game.playTimeMax),
      },
      { label: tStats("owners"), value: format.number(game.ownerCount) },
    ],
    description:
      game.description === null
        ? null
        : {
            text: game.description,
            more: t("description.more"),
            less: t("description.less"),
          },
    owners: {
      heading: tOwners("heading", { count: format.number(game.owners.length) }),
      none: tOwners("none"),
      sinceBefore,
      sinceAfter,
      rows: game.owners.map((owner) => ({
        memberId: owner.memberId,
        initial: coverInitial(owner.displayName),
        name: owner.displayName,
        since: owner.since,
      })),
    },
    dock: { own: t("dock.own"), soon: t("dock.soon") },
    share: {
      label: t("share.label"),
      copied: t("share.copied"),
      copyFailed: t("share.copyFailed"),
    },
    closeLabel: t("close"),
    sharePath,
  };
}
