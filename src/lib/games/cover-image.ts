// Pure helpers for the cover picture (spec 0013, AC-7 and AC-8). The browser
// does the drawing; the server repeats the byte checks.

/** A stored cover is at most this many bytes (150 KB, same as the bucket cap). */
export const COVER_MAX_BYTES = 153_600;
/** A picture picked from the device may be at most 15 MB before shrinking. */
export const COVER_MAX_INPUT_BYTES = 15 * 1024 * 1024;
export const COVER_WIDTHS = [600, 480] as const;
export const COVER_QUALITIES = [0.82, 0.72, 0.62, 0.52, 0.42] as const;
export const TINT_SIZE = 24;

export type CoverKind = "webp" | "jpeg";

/** Real file type from the first bytes, never from the name or the header. */
export function coverKind(bytes: Uint8Array): CoverKind | null {
  const riff = [0x52, 0x49, 0x46, 0x46];
  const webp = [0x57, 0x45, 0x42, 0x50];
  if (
    bytes.length >= 12 &&
    riff.every((value, index) => bytes[index] === value) &&
    webp.every((value, index) => bytes[8 + index] === value)
  ) {
    return "webp";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpeg";
  }
  return null;
}

export function isTint(value: string): boolean {
  return /^#[0-9a-f]{6}$/.test(value);
}

function hex(value: number): string {
  return Math.round(value).toString(16).padStart(2, "0");
}

/**
 * The cover's main colour: the average of the RGBA pixels, skipping see
 * through, near white (all channels above 240), and near black (all below 16)
 * ones. When every pixel is skipped, it averages them all. `#rrggbb`, lower
 * case; `#808080` for no pixels at all.
 */
export function pickTint(pixels: ArrayLike<number>): string {
  function average(
    keep: (r: number, g: number, b: number, a: number) => boolean,
  ) {
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let i = 0; i + 3 < pixels.length; i += 4) {
      const pr = pixels[i] ?? 0;
      const pg = pixels[i + 1] ?? 0;
      const pb = pixels[i + 2] ?? 0;
      const pa = pixels[i + 3] ?? 0;
      if (!keep(pr, pg, pb, pa)) continue;
      r += pr;
      g += pg;
      b += pb;
      count += 1;
    }
    return count === 0 ? null : { r: r / count, g: g / count, b: b / count };
  }

  const picked =
    average(
      (r, g, b, a) =>
        a >= 128 &&
        !(r > 240 && g > 240 && b > 240) &&
        !(r < 16 && g < 16 && b < 16),
    ) ?? average(() => true);
  if (picked === null) return "#808080";
  return `#${hex(picked.r)}${hex(picked.g)}${hex(picked.b)}`;
}
