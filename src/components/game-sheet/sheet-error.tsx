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

type SheetErrorProps = {
  title: string;
  body: string;
  retryLabel: string;
  /** Runs the read again. Default: refresh the route. */
  onRetry?: () => void;
};

/**
 * "Could not load this game" inside the sheet frame (spec 0008, AC-15). Its
 * strings are props so `/design` can show it with no message provider.
 */
export function SheetError({
  title,
  body,
  retryLabel,
  onRetry,
}: SheetErrorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function retry() {
    startTransition(() => {
      if (onRetry) onRetry();
      else router.refresh();
    });
  }

  return (
    <div className="flex min-h-[40dvh] items-center justify-center bg-background">
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
    </div>
  );
}
