import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ShelfLoader } from "@/components/shelf/shelf-loader";
import { ShelfSkeleton } from "@/components/shelf/shelf-skeleton";
import { getAlternates } from "@/i18n/alternates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shelf.meta");
  return {
    title: t("title"),
    description: t("description"),
    alternates: await getAlternates("/shelf"),
  };
}

async function ShelfFallback() {
  const t = await getTranslations("shelf");
  return <ShelfSkeleton label={t("loading")} />;
}

// The h1 sits outside Suspense, so it prerenders. `searchParams` is passed
// down unread: only ShelfLoader awaits it (Cache Components rule).
export default async function ShelfPage({
  searchParams,
}: PageProps<"/[locale]/shelf">) {
  const t = await getTranslations("shelf");

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-4 md:items-center md:gap-y-6">
      <h1 className="text-2xl font-semibold md:text-3xl">{t("heading")}</h1>
      <Suspense fallback={<ShelfFallback />}>
        <ShelfLoader searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
