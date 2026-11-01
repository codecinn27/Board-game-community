import { expect, test } from "@playwright/test";

// Spec 0007, AC-1 to AC-6, AC-12.

const order = [
  "Ark Nova",
  "Azul",
  "Cascadia",
  "Codenames",
  "Dixit",
  "Just One",
  "Magical Athlete",
  "SETI",
  "Splendor",
  "Ticket to Ride",
  "Wingspan",
  "三国杀",
];

const copy = {
  en: {
    count: "12 games",
    all: "All games",
    owner: "By owner",
    soon: "By owner is coming soon",
    owners: "4 owners",
    rating: "8.6 out of 10",
  },
  zh: {
    count: "12 款游戏",
    all: "全部游戏",
    owner: "按主人",
    soon: "按主人查看即将上线",
    owners: "4 位主人",
    rating: "8.6 分（满分 10）",
  },
} as const;

function columns(width: number) {
  if (width >= 1280) return 10;
  if (width >= 768) return 6;
  if (width >= 640) return 3;
  return 2;
}

for (const locale of ["en", "zh"] as const) {
  const t = copy[locale];

  test.describe(`shelf in ${locale}`, () => {
    test("lists 12 games A to Z with the count and the switch", async ({
      page,
    }) => {
      await page.goto(`/${locale}/shelf`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByText(t.count)).toBeVisible();

      const cards = page.locator("main ul > li a");
      await expect(cards).toHaveCount(12);
      const names = await cards.evaluateAll((links) =>
        links.map((a) => a.querySelector("span.line-clamp-2")?.textContent),
      );
      expect(names).toEqual(order);
      await expect(cards.first()).toHaveAttribute(
        "href",
        new RegExp(`^/${locale}/games/[0-9]+$`),
      );

      const seti = page.getByRole("link", { name: /SETI/ });
      await expect(seti).toContainText(t.rating);
      await expect(page.getByRole("link", { name: /Wingspan/ })).toContainText(
        t.owners,
      );
      await expect(
        page.getByRole("link", { name: /Just One/ }),
      ).not.toContainText(/\d\.\d/);
    });

    test("uses the right number of columns, with tall tap targets and no page scroll", async ({
      page,
    }) => {
      await page.goto(`/${locale}/shelf`);
      const width = page.viewportSize()?.width ?? 0;

      const tops = await page
        .locator("main ul > li")
        .evaluateAll((items) =>
          items.map((li) => Math.round(li.getBoundingClientRect().top)),
        );
      expect(tops.filter((top) => top === tops[0])).toHaveLength(
        columns(width),
      );

      const heights = await page
        .locator("main ul > li a, main nav a")
        .evaluateAll((links) =>
          links.map((a) => a.getBoundingClientRect().height),
        );
      for (const height of heights) expect(height).toBeGreaterThanOrEqual(44);

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("switches to By owner and back through the URL", async ({ page }) => {
      await page.goto(`/${locale}/shelf`);
      const nav = page.locator("main nav");
      await expect(nav.getByRole("link", { name: t.all })).toHaveAttribute(
        "aria-current",
        "page",
      );

      await nav.getByRole("link", { name: t.owner }).click();
      await expect(page).toHaveURL(
        new RegExp(`/${locale}/shelf[?]view=owner$`),
      );
      await expect(page.getByText(t.soon)).toBeVisible();
      await expect(page.getByText(t.count)).toBeVisible();
      await expect(page.locator("main ul > li")).toHaveCount(0);
      await expect(nav.getByRole("link", { name: t.owner })).toHaveAttribute(
        "aria-current",
        "page",
      );

      await nav.getByRole("link", { name: t.all }).click();
      await expect(page.locator("main ul > li")).toHaveCount(12);
    });

    test("an unknown or repeated view shows All games", async ({ page }) => {
      for (const query of ["view=x", "view=owner&view=owner"]) {
        await page.goto(`/${locale}/shelf?${query}`);
        await expect(page.locator("main ul > li")).toHaveCount(12);
        await expect(
          page.locator("main nav").getByRole("link", { name: t.all }),
        ).toHaveAttribute("aria-current", "page");
      }
    });

    test("focus rings show on a card", async ({ page }) => {
      await page.goto(`/${locale}/shelf`);
      const card = page.locator("main ul > li a").first();
      await card.focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      const shadow = await card.evaluate((a) => getComputedStyle(a).boxShadow);
      expect(shadow).not.toBe("none");
    });
  });
}
