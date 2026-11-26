import { expect, test, type Page } from "@playwright/test";

// Spec 0015, AC-8, 9, 11. Google's script is blocked or replaced by a stub, so
// no real Google account is needed. A real Google sign in is a hand check. The
// dev server needs a `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (any value will do).

test.skip(
  !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  "NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set",
);

const SCRIPT = "https://accounts.google.com/gsi/client*";

// Records each setup and draws a button that hands back a made up token.
const STUB = `
window.__setups = [];
window.google = { accounts: { id: {
  initialize(options) { window.__options = options; window.__setups.push(options.nonce); },
  renderButton(element, options) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Stub Google " + options.locale;
    button.onclick = () => window.__options.callback({ credential: "not-a-token" });
    element.appendChild(button);
  },
} } };
`;

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

function setups(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __setups: string[] }).__setups,
  );
}

test("a blocked script leaves the email form and the hint (AC-9)", async ({
  page,
}) => {
  await page.route(SCRIPT, (route) => route.abort());
  await page.goto("/en/sign-in");
  await expect(page.getByText("or", { exact: true })).toBeVisible();
  await expect(page.getByText("or", { exact: true })).toHaveCount(0, {
    timeout: 15_000,
  });
  await expect(page.getByText("If Google does not work")).toBeVisible();
  await expect(page.getByLabel("Username or email")).toBeVisible();
  await noSidewaysScroll(page);
});

test("a refused token shows an error and a fresh nonce (AC-8)", async ({
  page,
}) => {
  await page.route(SCRIPT, (route) =>
    route.fulfill({ contentType: "text/javascript", body: STUB }),
  );
  await page.goto("/en/sign-in");
  const button = page.getByRole("button", { name: "Stub Google en" });
  await expect(button).toBeVisible();
  await page.getByLabel("Username or email").fill("typed-before");
  // It settles: setting the nonce cookie must not set the button up forever.
  await page.waitForTimeout(2000);
  const before = await setups(page);
  expect(before.length).toBeLessThanOrEqual(2);
  expect(before.at(-1)).toMatch(/^[0-9a-f]{64}$/);

  await button.click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Google sign in did not work",
  );
  await expect
    .poll(async () => (await setups(page)).at(-1))
    .not.toBe(before.at(-1));
  await expect(page.getByLabel("Username or email")).toHaveValue(
    "typed-before",
  );
  await expect(page).toHaveURL(/\/en\/sign-in$/);
});

test("the button follows the page language (AC-11)", async ({ page }) => {
  await page.route(SCRIPT, (route) =>
    route.fulfill({ contentType: "text/javascript", body: STUB }),
  );
  await page.goto("/zh/sign-in");
  await expect(
    page.getByRole("button", { name: "Stub Google zh_CN" }),
  ).toBeVisible();
  await noSidewaysScroll(page);
});
