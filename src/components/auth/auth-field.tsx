"use client";

import { KeyRound, Lock, Mail, User, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ComponentProps, useLayoutEffect, useRef, useState } from "react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type FieldCode } from "@/lib/auth/validation";
import { cn } from "@/lib/utils";
import { type Look } from "./form-parts";
import { PasswordToggle } from "./password-toggle";

type FieldLabelKey =
  | "email"
  | "password"
  | "newPassword"
  | "confirmPassword"
  | "displayName"
  | "username"
  | "identifier"
  | "confirmRegister"
  | "inviteCode";

/** The icon inside each scene field, on the left (spec 0010, AC-18). */
const ICONS: Record<FieldLabelKey, LucideIcon> = {
  email: Mail,
  password: Lock,
  newPassword: Lock,
  confirmPassword: Lock,
  displayName: User,
  username: User,
  identifier: User,
  confirmRegister: Lock,
  inviteCode: KeyRound,
};

type AuthFieldProps = {
  name: string;
  /** Key under `auth.fields`. */
  label: FieldLabelKey;
  /** Key under `auth.hints`, shown under the field. */
  hint?: "displayName" | "username" | "password" | "inviteCode";
  error?: FieldCode | undefined;
  type?: ComponentProps<"input">["type"];
  autoComplete?: string;
  defaultValue?: string | undefined;
  maxLength?: number;
  /** `scene` is the Dice Galaxy field on the auth pages; `plain` is the site field. */
  look?: Look;
};

/**
 * One labelled input with its hint and its error under it. In the auth scene
 * the label is visually hidden and repeated as the placeholder; it is still a
 * real `<label>`, so the field keeps its name. Password inputs get a show or
 * hide button.
 */
export function AuthField({
  name,
  label,
  hint,
  error,
  type = "text",
  autoComplete,
  defaultValue,
  maxLength,
  look = "scene",
}: AuthFieldProps) {
  const t = useTranslations("auth");
  const id = `field-${name}`;
  const text = t(`fields.${label}`);
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const caret = useRef<[number | null, number | null] | null>(null);

  // Switching the type can drop the selection in some browsers: put it back.
  useLayoutEffect(() => {
    const element = input.current;
    const saved = caret.current;
    caret.current = null;
    if (!element || !saved || document.activeElement !== element) return;
    element.setSelectionRange(saved[0], saved[1]);
  }, [visible]);

  const toggle = () => {
    const element = input.current;
    if (element) caret.current = [element.selectionStart, element.selectionEnd];
    setVisible((on) => !on);
  };

  const inputProps = {
    ref: input,
    id,
    name,
    type: isPassword && visible ? "text" : type,
    autoComplete,
    defaultValue,
    maxLength,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
  } as const;

  const scene = look === "scene";
  const Icon = ICONS[label];

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id} className={cn(scene && "sr-only")}>
        {text}
      </FieldLabel>
      {scene ? (
        <div className="relative">
          <Icon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-auth-icon"
          />
          <input
            {...inputProps}
            placeholder={text}
            className={cn(
              "h-13 w-full rounded-xl border border-auth-field-line bg-auth-field pr-4 pl-12 text-base text-auth-ink outline-none placeholder:text-auth-ink-muted focus-visible:ring-3 focus-visible:ring-auth-ring aria-invalid:border-2 aria-invalid:border-auth-danger",
              isPassword && "pr-14",
            )}
          />
          {isPassword ? (
            <PasswordToggle
              inputId={id}
              visible={visible}
              onToggle={toggle}
              className="right-1 rounded-lg text-auth-ink-muted hover:text-auth-ink focus-visible:ring-auth-ring"
            />
          ) : null}
        </div>
      ) : (
        <div className="relative">
          <Input
            {...inputProps}
            className={cn("h-11", isPassword && "pr-12")}
          />
          {isPassword ? (
            <PasswordToggle
              inputId={id}
              visible={visible}
              onToggle={toggle}
              className="right-0 text-muted-foreground hover:text-foreground focus-visible:ring-ring"
            />
          ) : null}
        </div>
      )}
      {hint ? (
        <FieldDescription
          id={`${id}-hint`}
          className={cn(scene && "px-1 text-auth-ink-muted")}
        >
          {t(`hints.${hint}`)}
        </FieldDescription>
      ) : null}
      {error ? (
        <FieldError
          id={`${id}-error`}
          className={cn(scene && "px-1 text-auth-danger")}
        >
          {t(`fieldErrors.${error}`)}
        </FieldError>
      ) : null}
    </Field>
  );
}
