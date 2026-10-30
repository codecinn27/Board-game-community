// Pure color math for the design token contrast test (spec 0004, AC-4).

/** An sRGB color with channels 0..1 (gamma encoded) and alpha 0..1. */
export type Rgba = { r: number; g: number; b: number; a: number };

const OKLCH_PATTERN =
  /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)(%?)\s*)?\)$/;

/** Parses `oklch(L C H)` or `oklch(L C H / A%)` into gamma sRGB. */
export function parseOklch(value: string): Rgba {
  const match = OKLCH_PATTERN.exec(value.trim());
  if (!match) throw new Error(`Not an oklch() color: ${value}`);
  const [, l, lPercent, c, h, alpha, alphaPercent] = match;
  if (l === undefined || c === undefined || h === undefined) {
    throw new Error(`Not an oklch() color: ${value}`);
  }
  const lightness = Number(l) / (lPercent ? 100 : 1);
  const a = alpha === undefined ? 1 : Number(alpha) / (alphaPercent ? 100 : 1);
  return { ...oklchToSrgb(lightness, Number(c), Number(h)), a };
}

/**
 * OKLCH to gamma encoded sRGB. Each channel is clamped to 0..1, a simple gamut
 * clip; browsers map out of gamut colors slightly differently.
 */
export function oklchToSrgb(
  l: number,
  c: number,
  hDegrees: number,
): Omit<Rgba, "a"> {
  const h = (hDegrees * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const lc = l_ ** 3;
  const mc = m_ ** 3;
  const sc = s_ ** 3;

  const r = 4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  const g = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  const bl = -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc;

  return { r: encode(clamp(r)), g: encode(clamp(g)), b: encode(clamp(bl)) };
}

/** Paints a translucent color over an opaque background, in sRGB space. */
export function composite(top: Rgba, bottom: Rgba): Rgba {
  const mix = (t: number, u: number) => t * top.a + u * (1 - top.a);
  return {
    r: mix(top.r, bottom.r),
    g: mix(top.g, bottom.g),
    b: mix(top.b, bottom.b),
    a: 1,
  };
}

/** WCAG 2 relative luminance of a gamma encoded sRGB color. */
export function relativeLuminance({ r, g, b }: Rgba): number {
  return 0.2126 * decode(r) + 0.7152 * decode(g) + 0.0722 * decode(b);
}

/** WCAG 2 contrast ratio of a text color on a background, 1 to 21. */
export function contrastRatio(text: Rgba, background: Rgba): number {
  const solid = composite(text, background);
  const lighter = Math.max(
    relativeLuminance(solid),
    relativeLuminance(background),
  );
  const darker = Math.min(
    relativeLuminance(solid),
    relativeLuminance(background),
  );
  return (lighter + 0.05) / (darker + 0.05);
}

/** `#rrggbb` for an opaque color. */
export function toHex({ r, g, b }: Rgba): string {
  const byte = (v: number) =>
    Math.round(clamp(v) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

/** Parses `#rrggbb`. */
export function parseHex(hex: string): Rgba {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Not a #rrggbb color: ${hex}`);
  const [, r, g, b] = match;
  const channel = (v: string | undefined) =>
    Number.parseInt(v ?? "0", 16) / 255;
  return { r: channel(r), g: channel(g), b: channel(b), a: 1 };
}

function clamp(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function encode(linear: number): number {
  return linear <= 0.0031308
    ? 12.92 * linear
    : 1.055 * linear ** (1 / 2.4) - 0.055;
}

function decode(gamma: number): number {
  return gamma <= 0.04045 ? gamma / 12.92 : ((gamma + 0.055) / 1.055) ** 2.4;
}
