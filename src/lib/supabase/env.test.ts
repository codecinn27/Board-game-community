import { afterEach, describe, expect, it, vi } from "vitest";
import { siteBaseUrl } from "./env";

describe("siteBaseUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses NEXT_PUBLIC_SITE_URL when set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shelf.example.com");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "x.vercel.app");
    expect(siteBaseUrl()).toBe("https://shelf.example.com");
  });

  it("falls back to the preview address on a Vercel preview build", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "x.vercel.app");
    expect(siteBaseUrl()).toBe("https://x.vercel.app");
  });

  it("throws in production when it is not set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_URL", "x.vercel.app");
    expect(() => siteBaseUrl()).toThrow("NEXT_PUBLIC_SITE_URL");
  });
});
