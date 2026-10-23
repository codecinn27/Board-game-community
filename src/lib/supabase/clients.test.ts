import { beforeEach, describe, expect, it, vi } from "vitest"

const createServerClient = vi.fn(() => ({ kind: "server" }))
const createBrowserClient = vi.fn(() => ({ kind: "browser" }))
const createSupabaseClient = vi.fn(() => ({ kind: "supabase-js" }))
const cookieStore = { getAll: vi.fn(() => [{ name: "sb", value: "1" }]), set: vi.fn() }

vi.mock("@supabase/ssr", () => ({ createServerClient, createBrowserClient }))
vi.mock("@supabase/supabase-js", () => ({ createClient: createSupabaseClient }))
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }))

type CookieItem = { name: string; value: string; options?: object }
type ServerOptions = {
  cookies: { getAll: () => unknown; setAll: (items: CookieItem[]) => void }
}
const serverOptions = () =>
  (createServerClient.mock.calls[0] as unknown as [string, string, ServerOptions])[2]

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test")
})

describe("browser client", () => {
  it("is built from the public URL and publishable key", async () => {
    const { createClient } = await import("./browser")
    createClient()
    expect(createBrowserClient).toHaveBeenCalledWith(
      "http://localhost:54321",
      "sb_publishable_test",
    )
  })
})

describe("server client", () => {
  it("uses the publishable key, never the secret key", async () => {
    const { createClient } = await import("./server")
    await createClient()
    const [url, key] = createServerClient.mock.calls[0] as unknown as [string, string]
    expect(url).toBe("http://localhost:54321")
    expect(key).toBe("sb_publishable_test")
    expect(key).not.toBe("sb_secret_test")
  })

  it("reads cookies from the Next.js cookie store", async () => {
    const { createClient } = await import("./server")
    await createClient()
    const opts = serverOptions()
    expect(opts.cookies.getAll()).toEqual([{ name: "sb", value: "1" }])
  })

  it("writes refreshed cookies to the store", async () => {
    const { createClient } = await import("./server")
    await createClient()
    const opts = serverOptions()
    opts.cookies.setAll([{ name: "sb", value: "2", options: { path: "/" } }])
    expect(cookieStore.set).toHaveBeenCalledWith("sb", "2", { path: "/" })
  })

  it("does not throw when cookies cannot be set (Server Component)", async () => {
    cookieStore.set.mockImplementationOnce(() => {
      throw new Error("read only cookies")
    })
    const { createClient } = await import("./server")
    await createClient()
    const opts = serverOptions()
    expect(() =>
      opts.cookies.setAll([{ name: "sb", value: "2", options: {} }]),
    ).not.toThrow()
  })
})

describe("public client", () => {
  it("uses the publishable key and keeps no session, so pages stay cacheable", async () => {
    const { createPublicClient } = await import("./public")
    createPublicClient()
    expect(createSupabaseClient).toHaveBeenCalledWith(
      "http://localhost:54321",
      "sb_publishable_test",
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
  })
})

describe("admin client", () => {
  it("refuses to load outside server code (server-only guard)", async () => {
    vi.resetModules()
    await expect(import("./admin")).rejects.toThrow()
  })

  it("uses the secret key and keeps no session when loaded as server code", async () => {
    vi.resetModules()
    vi.doMock("server-only", () => ({}))
    const { createAdminClient } = await import("./admin")
    createAdminClient()
    expect(createSupabaseClient).toHaveBeenCalledWith(
      "http://localhost:54321",
      "sb_secret_test",
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
  })
})
