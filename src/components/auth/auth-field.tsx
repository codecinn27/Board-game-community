"use client";

import { useTranslations } from "next-intl";
import { type ComponentProps } from "react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type FieldCode } from "@/lib/auth/validation";

type AuthFieldProps = {
  name: string;
  /** Key under `auth.fields`. */
  label:
    | "email"
    | "password"
    | "newPassword"
    | "confirmPassword"
    | "displayName"
    | "inviteCode";
  /** Key under `auth.hints`, shown under the field. */
  hint?: "displayName" | "password" | "inviteCode";
  error?: FieldCode | undefined;
  type?: ComponentProps<"input">["type"];
  autoComplete?: string;
  defaultValue?: string | undefined;
  maxLength?: number;
};

/** One labelled input with its hint and its error under it (design.md). */
export function AuthField({
  name,
  label,
  hint,
  error,
  type = "text",
  autoComplete,
  defaultValue,
  maxLength,
}: AuthFieldProps) {
  const t = useTranslations("auth");
  const id = `field-${name}`;
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{t(`fields.${label}`)}</FieldLabel>
      <Input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="h-11"
      />
      {hint ? (
        <FieldDescription id={`${id}-hint`}>
          {t(`hints.${hint}`)}
        </FieldDescription>
      ) : null}
      {error ? (
        <FieldError id={`${id}-error`}>{t(`fieldErrors.${error}`)}</FieldError>
      ) : null}
    </Field>
  );
}
