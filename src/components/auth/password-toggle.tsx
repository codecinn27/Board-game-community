"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type PasswordToggleProps = {
  /** The id of the password input this button shows or hides. */
  inputId: string;
  visible: boolean;
  onToggle: () => void;
  className?: string;
};

/**
 * Show or hide a password (spec 0010, AC-18). A toggle button: its name stays
 * "Show password" and `aria-pressed` says whether it is on, so a screen reader
 * hears "Show password, pressed" rather than a name that keeps changing.
 * A mouse press does not take focus from the input, so the caret stays put.
 */
export function PasswordToggle({
  inputId,
  visible,
  onToggle,
  className,
}: PasswordToggleProps) {
  const t = useTranslations("auth.password");
  const Icon = visible ? EyeOff : Eye;
  return (
    <button
      type="button"
      aria-controls={inputId}
      aria-pressed={visible}
      aria-label={t("show")}
      title={visible ? t("hide") : t("show")}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onToggle}
      className={cn(
        "absolute top-1/2 right-1.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-full focus-visible:ring-3 focus-visible:outline-none",
        className,
      )}
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}
