import { describe, expect, it } from "vitest";
import { parseReviewShown, parseReviewTab } from "./review-params";

// Spec 0013, AC-14.

describe("parseReviewTab", () => {
  it("is done only for ?tab=done", () => {
    expect(parseReviewTab("done")).toBe("done");
    expect(parseReviewTab("todo")).toBe("todo");
    expect(parseReviewTab(undefined)).toBe("todo");
    expect(parseReviewTab(["done"])).toBe("todo");
    expect(parseReviewTab("DONE")).toBe("todo");
  });
});

describe("parseReviewShown", () => {
  it("keeps multiples of 30 from 30 to 300", () => {
    expect(parseReviewShown("30")).toBe(30);
    expect(parseReviewShown("90")).toBe(90);
    expect(parseReviewShown("300")).toBe(300);
  });

  it("falls back to 30 for anything else", () => {
    for (const value of ["0", "45", "330", "-30", "abc", "30.5", "", "00030"]) {
      expect(parseReviewShown(value)).toBe(30);
    }
    expect(parseReviewShown(undefined)).toBe(30);
    expect(parseReviewShown(["60"])).toBe(30);
  });
});
