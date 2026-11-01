"use client";

import { Share } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { glassButton, sheetFocusRing } from "./sheet-theme";

type ShareLabels = { copied: string; copyFailed: string };

const ShareContext = createContext<(() => void) | null>(null);

type ShareProviderProps = {
  /** The shared title: the game name. */
  title: string;
  labels: ShareLabels;
  children: ReactNode;
};

const MESSAGE_MS = 2000;

/**
 * One Share behavior for every Share button on the sheet (spec 0008, AC-11):
 * the native share sheet where it exists, otherwise copy the link and say so
 * in a polite live region. The link is always the current page address.
 */
export function ShareProvider({ title, labels, children }: ShareProviderProps) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  function say(text: string) {
    setMessage(text);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), MESSAGE_MS);
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      say(labels.copied);
    } catch {
      say(labels.copyFailed);
    }
  }

  async function share() {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // Cancelling the share sheet is not an error.
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }
    await copy(url);
  }

  return (
    <ShareContext value={() => void share()}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-28 z-10 flex justify-center px-4"
      >
        {message === "" ? null : (
          <p className="rounded-full bg-(--sheet-ink) px-4 py-2 text-sm font-medium text-(--sheet-ink-inverse)">
            {message}
          </p>
        )}
      </div>
    </ShareContext>
  );
}

type ShareButtonProps = {
  label: string;
  /** `glass` is the round button over the cover; `dock` shows the label. */
  variant: "glass" | "dock";
  className?: string;
};

export function ShareButton({ label, variant, className }: ShareButtonProps) {
  const share = useContext(ShareContext);

  if (variant === "glass") {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={() => share?.()}
        className={cn(glassButton, sheetFocusRing, className)}
      >
        <Share aria-hidden className="size-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => share?.()}
      className={cn(
        "inline-flex min-h-12 min-w-11 items-center justify-center gap-2 rounded-full border border-(--sheet-line) px-4 text-sm font-semibold text-(--sheet-ink)",
        sheetFocusRing,
        className,
      )}
    >
      <Share aria-hidden className="size-5" />
      {label}
    </button>
  );
}
