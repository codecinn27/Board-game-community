import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const auth = { verifyOtp: vi.fn() };
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth }),
}));

beforeEach(() => vi.clearAllMocks());

const request = (query: string) =>
  new NextRequest(`http://localhost:3000/auth/confirm?${query}`);
const locationOf = (response: Response) =>
  new URL(response.headers.get("location") ?? "");

describe("GET /auth/confirm", () => {
  it("signs a confirmed member in and sends them to next", async () => {
    auth.verifyOtp.mockResolvedValue({ error: null });
    const { GET } = await import("./route");
    const response = await GET(
      request("token_hash=h&type=signup&next=/shelf&locale=zh"),
    );
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      type: "signup",
      token_hash: "h",
    });
    expect(locationOf(response).pathname).toBe("/zh/shelf");
  });

  it("sends a reset link to the new password page", async () => {
    auth.verifyOtp.mockResolvedValue({ error: null });
    const { GET } = await import("./route");
    const response = await GET(
      request("token_hash=h&type=recovery&next=/shelf&locale=en"),
    );
    expect(locationOf(response).pathname).toBe("/en/reset-password");
  });

  it("shows the link message for an expired or used link", async () => {
    auth.verifyOtp.mockResolvedValue({ error: { message: "expired" } });
    const { GET } = await import("./route");
    const response = await GET(request("token_hash=h&type=signup&locale=en"));
    expect(locationOf(response).pathname).toBe("/en/sign-in");
    expect(locationOf(response).searchParams.get("error")).toBe("link");
  });

  it("refuses a missing hash or an unknown type", async () => {
    const { GET } = await import("./route");
    const noHash = await GET(request("type=signup&locale=en"));
    const badType = await GET(request("token_hash=h&type=magiclink&locale=en"));
    expect(locationOf(noHash).searchParams.get("error")).toBe("link");
    expect(locationOf(badType).searchParams.get("error")).toBe("link");
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("ignores an unsafe next", async () => {
    auth.verifyOtp.mockResolvedValue({ error: null });
    const { GET } = await import("./route");
    const response = await GET(
      request("token_hash=h&type=signup&next=https://evil.com&locale=en"),
    );
    expect(locationOf(response).pathname).toBe("/en");
    expect(locationOf(response).host).toBe("localhost:3000");
  });
});
