import { expect, test, type Page } from "@playwright/test";

// Spec 0008, AC-1 to AC-3, AC-11 to AC-14, and AC-21: the client side modal on
// the shelf, and the page version at /games/{id}.

const copy = {
  en: {
    close: "Close",
    notFound: "Page not found",
    owners: "4 owners",
    rating: "8.0 out of 10, from 5 ratings",
    share: "Share",
    copied: "Link copied",
  },
  zh: {
    close: "关闭",
    notFound: "找不到页面",
    owners: "4 位拥有者",
    rating: "平均 8.0 分（满分 10 分），共 5 人评分",
    share: "分享",
    copied: "链接已复制",
  },
} as const;

/** Opens the page, waits for it to be interactive, and returns the Wingspan card. */
async function shelf(page: Page, locale: "en" | "zh", id = 1) {
  await page.goto(`/${locale}/shelf`);
  await page.waitForLoadState("networkidle");
  const card = page.locator(`a[href='/${locale}/games/${id}']`);
  await card.scrollIntoViewIfNeeded();
  return card;
}

async function settled(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // Let the open motion finish: a close press during it can be ignored.
  await expect(dialog).not.toHaveAttribute("data-starting-style", "");
  return dialog;
}

for (const locale of ["en", "zh"] as const) {
  const t = copy[locale];

  test.describe(`game sheet in ${locale}`, () => {
    test("opens as a modal on the same page within 500ms, and Back closes it", async ({
      page,
    }) => {
      const card = await shelf(page, locale);
      await card.focus();
      await card.click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 500 });

      const dialog = page.getByRole("dialog", { name: "Wingspan" });
      await expect(dialog).toContainText(t.owners, { timeout: 1500 });
      await expect(dialog).toContainText(t.rating);
      // The page does not navigate, and the page behind stays rendered.
      await expect(page).toHaveURL(`/${locale}/shelf`);
      await expect(page.locator("main ul > li a").first()).toBeAttached();

      await page.goBack();
      await expect(dialog).toHaveCount(0);
      await expect(page).toHaveURL(`/${locale}/shelf`);

      // Forward does not reopen it.
      await page.goForward();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });

    test("Close, Esc, and the dimmed area each close it and return focus to the card", async ({
      page,
    }) => {
      const card = await shelf(page, locale);
      for (const how of ["button", "escape", "backdrop"] as const) {
        await card.focus();
        await card.click();
        const dialog = await settled(page);

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

    test("closing leaves no extra history behind it", async ({ page }) => {
      await page.goto(`/${locale}`);
      const card = await shelf(page, locale);
      await card.click();
      const dialog = await settled(page);
      await dialog.getByRole("button", { name: t.close }).click();
      await expect(dialog).toHaveCount(0);

      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`/${locale}/?$`));
    });

    test("keeps the shelf scroll position and traps focus", async ({
      page,
    }) => {
      const card = await shelf(page, locale, 12);
      await page.evaluate(() => window.scrollBy(0, 40));
      const before = await page.evaluate(() => window.scrollY);
      await card.click();
      const dialog = await settled(page);

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

    test("a modifier click keeps the normal link and does not open the modal", async ({
      page,
      context,
    }) => {
      const card = await shelf(page, locale);
      const opened = context.waitForEvent("page");
      await card.click({ modifiers: ["Control"] });
      const other = await opened;

      await expect(page.getByRole("dialog")).toHaveCount(0);
      expect(other.url()).toContain(`/${locale}/games/1`);
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

    test("Share from the modal copies the game's own link, not the shelf's", async ({
      page,
      context,
    }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "share", { value: undefined });
      });
      const card = await shelf(page, locale);
      await card.click();
      const dialog = await settled(page);
      await expect(dialog).toContainText(t.owners, { timeout: 5000 });

      await dialog.getByRole("button", { name: t.share }).last().click();
      await expect(page.getByRole("status").last()).toContainText(t.copied);
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        new URL(`/${locale}/games/1`, page.url()).href,
      );
      await expect(page).toHaveURL(`/${locale}/shelf`);
    });
  });
}

