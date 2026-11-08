import { getMessages, getTranslations } from "next-intl/server";
import { IntlClientProvider } from "@/i18n/intl-client-provider";
import { hasInvitePass } from "@/lib/auth/invite-cookie";
import { safeNext } from "@/lib/auth/safe-next";
import { requireEnv } from "@/lib/supabase/env";
import { AuthCard, AuthFooter } from "./auth-scene";
import { Notice } from "./form-parts";
import { InviteForm } from "./invite-form";
import { RegisterForm } from "./register-form";
import { SignInForm } from "./sign-in-form";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const NOTICES = ["link"] as const;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The sign in page body. It reads `searchParams` and the invite cookie, so it
 * runs under Suspense and the page around it stays prerendered (Cache
 * Components, spec 0010).
 */
export async function SignInContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const register = first(params.mode) === "register";
  const next = safeNext(first(params.next));
  const noticeKey = NOTICES.find((key) => key === first(params.error));

  const [t, messages] = await Promise.all([
    getTranslations("auth"),
    getMessages(),
  ]);
  const siteKey = requireEnv(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  );

  // The pass is read here, on the server, so the register form is never sent
  // to a browser that has not entered the code.
  const hasPass = register && (await hasInvitePass());

  // The footer switch keeps the return page (AC-17).
  const query = (mode?: "register") => ({
    ...(mode ? { mode } : {}),
    ...(next === "/" ? {} : { next }),
  });

  const copy = !register
    ? { title: t("signIn.heading"), subtitle: t("signIn.subheading") }
    : hasPass
      ? { title: t("register.heading"), subtitle: t("register.subheading") }
      : { title: t("invite.heading"), subtitle: t("invite.body") };

  return (
    <AuthCard title={copy.title} subtitle={copy.subtitle}>
      <IntlClientProvider messages={{ auth: messages.auth }}>
        <div className="flex flex-col gap-5">
          {noticeKey ? <Notice message={t(`errors.${noticeKey}`)} /> : null}
          {!register ? (
            <SignInForm siteKey={siteKey} next={next} />
          ) : hasPass ? (
            <RegisterForm siteKey={siteKey} next={next} />
          ) : (
            <InviteForm siteKey={siteKey} next={next} />
          )}
        </div>
      </IntlClientProvider>
      {register ? (
        <AuthFooter
          prompt={t("switch.toSignInPrompt")}
          label={t("switch.toSignIn")}
          href={{ pathname: "/sign-in", query: query() }}
        />
      ) : (
        <AuthFooter
          prompt={t("switch.toRegisterPrompt")}
          label={t("switch.toRegister")}
          href={{ pathname: "/sign-in", query: query("register") }}
        />
      )}
    </AuthCard>
  );
}
