import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  oklchToSrgb,
  parseHex,
  srgbToOklch,
  toHex,
} from "./contrast";
import {
  coverTheme,
  DARK_INK,
  MIN_CONTRAST,
  parseColor,
  textSurfaces,
  WHITE_INK,
  type CoverTheme,
} from "./cover-tint";

// Spec 0004, AC-12.

function expectReadable(theme: CoverTheme, label: string) {
  const ink = parseColor(theme.ink);
  const muted = parseColor(theme.inkMuted);
  for (const [i, surface] of textSurfaces(theme).entries()) {
    expect(
      contrastRatio(ink, surface),
      `${label}: ink on surface ${i}`,
    ).toBeGreaterThanOrEqual(MIN_CONTRAST);
  }
  // Muted text sits on the backgrounds and the stats card, not on chips.
  for (const [i, surface] of textSurfaces(theme).slice(0, 4).entries()) {
    expect(
      contrastRatio(muted, surface),
      `${label}: muted ink on surface ${i}`,
    ).toBeGreaterThanOrEqual(MIN_CONTRAST);
  }
  // The main button: inverse text on an ink fill.
  expect(
    contrastRatio(parseColor(theme.inkInverse), ink),
    `${label}: button text`,
  ).toBeGreaterThanOrEqual(MIN_CONTRAST);
}

const named = {
  black: "#000000",
  white: "#ffffff",
  red: "#e0452e",
  green: "#4b6b4f",
  teal: "#3fa6c2",
  cream: "#f3ead2",
  grey: "#808080",
  yellow: "#f2c230",
  purple: "#9a7bd0",
} as const;

describe("coverTheme", () => {
  it.each(Object.entries(named))(
    "keeps every text readable for %s",
    (name, hex) => {
      expectReadable(coverTheme(hex), name);
    },
  );

  it("keeps every text readable across the color range", () => {
    for (let hue = 0; hue < 360; hue += 20) {
      for (let l = 0; l <= 1.0001; l += 0.05) {
        for (const c of [0, 0.05, 0.1, 0.2, 0.3]) {
          const hex = toHex({ ...oklchToSrgb(l, c, hue), a: 1 });
          expectReadable(coverTheme(hex), hex);
        }
      }
    }
  });

  it("uses black text on pale covers and white on dark or saturated ones", () => {
    expect(coverTheme(named.cream).ink).toBe(DARK_INK);
    expect(coverTheme(named.white).ink).toBe(DARK_INK);
    expect(coverTheme(named.red).ink).toBe(WHITE_INK);
    expect(coverTheme(named.green).ink).toBe(WHITE_INK);
    expect(coverTheme(named.black).ink).toBe(WHITE_INK);
  });

  it("calms the color: chroma never above 0.14 and never the exact sample", () => {
    for (const hex of Object.values(named)) {
      const tint = srgbToOklch(parseHex(coverTheme(hex).tint));
      // A little slack for rounding to 8 bit channels.
      expect(tint.c, hex).toBeLessThanOrEqual(0.145);
    }
    expect(coverTheme(named.red).tint).not.toBe(named.red);
  });

  it("keeps the hue family of the cover", () => {
    const sample = srgbToOklch(parseHex(named.red));
    const tint = srgbToOklch(parseHex(coverTheme(named.red).tint));
    expect(Math.abs(tint.h - sample.h)).toBeLessThan(8);
  });

  it("makes the deep shade darker than the tint", () => {
    for (const hex of Object.values(named)) {
      const theme = coverTheme(hex);
      const tint = srgbToOklch(parseHex(theme.tint));
      const deep = srgbToOklch(parseHex(theme.deep));
      expect(deep.l, hex).toBeLessThan(tint.l);
    }
  });

  it("darkens a middle grey until white text works", () => {
    const theme = coverTheme(named.grey);
    expect([WHITE_INK, DARK_INK]).toContain(theme.ink);
    expectReadable(theme, "grey");
  });

  it("returns only #rrggbb and rgba() strings", () => {
    const theme = coverTheme(named.teal);
    for (const [key, value] of Object.entries(theme)) {
      expect(
        /^#[\da-f]{6}$/.test(value) ||
          /^rgba\(\d+, \d+, \d+, [\d.]+\)$/.test(value),
        `${key}: ${value}`,
      ).toBe(true);
    }
  });

  it("rejects a sample that is not #rrggbb", () => {
    expect(() => coverTheme("red")).toThrow();
  });
});

describe("coverTheme surfaces and button", () => {
  it("pairs each ink with the opposite inverse ink for the main button", () => {
    expect(coverTheme(named.green).inkInverse).toBe(DARK_INK);
    expect(coverTheme(named.cream).inkInverse).toBe(WHITE_INK);
  });

  it("lists five opaque text surfaces: tint, deep, card on both, chip on tint", () => {
    const surfaces = textSurfaces(coverTheme(named.teal));
    expect(surfaces).toHaveLength(5);
    for (const surface of surfaces) expect(surface.a).toBe(1);
  });

  it("keeps the muted ink at 82% or more of the ink", () => {
    for (const hex of Object.values(named)) {
      expect(
        parseColor(coverTheme(hex).inkMuted).a,
        hex,
      ).toBeGreaterThanOrEqual(0.82);
    }
  });
});

describe("parseColor", () => {
  it("reads a #rrggbb string as an opaque color", () => {
    expect(parseColor("#ff0000")).toEqual({ r: 1, g: 0, b: 0, a: 1 });
  });

  it("reads an rgba() string with its alpha", () => {
    const color = parseColor("rgba(255, 0, 51, 0.22)");
    expect(color.r).toBe(1);
    expect(color.g).toBe(0);
    expect(color.b).toBeCloseTo(0.2, 5);
    expect(color.a).toBe(0.22);
  });

  it("rejects a color this module never returns", () => {
    expect(() => parseColor("hsl(0 100% 50%)")).toThrow(/Not a theme color/);
  });
});

describe("srgbToOklch", () => {
  it("matches known OKLCH values for white, black, and pure red", () => {
    const white = srgbToOklch(parseHex("#ffffff"));
    expect(white.l).toBeCloseTo(1, 3);
    expect(white.c).toBeLessThan(0.001);

    expect(srgbToOklch(parseHex("#000000")).l).toBeCloseTo(0, 5);

    // Reference: oklch(0.628 0.2577 29.23) for #ff0000.
    const red = srgbToOklch(parseHex("#ff0000"));
    expect(red.l).toBeCloseTo(0.628, 3);
    expect(red.c).toBeCloseTo(0.2577, 3);
    expect(red.h).toBeCloseTo(29.23, 1);
  });

  it("returns a hue between 0 and 360 for a blue (negative atan2)", () => {
    const { h } = srgbToOklch(parseHex("#0000ff"));
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(360);
    expect(h).toBeCloseTo(264.05, 0);
  });

  it("round trips with oklchToSrgb", () => {
    for (const hex of Object.values(named)) {
      const back = toHex({ ...oklchToSrgb(...lch(hex)), a: 1 });
      expect(back).toBe(hex);
    }
  });
});

function lch(hex: string): [number, number, number] {
  const { l, c, h } = srgbToOklch(parseHex(hex));
  return [l, c, h];
}
