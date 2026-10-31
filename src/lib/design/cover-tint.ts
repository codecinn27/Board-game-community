// Cover Tint (spec 0004, AC-12): turns one color sampled from the bottom of a
// game's cover into the colors of its detail sheet. Every text pair it returns
// reaches WCAG AA (4.5:1), whatever the input.

import {
  composite,
  contrastRatio,
  oklchToSrgb,
  parseHex,
  srgbToOklch,
  toHex,
  type Rgba,
} from "./contrast";

/** The sheet's colors, as CSS color strings. */
export type CoverTheme = {
  /** Main background, right under the cover's fade. */
  tint: string;
  /** Background at the bottom of the sheet. */
  deep: string;
  /** Text and icons: white or near black. */
  ink: string;
  /** Secondary text, such as stat labels. */
  inkMuted: string;
  /** Text on a surface filled with `ink`, such as the main button. */
  inkInverse: string;
  /** Borders and dividers. */
  line: string;
  /** Chip fill. */
  chip: string;
  /** Stats card fill, over the tint. */
  card: string;
  /** Round glass buttons over the cover. */
  glass: string;
  /** The floating dock. */
  dock: string;
};

export const WHITE_INK = "#ffffff";
export const DARK_INK = "#1b1410";

/** The smallest contrast any text pair in a theme may have. */
export const MIN_CONTRAST = 4.5;

const MAX_CHROMA = 0.14;
const CHROMA_SCALE = 0.85;
const LIGHTNESS_SHIFT = 0.06;
const DEEP_SHIFT_DARK = 0.1;
const DEEP_SHIFT_PALE = 0.06;
/** A tint this light or lighter is "pale" and gets a gentler deep shade. */
const PALE_LIGHTNESS = 0.7;
const DARKEN_STEP = 0.02;

const white = parseHex(WHITE_INK);
const dark = parseHex(DARK_INK);

/**
 * The theme for a sheet, from the average color of the bottom of its cover
 * (`#rrggbb`). The color is calmed (less chroma, a bit darker) so the sheet is
 * the same family as the cover, never the exact color.
 */
export function coverTheme(sampleHex: string): CoverTheme {
  const sample = srgbToOklch(parseHex(sampleHex));
  const chroma = Math.min(sample.c * CHROMA_SCALE, MAX_CHROMA);
  const hue = sample.h;
  let lightness = clamp(sample.l - LIGHTNESS_SHIFT, 0.1, 0.96);

  // Try white, then near black; if neither reads on both shades, darken until
  // white does. Lightness 0.1 always passes with white, so this ends.
  for (;;) {
    const tint = solid(lightness, chroma, hue);
    const deepShift =
      lightness >= PALE_LIGHTNESS ? DEEP_SHIFT_PALE : DEEP_SHIFT_DARK;
    const deep = solid(
      Math.max(lightness - deepShift, 0.05),
      chroma * 0.9,
      hue,
    );

    const ink = [white, dark].find((candidate) =>
      themeReads(candidate, tint, deep),
    );
    if (ink) return buildTheme(ink, tint, deep);
    if (lightness <= 0.1) return buildTheme(white, tint, deep);
    lightness = Math.max(lightness - DARKEN_STEP, 0.1);
  }
}

/** Every surface that text sits on, for a given ink. */
export function textSurfaces(theme: CoverTheme): Rgba[] {
  const tint = parseColor(theme.tint);
  const deep = parseColor(theme.deep);
  const card = parseColor(theme.card);
  const chip = parseColor(theme.chip);
  return [
    tint,
    deep,
    composite(card, tint),
    composite(card, deep),
    composite(chip, tint),
  ];
}

/** Parses the `#rrggbb` or `rgba(r, g, b, a)` strings this module returns. */
export function parseColor(value: string): Rgba {
  if (value.startsWith("#")) return parseHex(value);
  const match = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/.exec(
    value,
  );
  if (!match) throw new Error(`Not a theme color: ${value}`);
  const [, r, g, b, a] = match;
  return {
    r: Number(r) / 255,
    g: Number(g) / 255,
    b: Number(b) / 255,
    a: Number(a),
  };
}

function themeReads(ink: Rgba, tint: Rgba, deep: Rgba): boolean {
  const { card, chip } = surfaceFills(ink);
  return [
    tint,
    deep,
    composite(card, tint),
    composite(card, deep),
    composite(chip, tint),
  ].every((surface) => contrastRatio(ink, surface) >= MIN_CONTRAST);
}

function buildTheme(ink: Rgba, tint: Rgba, deep: Rgba): CoverTheme {
  const isWhite = ink === white;
  const fills = surfaceFills(ink);
  const surfaces = [
    tint,
    deep,
    composite(fills.card, tint),
    composite(fills.card, deep),
  ];

  // Muted text starts at 82% and rises until it still reads everywhere.
  let mutedAlpha = 0.82;
  while (
    mutedAlpha < 1 &&
    !surfaces.every(
      (s) => contrastRatio({ ...ink, a: mutedAlpha }, s) >= MIN_CONTRAST,
    )
  ) {
    mutedAlpha = Math.min(1, mutedAlpha + 0.04);
  }

  return {
    tint: toHex(tint),
    deep: toHex(deep),
    ink: toHex(ink),
    inkMuted: rgba(ink, mutedAlpha),
    inkInverse: isWhite ? DARK_INK : WHITE_INK,
    line: rgba(ink, 0.22),
    chip: rgba(fills.chip, fills.chip.a),
    card: rgba(fills.card, fills.card.a),
    glass: isWhite ? rgba(parseHex("#000000"), 0.28) : rgba(white, 0.5),
    dock: rgba(deep, 0.82),
  };
}

function surfaceFills(ink: Rgba): { card: Rgba; chip: Rgba } {
  return ink === white
    ? { card: { ...parseHex("#000000"), a: 0.2 }, chip: { ...white, a: 0.16 } }
    : { card: { ...white, a: 0.45 }, chip: { ...dark, a: 0.08 } };
}

function solid(l: number, c: number, h: number): Rgba {
  // Round trip through hex so the checks see exactly what the page paints.
  return parseHex(toHex({ ...oklchToSrgb(l, c, h), a: 1 }));
}

function rgba({ r, g, b }: Rgba, a: number): string {
  const byte = (v: number) => Math.round(v * 255);
  return `rgba(${byte(r)}, ${byte(g)}, ${byte(b)}, ${Number(a.toFixed(2))})`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
