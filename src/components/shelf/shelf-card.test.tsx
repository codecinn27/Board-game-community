import { beforeEach, describe, expect, it, vi } from "vitest";
import { type ShelfCard as ShelfCardData } from "@/lib/games/shelf";
import { render, setLocale, textOf } from "@/components/home/test-intl";
import { ShelfCard } from "./shelf-card";
import { ShelfGrid } from "./shelf-grid";

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/home/test-intl")).navigationMock,
);

// Spec 0007, AC-1, AC-2.

function card(over: Partial<ShelfCardData> = {}): ShelfCardData {
  return {
    id: 5,
    name: "SETI",
    coverTint: null,
    ownerCount: 2,
    avgRecommendation: 8.5,
    ...over,
  };
}

describe("ShelfCard", () => {
  beforeEach(() => setLocale("en"));

  // covers: AC-1
  it("is one whole link to the game in the current language", () => {
    const html = render(<ShelfCard game={card()} />);

    const link = /<a[^>]*href="\/en\/games\/5"[^>]*>([\s\S]*?)<\/a>/.exec(html);
    expect(link).not.toBeNull();
    expect(textOf(link?.[1] ?? "")).toContain("SETI");
    expect(html.match(/<a /g)).toHaveLength(1);
  });

  // covers: AC-1
  it("links in Chinese too", () => {
    setLocale("zh");

    const html = render(<ShelfCard game={card()} />);

    expect(html).toContain('href="/zh/games/5"');
  });

  // covers: AC-2
  it("hides the cover tile from screen readers and clamps the name", () => {
    const html = render(<ShelfCard game={card()} />);

    expect(html).toMatch(/<div[^>]*aria-hidden="true"[^>]*>/);
    expect(html).toMatch(/line-clamp-2[^>]*>SETI</);
  });

  // covers: AC-2
  it("says the owner count and the rating to screen readers", () => {
    const html = render(<ShelfCard game={card()} />);

    expect(textOf(html)).toContain("2 owners");
    expect(textOf(html)).toContain("8.5 out of 10");
    expect(html).toMatch(/<span[^>]*aria-hidden="true"[^>]*>8\.5<\/span>/);
  });

  // covers: AC-2
  it("pluralizes the owner count", () => {
    expect(
      textOf(render(<ShelfCard game={card({ ownerCount: 1 })} />)),
    ).toContain("1 owner");
    expect(
      textOf(render(<ShelfCard game={card({ ownerCount: 1 })} />)),
    ).not.toContain("1 owners");
    setLocale("zh");
    expect(
      textOf(render(<ShelfCard game={card({ ownerCount: 3 })} />)),
    ).toContain("3 位主人");
  });

  // covers: AC-2
  it("shows the average with exactly one decimal", () => {
    const html = render(<ShelfCard game={card({ avgRecommendation: 8 })} />);

    expect(html).toMatch(/aria-hidden="true"[^>]*>8\.0</);
    expect(textOf(html)).toContain("8.0 out of 10");
  });

  // covers: AC-2
  it("reads the rating aloud in Chinese", () => {
    setLocale("zh");

    const html = render(<ShelfCard game={card({ avgRecommendation: 8.6 })} />);

    expect(textOf(html)).toContain("8.6 分（满分 10）");
  });

  // covers: AC-2
  it("shows no rating text and no star for an unrated game", () => {
    const html = render(<ShelfCard game={card({ avgRecommendation: null })} />);

    expect(textOf(html)).not.toContain("out of 10");
    expect(html).not.toContain("lucide-star");
    expect(textOf(html)).toContain("2 owners");
  });
});

describe("ShelfGrid", () => {
  beforeEach(() => setLocale("en"));

  // covers: AC-1, AC-4
  it("renders one card per game in the order given, in the responsive grid", () => {
    const html = render(
      <ShelfGrid
        games={[
          card({ id: 1, name: "Azul" }),
          card({ id: 2, name: "Dixit" }),
          card({ id: 3, name: "Wingspan" }),
        ]}
      />,
    );

    expect(html.match(/<li/g)).toHaveLength(3);
    expect(html.indexOf("Azul")).toBeLessThan(html.indexOf("Dixit"));
    expect(html.indexOf("Dixit")).toBeLessThan(html.indexOf("Wingspan"));
    expect(html).toContain(
      "grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-6 md:gap-x-4 xl:grid-cols-10",
    );
  });
});
