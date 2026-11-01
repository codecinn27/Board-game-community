"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSheetClose } from "./sheet-frame";
import { glassButton, sheetFocusRing } from "./sheet-theme";

type CloseButtonProps = {
  label: string;
  className?: string;
};

/** The overlay's Close: asks the frame to play the exit, then go back. */
export function CloseButton({ label, className }: CloseButtonProps) {
  const close = useSheetClose();

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => close?.()}
      className={cn(glassButton, sheetFocusRing, className)}
    >
      <X aria-hidden className="size-5" />
    </button>
  );
}
