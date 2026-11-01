import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getGameDetail, type GameDetail } from "@/lib/games/detail";
import { CloseButton } from "./close-button";
import { CloseLink } from "./close-link";
import { GameSheet } from "./game-sheet";
import { SheetError } from "./sheet-error";
import { SheetFrame } from "./sheet-frame";
import { SHEET_TITLE_ID, sheetStyle } from "./sheet-theme";

type GameSheetLoaderProps = {
  /** The route param, as given. */
  id: string;
  variant: "overlay" | "page";
};

/**
 * Reads one game and renders its sheet, for the page and the overlay alike
 * (spec 0008). An unknown id is the 404; a failed read is the error block.
 */
export async function GameSheetLoader({ id, variant }: GameSheetLoaderProps) {
  const t = await getTranslations("game");
  let game: GameDetail | null = null;
  let failed = false;
  try {
    game = await getGameDetail(id);
  } catch {
    failed = true;
  }

  if (failed) {
    const error = (
      <SheetError
        title={t("error.title")}
        body={t("error.body")}
        retryLabel={t("error.retry")}
      />
    );
    if (variant === "page") return error;
    return (
      <SheetFrame style={sheetStyle(null)} label={t("error.title")}>
        <div className="relative">
          <CloseButton
            label={t("close")}
            className="absolute top-4 left-4 z-10"
          />
          {error}
        </div>
      </SheetFrame>
    );
  }
  if (game === null) notFound();

  if (variant === "page") {
    return (
      <GameSheet
        game={game}
        variant="page"
        closeControl={<CloseLink label={t("close")} />}
      />
    );
  }
  return (
    <SheetFrame style={sheetStyle(game.coverTint)} labelledBy={SHEET_TITLE_ID}>
      <GameSheet
        game={game}
        variant="overlay"
        closeControl={<CloseButton label={t("close")} />}
      />
    </SheetFrame>
  );
}
