"use client";

import { useTranslations } from "next-intl";
import { requestPasswordReset } from "@/app/[locale]/forgot-password/actions";
import { FieldGroup } from "@/components/ui/field";
import { AuthField } from "./auth-field";
import { CheckEmail } from "./check-email";
import { FormError, HiddenContext, SubmitButton } from "./form-parts";
import { Turnstile } from "./turnstile";
import { useAuthForm } from "./use-auth-form";

export function ForgotForm({ siteKey }: { siteKey: string }) {
  const t = useTranslations("auth.forgot");
  const { state, formAction, pending, token, setToken, attempt } =
    useAuthForm(requestPasswordReset);

  if (state.sent) return <CheckEmail kind="reset" />;

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <HiddenContext />
        <input type="hidden" name="turnstileToken" value={token} />
        <FormError error={state.error} />
        <AuthField
          name="email"
          label="email"
          type="email"
          autoComplete="email"
          defaultValue={state.values?.email}
          error={state.fields?.email}
        />
        <Turnstile key={attempt} siteKey={siteKey} onToken={setToken} />
        <SubmitButton
          label={t("submit")}
          pendingLabel={t("pending")}
          pending={pending}
          disabled={token === ""}
        />
      </FieldGroup>
    </form>
  );
}
