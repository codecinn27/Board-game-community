"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { updateDisplayName } from "@/app/[locale]/me/actions";
import { FieldGroup } from "@/components/ui/field";
import { initialState } from "@/lib/auth/state";
import { DISPLAY_NAME_MAX } from "@/lib/auth/validation";
import { AuthField } from "./auth-field";
import { FormError, HiddenContext, SubmitButton } from "./form-parts";

export function DisplayNameForm({ current }: { current: string }) {
  const t = useTranslations("auth.me");
  const [state, formAction, pending] = useActionState(
    updateDisplayName,
    initialState,
  );

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <HiddenContext />
        <FormError error={state.error} look="plain" />
        {state.ok ? (
          <p role="status" className="text-sm text-primary">
            {t("saved")}
          </p>
        ) : null}
        <AuthField
          name="displayName"
          label="displayName"
          hint="displayName"
          autoComplete="nickname"
          maxLength={DISPLAY_NAME_MAX}
          defaultValue={state.values?.displayName ?? current}
          error={state.fields?.displayName}
          look="plain"
        />
        <SubmitButton
          label={t("save")}
          pendingLabel={t("saving")}
          pending={pending}
          look="plain"
        />
      </FieldGroup>
    </form>
  );
}
