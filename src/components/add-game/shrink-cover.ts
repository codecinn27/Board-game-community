import {
  COVER_MAX_BYTES,
  COVER_MAX_INPUT_BYTES,
  COVER_QUALITIES,
  COVER_WIDTHS,
  pickTint,
  TINT_SIZE,
} from "@/lib/games/cover-image";

export type CoverError = "coverTooBig" | "coverUnreadable" | "coverTooDetailed";

export type ShrunkCover = { blob: Blob; tint: string };

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** The first quality step that fits under the cap, or null. */
async function fit(
  canvas: HTMLCanvasElement,
  type: "image/webp" | "image/jpeg",
): Promise<Blob | null> {
  for (const quality of COVER_QUALITIES) {
    const blob = await toBlob(canvas, type, quality);
    if (blob === null || blob.type !== type) return null;
    if (blob.size <= COVER_MAX_BYTES) return blob;
  }
  return null;
}

/**
 * Shrinks a picked picture in the browser (spec 0013, AC-7): at most 600 px
 * wide, WebP (JPEG when the browser cannot write WebP), under 150 KB, plus its
 * main colour. Throws a `CoverError` code.
 */
export async function shrinkCover(file: File): Promise<ShrunkCover> {
  if (file.size > COVER_MAX_INPUT_BYTES)
    throw "coverTooBig" satisfies CoverError;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw "coverUnreadable" satisfies CoverError;
  }

  try {
    let blob: Blob | null = null;
    for (const limit of COVER_WIDTHS) {
      const width = Math.min(limit, bitmap.width);
      const height = Math.max(
        1,
        Math.round((bitmap.height * width) / bitmap.width),
      );
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (context === null) throw "coverUnreadable" satisfies CoverError;
      context.drawImage(bitmap, 0, 0, width, height);
      // A browser that cannot write WebP hands back a PNG: try JPEG then.
      blob =
        (await fit(canvas, "image/webp")) ?? (await fit(canvas, "image/jpeg"));
      if (blob !== null) break;
    }
    if (blob === null) throw "coverTooDetailed" satisfies CoverError;

    const small = document.createElement("canvas");
    small.width = TINT_SIZE;
    small.height = TINT_SIZE;
    const context = small.getContext("2d", { willReadFrequently: true });
    if (context === null) throw "coverUnreadable" satisfies CoverError;
    context.drawImage(bitmap, 0, 0, TINT_SIZE, TINT_SIZE);
    const tint = pickTint(
      context.getImageData(0, 0, TINT_SIZE, TINT_SIZE).data,
    );
    return { blob, tint };
  } finally {
    bitmap.close();
  }
}
