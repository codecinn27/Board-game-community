import { type CSSProperties } from "react";
import { coverTheme } from "@/lib/design/cover-tint";
import { NEUTRAL_SHEET_TINT } from "@/lib/games/detail";

/**
 * The `--sheet-*` variables for a sheet: the one place colors come from data
 * (spec 0008, AC-5). A game with no tint gets the fixed neutral one.
 */
export function sheetStyle(coverTint: string | null): CSSProperties {
  const theme = coverTheme(coverTint ?? NEUTRAL_SHEET_TINT);
  return {
    "--sheet-tint": theme.tint,
    "--sheet-deep": theme.deep,
    "--sheet-ink": theme.ink,
    "--sheet-ink-muted": theme.inkMuted,
    "--sheet-ink-inverse": theme.inkInverse,
    "--sheet-line": theme.line,
    "--sheet-chip": theme.chip,
    "--sheet-card": theme.card,
    "--sheet-glass": theme.glass,
    "--sheet-dock": theme.dock,
  } as CSSProperties;
}

/** Id of the sheet's title, so the overlay can label itself by it. */
export const SHEET_TITLE_ID = "game-sheet-title";

/** Focus ring on a themed control. */
export const sheetFocusRing =
  "outline-none focus-visible:ring-3 focus-visible:ring-(--sheet-ink) focus-visible:ring-offset-2 focus-visible:ring-offset-(--sheet-tint)";

/** The round glass buttons over the cover. */
export const glassButton =
  "inline-flex size-11 items-center justify-center rounded-full border border-(--sheet-line) bg-(--sheet-glass) text-(--sheet-ink) backdrop-blur-md";
