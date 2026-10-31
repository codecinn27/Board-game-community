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

function darkTokens(): Map<string, string> {
  const match =
    /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}/.exec(
      css,
    );
  if (!match?.[1]) throw new Error("No dark :root block in globals.css");
  // Dark overrides light; anything not overridden keeps its light value.
  return new Map([...lightTokens(), ...declarations(match[1])]);
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

const modes = [
  ["light", lightTokens],
  ["dark", darkTokens],
] as const;

describe.each(modes)("%s mode token contrast (WCAG 2.2 AA)", (_mode, load) => {
  const tokens = load();
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

describe("themeColor hex mirrors --background", () => {
  it.each([
    ["light", themeColors.light, lightTokens],
    ["dark", themeColors.dark, darkTokens],
  ] as const)("%s %s", (_mode, hex, load) => {
    const token = resolve(load(), "--background");
    const meta = parseHex(hex);
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
