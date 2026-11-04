import { afterEach, describe, expect, it, vi } from "vitest";
import { coverUrl } from "./cover-url";

describe("coverUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("builds the public bucket address", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co/");
    expect(coverUrl("splendor.jpg")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/covers/splendor.jpg",
    );
  });

  it("is null without a path, so the tint tile shows", () => {
    expect(coverUrl(null)).toBeNull();
    expect(coverUrl(undefined)).toBeNull();
    expect(coverUrl("")).toBeNull();
  });
});
