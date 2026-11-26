import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthColumn, AuthHeading } from "@/components/auth/auth-layout";
import { getAlternates } from "@/i18n/alternates";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("terms.meta");
  return {
    title: t("title"),
    description: t("description"),
    alternates: await getAlternates("/terms"),
  };
}

const SECTIONS = [
  "service",
  "account",
  "content",
  "admins",
  "games",
  "warranty",
  "changes",
] as const;

export default async function TermsPage() {
  const t = await getTranslations("terms");
  return (
    <AuthColumn>
      <AuthHeading title={t("heading")} body={t("intro")} />
      {SECTIONS.map((key) => (
        <section key={key} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t(`${key}.heading`)}</h2>
          <p>{t(`${key}.body`)}</p>
        </section>
      ))}
      <Link
        href="/privacy"
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {t("privacy")}
      </Link>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {t("back")}
      </Link>
    </AuthColumn>
  );
}
