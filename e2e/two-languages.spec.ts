import { expect, test, type Page } from "@playwright/test";

// Spec 0005, AC-1, AC-2, AC-3, AC-4, AC-5, AC-7, AC-9.

const YEAR_SECONDS = 60 * 60 * 24 * 365;

// The dev server sends a relative Location, production an absolute one.
function locationOf(headers: Record<string, string>): URL {
  return new URL(headers.location ?? "", "http://localhost");
}

function languageButton(page: Page, name: RegExp | string) {
  // The page header, not the /design previews' headers.
  return page.locator("body > header").getByRole("button", { name });
}

test.describe("redirect to a language", () => {
  const cases = [
    ["zh-CN,zh;q=0.9,en;q=0.8", "/zh"],
    ["en-US,en;q=0.9,zh;q=0.8", "/en"],
    ["zh-TW", "/zh"],
    ["zh-HK", "/zh"],
    ["zh-Hant", "/zh"],
    ["fr-FR,fr;q=0.9", "/en"],
  ] as const;

  for (const [header, target] of cases) {
    test(`Accept-Language ${header} lands on ${target}`, async ({
      request,
    }) => {
      const response = await request.get("/", {
        headers: { "Accept-Language": header },
        maxRedirects: 0,
      });
      expect(response.status()).toBe(307);
      expect(locationOf(response.headers()).pathname).toBe(target);
    });
  }

  test("an unprefixed path keeps its path and query", async ({ request }) => {
    const response = await request.get("/design?x=1", {
      headers: { "Accept-Language": "en" },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    const location = locationOf(response.headers());
    expect(`${location.pathname}${location.search}`).toBe("/en/design?x=1");
  });

  test("a Chinese phone opens the site in Chinese", async ({ browser }) => {
    const context = await browser.newContext({ locale: "zh-CN" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/zh$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
    await expect(page.getByRole("link", { name: "桌游架" })).toBeVisible();
    await expect(page).toHaveTitle("桌游架");
    await context.close();
  });
});

test.describe("not found", () => {
  test("an unknown path under /zh is a translated 404", async ({ page }) => {
    const response = await page.goto("/zh/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
    await expect(
      page.getByRole("heading", { name: "找不到页面" }),
    ).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
  });

  test("an unknown language segment ends in a 404", async ({ page }) => {
    const response = await page.goto("/fr/x");
    expect(new URL(page.url()).pathname).toMatch(/^\/(en|zh)\/fr\/x$/);
    expect(response?.status()).toBe(404);
  });
});

test.describe("language menu", () => {
  test("switches on the same page, keeps the query, and remembers it", async ({
    browser,
  }, testInfo) => {
    const { viewport, colorScheme } = testInfo.project.use;
    const context = await browser.newContext({
      viewport,
      colorScheme,
      locale: "en-US",
    });
    const page = await context.newPage();
    await page.goto("/en/design?x=1");

    const button = languageButton(page, "Language: English");
    await expect(button).toHaveAttribute("lang", "en");
    await expect(button).toHaveText("EN");
    const box = await button.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);

    await button.click();
    const english = page.getByRole("menuitemradio", { name: "English" });
    const chinese = page.getByRole("menuitemradio", { name: "中文" });
    await expect(english).toHaveAttribute("aria-checked", "true");
    await expect(english).toHaveAttribute("lang", "en");
    await expect(chinese).toHaveAttribute("lang", "zh-Hans");
    await chinese.click();

    await expect(page).toHaveURL(/\/zh\/design\?x=1$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(languageButton(page, "语言：中文")).toHaveText("中");

    const cookie = (await context.cookies()).find(
      (c) => c.name === "NEXT_LOCALE",
    );
    expect(cookie?.value).toBe("zh");
    expect(cookie?.sameSite).toBe("Lax");
    const lifetime = (cookie?.expires ?? 0) - Date.now() / 1000;
    expect(Math.abs(lifetime - YEAR_SECONDS)).toBeLessThan(60 * 60);

    // The cookie wins over the English browser on the next visit to `/`.
    await page.goto("/");
    await expect(page).toHaveURL(/\/zh$/);
    await context.close();
  });

  test("opening and closing the menu changes nothing", async ({ page }) => {
    await page.goto("/en");
    // Wait for hydration, so the keyboard reaches a live menu.
    await page.waitForLoadState("networkidle");
    const button = languageButton(page, "Language: English");
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByRole("menuitemradio", { name: "中文" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(button).toBeFocused();

    const cookie = (await page.context().cookies()).find(
      (c) => c.name === "NEXT_LOCALE",
    );
    expect(cookie?.value ?? "en").toBe("en");
    await expect(page).toHaveURL(/\/en$/);
  });

  test("the header fits on one line", async ({ page }) => {
    await page.goto("/zh");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const header = await page.locator("body > header").boundingBox();
    expect(header?.height).toBeLessThanOrEqual(60);
  });
});

test.describe("language twins in metadata", () => {
  for (const path of ["/zh", "/zh/design"]) {
    test(`${path} declares its own canonical and both languages`, async ({
      page,
    }) => {
      await page.goto(path);
      const suffix = path.replace(/^\/zh/, "");
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute(
        "href",
        new RegExp(`/zh${suffix}$`),
      );
      const alternate = (lang: string) =>
        page.locator(`link[rel="alternate"][hreflang="${lang}"]`);
      await expect(alternate("en")).toHaveAttribute(
        "href",
        new RegExp(`/en${suffix}$`),
      );
      await expect(alternate("zh-Hans")).toHaveAttribute(
        "href",
        new RegExp(`/zh${suffix}$`),
      );
      await expect(alternate("x-default")).toHaveAttribute(
        "href",
        new RegExp(`/en${suffix}$`),
      );
    });
  }
});

test("LocalTime switches to the reader's zone with no hydration warning", async ({
  browser,
  request,
}) => {
  // The server sends the UTC+8 date and title.
  const html = await (await request.get("/en/design")).text();
  expect(html).toMatch(
    /<time dateTime="2026-10-31T17:00:00.000Z" title="Nov 1, 2026, 1:00\sAM"[^>]*>Nov 1, 2026<\/time>/,
  );

  const context = await browser.newContext({
    timezoneId: "Europe/London",
    locale: "en-GB",
  });
  const page = await context.newPage();
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (/hydrat/i.test(message.text())) warnings.push(message.text());
  });
  await page.goto("/en/design");
  const older = page.locator('time[datetime="2026-01-15T09:30:00.000Z"]');
  await expect(older).toHaveAttribute("title", /^Jan 15, 2026, 9:30\sAM$/);
  await expect(older).toHaveText("Jan 15, 2026");
  const late = page.locator('time[datetime="2026-10-31T17:00:00.000Z"]');
  await expect(late).toHaveAttribute("title", /^Oct 31, 2026, 5:00\sPM$/);
  expect(warnings).toEqual([]);
  await context.close();
});
