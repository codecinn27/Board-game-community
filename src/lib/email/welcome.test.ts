import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import zh from "../../../messages/zh.json";
import { buildWelcomeEmail, type WelcomeTranslator } from "./welcome";

function translator(locale: "en" | "zh"): WelcomeTranslator {
  const t = createTranslator({
    locale,
    messages: locale === "en" ? en : zh,
    namespace: "WelcomeEmail",
  });
  return (key, values) => (t as unknown as WelcomeTranslator)(key, values);
}

const base = { siteUrl: "https://shelf.example.com", displayName: "Mei" };

describe("buildWelcomeEmail", () => {
  it("builds the English email with the name, list, and shelf link", () => {
    const mail = buildWelcomeEmail({
      ...base,
      locale: "en",
      t: translator("en"),
    });
    expect(mail.subject).toBe(en.WelcomeEmail.subject);
    expect(mail.html).toContain('lang="en"');
    expect(mail.html).toContain("Welcome, Mei!");
    expect(mail.html).toContain('href="https://shelf.example.com/en/shelf"');
    expect(mail.html.match(/<li /g)).toHaveLength(6);
    expect(mail.text).toContain(
      "Open the shelf: https://shelf.example.com/en/shelf",
    );
    expect(mail.text).toContain("- Rate games");
  });

  it("builds the Chinese email with a Chinese subject and /zh/shelf link", () => {
    const mail = buildWelcomeEmail({
      ...base,
      locale: "zh",
      t: translator("zh"),
    });
    expect(mail.subject).toBe(zh.WelcomeEmail.subject);
    expect(mail.html).toContain('lang="zh-Hans"');
    expect(mail.html).toContain('href="https://shelf.example.com/zh/shelf"');
    expect(mail.text).toContain("https://shelf.example.com/zh/shelf");
  });

  it("escapes the display name in the HTML", () => {
    const mail = buildWelcomeEmail({
      ...base,
      displayName: "<script>x</script>",
      locale: "en",
      t: translator("en"),
    });
    expect(mail.html).toContain("&lt;script&gt;x&lt;/script&gt;");
    expect(mail.html).not.toContain("<script>");
  });
});
