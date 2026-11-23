"use client";

import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  getOwnState,
  markOwned,
  unmarkOwned,
  type OwnResult,
  type OwnState,
} from "./own-actions";
import { type SheetData } from "./sheet-data";
import { refreshSheet } from "./sheet-store";

const UNDO_MS = 5000;

const base =
  "flex min-h-12 flex-1 flex-col items-center justify-center rounded-full bg-(--sheet-ink) px-4 leading-tight font-semibold text-(--sheet-ink-inverse) outline-none focus-visible:ring-3 focus-visible:ring-(--sheet-ink)/40";

type OwnButtonProps = {
  gameId: number;
  /** The modal reloads its sheet; the page refreshes its route. */
  variant: "overlay" | "page";
  labels: SheetData["dock"];
};

type Phase = OwnState | "loading" | "removed";

/**
 * The sheet's main action (spec 0013, AC-9 and AC-10): "I own this" adds the
 * viewer as an owner, "You own this" removes them with a 5 second Undo. The
 * start state is read after mount, so the cached sheet never reads cookies.
 */
export function OwnButton({ gameId, variant, labels }: OwnButtonProps) {
  const locale = useLocale();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let current = true;
    getOwnState(gameId).then(
      (answer) => {
        if (!current) return;
        // An error falls back to the guest link, which is always safe.
        setPhase(typeof answer === "string" ? answer : "guest");
      },
      () => {
        if (current) setPhase("guest");
      },
    );
    return () => {
      current = false;
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [gameId]);

  function changed() {
    if (variant === "overlay") void refreshSheet(gameId, locale);
    else router.refresh();
  }

  async function run(
    action: (id: number) => Promise<OwnResult>,
    after: (result: OwnResult) => void,
  ) {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const result = await action(gameId);
      if (result.status === "guest") setPhase("guest");
      else if (result.status === "readOnly") setPhase("readOnly");
      else if (result.status === "error" || result.status === "notFound") {
        setFailed(true);
      } else {
        after(result);
        changed();
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  function add() {
    void run(markOwned, () => setPhase("owned"));
  }

  function remove() {
    void run(unmarkOwned, () => {
      setPhase("removed");
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(() => setPhase("notOwned"), UNDO_MS);
    });
  }

  function undo() {
    if (timer.current !== null) clearTimeout(timer.current);
    add();
  }

  if (phase === "guest") {
    return (
      <Link
        href={{ pathname: "/sign-in", query: { next: `/games/${gameId}` } }}
        className={cn(base, "text-center")}
      >
        {labels.own}
      </Link>
    );
  }

  if (phase === "removed") {
    return (
      <div role="status" className={cn(base, "flex-row gap-3")}>
        <span>{labels.removed}</span>
        <button
          type="button"
          onClick={undo}
          disabled={busy}
          className="min-h-9 rounded-full bg-(--sheet-ink-inverse) px-4 text-sm font-semibold text-(--sheet-ink) disabled:opacity-60"
        >
          {labels.undo}
        </button>
      </div>
    );
  }

  const disabled = phase === "loading" || phase === "readOnly" || busy;
  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={phase === "loading" || busy ? true : undefined}
      onClick={phase === "owned" ? remove : add}
      className={cn(base, disabled && "cursor-not-allowed opacity-70")}
    >
      {phase === "owned" ? labels.owned : labels.own}
      {phase === "readOnly" ? (
        <span className="text-xs font-medium">{labels.readOnly}</span>
      ) : null}
      {failed ? (
        <span role="alert" className="text-xs font-medium">
          {labels.error}
        </span>
      ) : null}
    </button>
  );
}
