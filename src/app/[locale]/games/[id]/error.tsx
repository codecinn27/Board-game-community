"use client";

import { useTranslations } from "next-intl";
import { SheetError } from "@/components/game-sheet/sheet-error";

// Backstop for any throw the loader does not catch. Next 16 hands the boundary
// `retry()`, which re-fetches; `reset()` would only re-render.
export default function GameRouteError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("game.error");

  return (
    <div className="mx-auto w-full max-w-lg overflow-clip rounded-[28px]">
      <SheetError
        title={t("title")}
        body={t("body")}
        retryLabel={t("retry")}
        onRetry={retry}
      />
    </div>
  );
}
