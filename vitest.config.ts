import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Same `@/` alias as tsconfig.json.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Playwright specs run with `pnpm test:e2e`, not Vitest.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
