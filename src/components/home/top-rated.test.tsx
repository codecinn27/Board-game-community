import { beforeEach, describe, expect, it, vi } from "vitest";
import { type TopGame } from "@/lib/games/home";
import { render, setLocale, textOf } from "./test-intl";
import { TopRated } from "./top-rated";

vi.mock(
  "next-intl/server",
  async () => (await import("./test-intl")).intlServerMock,
);
vi.mock(
  "@/i18n/navigation",
  async () => (await import("./test-intl")).navigationMock,
);

// Spec 0006, AC-3, AC-4.

function top(rank: number, over: Partial<TopGame> = {}): TopGame {
  return {
    id: rank,
    name: `Game ${rank}`,
    coverTint: null,
    ownerCount: 2,
    avgRecommendation: 8,
    rank,
    ...over,
  };
}

async function section(games: TopGame[]) {
  return render(await TopRated({ games }));
}

describe("TopRated", () => {
  beforeEach(() => setLocale("en"));

  // covers: AC-3
  it("renders nothing when no game qualifies", async () => {
    expect(await TopRated({ games: [] })).toBeNull();
  });

  // covers: AC-3
  it("lists the games in the order given, as a numbered list", async () => {
    const html = await section([top(1), top(2), top(3)]);

    expect(html).toContain("<ol");
    const names = html
      .split("<li")
      .slice(1)
      .map((li) => /Game \d/.exec(li)?.[0]);
    expect(names).toEqual(["Game 1", "Game 2", "Game 3"]);
    expect(textOf(html)).toContain("Top rated");
  });

  // covers: AC-3
  it("shows the average with exactly one decimal", async () => {
    const html = await section([
      top(1, { avgRecommendation: 8 }),
      top(2, { avgRecommendation: 8.6 }),
      top(3, { avgRecommendation: 7.25 }),
    ]);

    expect(html).toMatch(/aria-label="8\.0 out of 10"[^>]*>[\s\S]*?8\.0</);
    expect(html).toContain('aria-label="8.6 out of 10"');
    expect(html).toMatch(
      /aria-label="7\.3 out of 10"|aria-label="7\.2 out of 10"/,
    );
  });

  // covers: AC-3
  it("reads the rating aloud in Chinese", async () => {
    setLocale("zh");

    const html = await section([top(1, { avgRecommendation: 8.6 })]);

    expect(html).toContain('aria-label="8.6 分（满分 10）"');
  });

  // covers: AC-3
  it("pluralizes the owner count in English", async () => {
    const html = await section([
      top(1, { ownerCount: 1 }),
      top(2, { ownerCount: 4 }),
    ]);

    expect(textOf(html)).toContain("1 owner");
    expect(textOf(html)).not.toContain("1 owners");
    expect(textOf(html)).toContain("4 owners");
  });

  // covers: AC-3
  it("writes the owner count in Chinese", async () => {
    setLocale("zh");

    const html = await section([
      top(1, { ownerCount: 1 }),
      top(2, { ownerCount: 3 }),
    ]);

    expect(textOf(html)).toContain("1 位主人");
    expect(textOf(html)).toContain("3 位主人");
  });

  // covers: AC-3
  it("hides the rank number and the star from screen readers", async () => {
    const html = await section([top(1)]);

    expect(html).toMatch(/<span[^>]*aria-hidden="true"[^>]*>1<\/span>/);
    expect(html).toMatch(
      /<svg[^>]*lucide-star[^>]*aria-hidden="true"|<svg[^>]*aria-hidden="true"[^>]*lucide-star/,
    );
  });

  // covers: AC-4
  it("makes each game one whole link to its sheet, name and rating inside", async () => {
    const html = await section([
      top(1, { id: 5, name: "SETI", avgRecommendation: 8.6 }),
    ]);

    const link = /<a[^>]*href="\/en\/games\/5"[^>]*>([\s\S]*?)<\/a>/.exec(
      html,
    )?.[1];
    expect(link).toBeDefined();
    expect(textOf(link ?? "")).toContain("SETI");
    expect(textOf(link ?? "")).toContain("8.6");
  });

  it("gives the section an accessible name from its title", async () => {
    const html = await section([top(1)]);

    expect(html).toMatch(/<section[^>]*aria-labelledby="top-rated"/);
  });
});
