"use client";

import { useTranslations } from "next-intl";
import { signUpWithEmail } from "@/app/[locale]/sign-in/actions";
import { FieldGroup } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import { DISPLAY_NAME_MAX, USERNAME_MAX } from "@/lib/auth/validation";
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
          name="username"
          label="username"
          hint="username"
          autoComplete="username"
          maxLength={USERNAME_MAX}
          defaultValue={state.values?.username}
          error={state.fields?.username}
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
        <AuthField
          name="confirm"
          label="confirmRegister"
          type="password"
          autoComplete="new-password"
          error={state.fields?.confirm}
        />
        <Turnstile key={attempt} siteKey={siteKey} onToken={setToken} />
        <SubmitButton
          label={t("register.submit")}
          pendingLabel={t("register.pending")}
          pending={pending}
          disabled={token === ""}
        />
        <p className="px-2 text-center text-sm text-auth-ink-muted">
          {t.rich("register.privacy", {
            link: (chunks) => (
              <Link
                href="/privacy"
                className="font-medium text-auth-link underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-auth-ring focus-visible:outline-none"
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
