import { getTranslations } from "next-intl/server";
import { CloseButton } from "@/components/game-sheet/close-button";
import { SheetFrame } from "@/components/game-sheet/sheet-frame";
import { sheetStyle } from "@/components/game-sheet/sheet-theme";

// An unknown id reached by in app navigation: the same 404 words, in the frame.
export default async function GameOverlayNotFound() {
  const t = await getTranslations("common.notFound");
  const g = await getTranslations("game");
  return (
    <SheetFrame style={sheetStyle(null)} label={t("title")}>
      <div className="relative flex min-h-[40dvh] flex-col justify-center gap-2 bg-background px-6 py-16 text-center">
        <CloseButton label={g("close")} className="absolute top-4 left-4" />
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("body")}</p>
      </div>
    </SheetFrame>
  );
}
