import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import zh from "../../messages/zh.json";

function keys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("message files", () => {
  it("have the same keys in English and Chinese", () => {
    expect(keys(zh).sort()).toEqual(keys(en).sort());
  });

  it("have no empty strings", () => {
    for (const messages of [en, zh]) {
      const flat = JSON.stringify(messages);
      expect(flat).not.toContain('""');
    }
  });

  // The parity test cannot catch a wrong name, so pin them: each language is
  // named in its own script, the same in both files (spec 0005, AC-3).
  it("name each language in its own script in both files", () => {
    for (const messages of [en, zh]) {
      expect(messages.common.language.names).toEqual({
        en: "English",
        zh: "中文",
      });
    }
  });

  it("keep the {name} slot in the language menu label", () => {
    expect(en.common.language.label).toContain("{name}");
    expect(zh.common.language.label).toContain("{name}");
  });

  it("keep the %s slot in the title template", () => {
    expect(en.shell.meta.titleTemplate).toContain("%s");
    expect(zh.shell.meta.titleTemplate).toContain("%s");
  });
});
