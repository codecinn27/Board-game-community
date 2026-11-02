"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { createContext, useContext, useEffect } from "react";
import { DialogPortal } from "@/components/ui/dialog";
import { CloseButton } from "./close-button";
import { SheetError } from "./sheet-error";
import { SheetPreview } from "./sheet-preview";
import { SheetView } from "./sheet-view";
import {
  closeFromBack,
  closeSheet,
  getOpener,
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
  const { open, card, status, data, tint } = useSheetState();

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
          {/* Its own fade, timed with the sheet. The stock keyframe fade ended
                early and snapped back to full dark for a frame before unmount. */}
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-foreground/50 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-safe:transition-opacity motion-safe:duration-280 motion-safe:ease-out motion-safe:data-ending-style:duration-200" />
          <DialogPrimitive.Popup
            aria-labelledby={SHEET_TITLE_ID}
            finalFocus={() => getOpener() ?? true}
            style={sheetStyle(tint)}
            className="fixed inset-x-0 bottom-0 z-50 h-[96dvh] outline-none data-ending-style:translate-y-full data-starting-style:translate-y-full motion-safe:transition-[translate,opacity] motion-safe:duration-280 motion-safe:ease-out motion-safe:data-ending-style:duration-200 md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:data-ending-style:-translate-y-1/2 md:data-ending-style:opacity-0 md:data-starting-style:-translate-y-1/2 md:data-starting-style:opacity-0"
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
