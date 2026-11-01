import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GameSheetLoader } from "@/components/game-sheet/game-sheet-loader";
import { getAlternates } from "@/i18n/alternates";
import { getGameDetail, getGameIds } from "@/lib/games/detail";

const DESCRIPTION_LIMIT = 160;

export function generateStaticParams() {
  return getGameIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/games/[id]">): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("game");
  const game = await getGameDetail(id);
  if (!game)
    return {
      title: (await getTranslations("common.notFound"))("title"),
      robots: { index: false },
    };

  return {
    title: game.name,
    description:
      game.description === null
        ? t("meta.description")
        : Array.from(game.description).slice(0, DESCRIPTION_LIMIT).join(""),
    alternates: await getAlternates(`/games/${game.id}`),
  };
}

export default async function GamePage({
  params,
}: PageProps<"/[locale]/games/[id]">) {
  const { id } = await params;
  return <GameSheetLoader id={id} variant="page" />;
}
