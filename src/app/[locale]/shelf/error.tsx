"use client";

import { useTranslations } from "next-intl";
import { ShelfError } from "@/components/shelf/shelf-error";

// Backstop for any throw the loader does not catch. Next 16 hands the boundary
// `retry()`, which re-fetches; `reset()` would only re-render (spec 0007, AC-9).
export default function ShelfRouteError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("shelf");

  return (
    <div className="flex flex-col gap-4">
      <ShelfError
        heading={t("heading")}
        title={t("error.title")}
        body={t("error.body")}
        retryLabel={t("error.retry")}
        onRetry={retry}
      />
    </div>
  );
}
