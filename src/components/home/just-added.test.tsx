import { beforeEach, describe, expect, it, vi } from "vitest";
import { type HomeGame } from "@/lib/games/home";
import { JustAdded } from "./just-added";
import { render, setLocale, textOf } from "./test-intl";

vi.mock(
  "next-intl/server",
  async () => (await import("./test-intl")).intlServerMock,
);
vi.mock(
  "@/i18n/navigation",
  async () => (await import("./test-intl")).navigationMock,
);

// Spec 0006, AC-2, AC-4.

function game(id: number, over: Partial<HomeGame> = {}): HomeGame {
  return {
    id,
    name: `Game ${id}`,
    coverTint: null,
    addedAt: "2026-10-31T17:00:00Z",
    addedByName: "Mei",
    ...over,
  };
}

const six = [1, 2, 3, 4, 5, 6].map((id) => game(id));

async function section(games: HomeGame[]) {
  return render(await JustAdded({ games }));
}

/** The list items, in order. */
function items(html: string): string[] {
  return html.split("<li").slice(1);
}

describe("JustAdded", () => {
  beforeEach(() => setLocale("en"));

  // covers: AC-2
  it("lists every game it is given, in order, under the section title", async () => {
    const html = await section(six);

    expect(textOf(html)).toContain("Just added");
    const names = items(html).map((li) => /Game \d/.exec(li)?.[0]);
    expect(names).toEqual([
      "Game 1",
      "Game 2",
      "Game 3",
      "Game 4",
      "Game 5",
      "Game 6",
    ]);
  });

  // covers: AC-2
  it("hides only the sixth item below md", async () => {
    const lis = items(await section(six));

    expect(lis.slice(0, 5).every((li) => !li.includes("hidden md:block"))).toBe(
      true,
    );
    expect(lis[5]).toContain("hidden md:block");
  });

  // covers: AC-2
  it("shows what exists when there are fewer games", async () => {
    const html = await section([game(1), game(2)]);

    expect(items(html)).toHaveLength(2);
  });

  // covers: AC-2
  it("shows 'added by name · when' with a real time element", async () => {
    const html = await section([game(1)]);

    expect(html).toMatch(
      /Mei <span aria-hidden="true">·<\/span> <time dateTime="2026-10-31T17:00:00.000Z"/,
    );
  });

  // covers: AC-2
  it("shows only the time when nobody is recorded as the adder", async () => {
    const html = await section([game(1, { addedByName: null })]);

    expect(html).toContain("<time ");
    expect(html).not.toContain("·");
    expect(html).not.toContain("Mei");
  });

  // covers: AC-2
  it("sends See all to the shelf in the same language", async () => {
    expect(await section(six)).toMatch(
      /<a[^>]*href="\/en\/shelf"[^>]*>See all/,
    );

    setLocale("zh");
    expect(await section(six)).toMatch(
      /<a[^>]*href="\/zh\/shelf"[^>]*>查看全部/,
    );
  });

  // covers: AC-4
  it("makes each game one whole link to its sheet", async () => {
    const html = await section([game(7, { name: "Azul" })]);

    const link = /<a[^>]*href="\/en\/games\/7"[^>]*>([\s\S]*?)<\/a>/.exec(
      html,
    )?.[1];
    expect(link).toBeDefined();
    expect(textOf(link ?? "")).toContain("Azul");
    expect(link).toContain("<time ");
  });

  it("gives the section an accessible name from its title", async () => {
    const html = await section(six);

    expect(html).toMatch(/<section[^>]*aria-labelledby="just-added"/);
    expect(html).toMatch(/<h2[^>]*id="just-added"/);
  });

  it("shows game names as stored in Chinese too", async () => {
    setLocale("zh");

    const html = await section([game(12, { name: "三国杀" })]);

    expect(textOf(html)).toContain("最新加入");
    expect(html).toContain("三国杀");
    expect(html).toContain('href="/zh/games/12"');
  });
});
