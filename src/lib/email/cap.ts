export const DEFAULT_DAILY_CAP = 80;

/** A positive whole number, else the default (spec 0011, AC-6). */
export function readDailyCap(value: string | undefined): number {
  if (value === undefined || !/^\d+$/.test(value.trim())) {
    return DEFAULT_DAILY_CAP;
  }
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_DAILY_CAP;
}
