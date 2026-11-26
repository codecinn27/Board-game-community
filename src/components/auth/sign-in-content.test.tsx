import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleButton } from "./google-button";
import { SignInContent } from "./sign-in-content";

// Spec 0015, AC-1 and AC-12: when the Google button is on the page.

vi.mock("server-only", () => ({}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  getMessages: async () => ({ auth: {} }),
}));
const hasInvitePass = vi.fn();
vi.mock("@/lib/auth/invite-cookie", () => ({
  hasInvitePass: () => hasInvitePass(),
}));
vi.mock("./google-button", () => ({ GoogleButton: () => null }));
vi.mock("./auth-scene", () => ({
  AuthCard: () => null,
  AuthFooter: () => null,
}));
vi.mock("./sign-in-form", () => ({ SignInForm: () => null }));
vi.mock("./register-form", () => ({ RegisterForm: () => null }));
vi.mock("./invite-form", () => ({ InviteForm: () => null }));
vi.mock("./form-parts", () => ({ Notice: () => null }));
vi.mock("@/i18n/intl-client-provider", () => ({
  IntlClientProvider: () => null,
}));

function hasGoogle(node: ReactNode): boolean {
  if (Array.isArray(node)) return node.some(hasGoogle);
  if (!isValidElement<{ children?: ReactNode }>(node)) return false;
  return node.type === GoogleButton || hasGoogle(node.props.children);
}

async function shows(params: Record<string, string>) {
  return hasGoogle(
    await SignInContent({ searchParams: Promise.resolve(params) }),
  );
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "client-id");
  hasInvitePass.mockResolvedValue(false);
});

describe("Google button placement", () => {
  it("shows when signing in, and after a valid invite pass", async () => {
    expect(await shows({})).toBe(true);
    hasInvitePass.mockResolvedValue(true);
    expect(await shows({ mode: "register" })).toBe(true);
  });

  it("is absent on the invite code step", async () => {
    expect(await shows({ mode: "register" })).toBe(false);
  });

  it("is absent with no client ID", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "");
    expect(await shows({})).toBe(false);
  });
});
