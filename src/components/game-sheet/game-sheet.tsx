import { type ReactNode } from "react";
import { type Locale } from "@/i18n/routing";
import { type GameDetail } from "@/lib/games/detail";
import { buildSheetData } from "./sheet-data";
import { SheetView } from "./sheet-view";

type GameSheetProps = {
  game: GameDetail;
  variant: "overlay" | "page";
  /** The Close control: a button in the modal, a link on the page. */
  closeControl: ReactNode;
  /** The game's own address, for Share. Default: the page's address. */
  sharePath?: string;
  /** A route reads the language from the URL; pass it only outside a route. */
  locale?: Locale;
  /** The title's heading level: 1 on its own page, 3 inside `/design`. */
  headingLevel?: 1 | 3;
};

/**
 * The page version of the sheet (spec 0008): translate and format on the
 * server, then draw it with the same `SheetView` the modal uses.
 */
export async function GameSheet({
  game,
  variant,
  closeControl,
  sharePath,
  locale,
  headingLevel,
}: GameSheetProps) {
  const data = await buildSheetData(game, locale, sharePath);
  return (
    <SheetView
      data={data}
      variant={variant}
      closeControl={closeControl}
      headingLevel={headingLevel}
    />
  );
}
