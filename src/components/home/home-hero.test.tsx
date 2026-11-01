import { beforeEach, describe, expect, it, vi } from "vitest";
import { type HomeGame } from "@/lib/games/home";
import { HomeHero } from "./home-hero";
import { render, setLocale, textOf } from "./test-intl";

vi.mock(
  "next-intl/server",
  async () => (await import("./test-intl")).intlServerMock,
);
vi.mock(
  "@/i18n/navigation",
  async () => (await import("./test-intl")).navigationMock,
);

// Spec 0006, AC-1, AC-5, AC-7.

const mosaic: HomeGame[] = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  name: `Game ${i + 1}`,
  coverTint: null,
  addedAt: "2026-10-01T00:00:00Z",
  addedByName: null,
}));

async function hero(props: {
  gameCount: number;
  memberCount: number;
  mosaic?: HomeGame[];
}) {
  return render(await HomeHero({ mosaic, ...props }));
}

function h1Of(html: string): string {
  const match = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html);
  if (!match?.[1]) throw new Error("No h1");
  return textOf(match[1]);
}

describe("HomeHero", () => {
  beforeEach(() => setLocale("en"));

  // covers: AC-1
  it("shows the count and label in the h1, then members and tagline", async () => {
    const html = await hero({ gameCount: 12, memberCount: 4 });

    expect(h1Of(html)).toBe("12 games on the shelf");
    expect(textOf(html)).toContain("Owned by 4 members.");
    expect(textOf(html)).toContain("Check here before you buy.");
  });

  // covers: AC-1
  it("uses the singular forms for one game and one member", async () => {
    const html = await hero({ gameCount: 1, memberCount: 1 });

    expect(h1Of(html)).toBe("1 game on the shelf");
    expect(textOf(html)).toContain("Owned by 1 member.");
  });

  // covers: AC-1
  it("groups a big count with the language's separator", async () => {
    const html = await hero({ gameCount: 1234, memberCount: 9 });

    expect(h1Of(html)).toBe("1,234 games on the shelf");
  });

  // covers: AC-1
  it("links Browse to the shelf in the same language", async () => {
    const en = await hero({ gameCount: 12, memberCount: 4 });
    expect(en).toMatch(/<a[^>]*href="\/en\/shelf"[^>]*>Browse the shelf<\/a>/);

    setLocale("zh");
    const zh = await hero({ gameCount: 12, memberCount: 4 });
    expect(zh).toMatch(/<a[^>]*href="\/zh\/shelf"[^>]*>浏览游戏架<\/a>/);
  });

  // covers: AC-1
  it("never mentions copies", async () => {
    const html = await hero({ gameCount: 12, memberCount: 4 });

    expect(textOf(html)).not.toMatch(/cop(y|ies)/i);
  });

  // covers: AC-1
  it("reads in Chinese with no plural form", async () => {
    setLocale("zh");

    const html = await hero({ gameCount: 12, memberCount: 4 });

    expect(h1Of(html)).toBe("12 款游戏在架上");
    expect(textOf(html)).toContain("由 4 位成员拥有。");
    expect(textOf(html)).toContain("买之前先来这里看看。");
  });

  // covers: AC-7
  it("renders a decorative mosaic of six tiles", async () => {
    const html = await hero({ gameCount: 12, memberCount: 4 });

    const mosaicHtml = /data-testid="mosaic"[\s\S]*?<\/section>/.exec(
      html,
    )?.[0];
    expect(mosaicHtml).toBeDefined();
    expect(html).toMatch(/aria-hidden="true"[^>]*data-testid="mosaic"/);
    expect(mosaicHtml?.match(/data-slot|aspect-square/g)).toHaveLength(6);
  });
});

describe("HomeHero with no games", () => {
  beforeEach(() => setLocale("en"));

  // covers: AC-5
  it("reads 'No games on the shelf yet' and hides members, tagline, and mosaic", async () => {
    const html = await hero({ gameCount: 0, memberCount: 0, mosaic: [] });

    expect(h1Of(html)).toBe("No games on the shelf yet");
    expect(textOf(html)).not.toContain("Owned by");
    expect(textOf(html)).not.toContain("Check here before you buy.");
    expect(html).not.toContain("mosaic");
  });

  // covers: AC-5
  it("keeps the Browse button", async () => {
    const html = await hero({ gameCount: 0, memberCount: 0, mosaic: [] });

    expect(html).toContain('href="/en/shelf"');
    expect(textOf(html)).toContain("Browse the shelf");
  });

  // covers: AC-5
  it("reads the empty line in Chinese", async () => {
    setLocale("zh");

    const html = await hero({ gameCount: 0, memberCount: 0, mosaic: [] });

    expect(h1Of(html)).toBe("架上还没有游戏");
  });
});

describe("HomeHero with games but no owning members", () => {
  beforeEach(() => setLocale("en"));

  // covers: AC-5
  it("hides only the member line", async () => {
    const html = await hero({ gameCount: 3, memberCount: 0 });

    expect(h1Of(html)).toBe("3 games on the shelf");
    expect(textOf(html)).not.toContain("Owned by");
    expect(textOf(html)).toContain("Check here before you buy.");
  });
});
