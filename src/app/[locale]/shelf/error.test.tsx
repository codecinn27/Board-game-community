import { isValidElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { ShelfError } from "@/components/shelf/shelf-error";
import ShelfRouteError from "./error";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

// Spec 0007, AC-9.

function shelfError(retry: () => void) {
  const tree = ShelfRouteError({ error: new Error("boom"), retry });
  const child = (tree as ReactElement<{ children: unknown }>).props.children;
  if (!isValidElement<Record<string, unknown>>(child)) {
    throw new Error("expected a ShelfError element");
  }
  return child;
}

describe("shelf error.tsx backstop", () => {
  // covers: AC-9
  it("renders ShelfError with the h1 and the error strings", () => {
    const el = shelfError(() => {});

    expect(el.type).toBe(ShelfError);
    expect(el.props.heading).toBe("shelf.heading");
    expect(el.props.title).toBe("shelf.error.title");
    expect(el.props.body).toBe("shelf.error.body");
    expect(el.props.retryLabel).toBe("shelf.error.retry");
  });

  // covers: AC-9
  it("hands the boundary's retry to Try again, not reset", () => {
    const retry = vi.fn();
    const el = shelfError(retry);

    expect(el.props.onRetry).toBe(retry);
  });
});
