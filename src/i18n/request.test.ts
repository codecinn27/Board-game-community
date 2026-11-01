import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import zh from "../../messages/zh.json";

const rootLocale = vi.fn<() => Promise<string | undefined>>();

vi.mock("next/root-params", () => ({ locale: () => rootLocale() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
// getRequestConfig only wraps the callback; call the callback directly.
vi.mock("next-intl/server", () => ({
  getRequestConfig: <T>(callback: T) => callback,
}));

type Config = {
  locale: string;
  messages: typeof en;
  timeZone: string;
};
type Callback = (params: { locale?: string }) => Promise<Config>;

async function loadConfig() {
  const mod = (await import("./request")) as unknown as { default: Callback };
  return mod.default;
}

describe("request config", () => {
  beforeEach(() => {
    rootLocale.mockReset();
  });

  // covers: AC-5, AC-6
  it("takes the language from the [locale] segment", async () => {
    rootLocale.mockResolvedValue("zh");
    const getConfig = await loadConfig();

    const config = await getConfig({});

    expect(config.locale).toBe("zh");
    expect(config.messages.shell.brand).toBe(zh.shell.brand);
  });

  it("prefers an explicit locale over the segment", async () => {
    rootLocale.mockResolvedValue("zh");
    const getConfig = await loadConfig();

    const config = await getConfig({ locale: "en" });

    expect(config.locale).toBe("en");
    expect(config.messages).toEqual(en);
  });

  // covers: AC-12
  it("gives Chinese messages with every English key underneath", async () => {
    rootLocale.mockResolvedValue("zh");
    const getConfig = await loadConfig();

    const { messages } = await getConfig({});

    expect(Object.keys(messages)).toEqual(Object.keys(en));
    expect(messages.common.language.names).toEqual(en.common.language.names);
  });

  // covers: AC-9
  it("formats on the server in UTC+8", async () => {
    rootLocale.mockResolvedValue("en");
    const getConfig = await loadConfig();

    const config = await getConfig({});

    expect(config.timeZone).toBe("Asia/Kuala_Lumpur");
  });

  // covers: AC-1
  it("shows the 404 for a language the site does not offer", async () => {
    rootLocale.mockResolvedValue("fr");
    const getConfig = await loadConfig();

    await expect(getConfig({})).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("shows the 404 when there is no language at all", async () => {
    rootLocale.mockResolvedValue(undefined);
    const getConfig = await loadConfig();

    await expect(getConfig({})).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
