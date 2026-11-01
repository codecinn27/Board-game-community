import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setLocale } from "@/components/home/test-intl";
import { type HomeData } from "@/lib/games/home";
import HomePage, { generateMetadata } from "./page";

vi.mock(
  "next-intl/server",
  async () => (await import("@/components/home/test-intl")).intlServerMock,
);
vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/home/test-intl")).navigationMock,
);
vi.mock("@/i18n/alternates", () => ({
  getAlternates: vi.fn(async (path: string) => ({ canonical: `alt:${path}` })),
}));

let data: HomeData;
vi.mock("@/lib/games/home", () => ({ getHomeData: async () => data }));

// Spec 0006, AC-5, AC-9.

/** Names of the component types in a React element tree, in order. */
function componentNames(node: ReactNode): string[] {
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  const own = typeof node.type === "function" ? [node.type.name] : [];
  const children = [node.props.children].flat() as ReactNode[];
  return [...own, ...children.flatMap(componentNames)];
}

const full: HomeData = {
  gameCount: 12,
  memberCount: 4,
  newest: [],
  topRated: [],
};

describe("home page", () => {
  beforeEach(() => setLocale("en"));

  // covers: AC-1
  it("shows the hero, Just added, and Top rated when there are games", async () => {
    data = full;

    expect(componentNames(await HomePage())).toEqual([
      "HomeHero",
      "JustAdded",
      "TopRated",
    ]);
  });

  // covers: AC-5
  it("shows only the hero when there are no games", async () => {
    data = { ...full, gameCount: 0, memberCount: 0 };

    expect(componentNames(await HomePage())).toEqual(["HomeHero"]);
  });
});

describe("home page metadata", () => {
  // covers: AC-9
  it("uses just the brand as the title, in both languages", async () => {
    setLocale("en");
    expect((await generateMetadata()).title).toEqual({
      absolute: "Game Shelf",
    });

    setLocale("zh");
    expect((await generateMetadata()).title).toEqual({ absolute: "桌游架" });
  });

  // covers: AC-9
  it("has a translated description and the canonical for `/`", async () => {
    setLocale("en");
    const en = await generateMetadata();
    expect(en.description).toBe(
      "See every board game our group owns, and who owns it, before you buy.",
    );
    expect(en.alternates).toEqual({ canonical: "alt:/" });

    setLocale("zh");
    expect((await generateMetadata()).description).toBe(
      "看看我们群组拥有的所有桌游和主人，买之前先查一查。",
    );
  });
});
