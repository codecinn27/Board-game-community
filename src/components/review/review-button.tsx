"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import {
  markReviewed,
  markUnreviewed,
} from "@/app/[locale]/admin/review/actions";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

type ReviewButtonProps = {
  gameId: number;
  /** `done` marks the game reviewed; `undo` moves it back to the to review list. */
  mode: "done" | "undo";
  label: string;
  errorLabel: string;
};

/** "Looks right" and "Mark as not reviewed" (spec 0013, AC-14). */
export function ReviewButton({
  gameId,
  mode,
  label,
  errorLabel,
}: ReviewButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const result = await (mode === "done"
        ? markReviewed(gameId)
        : markUnreviewed(gameId));
      // The page is not cached, so a refresh is all it takes.
      if (result.status === "ok" || result.status === "notFound") {
        router.refresh();
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant={mode === "done" ? "default" : "outline"}
        className="h-11 px-4"
        disabled={busy}
        onClick={() => void run()}
      >
        {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
        {label}
      </Button>
      {failed ? (
        <p role="alert" className="text-sm text-destructive">
          {errorLabel}
        </p>
      ) : null}
    </div>
  );
}
