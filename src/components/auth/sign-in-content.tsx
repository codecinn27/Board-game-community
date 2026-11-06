import { getMessages, getTranslations } from "next-intl/server";
import { IntlClientProvider } from "@/i18n/intl-client-provider";
import { Link } from "@/i18n/navigation";
import { hasInvitePass } from "@/lib/auth/invite-cookie";
import { safeNext } from "@/lib/auth/safe-next";
import { requireEnv } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";
import { AuthHeading } from "./auth-layout";
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

  const query = (mode?: "register") => ({
    ...(mode ? { mode } : {}),
    ...(next === "/" ? {} : { next }),
  });
  const tab = (active: boolean) =>
    cn(
      "flex min-h-11 flex-1 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none",
      active && "bg-card text-foreground shadow-sm",
    );

  const heading = !register
    ? t("signIn.heading")
    : hasPass
      ? t("register.heading")
      : t("invite.heading");

  return (
    <IntlClientProvider messages={{ auth: messages.auth }}>
      <nav
        aria-label={t("tabs.label")}
        className="flex gap-1 rounded-lg bg-secondary p-1"
      >
        <Link
          href={{ pathname: "/sign-in", query: query() }}
          aria-current={register ? undefined : "page"}
          className={tab(!register)}
        >
          {t("tabs.signIn")}
        </Link>
        <Link
          href={{ pathname: "/sign-in", query: query("register") }}
          aria-current={register ? "page" : undefined}
          className={tab(register)}
        >
          {t("tabs.register")}
        </Link>
      </nav>

      <AuthHeading
        title={heading}
        {...(register && !hasPass ? { body: t("invite.body") } : {})}
      />
      {noticeKey ? <Notice message={t(`errors.${noticeKey}`)} /> : null}

      {!register ? (
        <>
          <SignInForm siteKey={siteKey} next={next} />
        </>
      ) : hasPass ? (
        <>
          <RegisterForm siteKey={siteKey} next={next} />
        </>
      ) : (
        <InviteForm siteKey={siteKey} next={next} />
      )}
    </IntlClientProvider>
  );
}
