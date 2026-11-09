import { describe, expect, it } from "vitest";
import { readDailyCap } from "./cap";

describe("readDailyCap", () => {
  it("defaults to 80 when unset or not a positive whole number", () => {
    for (const value of [undefined, "", "abc", "0", "-5", "2.5", "1e3"]) {
      expect(readDailyCap(value)).toBe(80);
    }
  });

  it("reads a positive whole number", () => {
    expect(readDailyCap("25")).toBe(25);
    expect(readDailyCap(" 7 ")).toBe(7);
  });
});
