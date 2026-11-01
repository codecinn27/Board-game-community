import type * as ReactTypes from "react";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setLocale } from "@/components/home/test-intl";
import type * as ShelfTypes from "@/lib/games/shelf";
import { ShelfContent } from "./shelf-content";
import { ShelfError } from "./shelf-error";
import { ShelfLoader } from "./shelf-loader";

const refresh = vi.fn();
const shelf = vi.hoisted(() => ({ getShelfData: vi.fn() }));

vi.mock(
  "next-intl/server",
  async () => (await import("@/components/home/test-intl")).intlServerMock,
);
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof ReactTypes>()),
  // Run the transition at once, so a click's effect can be asserted.
  useTransition: () => [false, (fn: () => void) => fn()],
}));
vi.mock("@/lib/games/shelf", async (importOriginal) => ({
  ...(await importOriginal<typeof ShelfTypes>()),
  getShelfData: shelf.getShelfData,
}));

// Spec 0007, AC-5, AC-9.

function find(
  node: ReactNode,
  match: (el: ReactElement<Record<string, unknown>>) => boolean,
): ReactElement<Record<string, unknown>> | null {
  if (!isValidElement<Record<string, unknown>>(node)) return null;
  if (match(node)) return node;
  const children = node.props.children as ReactNode;
  for (const child of Array.isArray(children) ? children : [children]) {
    const found = find(child as ReactNode, match);
    if (found) return found;
  }
  return null;
}

describe("ShelfLoader", () => {
  beforeEach(() => {
    setLocale("en");
    refresh.mockClear();
    shelf.getShelfData.mockReset();
  });

  // covers: AC-5
  it.each([
    [undefined, "all"],
    ["owner", "owner"],
    ["x", "all"],
    [["owner", "owner"], "all"],
  ])("reads ?view=%j as %s", async (value, expected) => {
    shelf.getShelfData.mockResolvedValue({ games: [] });

    const out = (await ShelfLoader({
      searchParams: Promise.resolve({ view: value }),
    })) as ReactElement<{ view: string }>;

    expect(out.type).toBe(ShelfContent);
    expect(out.props.view).toBe(expected);
  });

  // covers: AC-9
  it("shows the error block with its strings when the read throws", async () => {
    shelf.getShelfData.mockRejectedValue(new Error("down"));

    const out = (await ShelfLoader({
      searchParams: Promise.resolve({}),
    })) as ReactElement<{ title: string; body: string; retryLabel: string }>;

    expect(out.type).toBe(ShelfError);
    expect(out.props.title).toBe("Could not load the shelf");
    expect(out.props.retryLabel).toBe("Try again");
  });

  // covers: AC-9
  it("shows the error block in Chinese", async () => {
    setLocale("zh");
    shelf.getShelfData.mockRejectedValue(new Error("down"));

    const out = (await ShelfLoader({
      searchParams: Promise.resolve({}),
    })) as ReactElement<{ title: string }>;

    expect(out.props.title).toBe("无法加载游戏架");
  });
});

describe("ShelfError", () => {
  beforeEach(() => refresh.mockClear());

  const props = { title: "T", body: "B", retryLabel: "Try again" };

  // covers: AC-9
  it("refreshes the route when Try again is pressed", () => {
    const tree = ShelfError(props);
    const button = find(tree, (el) => typeof el.props.onClick === "function");

    (button?.props.onClick as () => void)();

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  // covers: AC-9
  it("calls the boundary's retry instead when given one", () => {
    const retry = vi.fn();
    const tree = ShelfError({ ...props, onRetry: retry });
    const button = find(tree, (el) => typeof el.props.onClick === "function");

    (button?.props.onClick as () => void)();

    expect(retry).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });

  // covers: AC-9
  it("brings its own h1 only when given a heading", () => {
    const isH1 = (el: ReactElement<Record<string, unknown>>) =>
      el.type === "h1";

    expect(find(ShelfError(props), isH1)).toBeNull();
    expect(
      find(ShelfError({ ...props, heading: "Shelf" }), isH1),
    ).not.toBeNull();
  });
});
