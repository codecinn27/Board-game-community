"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { DialogPortal } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CloseButton } from "./close-button";
import { SheetError } from "./sheet-error";
import { SheetPreview } from "./sheet-preview";
import { animateClose, animateOpen } from "./sheet-motion";
import { SheetView } from "./sheet-view";
import {
  closeFromBack,
  closeSheet,
  finishClose,
  getOpener,
  getOriginRect,
  resetSheet,
  retrySheet,
  useSheetState,
} from "./sheet-store";
import { SHEET_TITLE_ID, sheetStyle } from "./sheet-theme";

const CloseContext = createContext<(() => void) | null>(null);

/** Starts the exit. Null outside the host. */
export function useSheetClose(): (() => void) | null {
  return useContext(CloseContext);
}

export type SheetHostLabels = {
  close: string;
  loading: string;
  errorTitle: string;
  errorBody: string;
  errorRetry: string;
  notFoundTitle: string;
  notFoundBody: string;
};

type SheetHostProps = {
  labels: SheetHostLabels;
};

/**
 * The one dialog (spec 0008, AC-12 to AC-14 and AC-21): a bottom sheet on
 * phones and a centered dialog from `md`, over the page the visitor is on. It
 * opens on a card tap from the card's own data, then shows the sheet the
 * server rendered. The URL does not change.
 */
export function SheetHost({ labels }: SheetHostProps) {
  const { open, closing, card, status, data, tint } = useSheetState();
  const popup = useRef<HTMLDivElement | null>(null);

  // The card grows into the modal as soon as the modal is on screen.
  const setPopup = useCallback((element: HTMLDivElement | null) => {
    popup.current = element;
    if (element) animateOpen(element, getOriginRect());
  }, []);

  // The modal shrinks back into the card, and only then goes away.
  useEffect(() => {
    if (!closing) return;
    const animation = popup.current
      ? animateClose(popup.current, getOriginRect())
      : null;
    if (animation === null) {
      finishClose();
      return;
    }
    let cancelled = false;
    animation.finished.then(
      () => {
        if (!cancelled) finishClose();
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [closing]);

  // The browser's Back pops the modal's own history entry.
  useEffect(() => {
    window.addEventListener("popstate", closeFromBack);
    return () => window.removeEventListener("popstate", closeFromBack);
  }, []);

  return (
    <CloseContext value={closeSheet}>
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) closeSheet();
        }}
        onOpenChangeComplete={(isOpen) => {
          if (!isOpen) resetSheet();
        }}
      >
        <DialogPortal>
          {/* Its own fade, timed with the motion of the modal. The stock keyframe
              fade ended early and snapped back to full dark for a frame. */}
          <DialogPrimitive.Backdrop
            className={cn(
              "fixed inset-0 z-50 bg-foreground/50 data-starting-style:opacity-0 motion-safe:transition-opacity motion-safe:duration-340 motion-safe:ease-out",
              closing && "opacity-0 motion-safe:duration-260",
            )}
          />
          <DialogPrimitive.Popup
            ref={setPopup}
            aria-labelledby={SHEET_TITLE_ID}
            finalFocus={() => getOpener() ?? true}
            style={sheetStyle(tint)}
            className="fixed inset-x-0 bottom-0 z-50 h-[96dvh] outline-none md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-6 -z-10 hidden rounded-[48px] bg-(--sheet-tint) opacity-60 blur-3xl md:block"
            />
            <div className="h-full overflow-y-auto overscroll-contain rounded-t-[32px] md:h-auto md:max-h-[90dvh] md:rounded-[28px]">
              {status === "ready" && data !== null ? (
                <SheetView
                  data={data}
                  variant="overlay"
                  closeControl={<CloseButton label={data.closeLabel} />}
                />
              ) : null}
              {status === "loading" && card !== null ? (
                <SheetPreview
                  card={card}
                  closeLabel={labels.close}
                  loadingLabel={labels.loading}
                />
              ) : null}
              {status === "error" || status === "notfound" ? (
                <div className="relative">
                  <CloseButton
                    label={labels.close}
                    className="absolute top-4 left-4 z-10"
                  />
                  <h2 id={SHEET_TITLE_ID} className="sr-only">
                    {status === "error"
                      ? labels.errorTitle
                      : labels.notFoundTitle}
                  </h2>
                  {status === "error" ? (
                    <SheetError
                      title={labels.errorTitle}
                      body={labels.errorBody}
                      retryLabel={labels.errorRetry}
                      onRetry={retrySheet}
                    />
                  ) : (
                    <div className="flex min-h-[40dvh] flex-col justify-center gap-2 bg-background px-6 py-16 text-center">
                      <p className="text-2xl font-semibold">
                        {labels.notFoundTitle}
                      </p>
                      <p className="text-muted-foreground">
                        {labels.notFoundBody}
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </DialogPrimitive.Popup>
        </DialogPortal>
      </DialogPrimitive.Root>
    </CloseContext>
  );
}
