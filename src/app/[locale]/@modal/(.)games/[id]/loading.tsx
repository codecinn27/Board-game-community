import { getTranslations } from "next-intl/server";
import { SheetFrame } from "@/components/game-sheet/sheet-frame";
import { SheetSkeleton } from "@/components/game-sheet/sheet-skeleton";
import { sheetStyle } from "@/components/game-sheet/sheet-theme";

export default async function GameOverlayLoading() {
  const t = await getTranslations("game");
  return (
    <SheetFrame style={sheetStyle(null)} label={t("loading")}>
      <SheetSkeleton label={t("loading")} />
    </SheetFrame>
  );
}
