import { defineConfig } from "@playwright/test";

// Playwright does not load `.env.local` (only the dev server does), and the
// email checks need SUPABASE_SECRET_KEY, SMTP_URL, and MAILPIT_URL.
// `.env.e2e` (the local Supabase stack) loads first and wins: loadEnvFile never
// overwrites a variable that is already set, and the dev server that
// Playwright starts inherits these values over its own `.env.local`.
for (const file of [".env.e2e", ".env.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Missing file: the tests that need it skip or fail with a clear message.
  }
}

// Local only for now (spec 0004, AC-11): runs against `pnpm dev`, which needs
// `.env.local` because `/` reads Supabase. CI does not run it yet.
const sizes = [
  { name: "phone", width: 360, height: 800 },
  { name: "desktop", width: 1280, height: 800 },
] as const;
// The site is always light (spec 0004 follow up), so there is no dark project.
const schemes = ["light"] as const;

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  globalTeardown: "./e2e/global-teardown.ts",
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
