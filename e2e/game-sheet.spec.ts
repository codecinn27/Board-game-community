import { expect, test, type Page } from "@playwright/test";

// Spec 0008, AC-1 to AC-3 and AC-11 to AC-14, on the real intercepting route.

const copy = {
  en: {
    close: "Close",
    shelf: "Shelf",
    notFound: "Page not found",
    owners: "4 owners",
    rating: "8.0 out of 10, from 5 ratings",
    none: "Just One",
  },
  zh: {
    close: "关闭",
    shelf: "书架",
    notFound: "找不到页面",
    owners: "4 位拥有者",
    rating: "平均 8.0 分（满分 10 分），共 5 人评分",
    none: "Just One",
  },
} as const;

async function openFromShelf(page: Page, locale: "en" | "zh") {
  await page.goto(`/${locale}/shelf`);
  await page.waitForLoadState("networkidle");
  const card = page.locator(`a[href='/${locale}/games/1']`);
  await card.scrollIntoViewIfNeeded();
  await card.focus();
  await card.click();
  await expect(page).toHaveURL(`/${locale}/games/1`);
  // Let the open motion finish: a close press during it can be ignored.
  await expect(page.getByRole("dialog")).not.toHaveAttribute(
    "data-starting-style",
    "",
  );
  return card;
}

for (const locale of ["en", "zh"] as const) {
  const t = copy[locale];

  test.describe(`game sheet in ${locale}`, () => {
    test("opens over the shelf as a labelled dialog, and Back closes it", async ({
      page,
    }) => {
      await openFromShelf(page, locale);
      const dialog = page.getByRole("dialog", { name: "Wingspan" });
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(t.owners);
      await expect(dialog).toContainText(t.rating);
      // The page behind stays rendered.
      await expect(page.locator("main ul > li a").first()).toBeAttached();

      await page.goBack();
      await expect(dialog).toHaveCount(0);
      await expect(page).toHaveURL(`/${locale}/shelf`);

      await page.goForward();
      await expect(dialog).toBeVisible();
    });

    test("Close, Esc, and the dimmed area each go back and return focus to the card", async ({
      page,
    }) => {
      for (const how of ["button", "escape", "backdrop"] as const) {
        const card = await openFromShelf(page, locale);
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();

        if (how === "button") {
          await dialog.getByRole("button", { name: t.close }).click();
        } else if (how === "escape") {
          await page.keyboard.press("Escape");
        } else {
          await page.mouse.click(2, 2);
        }

        await expect(dialog).toHaveCount(0);
        await expect(page).toHaveURL(`/${locale}/shelf`);
        await expect(card).toBeFocused();
      }
    });

    test("keeps the shelf scroll position and traps focus", async ({
      page,
    }) => {
      await page.goto(`/${locale}/shelf`);
      await page.waitForLoadState("networkidle");
      const card = page.locator(`a[href='/${locale}/games/12']`);
      await card.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, 40));
      const before = await page.evaluate(() => window.scrollY);
      await card.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog).not.toHaveAttribute("data-starting-style", "");

      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("Tab");
        // Poll: focus passes through a guard element for an instant.
        await expect
          .poll(() =>
            page.evaluate(
              () => !!document.activeElement?.closest("[role=dialog]"),
            ),
          )
          .toBe(true);
      }

      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      expect(await page.evaluate(() => window.scrollY)).toBe(before);
    });

    test("a direct visit renders the page version with no dialog", async ({
      page,
    }) => {
      const response = await page.goto(`/${locale}/games/12`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "三国杀",
      );
      await expect(page.getByRole("dialog")).toHaveCount(0);
      // The app shell stays.
      await expect(page.getByRole("banner")).toBeVisible();

      await page.getByRole("link", { name: t.close }).click();
      await expect(page).toHaveURL(`/${locale}/shelf`);
    });

    test("an unknown or invalid id is a translated 404", async ({ page }) => {
      for (const id of ["999", "abc", "0", "1.5"]) {
        const response = await page.goto(`/${locale}/games/${id}`);
        expect(response?.status()).toBe(404);
        await expect(
          page.getByRole("heading", { name: t.notFound }),
        ).toBeVisible();
      }
    });

    test("Just One shows ? stats and no description or rating chip", async ({
      page,
    }) => {
      await page.goto(`/${locale}/games/11`);
      const sheet = page.getByRole("article");
      await expect(sheet.getByText("?")).toHaveCount(2);
      await expect(sheet.getByText(/\d\.\d/)).toHaveCount(0);
    });

    test("Share copies the link when there is no share sheet", async ({
      page,
      context,
    }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "share", { value: undefined });
      });
      await page.goto(`/${locale}/games/1`);
      await page.waitForLoadState("networkidle");
      await page
        .getByRole("button", { name: locale === "en" ? "Share" : "分享" })
        .last()
        .click();
      await expect(page.getByRole("status")).toContainText(
        locale === "en" ? "Link copied" : "链接已复制",
      );
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        new URL(`/${locale}/games/1`, page.url()).href,
      );
    });
  });
}

test("with reduced motion the overlay closes at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openFromShelf(page, "en");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0, { timeout: 500 });
});

test("every control in the sheet is at least 44px", async ({ page }) => {
  await page.goto("/en/games/1");
  await page.waitForLoadState("networkidle");
  const small = await page
    .getByRole("article")
    .locator("a, button")
    .evaluateAll((els) =>
      els
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width < 44 || r.height < 44)
        .map((r) => `${r.width}x${r.height}`),
    );
  expect(small).toEqual([]);
});
