import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ReviewLoader } from "@/components/review/review-loader";
import { Skeleton } from "@/components/ui/skeleton";
import { getAlternates } from "@/i18n/alternates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("review.meta");
  return {
    title: t("title"),
    alternates: await getAlternates("/admin/review"),
    robots: { index: false },
  };
}

async function Fallback() {
  const t = await getTranslations("review");
  return (
    <div
      aria-busy="true"
      aria-label={t("loading")}
      className="flex flex-col gap-4"
    >
      <Skeleton className="h-11 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

// The heading prerenders; the admin check and the lists sit under Suspense.
export default async function ReviewPage({
  searchParams,
}: PageProps<"/[locale]/admin/review">) {
  const t = await getTranslations("review");
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-2 md:py-6">
      <h1 className="text-2xl font-semibold md:text-3xl">{t("heading")}</h1>
      <Suspense fallback={<Fallback />}>
        <ReviewLoader searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
