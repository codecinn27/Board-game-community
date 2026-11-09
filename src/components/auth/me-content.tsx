import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { signOut, updatePassword } from "@/app/[locale]/me/actions";
import { Button } from "@/components/ui/button";
import { IntlClientProvider } from "@/i18n/intl-client-provider";
import { Link, redirect } from "@/i18n/navigation";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { AuthHeading } from "./auth-layout";
import { DisplayNameForm } from "./display-name-form";
import { PasswordForm } from "./password-form";

/**
 * The `/me` body. It reads the session, so it runs under Suspense. A guest is
 * normally sent to sign in by `proxy.ts`; the redirect here is the backstop.
 */
export async function MeContent() {
  const [viewer, locale] = await Promise.all([getViewer(), getLocale()]);
  if (viewer.kind === "guest") {
    return redirect({
      href: { pathname: "/sign-in", query: { next: "/me" } },
      locale,
    });
  }

  const supabase = await createClient();
  const [t, messages, { data: profile }, { data: userData }] =
    await Promise.all([
      getTranslations("auth.me"),
      getMessages(),
      supabase
        .from("profiles")
        .select("display_name, status")
        .eq("id", viewer.id)
        .maybeSingle(),
      supabase.auth.getUser(),
    ]);

  const displayName = profile?.display_name ?? "";
  const disabled = profile?.status === "disabled";
  // Google members have no password here; email members can change theirs.
  const hasPassword =
    userData.user?.identities?.some(({ provider }) => provider === "email") ??
    false;

  return (
    <IntlClientProvider messages={{ auth: messages.auth }}>
      <AuthHeading title={t("heading")} />
      {disabled ? (
        <p
          role="status"
          className="rounded-lg border bg-secondary px-3 py-2 text-sm text-secondary-foreground"
        >
          {t("disabled")}
        </p>
      ) : null}

      <dl className="flex flex-col gap-1">
        <dt className="text-sm text-muted-foreground">{t("email")}</dt>
        <dd className="break-all">{viewer.email ?? ""}</dd>
      </dl>

      {disabled ? (
        <p className="text-lg font-semibold">{displayName}</p>
      ) : (
        <DisplayNameForm current={displayName} />
      )}

      {hasPassword ? (
        !disabled && (
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">{t("passwordHeading")}</h2>
            <PasswordForm action={updatePassword} variant="me" />
          </section>
        )
      ) : (
        <p className="text-sm text-muted-foreground">{t("googleNote")}</p>
      )}

      <Link
        href="/privacy"
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {t("privacy")}
      </Link>

      <form action={signOut}>
        <input type="hidden" name="locale" value={locale} />
        <Button
          type="submit"
          variant="outline"
          className="h-11 w-full text-base"
        >
          {t("signOut")}
        </Button>
      </form>
    </IntlClientProvider>
  );
}
