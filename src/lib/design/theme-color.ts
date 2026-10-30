// Browser chrome colors for `viewport.themeColor`. Hex, because browsers handle
// oklch() poorly in the theme-color meta tag. contrast.test.ts checks each
// one stays within a rounding step of the token it mirrors.
export const themeColors = {
  /** Mirrors light `--background`: oklch(0.985 0.012 85). */
  light: "#fefaf1",
  /** Mirrors dark `--background`: oklch(0.19 0.012 50). */
  dark: "#18120f",
} as const;
