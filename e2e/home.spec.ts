import { expect, test, type Page } from "@playwright/test";

// Spec 0006, AC-1 to AC-4, AC-7, AC-8, AC-10.

const justAdded = [
  "三国杀",
  "Just One",
  "Ark Nova",
  "Dixit",
  "Splendor",
  "Azul",
];
const topRated = [
  "SETI",
  "Ark Nova",
  "Cascadia",
  "Wingspan",
  "Magical Athlete",
];

const copy = {
  en: {
    h1: /12\s*games on the shelf/,
    members: "Owned by 4 members.",
    browse: "Browse the shelf",
    justAdded: "Just added",
    topRated: "Top rated",
    seeAll: "See all",
    owners: "1 owner",
    rating: "8.6 out of 10",
  },
  zh: {
    h1: /12\s*款游戏在架上/,
    members: "由 4 位成员拥有。",
    browse: "浏览游戏架",
    justAdded: "最新加入",
    topRated: "最高评分",
    seeAll: "查看全部",
    owners: "1 位主人",
    rating: "8.6 分（满分 10）",
  },
} as const;

const isDesktop = (projectName: string) => projectName.startsWith("desktop");

async function names(page: Page, section: string) {
  const list = page
    .getByRole("region", { name: section })
    .getByRole("listitem");
  return list.evaluateAll((items) =>
    items
      .filter((li) => li.getBoundingClientRect().width > 0)
      .map((li) => li.querySelector("a span.line-clamp-2")?.textContent),
  );
}

for (const locale of ["en", "zh"] as const) {
  const t = copy[locale];

  test.describe(`home in ${locale}`, () => {
    test("shows the hero with its counts and a link to the shelf", async ({
      page,
    }) => {
      await page.goto(`/${locale}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(t.h1);
      await expect(page.getByText(t.members)).toBeVisible();
      await expect(page.getByRole("link", { name: t.browse })).toHaveAttribute(
        "href",
        `/${locale}/shelf`,
      );
      await expect(page.getByText(/cop(y|ies)/i)).toHaveCount(0);
    });

    test("lists the newest games, five on a phone and six from md", async ({
      page,
    }, testInfo) => {
      await page.goto(`/${locale}`);
      const shown = await names(page, t.justAdded);
      expect(shown).toEqual(
        isDesktop(testInfo.project.name) ? justAdded : justAdded.slice(0, 5),
      );
      await expect(
        page
          .getByRole("region", { name: t.justAdded })
          .getByRole("link", { name: t.seeAll }),
      ).toHaveAttribute("href", `/${locale}/shelf`);
      // Times are real `time` elements, never hand typed relative text.
      const section = page.getByRole("region", { name: t.justAdded });
      await expect(section.locator("time[datetime]").first()).toBeAttached();
    });

    test("ranks the top rated games with owners and a spoken rating", async ({
      page,
    }) => {
      await page.goto(`/${locale}`);
      expect(await names(page, t.topRated)).toEqual(topRated);
      const first = page
        .getByRole("region", { name: t.topRated })
        .getByRole("listitem")
        .first();
      await expect(first).toContainText(t.owners);
      await expect(first.getByRole("img", { name: t.rating })).toBeVisible();
      await expect(first).toContainText("8.6");
    });

    test("every game is one whole link to its sheet", async ({ page }) => {
      await page.goto(`/${locale}`);
      const links = page.locator(
        "main section:not(:first-child) li > a[href*='/games/']",
      );
      expect(await links.count()).toBeGreaterThanOrEqual(10);
      await expect(
        page.getByRole("link", { name: /SETI/ }).first(),
      ).toHaveAttribute("href", `/${locale}/games/5`);
    });
  });
}

test("the page fits the screen, with 44px targets and a clear bottom", async ({
  page,
}, testInfo) => {
  for (const locale of ["en", "zh"]) {
    await page.goto(`/${locale}`);
    await page.waitForLoadState("networkidle");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `${locale} overflow`).toBeLessThanOrEqual(0);

    const links = page.locator("main a");
    for (let i = 0; i < (await links.count()); i++) {
      const link = links.nth(i);
      if (!(await link.isVisible())) continue;
      const box = await link.boundingBox();
      expect(box?.height, `${locale} link ${i}`).toBeGreaterThanOrEqual(44);
    }

    if (!isDesktop(testInfo.project.name)) {
      // The last section ends above the fixed bar.
      const lastBottom = await page
        .locator("main section")
        .last()
        .evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY);
      const barTop = await page
        .locator("body > nav")
        .evaluate((el) => el.getBoundingClientRect().height);
      const pageHeight = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      expect(pageHeight - lastBottom).toBeGreaterThanOrEqual(barTop);
    }
  }
  await page.screenshot({
    path: testInfo.outputPath("home.png"),
    fullPage: true,
  });
});

test("the mosaic shows from lg and only then", async ({ page }, testInfo) => {
  await page.goto("/en");
  const mosaic = page.getByTestId("mosaic");
  if (isDesktop(testInfo.project.name)) {
    await expect(mosaic).toBeVisible();
    await expect(mosaic.locator("> div")).toHaveCount(6);
  } else {
    await expect(mosaic).toBeHidden();
  }
});

test("Home is active on / and Shelf on /shelf", async ({ page }, testInfo) => {
  test.skip(isDesktop(testInfo.project.name), "phone bar only");
  await page.goto("/en");
  await expect(page.locator('body > nav a[aria-current="page"]')).toHaveText(
    "Home",
  );
  await page.goto("/en/shelf");
  await expect(page.locator('body > nav a[aria-current="page"]')).toHaveText(
    "Shelf",
  );
  await expect(page).toHaveTitle("Shelf · Game Shelf");
});

test("the home title is just the brand", async ({ page }) => {
  await page.goto("/en");
  await expect(page).toHaveTitle("Game Shelf");
});
