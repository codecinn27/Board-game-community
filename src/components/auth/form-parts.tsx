"use client";

import { CircleAlert, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { type FormState } from "@/lib/auth/state";
import { cn } from "@/lib/utils";

/**
 * `scene`: the Dice Galaxy look on sign in, forgot, and reset (spec 0010,
 * AC-16).
 * `plain`: the site's own look, on `/me`.
 */
export type Look = "scene" | "plain";

const alertLook: Record<Look, string> = {
  scene:
    "flex items-start gap-2 rounded-xl bg-auth-danger-bg px-4 py-2.5 text-sm text-auth-danger",
  plain:
    "rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive",
};

function Alert({ message, look }: { message: string; look: Look }) {
  return (
    <p role="alert" className={alertLook[look]}>
      {look === "scene" ? (
        <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      ) : null}
      <span>{message}</span>
    </p>
  );
}

/** The form level error, announced to screen readers. */
export function FormError({
  error,
  look = "scene",
}: {
  error: FormState["error"];
  look?: Look;
}) {
  const t = useTranslations("auth.errors");
  if (!error) return null;
  return <Alert message={t(error)} look={look} />;
}

/** A page level notice from `?error=` (a bad link, a missing invite code). */
export function Notice({
  message,
  look = "scene",
}: {
  message: string;
  look?: Look;
}) {
  return <Alert message={message} look={look} />;
}

/** Language and return page, sent with every form (an action has no route). */
export function HiddenContext({ next }: { next?: string | undefined }) {
  const locale = useLocale();
  return (
    <>
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
    </>
  );
}

type SubmitButtonProps = {
  label: string;
  pendingLabel: string;
  pending: boolean;
  disabled?: boolean;
  look?: Look;
};

/** Full width, spinner and disabled while pending (design.md, Form fields). */
export function SubmitButton({
  label,
  pendingLabel,
  pending,
  disabled = false,
  look = "scene",
}: SubmitButtonProps) {
  const content = pending ? (
    <>
      <Loader2 aria-hidden className="size-5 animate-spin" />
      <span role="status">{pendingLabel}</span>
    </>
  ) : (
    label
  );

  if (look === "plain") {
    return (
      <Button
        type="submit"
        disabled={pending || disabled}
        className="h-11 w-full text-base"
      >
        {content}
      </Button>
    );
  }

  // Pink to violet, left to right; white text passes 4.5:1 on both ends
  // (AC-20).
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(
        "flex h-14 w-full items-center justify-center gap-2 rounded-full bg-linear-to-r from-auth-button-from to-auth-button-to text-lg font-bold text-auth-on-button shadow-[0_14px_24px_-12px_var(--auth-button-glow)]",
        "focus-visible:ring-3 focus-visible:ring-auth-ring focus-visible:ring-offset-2 focus-visible:ring-offset-auth-card focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60 motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.98]",
      )}
    >
      {content}
    </button>
  );
}
