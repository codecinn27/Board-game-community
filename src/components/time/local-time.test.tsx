import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import zh from "../../../messages/zh.json";
import { IntlClientProvider } from "@/i18n/intl-client-provider";
import { LocalTime } from "./local-time";

// The server render, before any effect runs: what the prerender sends and
// what the first client render must match (spec 0005, AC-9).
function serverRender(value: string, locale: "en" | "zh" = "en") {
  const messages = locale === "en" ? en : zh;
  return renderToStaticMarkup(
    <IntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="Europe/London"
    >
      <LocalTime value={value} className="tabular-nums" />
    </IntlClientProvider>,
  );
}

describe("LocalTime on the server", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  // covers: AC-9
  it("renders a time element with the UTC+8 date, whatever the reader's zone", () => {
    const html = serverRender("2026-10-31T17:00:00Z");

    expect(html).toBe(
      '<time dateTime="2026-10-31T17:00:00.000Z" title="Nov 1, 2026, 1:00 AM" class="tabular-nums">Nov 1, 2026</time>',
    );
  });

  // covers: AC-9
  it("formats the date for the page language", () => {
    const html = serverRender("2026-01-15T09:30:00Z", "zh");

    expect(html).toContain(">2026年1月15日</time>");
    expect(html).toContain('title="2026年1月15日 17:30"');
  });

  // covers: AC-9
  it("renders nothing for an invalid value", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(serverRender("not a date")).toBe("");
  });

  // covers: AC-9
  it("logs an invalid value in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    serverRender("not a date");

    expect(error).toHaveBeenCalledWith('LocalTime: invalid value "not a date"');
  });

  it("stays quiet about an invalid value in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    serverRender("not a date");

    expect(error).not.toHaveBeenCalled();
  });
});
