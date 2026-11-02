import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getGameDetail, type GameDetail } from "@/lib/games/detail";
import { CloseLink } from "./close-link";
import { GameSheet } from "./game-sheet";
import { SheetError } from "./sheet-error";

type GameSheetLoaderProps = {
  /** The route param, as given. */
  id: string;
};

/**
 * Reads one game and renders its sheet, for the page and the overlay alike
 * (spec 0008). An unknown id is the 404; a failed read is the error block.
 */
export async function GameSheetLoader({ id }: GameSheetLoaderProps) {
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
    return error;
  }
  if (game === null) notFound();

  return (
    <GameSheet
      game={game}
      variant="page"
      closeControl={<CloseLink label={t("close")} />}
    />
  );
}
