import { isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { ShelfError } from "@/components/shelf/shelf-error";
import LocaleRouteError from "./error";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

// Spec 0009, AC-11: home falls back to this when its read fails.

describe("locale error.tsx backstop", () => {
  // covers: AC-11
  it("renders the error block with the home strings", () => {
    const el = LocaleRouteError({ error: new Error("boom"), retry: () => {} });

    if (!isValidElement<Record<string, unknown>>(el)) {
      throw new Error("expected an element");
    }
    expect(el.type).toBe(ShelfError);
    expect(el.props.title).toBe("home.error.title");
    expect(el.props.body).toBe("home.error.body");
    expect(el.props.retryLabel).toBe("home.error.retry");
  });

  // covers: AC-11
  it("hands the boundary's retry to Try again, not reset", () => {
    const retry = vi.fn();
    const el = LocaleRouteError({ error: new Error("boom"), retry });

    if (!isValidElement<{ onRetry: () => void }>(el)) {
      throw new Error("expected an element");
    }
    el.props.onRetry();
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
