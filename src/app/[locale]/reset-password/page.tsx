import { type Metadata } from "next";
import { getMessages, getTranslations } from "next-intl/server";
import { AuthColumn, AuthHeading } from "@/components/auth/auth-layout";
import { PasswordForm } from "@/components/auth/password-form";
import { IntlClientProvider } from "@/i18n/intl-client-provider";
import { resetPassword } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.meta.reset");
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: false },
  };
}

// Static: `proxy.ts` sends anyone without a reset link session to
// `/forgot-password` before this renders (spec 0010, AC-12).
export default async function ResetPasswordPage() {
  const [t, messages] = await Promise.all([
    getTranslations("auth.reset"),
    getMessages(),
  ]);
  return (
    <AuthColumn>
      <AuthHeading title={t("heading")} />
      <IntlClientProvider messages={{ auth: messages.auth }}>
        <PasswordForm action={resetPassword} variant="reset" />
      </IntlClientProvider>
    </AuthColumn>
  );
}
