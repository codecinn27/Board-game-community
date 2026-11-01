import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

// Proves the spec 0005 lint rules (AC-8) still bite: raw JSX text, imports that
// drop the language, and an unpicked message provider.

let eslint: ESLint;

// The first lint loads the whole config and its plugins, which is slow.
beforeAll(async () => {
  eslint = new ESLint({ overrideConfigFile: "eslint.config.mjs" });
  await eslint.lintText("", { filePath: "src/components/warm-up.tsx" });
}, 60_000);

async function ruleIds(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((m) => m.ruleId ?? "fatal");
}

const rawText = `export function A() {\n  return <p>Hello</p>;\n}\n`;

describe("raw JSX text", () => {
  it("fails in src/components and src/app", async () => {
    expect(await ruleIds(rawText, "src/components/shelf/a.tsx")).toContain(
      "react/jsx-no-literals",
    );
    expect(await ruleIds(rawText, "src/app/[locale]/shelf/page.tsx")).toContain(
      "react/jsx-no-literals",
    );
  });

  it("allows the listed punctuation and text in props", async () => {
    const code = `export function A({ n }: { n: number }) {\n  return <p title="Hi">({n})</p>;\n}\n`;
    expect(await ruleIds(code, "src/components/shelf/a.tsx")).toEqual([]);
  });

  it("is off for the design preview, ui, and tests", async () => {
    for (const path of [
      "src/components/design/a.tsx",
      "src/app/[locale]/design/page.tsx",
      "src/components/ui/a.tsx",
      "src/components/shelf/a.test.tsx",
    ]) {
      expect(await ruleIds(rawText, path), path).not.toContain(
        "react/jsx-no-literals",
      );
    }
  });
});

describe("imports that drop the language", () => {
  const cases = [
    `import Link from "next/link";\nexport { Link };\n`,
    `import { useRouter } from "next/navigation";\nexport { useRouter };\n`,
    `import { redirect } from "next/navigation";\nexport { redirect };\n`,
  ];

  it("fail anywhere in src, including admin exempt files", async () => {
    for (const code of cases) {
      for (const path of [
        "src/app/[locale]/page.tsx",
        "src/components/design/a.tsx",
        "src/app/[locale]/shelf/actions.ts",
      ]) {
        expect(await ruleIds(code, path), `${path}: ${code}`).toContain(
          "no-restricted-imports",
        );
      }
    }
  });

  it("allow notFound and useSearchParams", async () => {
    const code = `import { notFound, useSearchParams } from "next/navigation";\nexport { notFound, useSearchParams };\n`;
    expect(await ruleIds(code, "src/app/[locale]/page.tsx")).toEqual([]);
  });
});

describe("NextIntlClientProvider", () => {
  const code = `import { NextIntlClientProvider } from "next-intl";\nexport { NextIntlClientProvider };\n`;

  it("fails outside the wrapper", async () => {
    expect(await ruleIds(code, "src/components/shelf/a.tsx")).toContain(
      "no-restricted-imports",
    );
  });

  it("is allowed in the wrapper", async () => {
    expect(await ruleIds(code, "src/i18n/intl-client-provider.tsx")).toEqual(
      [],
    );
  });
});

describe("admin client rule still applies", () => {
  it("fails in a component", async () => {
    const code = `import { createAdminClient } from "@/lib/supabase/admin";\nexport { createAdminClient };\n`;
    expect(await ruleIds(code, "src/components/shelf/a.tsx")).toContain(
      "no-restricted-imports",
    );
  });
});
