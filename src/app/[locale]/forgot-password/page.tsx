import { type Metadata } from "next";
import { getMessages, getTranslations } from "next-intl/server";
import { AuthCard, AuthFooter, AuthScene } from "@/components/auth/auth-scene";
import { ForgotForm } from "@/components/auth/forgot-form";
import { IntlClientProvider } from "@/i18n/intl-client-provider";
import { requireEnv } from "@/lib/supabase/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.meta.forgot");
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: false },
  };
}

// Static: a signed in member is sent away by `proxy.ts` before this renders.
export default async function ForgotPasswordPage() {
  const [t, messages] = await Promise.all([
    getTranslations("auth.forgot"),
    getMessages(),
  ]);
  return (
    <AuthScene>
      <AuthCard title={t("heading")} subtitle={t("body")}>
        <IntlClientProvider messages={{ auth: messages.auth }}>
          <ForgotForm
            siteKey={requireEnv(
              process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
              "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
            )}
          />
        </IntlClientProvider>
        <AuthFooter
          prompt={t("rememberedPrompt")}
          label={t("remembered")}
          href="/sign-in"
        />
      </AuthCard>
    </AuthScene>
  );
}
