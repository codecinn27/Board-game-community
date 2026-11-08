import { describe, expect, it, vi } from "vitest";
import { render, textOf } from "@/components/home/test-intl";
import { AuthCard, AuthFooter, AuthScene, AuthSkeleton } from "./auth-scene";

vi.mock("@/i18n/navigation", async () => {
  const { navigationMock } = await import("@/components/home/test-intl");
  return navigationMock;
});

// next/font is a build time transform; under Vitest it only needs a class.
// The name starts with `font-` on purpose: it must not knock out `font-auth`.
vi.mock("next/font/google", () => ({
  Baloo_2: () => ({ variable: "font-baloo-test", className: "" }),
}));

// Spec 0010, AC-16, AC-17, AC-19, AC-21.
describe("AuthScene", () => {
  const html = render(
    <AuthScene>
      <p>form</p>
    </AuthScene>,
  );

  it("scopes the Dice Galaxy tokens and its font", () => {
    expect(html).toContain("auth-scene");
    expect(html).toContain("font-auth");
    expect(html).toContain("font-baloo-test");
  });

  it("hides the whole art layer from assistive tech", () => {
    expect(html).toMatch(/aria-hidden="true" class="pointer-events-none/);
  });

  it("draws the art in code, with no image files", () => {
    expect(html).toContain("<svg");
    expect(html).not.toContain("<img");
  });

  it("only moves the art under motion-safe", () => {
    const moving = html.match(/[\w:-]*animate-auth-[\w-]+/g) ?? [];
    for (const name of [
      "float",
      "twinkle",
      "bob",
      "flicker",
      "puff",
      "shimmer",
    ])
      expect(moving).toContain(`motion-safe:animate-auth-${name}`);
    for (const cls of moving) expect(cls).toMatch(/^motion-safe:animate-auth-/);
  });

  it("places the side art outward from the page center", () => {
    for (const offset of html.match(/(?:left|right)-\[calc\(50%[^\]]*\)\]/g) ??
      [])
      expect(offset).toMatch(/50%\+/);
  });
});

describe("AuthCard", () => {
  const html = render(
    <AuthCard title="Welcome back" subtitle="Sign in to continue your journey">
      <form />
    </AuthCard>,
  );

  it("shows the heading on the sky, the subheading, and the form", () => {
    expect(html).toMatch(/<h1[^>]*text-auth-on-sky[^>]*>Welcome back<\/h1>/);
    expect(textOf(html)).toContain("Sign in to continue your journey");
    expect(html).toContain("<form>");
  });

  it("flies the small rocket only below lg", () => {
    expect(html).toMatch(/<svg aria-hidden="true"[^>]*lg:hidden/);
  });

  it("puts the form on the white card", () => {
    expect(html).toContain("bg-auth-card");
  });
});

describe("AuthSkeleton", () => {
  it("keeps the card shape while loading", () => {
    const html = render(<AuthSkeleton label="Sign in" />);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Sign in"');
    expect(html).toContain("bg-auth-field");
  });
});

describe("AuthFooter", () => {
  it("is a prompt plus a 44px link", () => {
    const html = render(
      <AuthFooter
        prompt="Don't have an account?"
        label="Sign up"
        href="/sign-in?mode=register"
      />,
    );

    expect(textOf(html)).toBe("Don&#x27;t have an account? Sign up");
    expect(html).toContain('href="/en/sign-in?mode=register"');
    expect(html).toContain("min-h-11");
  });
});
