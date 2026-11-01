import { describe, expect, it } from "vitest";
import { coverInitial } from "./cover-initial";

// Spec 0006, AC-6.
describe("coverInitial", () => {
  it("takes the first whole Chinese character", () => {
    expect(coverInitial("三国杀")).toBe("三");
  });

  it("uppercases and skips leading spaces", () => {
    expect(coverInitial(" azul")).toBe("A");
  });

  it("keeps an astral character whole", () => {
    expect(coverInitial("🎲 Dice")).toBe("🎲");
  });

  it("gives an empty string for an empty name", () => {
    expect(coverInitial("  ")).toBe("");
  });
});
