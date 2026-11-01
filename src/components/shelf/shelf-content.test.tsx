import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, setLocale, textOf } from "@/components/home/test-intl";
import { type ShelfData } from "@/lib/games/shelf";
import { ShelfContent } from "./shelf-content";
import { ShelfSkeleton } from "./shelf-skeleton";

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/home/test-intl")).navigationMock,
);

// Spec 0007, AC-5 to AC-8.

const data: ShelfData = {
  games: [
    {
      id: 1,
      name: "Azul",
      coverTint: null,
      ownerCount: 3,
      avgRecommendation: 7.8,
    },
    {
      id: 2,
      name: "Dixit",
      coverTint: null,
      ownerCount: 1,
      avgRecommendation: null,
    },
  ],
};
const empty: ShelfData = { games: [] };

describe("ShelfContent", () => {
  beforeEach(() => setLocale("en"));

  // covers: AC-1
  it("shows the count and the grid for All games", () => {
    const html = render(<ShelfContent data={data} view="all" />);

    expect(textOf(html)).toContain("2 games");
    expect(html.match(/<li/g)).toHaveLength(2);
  });

  // covers: AC-1
  it("says 1 game, and counts in Chinese", () => {
    const one: ShelfData = { games: data.games.slice(0, 1) };
    expect(textOf(render(<ShelfContent data={one} view="all" />))).toContain(
      "1 game",
    );
    setLocale("zh");
    expect(textOf(render(<ShelfContent data={data} view="all" />))).toContain(
      "2 款游戏",
    );
  });

  // covers: AC-5
  it("links the switch to both views and marks the current one", () => {
    const all = render(<ShelfContent data={data} view="all" />);
    expect(all).toMatch(/<nav[^>]*aria-label="Show games"/);
    expect(all).toMatch(
      /href="\/en\/shelf"[^>]*aria-current="page"[^>]*>All games</,
    );
    expect(all).toMatch(/href="\/en\/shelf\?view=owner"[^>]*>By owner</);
    expect(all.match(/aria-current="page"/g)).toHaveLength(1);

    const owner = render(<ShelfContent data={data} view="owner" />);
    expect(owner).toMatch(
      /href="\/en\/shelf\?view=owner"[^>]*aria-current="page"[^>]*>By owner</,
    );
  });

  // covers: AC-5
  it("links in Chinese", () => {
    setLocale("zh");

    const html = render(<ShelfContent data={data} view="all" />);

    expect(html).toContain('href="/zh/shelf?view=owner"');
    expect(textOf(html)).toContain("按主人");
  });

  // covers: AC-6
  it("shows the placeholder, the count, and the switch but no grid for By owner", () => {
    const html = render(<ShelfContent data={data} view="owner" />);

    expect(textOf(html)).toContain("By owner is coming soon");
    expect(textOf(html)).toContain("2 games");
    expect(html).toContain("<nav");
    expect(html).not.toContain("<li");
  });

  // covers: AC-7
  it.each(["all", "owner"] as const)(
    "shows only the empty block, no count, switch, or button, for %s",
    (view) => {
      const html = render(<ShelfContent data={empty} view={view} />);

      expect(textOf(html)).toContain("The shelf is empty");
      expect(textOf(html)).toContain("Members can add the games they own");
      expect(html).not.toContain("<nav");
      expect(html).not.toContain("<button");
      expect(html).not.toContain("<a ");
      expect(textOf(html)).not.toMatch(/\d+ games?/);
    },
  );

  // covers: AC-7
  it("writes the empty block in Chinese", () => {
    setLocale("zh");

    const html = render(<ShelfContent data={empty} view="all" />);

    expect(textOf(html)).toContain("游戏架还是空的");
  });
});

describe("ShelfSkeleton", () => {
  // covers: AC-8
  it("shows six placeholder cards, marked busy with the label", () => {
    const html = render(<ShelfSkeleton label="Loading games" />);

    expect(html).toMatch(
      /<ul[^>]*aria-busy="true"[^>]*aria-label="Loading games"/,
    );
    expect(html.match(/<li/g)).toHaveLength(6);
    expect(html).not.toContain("<a ");
  });
});
