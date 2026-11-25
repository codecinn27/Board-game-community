import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import en from "../messages/en.json";
import { adminClient } from "./support/admin";

// Spec 0013 amendment, AC-16 to AC-22. Needs the local Supabase stack with the
// seed (the admin is mei@example.com, password `password123`): `adminClient`
// refuses any other host, so these tests cannot touch the real project. Each
// test makes its own game and removes it afterwards. Edit history cannot be
// deleted through the API (nobody has the grant), and an admin's edit writes an
// admin log row, so run `supabase db reset` after these before `supabase test db`.

const editor = en.review.editor;
const row = en.review.row;
const tabs = en.review.tabs;

async function signInAsAdmin(page: Page) {
  await page.goto("/en/sign-in");
  const submit = page.locator("form button[type=submit]");
  // Enabled once the page has hydrated and the security check handed over a token.
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

/**
 * The admin's own session, the only way to read `game_edits` (admin only). Local
 * sign in asks for a captcha, so it signs in with a one time token instead.
 */
async function adminSession() {
  const { data, error } = await adminClient().auth.admin.generateLink({
    type: "magiclink",
    email: "mei@example.com",
  });
  if (error) throw error;
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const verified = await client.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: "magiclink",
  });
  if (verified.error) throw verified.error;
  return client;
}

let game: { id: number; name: string };

test.beforeEach(async ({ page }, info) => {
  const name = `E2E Review ${info.project.name} ${Date.now()}`;
  const { data, error } = await adminClient()
    .from("games")
    .insert({ name, description: "An end to end test game" })
    .select("id")
    .single();
  if (error) throw error;
  game = { id: data.id, name };
  await signInAsAdmin(page);
  await page.goto("/en/admin/review");
});

test.afterEach(async () => {
  const admin = adminClient();
  await admin.from("games").delete().eq("id", game.id);
  await admin.from("cover_trash").delete().eq("game_id", game.id);
});

function item(page: Page) {
  return page.getByRole("listitem").filter({
    has: page.getByRole("button", { name: game.name, exact: true }),
  });
}

test("the admin fixes a game in the editor and approves it in one save (AC-16, AC-17, AC-19, AC-21)", async ({
  page,
}) => {
  await page.getByRole("button", { name: game.name, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await noSidewaysScroll(page);

  const newName = `${game.name} Deluxe`;
  await dialog.getByLabel(editor.fields.name, { exact: true }).fill(newName);
  await dialog.getByRole("tab", { name: editor.tabs.zh }).click();
  // Chinese names are unique, and the two screen sizes run side by side.
  const zhName = `测试游戏${Date.now()}`;
  await dialog.getByLabel(editor.fields.nameZh).fill(zhName);
  await dialog.getByText("Strategy", { exact: true }).click();
  await dialog.getByRole("button", { name: editor.saveAndApprove }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });

  // The game moved to Reviewed with the new values, and history has one row.
  await page.getByRole("link", { name: tabs.done }).click();
  await expect(page.getByText(newName)).toBeVisible();
  const admin = adminClient();
  const { data: saved } = await admin
    .from("games")
    .select("name, name_zh, reviewed_at")
    .eq("id", game.id)
    .single();
  expect(saved?.name).toBe(newName);
  expect(saved?.name_zh).toBe(zhName);
  expect(saved?.reviewed_at).not.toBeNull();
  const { data: edits } = await (
    await adminSession()
  )
    .from("game_edits")
    .select("changed")
    .eq("game_id", game.id);
  expect(edits).toHaveLength(1);
  expect(edits?.[0]?.changed).toEqual(
    expect.arrayContaining(["name", "name_zh", "category_ids"]),
  );
});

test("a tap anywhere on the top block opens the editor, View game page opens the sheet", async ({
  page,
}) => {
  // The description text is not a button any more; the whole block is the target.
  await item(page).getByText("An end to end test game").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: editor.cancel }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // "View game page" opens the game sheet on this page, no navigation.
  const before = page.url();
  await item(page).getByRole("link", { name: editor.gamePage }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: game.name }),
  ).toBeVisible();
  expect(page.url()).toBe(before);
  // The editor did not open as well.
  await expect(
    page.getByRole("dialog").getByLabel(editor.fields.name, { exact: true }),
  ).toHaveCount(0);
});

