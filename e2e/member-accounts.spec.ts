import { expect, test, type Page } from "@playwright/test";
import en from "../messages/en.json";
import zh from "../messages/zh.json";
import { deleteUserByEmail } from "./support/admin";
import { deleteMail, waitForMail } from "./support/mailpit";

// Spec 0010, AC-1, 2, 8, 11, 12, 14. The register
// test makes a real account, so it runs only with `E2E_REGISTER=1`.
// Turnstile uses Cloudflare's always pass test keys from `.env.local`.

const inviteCode = process.env.E2E_INVITE_CODE ?? "local-invite-code-1234";

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function waitForSecurityCheck(page: Page) {
  // The submit button stays disabled until the widget hands over a token.
  await expect(page.locator("form button[type=submit]")).toBeEnabled({
    timeout: 20_000,
  });
}

test.describe("guest", () => {
  test("browses with the guest tabs and no sign in prompt (AC-1, AC-8)", async ({
    page,
  }) => {
    await page.goto("/en/shelf");
    await expect(page).toHaveURL(/\/en\/shelf$/);
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav.first()).toBeVisible();
    // The guest set shows after the nav streams in (or is the fallback).
    await expect(
      page.getByRole("link", { name: "Sign in", exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Me", exact: true }),
    ).toHaveCount(0);
  });

  test("/me sends a guest to sign in and keeps the way back (AC-12)", async ({
    page,
  }) => {
    await page.goto("/en/me");
    await expect(page).toHaveURL(/\/en\/sign-in\?next=\/me$/);
  });

  test("the reset page sends a guest to forgot password (AC-12)", async ({
    page,
  }) => {
    await page.goto("/en/reset-password");
    await expect(page).toHaveURL(/\/en\/forgot-password$/);
  });

  test("sign in page fits the screen (AC-14)", async ({ page }) => {
    await page.goto("/en/sign-in");
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    await expect(page.getByLabel("Username or email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await noSidewaysScroll(page);
  });

  test("create account asks only for the code first (AC-2)", async ({
    page,
  }) => {
    await page.goto("/en/sign-in?mode=register");
    await expect(page.getByLabel("Invite code")).toBeVisible();
    await expect(page.getByLabel("Display name")).toHaveCount(0);
    await noSidewaysScroll(page);

    await page.getByLabel("Invite code").fill("not-the-code");
    await waitForSecurityCheck(page);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "not right",
    );
    await expect(page.getByLabel("Display name")).toHaveCount(0);
  });

  test("the right code reveals the register form (AC-2)", async ({ page }) => {
    await page.goto("/en/sign-in?mode=register");
    await page.getByLabel("Invite code").fill(inviteCode);
    await waitForSecurityCheck(page);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByLabel("Display name")).toBeVisible();
    await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Confirm password")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "privacy note" }),
    ).toBeVisible();
    await noSidewaysScroll(page);
  });

  test("a wrong password shows one generic message (AC-5)", async ({
    page,
  }) => {
    await page.goto("/en/sign-in");
    await page.getByLabel("Username or email").fill("nobody_here");
    await page.getByLabel("Password", { exact: true }).fill("wrong-password-1");
    await waitForSecurityCheck(page);
    await page
      .getByRole("button", { name: "Sign in", exact: true })
      .last()
      .click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "The username, email or password is wrong.",
    );
  });
});

for (const [locale, heading, link] of [
  ["en", "Privacy", "Read the privacy note"],
  ["zh", "隐私说明", "查看隐私说明"],
] as const) {
  test.describe(`privacy in ${locale}`, () => {
    test("renders and fits the screen (AC-11, AC-14)", async ({ page }) => {
      await page.goto(`/${locale}/privacy`);
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      await expect(page.locator("main li")).toHaveCount(7);
      await noSidewaysScroll(page);
      expect(link.length).toBeGreaterThan(0);
    });
  });
}

