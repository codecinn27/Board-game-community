import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AddGameLoader } from "@/components/add-game/add-game-loader";
import { Skeleton } from "@/components/ui/skeleton";
import { getAlternates } from "@/i18n/alternates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("addGame.meta");
  return {
    title: t("title"),
    description: t("description"),
    alternates: await getAlternates("/games/new"),
    robots: { index: false },
  };
}

async function Fallback() {
  const t = await getTranslations("addGame");
  return (
    <div
      aria-busy="true"
      aria-label={t("loading")}
      className="flex flex-col gap-4"
    >
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-5 w-2/3" />
    </div>
  );
}

// The heading prerenders; the session read sits under Suspense.
export default async function AddGamePage() {
  const t = await getTranslations("addGame");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-2 md:py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold md:text-3xl">{t("heading")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>
      <Suspense fallback={<Fallback />}>
        <AddGameLoader />
      </Suspense>
    </div>
  );
}
