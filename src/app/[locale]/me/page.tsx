import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthColumn, AuthSkeleton } from "@/components/auth/auth-layout";
import { MeContent } from "@/components/auth/me-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.meta.me");
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: false },
  };
}

async function Fallback() {
  const t = await getTranslations("auth.meta.me");
  return <AuthSkeleton label={t("title")} />;
}

export default function MePage() {
  return (
    <AuthColumn>
      <Suspense fallback={<Fallback />}>
        <MeContent />
      </Suspense>
    </AuthColumn>
  );
}
