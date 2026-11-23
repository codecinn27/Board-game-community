import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Records the order of calls, so the test can prove the clock is never read
// before `connection()` (Partial Prefetching rejects Date.now otherwise).
const calls: string[] = [];

vi.mock("next/server", () => ({
  connection: async () => {
    calls.push("connection");
  },
}));

const getClaims = vi.fn();
const maybeSingle = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    calls.push("createClient");
    return {
      auth: { getClaims },
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle }) }),
      }),
    };
  },
}));

const { getViewer } = await import("./viewer");

beforeEach(() => {
  calls.length = 0;
  getClaims.mockReset();
  maybeSingle.mockReset();
  maybeSingle.mockResolvedValue({
    data: { role: "member", status: "active", display_name: "Arif" },
  });
  getClaims.mockImplementation(async () => {
    calls.push("getClaims");
    return { data: null };
  });
});

describe("getViewer", () => {
  it("marks the work as request time before reading the session", async () => {
    await getViewer();
    expect(calls).toEqual(["connection", "createClient", "getClaims"]);
  });

  it("is a guest without claims", async () => {
    await expect(getViewer()).resolves.toEqual({ kind: "guest" });
  });

  it("is a member with verified claims", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-1", email: "a@b.co" } },
    });
    await expect(getViewer()).resolves.toEqual({
      kind: "member",
      id: "user-1",
      email: "a@b.co",
      role: "member",
      status: "active",
      displayName: "Arif",
    });
  });

  it("reads the admin role and a disabled status from the profile", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-1" } } });
    maybeSingle.mockResolvedValue({
      data: { role: "admin", status: "disabled", display_name: "Jun" },
    });
    await expect(getViewer()).resolves.toMatchObject({
      role: "admin",
      status: "disabled",
    });
  });

  it("counts a missing profile as an active member, never an admin", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-1" } } });
    maybeSingle.mockResolvedValue({ data: null });
    await expect(getViewer()).resolves.toMatchObject({
      role: "member",
      status: "active",
      displayName: null,
    });
  });
});
