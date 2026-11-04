import { type useFormatter } from "next-intl";

type Formatter = Pick<
  ReturnType<typeof useFormatter>,
  "dateTime" | "relativeTime"
>;

export const JUST_NOW_MS = 60 * 1000;
export const RELATIVE_LIMIT_MS = 7 * 24 * 60 * 60 * 1000;

type FormatLocalTimeOptions = {
  /** `null` means first render: date only, no relative text. */
  now: Date | null;
  /** `undefined` means the browser's own zone. */
  timeZone: string | undefined;
  format: Formatter;
  /** The translated "just now" (`common.time.justNow`). */
  justNow: string;
  /** Month and year only (`Aug 2026`), never relative: for "Since" dates. */
  monthYear?: boolean;
};

/**
 * Text and title for a timestamp (spec 0005, AC-9). Under one minute old, or in
 * the future (clock skew): "just now". Under 7 days: relative. Otherwise the
 * date. The title is always the full date and time in `timeZone`.
 */
export function formatLocalTime(
  value: Date,
  { now, timeZone, format, justNow, monthYear }: FormatLocalTimeOptions,
): { text: string; title: string } {
  // next-intl falls back to its configured zone, not the browser's, when
  // given none, so read the browser's zone here.
  const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const title = format.dateTime(value, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: zone,
  });
  const date = monthYear
    ? format.dateTime(value, {
        month: "short",
        year: "numeric",
        timeZone: zone,
      })
    : format.dateTime(value, { dateStyle: "medium", timeZone: zone });

  if (monthYear) return { text: date, title };

  if (now === null) return { text: date, title };

  const age = now.getTime() - value.getTime();
  if (age < JUST_NOW_MS) return { text: justNow, title };
  if (age < RELATIVE_LIMIT_MS) {
    return { text: format.relativeTime(value, now), title };
  }
  return { text: date, title };
}
