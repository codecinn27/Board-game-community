import { describe, expect, it } from "vitest";
import { buildAlternates } from "./alternates";

const site = "https://shelf.example";

describe("buildAlternates", () => {
  it("maps the home page with no trailing slash", () => {
    expect(buildAlternates(site, "zh", "/")).toEqual({
      canonical: "https://shelf.example/zh",
      languages: {
        en: "https://shelf.example/en",
        "zh-Hans": "https://shelf.example/zh",
        "x-default": "https://shelf.example/en",
      },
    });
  });

  it("gives each twin its own canonical and the same language map", () => {
    const en = buildAlternates(site, "en", "/games/12");
    const zh = buildAlternates(site, "zh", "/games/12");
    expect(en.canonical).toBe("https://shelf.example/en/games/12");
    expect(zh.canonical).toBe("https://shelf.example/zh/games/12");
    expect(zh.languages).toEqual(en.languages);
    expect(en.languages).toMatchObject({
      "zh-Hans": "https://shelf.example/zh/games/12",
      "x-default": "https://shelf.example/en/games/12",
    });
  });

  it("ignores a trailing slash on the site URL", () => {
    expect(buildAlternates(`${site}/`, "en", "/design").canonical).toBe(
      "https://shelf.example/en/design",
    );
  });
});
