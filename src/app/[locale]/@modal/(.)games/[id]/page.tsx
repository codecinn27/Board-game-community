import { GameSheetLoader } from "@/components/game-sheet/game-sheet-loader";

// The overlay version of /games/[id]: same sheet, inside the dialog frame.
export default async function GameOverlay({
  params,
}: PageProps<"/[locale]/games/[id]">) {
  const { id } = await params;
  return <GameSheetLoader id={id} variant="overlay" />;
}
