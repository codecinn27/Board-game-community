"use client";

import { TriangleAlert } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useRouter } from "@/i18n/navigation";

type ShelfErrorProps = {
  title: string;
  body: string;
  retryLabel: string;
  /** The backstop `error.tsx` replaces the page, so it brings its own `h1`. */
  heading?: string;
  /** Runs the read again. Default: refresh the route. */
  onRetry?: () => void;
};

export function ShelfError({
  title,
  body,
  retryLabel,
  heading,
  onRetry,
}: ShelfErrorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function retry() {
    startTransition(() => {
      if (onRetry) onRetry();
      else router.refresh();
    });
  }

  return (
    <>
      {heading === undefined ? null : (
        <h1 className="text-2xl font-semibold md:text-3xl">{heading}</h1>
      )}
      <Empty className="w-full flex-none py-16">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="size-18 rounded-full text-destructive"
          >
            <TriangleAlert aria-hidden className="size-8" />
          </EmptyMedia>
          <EmptyTitle className="text-lg">{title}</EmptyTitle>
          <EmptyDescription>{body}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            type="button"
            onClick={retry}
            disabled={pending}
            className="min-h-11 px-4"
          >
            {retryLabel}
          </Button>
        </EmptyContent>
      </Empty>
    </>
  );
}
