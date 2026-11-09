"use client";

import { useTranslations } from "next-intl";
import { signInWithEmail } from "@/app/[locale]/sign-in/actions";
import { FieldGroup } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import { AuthField } from "./auth-field";
import { FormError, HiddenContext, SubmitButton } from "./form-parts";
import { Turnstile } from "./turnstile";
import { useAuthForm } from "./use-auth-form";

type SignInFormProps = { siteKey: string; next: string };

export function SignInForm({ siteKey, next }: SignInFormProps) {
  const t = useTranslations("auth");
  const { state, formAction, pending, token, setToken, attempt } =
    useAuthForm(signInWithEmail);

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <HiddenContext next={next} />
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
        <AuthField
          name="password"
          label="password"
          type="password"
          autoComplete="current-password"
          error={state.fields?.password}
        />
        {/* Right aligned under the password, like the reference (AC-17). */}
        <div className="-mt-4 flex justify-end">
          <Link
            href="/forgot-password"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-auth-link underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-auth-ring focus-visible:outline-none"
          >
            {t("signIn.forgot")}
          </Link>
        </div>
        <Turnstile key={attempt} siteKey={siteKey} onToken={setToken} />
        <SubmitButton
          label={t("signIn.submit")}
          pendingLabel={t("signIn.pending")}
          pending={pending}
          disabled={token === ""}
        />
      </FieldGroup>
    </form>
  );
}
