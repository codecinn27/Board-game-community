import { describe, expect, it } from "vitest";
import { escapeHtml } from "./escape";

describe("escapeHtml", () => {
  it("escapes the five HTML characters", () => {
    expect(escapeHtml(`<b>"x" & 'y'</b>`)).toBe(
      "&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;",
    );
  });

  it("leaves plain text and Chinese alone", () => {
    expect(escapeHtml("Mei 小美")).toBe("Mei 小美");
  });
});
