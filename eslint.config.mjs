import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

// Links and redirects keep the language only through @/i18n/navigation, and
// messages reach the browser only through IntlClientProvider (spec 0005).
const navigationMessage =
  "Import from @/i18n/navigation so links keep the language.";
const languagePaths = [
  { name: "next/link", message: navigationMessage },
  {
    name: "next/navigation",
    importNames: ["redirect", "permanentRedirect", "usePathname", "useRouter"],
    message: navigationMessage,
  },
  {
    name: "next-intl",
    importNames: ["NextIntlClientProvider"],
    message: "Use IntlClientProvider so messages are always picked.",
  },
];

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
          paths: languagePaths,
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
    // Admin client allowed here; the language rules still apply.
    rules: { "no-restricted-imports": ["error", { paths: languagePaths }] },
  },
  {
    files: ["src/i18n/intl-client-provider.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: languagePaths.filter((path) => path.name !== "next-intl"),
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
    // Interface text goes through next-intl, never raw JSX text (spec 0005).
    files: ["src/app/**/*.tsx", "src/components/**/*.tsx"],
    rules: {
      "react/jsx-no-literals": [
        "error",
        {
          noStrings: false,
          ignoreProps: true,
          allowedStrings: ["·", "(", ")", "/", ":", ",", "+"],
        },
      ],
    },
  },
  {
    files: [
      "src/components/ui/**",
      "src/app/[[]locale]/design/**",
      "src/components/design/**",
      "src/**/*.test.{ts,tsx}",
    ],
    rules: { "react/jsx-no-literals": "off" },
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
