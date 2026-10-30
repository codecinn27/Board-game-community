import { expect, test } from "@playwright/test";

// Spec 0004, AC-2, AC-5, AC-6, AC-9, AC-10, AC-11.

// Mirrors `themeColors` in src/lib/design/theme-color.ts (each within 2 sRGB
// steps of its `--background` token), so first paint must land close to these.
const expectedBackground = {
  light: [254, 250, 241],
  dark: [24, 18, 15],
} as const;

const pages = ["/", "/design"] as const;

for (const path of pages) {
  test(`${path} fits the screen, has 44px targets, and paints the right theme`, async ({
    page,
  }, testInfo) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    // No sideways scroll.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Every visible shell control is at least 44 by 44.
    const controls = page.locator("header a, header button, nav a, nav button");
    const count = await controls.count();
    for (let i = 0; i < count; i++) {
      const control = controls.nth(i);
      if (!(await control.isVisible())) continue;
      const box = await control.boundingBox();
      expect(box, `control ${i} has a box`).not.toBeNull();
      if (!box) continue;
      expect(box.width, `control ${i} width`).toBeGreaterThanOrEqual(44);
      expect(box.height, `control ${i} height`).toBeGreaterThanOrEqual(44);
    }

    // Background follows the device scheme on first paint.
    const scheme =
      testInfo.project.use.colorScheme === "dark" ? "dark" : "light";
    const rgb = await page.evaluate(() => {
      // Let the browser resolve oklch() to sRGB by painting it on a canvas.
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
      ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
    });
    expect(rgb).not.toBeNull();
    const expected = expectedBackground[scheme];
    rgb?.forEach((channel, i) => {
      expect(Math.abs(channel - (expected[i] ?? 0))).toBeLessThanOrEqual(3);
    });

    await page.screenshot({
      path: testInfo.outputPath(`${path === "/" ? "home" : "design"}.png`),
      fullPage: true,
    });
  });
}

test("the phone shelf has no bottom bar with a single tab", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.startsWith("desktop"), "phone only");
  await page.goto("/");
  // The only navigation landmarks on `/` today are none: one tab, no nav.
  await expect(page.locator("body > nav")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Game Shelf" })).toBeVisible();
});

test("/design previews both tab sets with the raised Add and an active Shelf", async ({
  page,
}, testInfo) => {
  await page.goto("/design");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  const bars = page.getByRole("navigation", { name: "Main navigation" });
  // Each preview has a bottom bar, plus header links from 768px up.
  const desktop = testInfo.project.name.startsWith("desktop");
  await expect(bars).toHaveCount(desktop ? 4 : 2);
  await expect(page.getByRole("link", { name: "Add" }).first()).toBeAttached();
  const active = page.locator('a[aria-current="page"]');
  await expect(active.first()).toContainText("Shelf");
});

test("keyboard reaches the wordmark first, with a visible ring", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"), "desktop only");
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toHaveAccessibleName("Game Shelf");
  const ring = await focused.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(ring).not.toBe("none");
});

test("/design walks the member header links in order at desktop", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"), "desktop only");
  await page.goto("/design");
  const memberHeaderLinks = page
    .getByRole("figure")
    .filter({ hasText: "Member set" })
    .locator("header a");
  const names = await memberHeaderLinks.allInnerTexts();
  expect(names.map((n) => n.trim())).toEqual([
    "Game Shelf",
    "Home",
    "Shelf",
    "Add",
    "Me",
  ]);

  // Tab from the wordmark through each link, each showing a ring.
  await memberHeaderLinks.first().focus();
  for (let i = 0; i < names.length; i++) {
    const focused = page.locator(":focus");
    await expect(focused).toHaveText(names[i]?.trim() ?? "");
    const ring = await focused.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(ring).not.toBe("none");
    await page.keyboard.press("Tab");
  }
});
