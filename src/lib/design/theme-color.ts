// Browser chrome colors for `viewport.themeColor`. Hex, because browsers handle
// oklch() poorly in the theme-color meta tag. contrast.test.ts checks each
// one stays within a rounding step of the token it mirrors.
export const themeColors = {
  /** Mirrors light `--background`: oklch(0.986 0.013 87). */
  light: "#fefaf1",
} as const;
