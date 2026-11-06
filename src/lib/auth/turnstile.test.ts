import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

beforeEach(() => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
});

async function verify(fetcher: typeof fetch, token = "tok") {
  const { verifyTurnstile } = await import("./turnstile");
  return verifyTurnstile(token, fetcher);
}

const reply = (body: unknown, ok = true) =>
  vi.fn(async () => ({ ok, json: async () => body }) as Response);

describe("verifyTurnstile", () => {
  it("passes when Cloudflare says success", async () => {
    const fetcher = reply({ success: true });
    expect(await verify(fetcher)).toBe(true);
    const [url, init] = fetcher.mock.calls[0] as unknown as [
      string,
      { body: URLSearchParams },
    ];
    expect(url).toContain("challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(init.body.get("secret")).toBe("secret");
    expect(init.body.get("response")).toBe("tok");
  });

  it("fails on a refused token, a bad status, or a network error", async () => {
    expect(await verify(reply({ success: false }))).toBe(false);
    expect(await verify(reply({ success: true }, false))).toBe(false);
    expect(
      await verify(
        vi.fn(async () => {
          throw new Error("offline");
        }),
      ),
    ).toBe(false);
  });

  it("fails without calling Cloudflare when there is no token", async () => {
    const fetcher = reply({ success: true });
    expect(await verify(fetcher, "")).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
