import { getTranslations } from "next-intl/server";
import { SheetSkeleton } from "@/components/game-sheet/sheet-skeleton";

export default async function GameLoading() {
  const t = await getTranslations("game");
  return (
    <div className="mx-auto w-full max-w-lg overflow-clip rounded-[28px]">
      <SheetSkeleton label={t("loading")} />
    </div>
  );
}
