"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  createContext,
  useContext,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";

const CloseContext = createContext<(() => void) | null>(null);

/** Starts the exit; `router.back()` runs when it ends. Null outside the overlay. */
export function useSheetClose(): (() => void) | null {
  return useContext(CloseContext);
}

// The card the visitor tapped. A loading frame can be replaced by the real
// one, so a capture made while a dialog has focus never replaces it.
let opener: HTMLElement | null = null;

function captureOpener(): HTMLElement | null {
  if (typeof document === "undefined") return opener;
  const active = document.activeElement;
  if (active instanceof HTMLElement && !active.closest('[role="dialog"]')) {
    opener = active === document.body ? null : active;
  }
  return opener;
}

type SheetFrameProps = {
  /** The `--sheet-*` variables, so the glow and the popup share the theme. */
  style: CSSProperties;
  /** Id of the element that names the dialog. */
  labelledBy?: string;
  /** Names the dialog when no title element exists (loading, error). */
  label?: string;
  children: ReactNode;
};

/**
 * The overlay frame (spec 0008, AC-12 to AC-14): a bottom sheet on phones and
 * a centered dialog from `md`. One close path: exit, then `router.back()`.
 */
export function SheetFrame({
  style,
  labelledBy,
  label,
  children,
}: SheetFrameProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [returnTo] = useState(captureOpener);

  function finishClose() {
    if (window.history.length > 1) router.back();
    else router.replace("/shelf");
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) finishClose();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-foreground/50 supports-backdrop-filter:backdrop-blur-none" />
        <DialogPrimitive.Popup
          aria-labelledby={labelledBy}
          aria-label={labelledBy ? undefined : label}
          finalFocus={() => returnTo}
          style={style}
          className="fixed inset-x-0 bottom-0 z-50 h-[96dvh] outline-none data-ending-style:translate-y-full data-starting-style:translate-y-full motion-safe:transition-[transform,opacity] motion-safe:duration-280 motion-safe:ease-out motion-safe:data-ending-style:duration-200 md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:data-ending-style:-translate-y-1/2 md:data-ending-style:opacity-0 md:data-starting-style:-translate-y-1/2 md:data-starting-style:opacity-0"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 -z-10 hidden rounded-[48px] bg-(--sheet-tint) opacity-60 blur-3xl md:block"
          />
          <CloseContext value={() => setOpen(false)}>
            <div className="h-full overflow-y-auto overscroll-contain rounded-t-[32px] md:h-auto md:max-h-[90dvh] md:rounded-[28px]">
              {children}
            </div>
          </CloseContext>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
