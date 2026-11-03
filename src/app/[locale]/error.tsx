"use client";

import { useTranslations } from "next-intl";
import { ShelfError } from "@/components/shelf/shelf-error";

// Backstop for a page whose own `error.tsx` is closer, such as the shelf and a
// game, so in practice this is home when its read fails (spec 0009, AC-11).
// Next 16 hands the boundary `retry()`, which re-fetches; `reset()` would only
// re-render.
export default function LocaleRouteError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("home.error");

  return (
    <ShelfError
      title={t("title")}
      body={t("body")}
      retryLabel={t("retry")}
      onRetry={retry}
    />
  );
}
