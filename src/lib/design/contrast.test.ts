import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  parseHex,
  parseOklch,
  relativeLuminance,
  type Rgba,
} from "./contrast";
import { themeColors } from "./theme-color";

// Vitest runs from the repo root.
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

function declarations(block: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name && value) tokens.set(name, value.trim());
  }
  return tokens;
}

function lightTokens(): Map<string, string> {
  // The first top level `:root { ... }` block.
  const match = /^:root\s*\{([^}]*)\}/m.exec(css);
  if (!match?.[1]) throw new Error("No light :root block in globals.css");
  return declarations(match[1]);
}

function resolve(tokens: Map<string, string>, name: string): Rgba {
  let value = tokens.get(name);
  // Resolve `var(--x)` one level deep.
  const ref = value && /^var\((--[\w-]+)\)$/.exec(value);
  if (ref?.[1]) value = tokens.get(ref[1]);
  if (!value) throw new Error(`Missing token ${name}`);
  return parseOklch(value);
}

const covers = [1, 2, 3, 4, 5, 6].map((n) => `--cover-${n}`);

// [text, surfaces, minimum ratio]
const pairs: [string, string[], number][] = [
  [
    "--foreground",
    ["--background", "--card", "--popover", "--muted", "--accent"],
    4.5,
  ],
  ["--card-foreground", ["--card"], 4.5],
  ["--popover-foreground", ["--popover"], 4.5],
  ["--accent-foreground", ["--accent"], 4.5],
  ["--muted-foreground", ["--background", "--card", "--muted"], 4.5],
  ["--primary-foreground", ["--primary"], 4.5],
  ["--secondary-foreground", ["--secondary"], 4.5],
  ["--primary", ["--background", "--card"], 4.5],
  ["--destructive", ["--background", "--card"], 4.5],
  ["--foreground", covers, 4.5],
  ["--input", ["--background", "--card"], 3],
  ["--ring", ["--background", "--card"], 3],
];

describe("token contrast (WCAG 2.2 AA)", () => {
  const tokens = lightTokens();
  const cases = pairs.flatMap(([text, surfaces, min]) =>
    surfaces.map((surface) => [text, surface, min] as const),
  );

  it.each(cases)("%s on %s reaches %s:1", (text, surface, min) => {
    const ratio = contrastRatio(
      resolve(tokens, text),
      resolve(tokens, surface),
    );
    expect(ratio).toBeGreaterThanOrEqual(min);
  });
});

// Spec 0010, AC-20: the auth Dice Galaxy scene's own tokens, on `.auth-scene`.
function authTokens(): Map<string, string> {
  const match = /^\.auth-scene\s*\{([^}]*)\}/m.exec(css);
  if (!match?.[1]) throw new Error("No .auth-scene block in globals.css");
  return declarations(match[1]);
}

// The sky is a gradient, so text on it is checked on every stop.
const SKY = ["--auth-sky", "--auth-sky-mid", "--auth-sky-deep"];

const authPairs: [string, string[], number][] = [
  ["--auth-on-sky", SKY, 4.5],
  ["--auth-on-sky-muted", SKY, 4.5],
  ["--auth-ink", ["--auth-card", "--auth-field", "--auth-danger-bg"], 4.5],
  ["--auth-ink-muted", ["--auth-card", "--auth-field"], 4.5],
  ["--auth-link", ["--auth-card", "--auth-field"], 4.5],
  ["--auth-on-button", ["--auth-button-from", "--auth-button-to"], 4.5],
  ["--auth-danger", ["--auth-card", "--auth-danger-bg"], 4.5],
  ["--auth-field-line", ["--auth-card", "--auth-field"], 3],
  ["--auth-ring", ["--auth-card", "--auth-field"], 3],
  ["--auth-icon", ["--auth-field"], 3],
];

describe("auth Dice Galaxy scene contrast (WCAG 2.2 AA)", () => {
  const tokens = authTokens();
  const cases = authPairs.flatMap(([text, surfaces, min]) =>
    surfaces.map((name) => [text, name, min] as const),
  );

  it.each(cases)("%s on %s reaches %s:1", (text, name, min) => {
    expect(
      contrastRatio(resolve(tokens, text), resolve(tokens, name)),
    ).toBeGreaterThanOrEqual(min);
  });

  it("keeps the art colors out of text (fills only)", () => {
    const textTokens = authPairs.map(([text]) => text);
    for (const art of [
      "--auth-clay",
      "--auth-rose",
      "--auth-gold",
      "--auth-haze",
      "--auth-glow",
      "--auth-spark",
      "--auth-flame",
    ]) {
      expect(textTokens).not.toContain(art);
    }
  });
});

describe("themeColor hex mirrors --background", () => {
  it("matches the light background", () => {
    const token = resolve(lightTokens(), "--background");
    const meta = parseHex(themeColors.light);
    for (const channel of ["r", "g", "b"] as const) {
      // Within 2 sRGB steps per channel.
      expect(
        Math.abs(token[channel] - meta[channel]) * 255,
      ).toBeLessThanOrEqual(2);
    }
  });
});

describe("contrast math", () => {
  it("gives 21:1 for black on white", () => {
    expect(
      contrastRatio(parseOklch("oklch(0 0 0)"), parseOklch("oklch(1 0 0)")),
    ).toBeCloseTo(21, 1);
  });

  it("gives 1:1 for a color on itself", () => {
    const c = parseOklch("oklch(0.55 0.15 42)");
    expect(contrastRatio(c, c)).toBeCloseTo(1, 5);
  });

  it("composites a translucent color over its background", () => {
    const clear = parseOklch("oklch(0 0 0 / 0%)");
    const white = parseOklch("oklch(1 0 0)");
    expect(contrastRatio(clear, white)).toBeCloseTo(1, 5);
  });

  it("reads percent alpha", () => {
    expect(parseOklch("oklch(1 0 0 / 14%)").a).toBeCloseTo(0.14);
  });

  it("matches the WCAG luminance of mid grey", () => {
    expect(relativeLuminance(parseHex("#777777"))).toBeCloseTo(0.1845, 3);
  });

  it("fails a muted text that is too light", () => {
    const lowered = contrastRatio(
      parseOklch("oklch(0.7 0.025 60)"),
      parseOklch("oklch(0.985 0.012 85)"),
    );
    expect(lowered).toBeLessThan(4.5);
  });

  it("rejects a non oklch value", () => {
    expect(() => parseOklch("#fff")).toThrow();
  });
});