test("Save keeps the game in To review (AC-19)", async ({ page }) => {
  await page.getByRole("button", { name: game.name, exact: true }).click();
  const dialog = page.getByRole("dialog");
  const newName = `${game.name} Saved`;
  await dialog.getByLabel(editor.fields.name, { exact: true }).fill(newName);
  await dialog.getByRole("button", { name: editor.save, exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  await expect(
    page.getByRole("button", { name: newName, exact: true }),
  ).toBeVisible();
});

test("a Chinese error moves the editor to the Chinese tab (AC-17)", async ({
  page,
}) => {
  await page.getByRole("button", { name: game.name, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: editor.tabs.zh }).click();
  await dialog.getByLabel(editor.fields.nameZh).fill("！！");
  await dialog.getByRole("tab", { name: editor.tabs.en }).click();
  await dialog.getByRole("button", { name: editor.save, exact: true }).click();
  await expect(
    dialog.getByRole("tab", { name: editor.tabs.zh }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByText(editor.errors.nameZhSymbols)).toBeVisible();
});

test("closing with unsaved changes asks first (AC-19)", async ({ page }) => {
  await page.getByRole("button", { name: game.name, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(editor.fields.name, { exact: true }).fill("Changed");
  await dialog.getByRole("button", { name: editor.cancel }).click();
  await expect(dialog.getByRole("alertdialog")).toBeVisible();
  await dialog.getByRole("button", { name: editor.discard.keep }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: editor.cancel }).click();
  await dialog.getByRole("button", { name: editor.discard.discard }).click();
  await expect(dialog).toBeHidden();
  const { data } = await adminClient()
    .from("games")
    .select("name")
    .eq("id", game.id)
    .single();
  expect(data?.name).toBe(game.name);
});

test("Looks right on the card approves at once, without the editor (AC-16)", async ({
  page,
}) => {
  await item(page).getByRole("button", { name: row.looksRight }).click();
  await expect(item(page)).toHaveCount(0, { timeout: 20_000 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const { data } = await adminClient()
    .from("games")
    .select("reviewed_at")
    .eq("id", game.id)
    .single();
  expect(data?.reviewed_at).not.toBeNull();
  const { data: edits } = await (
    await adminSession()
  )
    .from("game_edits")
    .select("id")
    .eq("game_id", game.id);
  expect(edits).toHaveLength(0);
});

test("a reviewed game has no editor until it is marked not reviewed (AC-16)", async ({
  page,
}) => {
  await item(page).getByRole("button", { name: row.looksRight }).click();
  await expect(item(page)).toHaveCount(0, { timeout: 20_000 });

  await page.getByRole("link", { name: tabs.done }).click();
  await expect(page.getByText(game.name)).toBeVisible();
  await expect(
    page.getByRole("button", { name: game.name, exact: true }),
  ).toHaveCount(0);
  // On this tab the name is a link; scope to this game's row, since the other
  // screen size runs a game of its own at the same time.
  await page
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: game.name, exact: true }) })
    .getByRole("button", { name: row.notReviewed })
    .click();

  await page.getByRole("link", { name: tabs.todo }).click();
  await expect(
    page.getByRole("button", { name: game.name, exact: true }),
  ).toBeVisible();
});

test("a game reviewed in another tab is refused with a message (AC-20)", async ({
  page,
}) => {
  await page.getByRole("button", { name: game.name, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel(editor.fields.name, { exact: true })
    .fill("Late edit");
  await adminClient()
    .from("games")
    .update({ reviewed_at: new Date().toISOString() })
    .eq("id", game.id);
  await dialog.getByRole("button", { name: editor.save, exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    editor.problem.alreadyReviewed,
  );
});
