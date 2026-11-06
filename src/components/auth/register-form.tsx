"use client";

import { useTranslations } from "next-intl";
import { signUpWithEmail } from "@/app/[locale]/sign-in/actions";
import { FieldGroup } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import { DISPLAY_NAME_MAX } from "@/lib/auth/validation";
import { AuthField } from "./auth-field";
import { FormError, HiddenContext, SubmitButton } from "./form-parts";
import { Turnstile } from "./turnstile";
import { useAuthForm } from "./use-auth-form";

type RegisterFormProps = { siteKey: string; next: string };

/** Step two of Create account, shown only while an invite pass is held. */
export function RegisterForm({ siteKey, next }: RegisterFormProps) {
  const t = useTranslations("auth");
  const { state, formAction, pending, token, setToken, attempt } =
    useAuthForm(signUpWithEmail);

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <HiddenContext next={next} />
        <input type="hidden" name="turnstileToken" value={token} />
        <FormError error={state.error} />
        <AuthField
          name="displayName"
          label="displayName"
          hint="displayName"
          autoComplete="nickname"
          maxLength={DISPLAY_NAME_MAX}
          defaultValue={state.values?.displayName}
          error={state.fields?.displayName}
        />
        <AuthField
          name="email"
          label="email"
          type="email"
          autoComplete="email"
          defaultValue={state.values?.email}
          error={state.fields?.email}
        />
        <AuthField
          name="password"
          label="password"
          hint="password"
          type="password"
          autoComplete="new-password"
          error={state.fields?.password}
        />
        <Turnstile key={attempt} siteKey={siteKey} onToken={setToken} />
        <SubmitButton
          label={t("register.submit")}
          pendingLabel={t("register.pending")}
          pending={pending}
          disabled={token === ""}
        />
        <p className="text-center text-sm text-muted-foreground">
          {t.rich("register.privacy", {
            link: (chunks) => (
              <Link
                href="/privacy"
                className="font-medium text-primary underline underline-offset-4"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </FieldGroup>
    </form>
  );
}
