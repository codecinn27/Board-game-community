import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthScene, AuthSkeleton } from "@/components/auth/auth-scene";
import { SignInContent } from "@/components/auth/sign-in-content";

// Room for `after()` to finish the welcome email (spec 0011): three 10 s SMTP timeouts plus two database calls.
export const maxDuration = 30;

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
    <AuthScene>
      <Suspense fallback={<Fallback />}>
        <SignInContent searchParams={searchParams} />
      </Suspense>
    </AuthScene>
  );
}
