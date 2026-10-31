import { defineConfig } from "@playwright/test";

// Local only for now (spec 0004, AC-11): runs against `pnpm dev`, which needs
// `.env.local` because `/` reads Supabase. CI does not run it yet.
const sizes = [
  { name: "phone", width: 360, height: 800 },
  { name: "desktop", width: 1280, height: 800 },
] as const;
const schemes = ["light", "dark"] as const;

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: sizes.flatMap((size) =>
    schemes.map((colorScheme) => ({
      name: `${size.name}-${colorScheme}`,
      use: {
        browserName: "chromium" as const,
        viewport: { width: size.width, height: size.height },
        colorScheme,
      },
    })),
  ),
});
