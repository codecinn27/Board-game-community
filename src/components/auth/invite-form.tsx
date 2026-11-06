"use client";

import { useTranslations } from "next-intl";
import { verifyInvite } from "@/app/[locale]/sign-in/actions";
import { FieldGroup } from "@/components/ui/field";
import { AuthField } from "./auth-field";
import { FormError, HiddenContext, SubmitButton } from "./form-parts";
import { Turnstile } from "./turnstile";
import { useAuthForm } from "./use-auth-form";

type InviteFormProps = { siteKey: string; next: string };

/** Step one of Create account: only the shared invite code (spec 0010). */
export function InviteForm({ siteKey, next }: InviteFormProps) {
  const t = useTranslations("auth");
  const { state, formAction, pending, token, setToken, attempt } =
    useAuthForm(verifyInvite);

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <HiddenContext next={next} />
        <input type="hidden" name="turnstileToken" value={token} />
        <FormError error={state.error} />
        <AuthField
          name="code"
          label="inviteCode"
          hint="inviteCode"
          autoComplete="off"
          error={state.fields?.code}
        />
        <Turnstile key={attempt} siteKey={siteKey} onToken={setToken} />
        <SubmitButton
          label={t("invite.submit")}
          pendingLabel={t("invite.pending")}
          pending={pending}
          disabled={token === ""}
        />
      </FieldGroup>
    </form>
  );
}
