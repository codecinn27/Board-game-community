"use client";

import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { type FormState } from "@/lib/auth/state";

/** The form level error, announced to screen readers. */
export function FormError({ error }: { error: FormState["error"] }) {
  const t = useTranslations("auth.errors");
  if (!error) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {t(error)}
    </p>
  );
}

/** A page level notice from `?error=` (a bad link, a missing invite code). */
export function Notice({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
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
};

/** Full width, spinner and disabled while pending (design.md, Form fields). */
export function SubmitButton({
  label,
  pendingLabel,
  pending,
  disabled = false,
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className="h-11 w-full text-base"
    >
      {pending ? (
        <>
          <Loader2 aria-hidden className="size-5 animate-spin" />
          <span role="status">{pendingLabel}</span>
        </>
      ) : (
        label
      )}
    </Button>
  );
}
