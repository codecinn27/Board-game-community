import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/supabase/admin", "**/supabase/admin"],
              message:
                "Use createAdminClient only in server actions, route handlers, proxy.ts, or src/lib/supabase.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/lib/supabase/**",
      "src/**/actions.ts",
      "src/app/**/route.ts",
      "src/proxy.ts",
      "src/**/*.test.{ts,tsx}",
    ],
    rules: { "no-restricted-imports": "off" },
  },
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored and generated files.
    ".claude/**",
    ".agents/**",
    "supabase/**",
    "src/lib/supabase/database.types.ts",
  ]),
]);

export default eslintConfig;
