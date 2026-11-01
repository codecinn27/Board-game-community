import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { routing } from "@/i18n/routing";

// next-intl ships its middleware as ESM that Node cannot load under Vitest, so
// the redirects and the cookie are checked live in e2e/two-languages.spec.ts.
// Here: the proxy wires next-intl to our routing, and the matcher skips the
// right paths.
const { createMiddleware, handleIntl } = vi.hoisted(() => {
  const handleIntl = vi.fn(
    (_request: unknown) => new Response(null, { status: 307 }),
  );
  return { handleIntl, createMiddleware: vi.fn(() => handleIntl) };
});
vi.mock("next-intl/middleware", () => ({ default: createMiddleware }));

const { default: proxy, config } = await import("./proxy");
// Read now: Vitest clears mock calls before each test.
const middlewareBuiltWith = createMiddleware.mock.calls.map((call) => call);

describe("proxy", () => {
  // covers: AC-1, AC-2, AC-4
  it("builds the next-intl middleware once, from the shared routing", () => {
    expect(middlewareBuiltWith).toEqual([[routing]]);
  });

  // covers: AC-1
  it("passes each request to the middleware and returns its response", async () => {
    const request = new NextRequest("http://localhost:3000/design?x=1");

    const response = await proxy(request);

    expect(handleIntl).toHaveBeenCalledWith(request);
    expect(response.status).toBe(307);
  });
});

describe("proxy game ids", () => {
  // covers: spec 0008 AC-1
  it.each(["/en/games/999", "/zh/games/abc", "/en/games/0", "/en/games/1.5"])(
    "rewrites %s to the catch all 404",
    async (path) => {
      handleIntl.mockClear();
      const response = await proxy(
        new NextRequest(`http://localhost:3000${path}`),
      );

      expect(response.headers.get("x-middleware-rewrite")).toMatch(
        /\/(en|zh)\/_missing$/,
      );
      expect(handleIntl).not.toHaveBeenCalled();
    },
  );

  it("leaves a real game id to the middleware", async () => {
    handleIntl.mockClear();
    await proxy(new NextRequest("http://localhost:3000/en/games/3"));

    expect(handleIntl).toHaveBeenCalledTimes(1);
  });
});

describe("proxy matcher", () => {
  const [pattern] = config.matcher;
  if (pattern === undefined) throw new Error("proxy has no matcher");
  // Next anchors the matcher to the whole path.
  const runs = (path: string) => new RegExp(`^${pattern}$`).test(path);

  // covers: AC-1
  it("runs on pages, with or without a language prefix", () => {
    expect(runs("/")).toBe(true);
    expect(runs("/design")).toBe(true);
    expect(runs("/zh/no-such-page")).toBe(true);
    expect(runs("/fr/x")).toBe(true);
  });

  // covers: AC-1
  it("skips API, auth, Next internals, and paths with a dot", () => {
    expect(runs("/api/nope")).toBe(false);
    expect(runs("/auth/callback")).toBe(false);
    expect(runs("/_next/static/chunk.js")).toBe(false);
    expect(runs("/_vercel/insights")).toBe(false);
    expect(runs("/favicon.ico")).toBe(false);
    expect(runs("/en/robots.txt")).toBe(false);
  });
});