test("with reduced motion the modal closes at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const card = await shelf(page, "en");
  await card.click();
  const dialog = await settled(page);
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

// Spec 0008, AC-22: the stock fade ended early and the backdrop snapped back
// to full dark for a frame before unmount (a visible flash), and the phone
// sheet never slid because its transition named `transform`, not `translate`.
test("closing fades the backdrop out in step with the sheet, with no flash", async ({
  page,
}) => {
  type Sample = { backdrop: number; sheet: string };
  const card = await shelf(page, "en");
  await card.click();
  await settled(page);
  // The open fade is still running just after the starting style clears.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const backdrop = document.querySelector(
          "div.fixed.inset-0.z-50:not([role=dialog])",
        );
        return backdrop ? Number(getComputedStyle(backdrop).opacity) : 0;
      }),
    )
    .toBe(1);
  await page.evaluate(() => {
    const samples: Sample[] = [];
    (window as unknown as { __close: Sample[] }).__close = samples;
    const start = performance.now();
    const tick = () => {
      const backdrop = document.querySelector(
        "div.fixed.inset-0.z-50:not([role=dialog])",
      );
      const sheet = document.querySelector("[role=dialog]");
      if (backdrop && sheet) {
        const style = getComputedStyle(sheet);
        samples.push({
          backdrop: Number(getComputedStyle(backdrop).opacity),
          sheet: `${style.translate} ${style.transform} ${style.clipPath} ${style.opacity}`,
        });
      }
      if (performance.now() - start < 600) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.waitForTimeout(500);

  const samples = await page.evaluate(
    () => (window as unknown as { __close: Sample[] }).__close,
  );
  expect(samples.length).toBeGreaterThan(3);
  // The backdrop only ever gets lighter while the sheet leaves.
  for (let i = 1; i < samples.length; i++) {
    expect(samples[i]?.backdrop).toBeLessThanOrEqual(
      (samples[i - 1]?.backdrop ?? 1) + 0.01,
    );
  }
  // And the sheet really animates out (several positions or fades), not vanishes.
  expect(new Set(samples.map((s) => s.sheet)).size).toBeGreaterThan(2);
});

// Spec 0008, AC-14: the card grows into the modal and shrinks back into it.
test("the modal grows out of the tapped card and shrinks back into it", async ({
  page,
}) => {
  type Rect = { x: number; y: number; w: number };
  const card = await shelf(page, "en");
  const cover = await card.locator(".aspect-square").boundingBox();
  if (cover === null) throw new Error("the card cover has no box");

  const sample = (bucket: string) =>
    page.evaluate((name) => {
      const rects: Rect[] = [];
      (window as unknown as Record<string, Rect[]>)[name] = rects;
      const start = performance.now();
      const tick = () => {
        const modal = document.querySelector("[role=dialog]");
        if (modal) {
          const r = modal.getBoundingClientRect();
          rects.push({ x: r.left, y: r.top, w: r.width });
        }
        if (performance.now() - start < 900) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, bucket);
  const read = (bucket: string) =>
    page.evaluate(
      (name) => (window as unknown as Record<string, Rect[]>)[name] ?? [],
      bucket,
    );
  const near = (rect: Rect | undefined) => {
    expect(rect).toBeDefined();
    expect(Math.abs((rect?.x ?? 0) - cover.x)).toBeLessThan(6);
    expect(Math.abs((rect?.y ?? 0) - cover.y)).toBeLessThan(6);
    expect(Math.abs((rect?.w ?? 0) - cover.width)).toBeLessThan(6);
  };

  await sample("__open");
  await card.click();
  await settled(page);
  await page.waitForTimeout(500);
  const opened = await read("__open");
  // It starts on the card, and ends much bigger.
  near(opened[0]);
  expect(opened[opened.length - 1]?.w ?? 0).toBeGreaterThan(cover.width * 2);

  await sample("__close");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.waitForTimeout(300);
  const closed = await read("__close");
  // It shrinks back onto the card before it goes away.
  expect(closed[0]?.w ?? 0).toBeGreaterThan(cover.width * 2);
  near(closed[closed.length - 1]);
});
