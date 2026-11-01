import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HomeHero } from "@/components/home/home-hero";
import { JustAdded } from "@/components/home/just-added";
import { TopRated } from "@/components/home/top-rated";
import { getAlternates } from "@/i18n/alternates";
import { getHomeData } from "@/lib/games/home";

export async function generateMetadata(): Promise<Metadata> {
  const [t, tShell] = await Promise.all([
    getTranslations("home.meta"),
    getTranslations("shell"),
  ]);
  return {
    title: { absolute: tShell("brand") },
    description: t("description"),
    alternates: await getAlternates("/"),
  };
}

export default async function HomePage() {
  const { gameCount, memberCount, newest, topRated } = await getHomeData();

  return (
    <div className="flex flex-col gap-6 lg:gap-12">
      <HomeHero
        gameCount={gameCount}
        memberCount={memberCount}
        mosaic={newest}
      />
      {gameCount > 0 ? (
        <>
          <JustAdded games={newest} />
          <TopRated games={topRated} />
        </>
      ) : null}
    </div>
  );
}
