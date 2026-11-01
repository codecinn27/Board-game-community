import { createFormatter } from "next-intl";
import { describe, expect, it } from "vitest";
import { type Locale } from "@/i18n/routing";
import { formatLocalTime } from "./format-local-time";

const KL = "Asia/Kuala_Lumpur";
const now = new Date("2026-11-01T12:00:00Z");

function run(
  value: string,
  {
    locale = "en" as Locale,
    at = now as Date | null,
    timeZone = KL as string | undefined,
    monthYear = false,
  } = {},
) {
  const format = createFormatter({ locale, timeZone: KL });
  const justNow = locale === "zh" ? "刚刚" : "just now";
  return formatLocalTime(new Date(value), {
    now: at,
    timeZone,
    format,
    justNow,
    monthYear,
  });
}

describe("formatLocalTime", () => {
  it("says just now under one minute and for a future value", () => {
    expect(run("2026-11-01T11:59:30Z").text).toBe("just now");
    expect(run("2026-11-01T12:05:00Z").text).toBe("just now");
    expect(run("2026-11-01T11:59:30Z", { locale: "zh" }).text).toBe("刚刚");
  });

  it("is relative under 7 days, in each language", () => {
    expect(run("2026-11-01T09:00:00Z").text).toBe("3 hours ago");
    expect(run("2026-11-01T09:00:00Z", { locale: "zh" }).text).toBe("3小时前");
  });

  it("shows the date at exactly 7 days and beyond", () => {
    expect(run("2026-10-25T12:00:00Z").text).toBe("Oct 25, 2026");
    expect(run("2026-10-25T12:00:00Z", { locale: "zh" }).text).toBe(
      "2026年10月25日",
    );
    expect(run("2026-10-26T12:00:00Z").text).toBe("6 days ago");
  });

  it("first render shows the UTC+8 date only, with the full title", () => {
    const result = run("2026-10-31T17:00:00Z", { at: null });
    expect(result.text).toBe("Nov 1, 2026");
    expect(result.title).toMatch(/^Nov 1, 2026.*1:00\s?AM$/);
  });

  it("uses the given zone for the date and title", () => {
    const result = run("2026-10-31T17:00:00Z", {
      at: null,
      timeZone: "Europe/London",
    });
    expect(result.text).toBe("Oct 31, 2026");
    expect(result.title).toMatch(/5:00\s?PM$/);
  });
});

describe("formatLocalTime month and year", () => {
  // Spec 0008, AC-9: "Since Aug 2026", never relative.
  it("shows only the month and year, even for a recent value", () => {
    expect(run("2026-08-02T11:00:00Z", { monthYear: true }).text).toBe(
      "Aug 2026",
    );
    expect(run("2026-11-01T09:00:00Z", { monthYear: true }).text).toBe(
      "Nov 2026",
    );
  });

  it("reads in Chinese, and the title keeps the full date and time", () => {
    const result = run("2026-08-02T11:00:00Z", {
      locale: "zh",
      monthYear: true,
    });

    expect(result.text).toBe("2026年8月");
    expect(result.title).toContain("19:00");
  });

  it("uses the first render zone when now is null", () => {
    expect(
      run("2026-07-31T17:00:00Z", { at: null, monthYear: true }).text,
    ).toBe("Aug 2026");
  });
});
