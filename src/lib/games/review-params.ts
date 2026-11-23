// The Review page's address parts (spec 0013, AC-14). Pure, so it is tested
// without a database.

export const REVIEW_PAGE_SIZE = 30;
export const REVIEW_MAX_SHOWN = 300;

export type ReviewTab = "todo" | "done";

/** Any `?tab` other than `done` is the to review list. */
export function parseReviewTab(
  value: string | string[] | undefined,
): ReviewTab {
  return value === "done" ? "done" : "todo";
}

/** A multiple of 30 from 30 to 300; anything else is 30. */
export function parseReviewShown(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^[0-9]{1,4}$/.test(value)) {
    return REVIEW_PAGE_SIZE;
  }
  const shown = Number(value);
  return shown >= REVIEW_PAGE_SIZE &&
    shown <= REVIEW_MAX_SHOWN &&
    shown % REVIEW_PAGE_SIZE === 0
    ? shown
    : REVIEW_PAGE_SIZE;
}
