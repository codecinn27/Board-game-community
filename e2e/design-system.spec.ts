import { expect, test } from "@playwright/test";
import { contrastRatio, parseHex } from "../src/lib/design/contrast";
import { DARK_INK, WHITE_INK } from "../src/lib/design/cover-tint";

// Spec 0004, AC-2, AC-5, AC-6, AC-9, AC-10, AC-11, AC-12.

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

// Spec 0004, AC-12: the static Cover Tint preview.
test("/design shows four readable Cover Tint sheets, one with black text", async ({
  page,
}) => {
  await page.goto("/design");
  const section = page.locator("section", {
    has: page.getByRole("heading", { name: "Cover Tint (game detail sheet)" }),
  });
  const sheets = section.getByRole("figure");
  await expect(sheets).toHaveCount(4);

  const inks: string[] = [];
  for (let i = 0; i < 4; i++) {
    const sheet = sheets.nth(i);
    // Each sheet's title reaches 4.5:1 on its own tint, as painted.
    const { color, tint } = await sheet
      .locator("p.text-3xl")
      .evaluate((title) => {
        const root = title.closest<HTMLElement>("[style]");
        return {
          color: getComputedStyle(title).color,
          tint: root
            ? getComputedStyle(root).getPropertyValue("--sheet-tint").trim()
            : "",
        };
      });
    const ink = rgbToHex(color);
    inks.push(ink);
    expect(
      contrastRatio(parseHex(ink), parseHex(tint)),
      `sheet ${i} title on tint`,
    ).toBeGreaterThanOrEqual(4.5);

    // Every control is at least 44px tall; the icon only ones are named and
    // 44px wide too (the text button "More" may be narrower).
    const buttons = sheet.getByRole("button");
    for (let b = 0; b < (await buttons.count()); b++) {
      const box = await buttons.nth(b).boundingBox();
      expect(box, `sheet ${i} button ${b} has a box`).not.toBeNull();
      expect(box?.height, `sheet ${i} button ${b}`).toBeGreaterThanOrEqual(44);
    }
    for (const name of ["Close", "Share", "Add to a list"]) {
      const icon = sheet.getByRole("button", { name });
      await expect(icon).toBeVisible();
      const box = await icon.boundingBox();
      expect(box?.width, `sheet ${i} ${name}`).toBeGreaterThanOrEqual(44);
      expect(box?.height, `sheet ${i} ${name}`).toBeGreaterThanOrEqual(44);
    }

    // Stat values fit their column, even "40–160" at 360px.
    const spills = await sheet.locator("dd").evaluateAll((values) =>
      values.some((dd) => {
        const own = dd.getBoundingClientRect();
        const column = dd.parentElement?.getBoundingClientRect();
        return (
          !column || own.left < column.left - 1 || own.right > column.right + 1
        );
      }),
    );
    expect(spills, `sheet ${i} stat values fit`).toBe(false);
  }

  // One pale sample turns the ink near black; the others stay white.
  expect(inks.filter((ink) => ink === DARK_INK)).toHaveLength(1);
  expect(inks.filter((ink) => ink === WHITE_INK)).toHaveLength(3);
});

function rgbToHex(color: string): string {
  const [r = 0, g = 0, b = 0] = (color.match(/\d+/g) ?? []).map(Number);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
