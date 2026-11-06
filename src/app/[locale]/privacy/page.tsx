import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthColumn, AuthHeading } from "@/components/auth/auth-layout";
import { getAlternates } from "@/i18n/alternates";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy.meta");
  return {
    title: t("title"),
    description: t("description"),
    alternates: await getAlternates("/privacy"),
  };
}

const STORED = ["email", "name", "activity"] as const;
const HANDLERS = ["supabase", "vercel", "turnstile"] as const;

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  return (
    <AuthColumn>
      <AuthHeading title={t("heading")} body={t("intro")} />
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("storedHeading")}</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {STORED.map((key) => (
            <li key={key}>{t(`stored.${key}`)}</li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("handlersHeading")}</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {HANDLERS.map((key) => (
            <li key={key}>{t(`handlers.${key}`)}</li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("choicesHeading")}</h2>
        <p>{t("choices")}</p>
      </section>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {t("back")}
      </Link>
    </AuthColumn>
  );
}
