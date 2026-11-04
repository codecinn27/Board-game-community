"use server";

import { hasLocale } from "@/i18n/routing";
import { getGameDetail } from "@/lib/games/detail";
import { buildSheetData, type SheetData } from "./sheet-data";

export type SheetResult =
  | { status: "ready"; data: SheetData }
  | { status: "notfound" }
  | { status: "error" };

/**
 * Reads one game and sends the modal everything it shows, as plain data
 * (spec 0008, AC-21). The sheet is drawn by `SheetView`, the same component the
 * page uses, and the read stays behind `getGameDetail`. A Server Action has no
 * route, so the language comes in as an argument, not from the URL.
 */
export async function loadGameSheet(
  id: number,
  locale: string,
): Promise<SheetResult> {
  try {
    if (!hasLocale(locale)) return { status: "notfound" };
    const game = await getGameDetail(String(id));
    if (game === null) return { status: "notfound" };
    return {
      status: "ready",
      data: await buildSheetData(game, locale, `/${locale}/games/${game.id}`),
    };
  } catch (error) {
    console.error("loadGameSheet failed", error);
    return { status: "error" };
  }
}
