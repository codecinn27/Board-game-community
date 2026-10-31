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

  it("keep the %s slot in the title template", () => {
    expect(en.shell.meta.titleTemplate).toContain("%s");
    expect(zh.shell.meta.titleTemplate).toContain("%s");
  });
});
