import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { IntlClientProvider } from "@/i18n/intl-client-provider";
import { redirect } from "@/i18n/navigation";
import { getViewer } from "@/lib/auth/viewer";
import { AddGame } from "./add-game";

/**
 * The Add page body. It reads the session, so it runs under Suspense. A guest
 * is normally sent to sign in by `proxy.ts`; the redirect is the backstop.
 */
export async function AddGameLoader() {
  const [viewer, locale, t, messages] = await Promise.all([
    getViewer(),
    getLocale(),
    getTranslations("addGame"),
    getMessages(),
  ]);
  if (viewer.kind === "guest") {
    return redirect({
      href: { pathname: "/sign-in", query: { next: "/games/new" } },
      locale,
    });
  }
  if (viewer.status === "disabled") {
    return (
      <p
        role="status"
        className="rounded-lg border bg-secondary px-3 py-2 text-secondary-foreground"
      >
        {t("readOnly")}
      </p>
    );
  }
  return (
    <IntlClientProvider messages={{ addGame: messages.addGame }}>
      <AddGame displayName={viewer.displayName ?? t("you")} />
    </IntlClientProvider>
  );
}