test.describe("email registration", () => {
  // Spec 0011, AC-1 to 4 and 11: register, find the welcome email in Mailpit,
  // then delete the account and the email.
  const registered: string[] = [];

  test.afterEach(async () => {
    for (const email of registered.splice(0)) {
      await deleteUserByEmail(email);
      await deleteMail(email);
    }
  });

  for (const locale of ["en", "zh"] as const) {
    test(`a valid code lets you register, land signed in, and get the welcome email in ${locale} (AC-3, 6, 7, 8)`, async ({
      page,
    }, testInfo) => {
      test.skip(
        process.env.E2E_REGISTER !== "1",
        "creates a real account: needs the local Supabase stack",
      );
      const t = locale === "en" ? en : zh;
      const letters = testInfo.project.name
        .toLowerCase()
        .replace(/[^a-z]/g, "");
      const email = `e2e${Date.now()}${locale}${letters}@example.com`;
      registered.push(email);
      const name = "Mei E2E";
      const username = `mei${Date.now() % 1_000_000_000}`;

      await page.goto(`/${locale}/sign-in?mode=register&next=%2Fshelf`);
      await page.getByLabel(t.auth.fields.inviteCode).fill(inviteCode);
      await waitForSecurityCheck(page);
      await page.getByRole("button", { name: t.auth.invite.submit }).click();

      await page.getByLabel(t.auth.fields.displayName).fill(name);
      await page.getByLabel(t.auth.fields.username).fill(username);
      await page.getByLabel(t.auth.fields.email).fill(email);
      await page
        .getByLabel(t.auth.fields.password, { exact: true })
        .fill("e2e-password-1");
      await page
        .getByLabel(t.auth.fields.confirmRegister)
        .fill("e2e-password-1");
      await waitForSecurityCheck(page);
      await page
        .getByRole("button", { name: t.auth.register.submit })
        .last()
        .click();

      // The redirect does not wait for the email (spec 0011, AC-4).
      await expect(page).toHaveURL(new RegExp(`/${locale}/shelf$`), {
        timeout: 30_000,
      });

      const mails = await waitForMail(email);
      expect(mails).toHaveLength(1);
      const mail = mails[0];
      if (!mail) throw new Error("no welcome email");
      expect(mail.Subject).toBe(t.WelcomeEmail.subject);
      expect(mail.HTML).toContain(name);
      expect(mail.HTML).toContain(
        `lang="${locale === "zh" ? "zh-Hans" : "en"}"`,
      );
      expect(mail.HTML).toContain(`/${locale}/shelf`);
      expect(mail.Text).toContain(`/${locale}/shelf`);

      await page
        .getByRole("link", { name: t.shell.tabs.me, exact: true })
        .first()
        .click();
      await expect(page.getByLabel(t.auth.fields.displayName)).toHaveValue(
        name,
        { timeout: 20_000 },
      );
    });
  }
});

// Spec 0010, AC-16 to AC-21: the Dice Galaxy scene. Runs at 360 and 1280
// through the Playwright projects. Each page also saves a screenshot for the
// engineer.
const scenePages = [
  ["sign in", "/en/sign-in", "Welcome back"],
  ["invite step", "/en/sign-in?mode=register", "Join the community"],
  ["forgot password", "/en/forgot-password", "Forgot your password?"],
  ["forgot password in Chinese", "/zh/forgot-password", "忘记密码了吗？"],
] as const;

test.describe("Dice Galaxy scene", () => {
  for (const [name, path, heading] of scenePages) {
    test(`${name} renders inside the scene (AC-16, AC-19, AC-21)`, async ({
      page,
    }, testInfo) => {
      await page.goto(path);
      const scene = page.locator(".auth-scene");
      await expect(scene).toBeVisible();
      await expect(
        scene.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      await noSidewaysScroll(page);

      // The art is drawn in code: no image files in the scene (AC-19).
      await expect(scene.locator("img")).toHaveCount(0);
      // The sky reaches both window edges (AC-21).
      const sky = await scene.evaluate((el) => {
        const layer = el.querySelector<HTMLElement>(
          ':scope > [aria-hidden="true"]',
        );
        const box = layer?.getBoundingClientRect();
        return box ? [box.left, box.right] : [1, 0];
      });
      const width = await page.evaluate(
        () => document.documentElement.clientWidth,
      );
      expect(sky[0]).toBeLessThanOrEqual(0);
      expect(sky[1]).toBeGreaterThanOrEqual(width);

      await page.screenshot({
        path: testInfo.outputPath(`${name.replace(/\W+/g, "-")}.png`),
        fullPage: true,
      });
    });
  }

  test("the password toggle shows and hides without losing the value (AC-18)", async ({
    page,
  }) => {
    await page.goto("/en/sign-in");
    const password = page.getByLabel("Password", { exact: true });
    const toggle = page.getByRole("button", { name: "Show password" });

    await password.fill("secret-pass-1");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(password).toHaveValue("secret-pass-1");

    await toggle.click();
    await expect(password).toHaveAttribute("type", "password");
    await expect(password).toHaveValue("secret-pass-1");
  });

  test("the footer switch keeps the return page (AC-17)", async ({ page }) => {
    await page.goto("/en/sign-in?next=%2Fshelf");
    await expect(
      page.getByRole("link", { name: "Forgot password?" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/en\/sign-in\?mode=register&next=%2Fshelf$/);
    await expect(page.getByLabel("Invite code")).toBeVisible();

    await page
      .locator(".auth-scene")
      .getByRole("link", { name: "Sign in", exact: true })
      .click();
    await expect(page).toHaveURL(/\/en\/sign-in\?next=%2Fshelf$/);
  });

  test("nothing floats or twinkles with reduced motion (AC-21)", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en/sign-in");
    const moving = await page
      .locator(".auth-scene *")
      .evaluateAll(
        (elements) =>
          elements.filter((el) =>
            getComputedStyle(el).animationName.startsWith("auth-"),
          ).length,
      );
    expect(moving).toBe(0);
  });

  test("the scene stays on the auth pages only (AC-16)", async ({ page }) => {
    await page.goto("/en/privacy");
    await expect(page.locator(".auth-scene")).toHaveCount(0);
  });
});
