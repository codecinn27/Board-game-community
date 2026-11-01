import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, setLocale, textOf } from "@/components/home/test-intl";
import { type GameOwner } from "@/lib/games/detail";
import { OwnersList } from "./owners-list";
import { StatsCard } from "./stats-card";

vi.mock(
  "next-intl/server",
  async () => (await import("@/components/home/test-intl")).intlServerMock,
);

// Spec 0008, AC-7, AC-9, AC-16.

describe("StatsCard", () => {
  beforeEach(() => setLocale("en"));

  async function stats(over: Partial<Parameters<typeof StatsCard>[0]>) {
    return textOf(
      render(
        await StatsCard({
          playersMin: 2,
          playersMax: 4,
          playTimeMin: 30,
          playTimeMax: 60,
          ownerCount: 3,
          ...over,
        }),
      ),
    );
  }

  // covers: AC-7
  it("shows ranges, single values, and the owner count", async () => {
    expect(await stats({})).toBe("Players 2–4 Minutes 30–60 Owners 3");
    expect(await stats({ playersMin: 4, playersMax: 4 })).toContain(
      "Players 4 ",
    );
  });

  // covers: AC-7
  it("shows ? for a missing end, never a half range", async () => {
    const text = await stats({ playersMin: null, playTimeMax: null });

    expect(text).toBe("Players ? Minutes ? Owners 3");
  });

  // covers: AC-7
  it("keeps values on one line, with tabular numbers", async () => {
    const html = render(
      await StatsCard({
        playersMin: 1,
        playersMax: 5,
        playTimeMin: 40,
        playTimeMax: 70,
        ownerCount: 4,
      }),
    );

    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain("tabular-nums");
  });
});

describe("OwnersList", () => {
  beforeEach(() => setLocale("en"));

  const owners: GameOwner[] = [
    { memberId: "a", displayName: "Mei", since: "2026-08-02T11:00:00Z" },
    { memberId: "b", displayName: "三郎", since: "2026-09-02T11:00:00Z" },
  ];

  // covers: AC-9
  it("shows the count, every owner, an initial, and a month year date", async () => {
    const html = render(await OwnersList({ owners }));

    expect(textOf(html)).toContain("Owners (2)");
    expect(html.match(/<li /g)).toHaveLength(2);
    expect(textOf(html)).toContain("Since Aug 2026");
    expect(textOf(html)).toContain("Since Sep 2026");
    expect(html).toMatch(/aria-hidden="true"[^>]*>三<\/span>/);
    expect(html).not.toContain("<a ");
  });

  // covers: AC-9
  it("shows every owner with no cap", async () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      memberId: `m${i}`,
      displayName: `Member ${i}`,
      since: "2026-08-02T11:00:00Z",
    }));

    const html = render(await OwnersList({ owners: many }));

    expect(html.match(/<li /g)).toHaveLength(40);
  });

  // covers: AC-9
  it("says nobody owns it, with no rows", async () => {
    const html = render(await OwnersList({ owners: [] }));

    expect(textOf(html)).toContain("Nobody owns this yet");
    expect(html).not.toContain("<li ");
  });

  // covers: AC-16
  it("reads the same in Chinese", async () => {
    setLocale("zh");

    const html = render(await OwnersList({ owners: [] }));

    expect(textOf(html)).toContain("还没有人拥有这款游戏");
  });
});
