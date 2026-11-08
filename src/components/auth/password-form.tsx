"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FieldGroup } from "@/components/ui/field";
import { initialState, type FormState } from "@/lib/auth/state";
import { AuthField } from "./auth-field";
import { FormError, HiddenContext, SubmitButton } from "./form-parts";

type PasswordFormProps = {
  action: (previous: FormState, data: FormData) => Promise<FormState>;
  /** `reset` is the page a reset link opens; `me` is the account page. */
  variant: "reset" | "me";
};

/** Two password fields, for the reset page and for `/me` (email members). */
export function PasswordForm({ action, variant }: PasswordFormProps) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(action, initialState);
  const submit = variant === "reset" ? "reset.submit" : "me.save";
  const wait = variant === "reset" ? "reset.pending" : "me.saving";
  // The reset page sits in the auth scene; `/me` keeps the site look.
  const look = variant === "reset" ? "scene" : "plain";

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <HiddenContext />
        <FormError error={state.error} look={look} />
        {state.ok && variant === "me" ? (
          <p role="status" className="text-sm text-primary">
            {t("me.passwordSaved")}
          </p>
        ) : null}
        <AuthField
          // A saved form starts clean: a new key remounts the inputs.
          key={state.ok ? "saved" : "editing"}
          name="password"
          label="newPassword"
          hint="password"
          type="password"
          autoComplete="new-password"
          error={state.fields?.password}
          look={look}
        />
        <AuthField
          key={state.ok ? "saved-confirm" : "editing-confirm"}
          name="confirm"
          label="confirmPassword"
          type="password"
          autoComplete="new-password"
          error={state.fields?.confirm}
          look={look}
        />
        <SubmitButton
          label={t(submit)}
          pendingLabel={t(wait)}
          pending={pending}
          look={look}
        />
      </FieldGroup>
    </form>
  );
}
