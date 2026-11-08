import { describe, expect, it, vi } from "vitest";
import { render, setLocale } from "@/components/home/test-intl";
import { AuthField } from "./auth-field";
import { FormError, SubmitButton } from "./form-parts";

vi.mock("@/i18n/navigation", async () => {
  const { navigationMock } = await import("@/components/home/test-intl");
  return navigationMock;
});

// Spec 0010, AC-18 and AC-20: the auth scene field keeps a real label, and
// every password input gets a show or hide toggle.
describe("AuthField in the auth scene", () => {
  it("keeps a real label, visually hidden, repeated as the placeholder", () => {
    setLocale("en");
    const html = render(<AuthField name="email" label="email" type="email" />);

    expect(html).toMatch(/<label[^>]*for="field-email"[^>]*>Email<\/label>/);
    expect(html).toMatch(/<label[^>]*class="[^"]*sr-only/);
    expect(html).toContain('placeholder="Email"');
    expect(html).toContain("rounded-xl");
    // The icon sits inside the field and is decoration only.
    const icon = /<svg[^>]*text-auth-icon[^>]*>/.exec(html)?.[0] ?? "";
    expect(icon).toContain('aria-hidden="true"');
  });

  it("gives a password field a toggle button tied to the input", () => {
    setLocale("en");
    const html = render(
      <AuthField name="password" label="password" type="password" />,
    );

    expect(html).toContain('type="password"');
    expect(html).toContain('aria-controls="field-password"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('aria-label="Show password"');
  });

  it("has no toggle on a text field", () => {
    const html = render(<AuthField name="code" label="inviteCode" />);
    expect(html).not.toContain("aria-pressed");
  });

  it("points the input at its hint and its error", () => {
    const html = render(
      <AuthField
        name="password"
        label="password"
        type="password"
        hint="password"
        error="passwordShort"
      />,
    );

    expect(html).toContain(
      'aria-describedby="field-password-hint field-password-error"',
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("Use at least 8 characters.");
  });

  it("translates the toggle name", () => {
    setLocale("zh");
    const html = render(
      <AuthField name="password" label="password" type="password" />,
    );
    expect(html).toContain('aria-label="显示密码"');
    expect(html).toContain('placeholder="密码"');
    setLocale("en");
  });
});

describe("AuthField with the plain look (/me)", () => {
  it("shows the label and no scene icon, but still has the toggle", () => {
    const html = render(
      <AuthField
        name="password"
        label="newPassword"
        type="password"
        look="plain"
      />,
    );

    expect(html).not.toMatch(/<label[^>]*sr-only/);
    expect(html).not.toContain("text-auth-icon");
    expect(html).toContain('aria-pressed="false"');
  });
});

describe("form parts in the auth scene", () => {
  it("shows a form error as an alert in the scene's danger colors", () => {
    const html = render(<FormError error="credentials" />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("text-auth-danger");
    expect(html).toContain("The email or password is wrong.");
  });

  it("puts white text on the pink to violet gradient", () => {
    const html = render(
      <SubmitButton
        label="Sign in"
        pendingLabel="Signing in"
        pending={false}
      />,
    );
    expect(html).toContain("from-auth-button-from");
    expect(html).toContain("to-auth-button-to");
    expect(html).toContain("text-auth-on-button");
    expect(html).toContain(">Sign in<");
  });
});
