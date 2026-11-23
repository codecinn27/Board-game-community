import { describe, expect, it } from "vitest";
import { COVER_MAX_BYTES, coverKind, isTint, pickTint } from "./cover-image";

// Spec 0013, AC-7.

function pixels(...list: [number, number, number, number][]): number[] {
  return list.flat();
}

describe("pickTint", () => {
  it("averages the pixels into lower case #rrggbb", () => {
    expect(pickTint(pixels([200, 0, 0, 255], [100, 0, 0, 255]))).toBe(
      "#960000",
    );
  });

  it("skips see through, near white, and near black pixels", () => {
    const tint = pickTint(
      pixels(
        [10, 120, 200, 255],
        [255, 255, 255, 255],
        [0, 0, 0, 255],
        [250, 10, 10, 0],
      ),
    );
    expect(tint).toBe("#0a78c8");
  });

  it("keeps a pixel that is white in only some channels", () => {
    expect(pickTint(pixels([255, 255, 100, 255]))).toBe("#ffff64");
  });

  it("uses every pixel when all of them are skipped", () => {
    expect(pickTint(pixels([255, 255, 255, 255], [0, 0, 0, 255]))).toBe(
      "#808080",
    );
  });

  it("returns mid grey for no pixels", () => {
    expect(pickTint([])).toBe("#808080");
  });

  it("always returns a valid tint", () => {
    expect(isTint(pickTint(pixels([1, 2, 3, 255])))).toBe(true);
  });
});

describe("coverKind", () => {
  const webp = Uint8Array.from([
    0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50,
  ]);

  it("recognises WebP and JPEG by their first bytes", () => {
    expect(coverKind(webp)).toBe("webp");
    expect(coverKind(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
  });

  it("refuses everything else, even with an image name", () => {
    expect(coverKind(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(coverKind(new Uint8Array())).toBeNull();
    // RIFF that is not WebP (a WAV file)
    expect(
      coverKind(
        Uint8Array.from([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45,
        ]),
      ),
    ).toBeNull();
  });
});

describe("isTint and the size cap", () => {
  it("accepts only lower case #rrggbb", () => {
    expect(isTint("#0a78c8")).toBe(true);
    expect(isTint("#0A78C8")).toBe(false);
    expect(isTint("0a78c8")).toBe(false);
    expect(isTint("#fff")).toBe(false);
  });

  it("caps a cover at 150 KB", () => {
    expect(COVER_MAX_BYTES).toBe(153600);
  });
});
