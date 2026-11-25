import { expect, test, type Page } from "@playwright/test";
import en from "../messages/en.json";
import { adminClient } from "./support/admin";

// Spec 0013, AC-1 to AC-6, AC-9, AC-11. Local stack with the seed only
// (`adminClient` refuses any other host). The member is the seeded Mei, who owns
// no game from the seed's Wingspan row until the test says so.

const add = en.addGame;
const dock = en.game.dock;

async function signIn(page: Page) {
  await page.goto("/en/sign-in");
  const submit = page.locator("form button[type=submit]");
  await expect(submit).toBeEnabled({ timeout: 30_000 });
  await page.getByLabel("Username or email").fill("mei@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await submit.click();
  await expect(page).not.toHaveURL(/sign-in/, { timeout: 30_000 });
}

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

let created: number[] = [];

test.afterEach(async () => {
  const admin = adminClient();
  for (const id of created) await admin.from("games").delete().eq("id", id);
  created = [];
});

test("a guest on the Add page is sent to sign in and back (AC-1)", async ({
  page,
}) => {
  await page.goto("/en/games/new");
  await expect(page).toHaveURL(/\/en\/sign-in\?next=\/games\/new$/);
});

test("search finds an existing game and shows who owns it (AC-2, AC-3)", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/en/games/new");
  await page.getByPlaceholder(add.search.placeholder).fill("wingspan");
  await expect(page.getByRole("link", { name: "Wingspan" })).toBeVisible();
  await expect(page.getByText(/Owned by/).first()).toBeVisible();
  await noSidewaysScroll(page);
});

test("a new game is added with the member as its owner (AC-4, AC-5)", async ({
  page,
}, info) => {
  await signIn(page);
  await page.goto("/en/games/new");
  const name = `E2E Added ${info.project.name} ${Date.now()}`;
  await page.getByPlaceholder(add.search.placeholder).fill(name);
  await expect(page.getByText(add.search.none)).toBeVisible();
  await page.getByRole("button", { name: add.addYourself }).click();
  await noSidewaysScroll(page);
  await page.getByLabel(add.form.fields.name, { exact: true }).fill(name);
  await page.getByRole("button", { name: add.form.save }).click();

  await expect(page).toHaveURL(/\/en\/games\/\d+$/, { timeout: 30_000 });
  const id = Number(page.url().split("/").pop());
  created.push(id);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  // The dock says the viewer owns it.
  await expect(page.getByRole("button", { name: dock.owned })).toBeVisible();

  const { data } = await adminClient()
    .from("games")
    .select("reviewed_at, source_kind")
    .eq("id", id)
    .single();
  expect(data?.reviewed_at).toBeNull();
  expect(data?.source_kind).toBe("manual");
});

test("owning and un-owning on the sheet, with Undo (AC-9, AC-11)", async ({
  page,
}, info) => {
  const { data, error } = await adminClient()
    .from("games")
    .insert({ name: `E2E Toggle ${info.project.name} ${Date.now()}` })
    .select("id")
    .single();
  if (error) throw error;
  created.push(data.id);

  await signIn(page);
  await page.goto(`/en/games/${data.id}`);
  await page.getByRole("button", { name: dock.own }).click();
  await expect(page.getByRole("button", { name: dock.owned })).toBeVisible();

  await page.getByRole("button", { name: dock.owned }).click();
  await expect(page.getByText(dock.removed)).toBeVisible();
  await page.getByRole("button", { name: dock.undo }).click();
  await expect(page.getByRole("button", { name: dock.owned })).toBeVisible();

  // Leaving the game with no owner keeps it (AC-11).
  await page.getByRole("button", { name: dock.owned }).click();
  // "Removed · Undo" shows for 5 seconds, then "I own this" returns.
  await expect(page.getByText(dock.removed)).toBeVisible();
  await expect(page.getByRole("button", { name: dock.own })).toBeVisible({
    timeout: 15_000,
  });
  const { data: still } = await adminClient()
    .from("games")
    .select("id")
    .eq("id", data.id)
    .maybeSingle();
  expect(still?.id).toBe(data.id);
});
