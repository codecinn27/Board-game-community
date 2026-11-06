import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthColumn, AuthSkeleton } from "@/components/auth/auth-layout";
import { SignInContent } from "@/components/auth/sign-in-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.meta.signIn");
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: false },
  };
}

async function Fallback() {
  const t = await getTranslations("auth.meta.signIn");
  return <AuthSkeleton label={t("title")} />;
}

// `searchParams` is passed down unread: only SignInContent awaits it, inside
// Suspense (Cache Components rule).
export default function SignInPage({
  searchParams,
}: PageProps<"/[locale]/sign-in">) {
  return (
    <AuthColumn>
      <Suspense fallback={<Fallback />}>
        <SignInContent searchParams={searchParams} />
      </Suspense>
    </AuthColumn>
  );
}
