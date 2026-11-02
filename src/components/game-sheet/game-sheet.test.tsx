import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, setLocale, textOf } from "@/components/home/test-intl";
import {
  buildGameDetail,
  type GameDetail,
  type GameOwner,
} from "@/lib/games/detail";
import { dummyGames, dummyOwners, dummyProfiles } from "@/lib/games/dummy-data";
import { GameSheet } from "./game-sheet";

vi.mock(
  "next-intl/server",
  async () => (await import("@/components/home/test-intl")).intlServerMock,
);
vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/home/test-intl")).navigationMock,
);

// Spec 0008, AC-4 to AC-11.

function detail(id: number, over: Partial<GameDetail> = {}): GameDetail {
  const game = buildGameDetail(id, dummyGames, dummyProfiles, dummyOwners);
  if (game === null) throw new Error(`no dummy game ${id}`);
  return { ...game, ...over };
}

async function sheet(game: GameDetail): Promise<string> {
  return render(
    await GameSheet({
      game,
      variant: "page",
      closeControl: <span>x</span>,
    }),
  );
}

describe("GameSheet", () => {
  beforeEach(() => setLocale("en"));

  // covers: AC-4
  it("shows the title, chips, stats, description, owners, and dock", async () => {
    const html = await sheet(detail(1));

    expect(html).toMatch(/<h1[^>]*>Wingspan<\/h1>/);
    expect(html).toContain("line-clamp-2");
    expect(html).toContain("h-[52dvh] max-h-[30rem]");
    expect(textOf(html)).toContain("Attract birds");
    expect(textOf(html)).toContain("Owners (4)");
    expect(html).toContain("I own this");
  });

  // covers: AC-5
  it("sets every --sheet variable inline from the cover tint", async () => {
    const html = await sheet(detail(1));

    for (const name of [
      "tint",
      "deep",
      "ink",
      "ink-muted",
      "ink-inverse",
      "line",
      "chip",
      "card",
      "glass",
      "dock",
    ]) {
      expect(html).toContain(`--sheet-${name}:`);
    }
  });

  // covers: AC-5
  it("uses the neutral tint for a game with no cover tint", async () => {
    const withTint = await sheet(detail(1));
    const neutral = await sheet(detail(11));

    const tintOf = (html: string) => /--sheet-tint:([^;"]+)/.exec(html)?.[1];
    expect(tintOf(neutral)).toBeDefined();
    expect(tintOf(neutral)).not.toBe(tintOf(withTint));
    expect(tintOf(await sheet(detail(12)))).toBe(tintOf(neutral));
  });

  // covers: AC-5
  it("writes no hex, oklch, or bracket colors in the sheet components", () => {
    const dir = __dirname;
    const files = readdirSync(dir).filter(
      (f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f),
    );
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      const source = readFileSync(join(dir, file), "utf8");
      expect(source, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source, file).not.toMatch(/oklch\(/);
      expect(source, file).not.toMatch(/\b(?:bg|text|border)-\[/);
    }
  });

  // covers: AC-6
  it("shows the rating with one decimal and a spoken, pluralized label", async () => {
    const html = await sheet(detail(1));

    expect(html).toContain("8.0");
    expect(textOf(html)).toContain("8.0 out of 10, from 5 ratings");
    expect(textOf(html)).toContain("4 owners");
  });

  // covers: AC-6
  it("pluralizes one rating and one owner", async () => {
    const html = await sheet(
      detail(9, { ratingCount: 1, avgRecommendation: 7.7 }),
    );

    expect(textOf(html)).toContain("7.7 out of 10, from 1 rating");
    expect(textOf(html)).toContain("1 owner");
    expect(textOf(html)).not.toContain("1 owners");
  });

  // covers: AC-6
  it("hides the rating chip with no average", async () => {
    const html = await sheet(detail(11));

    expect(html).not.toContain("out of 10");
    expect(html).not.toContain("lucide-star");
  });

  // covers: AC-6, AC-16
  it("speaks Chinese counts in Chinese", async () => {
    setLocale("zh");

    const html = await sheet(detail(1));

    expect(textOf(html)).toContain("4 位拥有者");
    expect(textOf(html)).toContain("平均 8.0 分");
    expect(html).toContain("我有这款游戏");
  });

  // covers: AC-8
  it("hides the whole description block when there is none", async () => {
    const html = await sheet(detail(11));

    expect(html).not.toContain("leading-7");
    expect(html).not.toContain("More");
  });

  // covers: AC-8
  it("clamps the description to 4 lines and shows description text as stored", async () => {
    setLocale("zh");

    const html = await sheet(detail(12));

    expect(html).toContain("line-clamp-4");
    expect(textOf(html)).toContain("三国题材");
  });

  // covers: AC-10
  it("renders I own this disabled, with the Coming soon hint inside it", async () => {
    const html = await sheet(detail(1));

    const button = /<button[^>]*disabled[^>]*>([\s\S]*?)<\/button>/.exec(html);
    expect(button).not.toBeNull();
    expect(textOf(button?.[1] ?? "")).toBe("I own this Coming soon");
  });

  // covers: AC-10
  it("offers Share twice: over the cover and in the dock", async () => {
    const html = await sheet(detail(1));

    expect(html.match(/lucide-share/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Share"');
  });

  // covers: AC-11
  it("has one polite live region for the share message", async () => {
    const html = await sheet(detail(1));

    expect(html.match(/aria-live="polite"/g)).toHaveLength(1);
  });
});

describe("sheet stats", () => {
  beforeEach(() => setLocale("en"));

  async function stats(over: Partial<GameDetail>) {
    const html = await sheet(detail(1, over));
    const card = /<dl[\s\S]*?<\/dl>/.exec(html)?.[0] ?? "";
    return textOf(card);
  }

  // covers: AC-7
  it("shows ranges, single values, and the owner count", async () => {
    expect(await stats({})).toBe(
      "Players 1\u20135 Minutes 40\u201370 Owners 4",
    );
    expect(await stats({ playersMin: 4, playersMax: 4 })).toContain(
      "Players 4 ",
    );
  });

  // covers: AC-7
  it("shows ? for a missing end, never a half range", async () => {
    const text = await stats({ playersMin: null, playTimeMax: null });

    expect(text).toBe("Players ? Minutes ? Owners 4");
  });

  // covers: AC-7
  it("keeps values on one line, with tabular numbers", async () => {
    const html = await sheet(detail(1));

    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain("tabular-nums");
  });
});

describe("sheet owners", () => {
  beforeEach(() => setLocale("en"));

  const owners: GameOwner[] = [
    { memberId: "a", displayName: "Mei", since: "2026-08-02T11:00:00Z" },
    {
      memberId: "b",
      displayName: "\u4e09\u90ce",
      since: "2026-09-02T11:00:00Z",
    },
  ];

  // covers: AC-9
  it("shows the count, every owner, an initial, and a month year date", async () => {
    const html = await sheet(detail(1, { owners, ownerCount: 2 }));
    const list =
      /<section aria-labelledby="game-owners"[\s\S]*?<\/section>/.exec(
        html,
      )?.[0] ?? "";

    expect(textOf(list)).toContain("Owners (2)");
    expect(list.match(/<li /g)).toHaveLength(2);
    expect(textOf(list)).toContain("Since Aug 2026");
    expect(textOf(list)).toContain("Since Sep 2026");
    expect(list).toMatch(/aria-hidden="true"[^>]*>\u4e09<\/span>/);
    expect(list).not.toContain("<a ");
  });

  // covers: AC-9
  it("shows every owner with no cap", async () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      memberId: `m${i}`,
      displayName: `Member ${i}`,
      since: "2026-08-02T11:00:00Z",
    }));

    const html = await sheet(detail(1, { owners: many, ownerCount: 40 }));
    const list =
      /<section aria-labelledby="game-owners"[\s\S]*?<\/section>/.exec(
        html,
      )?.[0] ?? "";

    expect(list.match(/<li /g)).toHaveLength(40);
  });

  // covers: AC-9
  it("says nobody owns it, with no rows", async () => {
    const html = await sheet(detail(1, { owners: [], ownerCount: 0 }));
    const list =
      /<section aria-labelledby="game-owners"[\s\S]*?<\/section>/.exec(
        html,
      )?.[0] ?? "";

    expect(textOf(list)).toContain("Nobody owns this yet");
    expect(list).not.toContain("<li ");
  });

  // covers: AC-16
  it("reads the same in Chinese", async () => {
    setLocale("zh");

    const html = await sheet(detail(1, { owners, ownerCount: 2 }));

    expect(textOf(html)).toContain("\u62e5\u6709\u8005\uff082\uff09");
    expect(textOf(html)).toContain("\u81ea 2026");
  });
});
