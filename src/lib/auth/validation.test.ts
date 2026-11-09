import { describe, expect, it } from "vitest";
import {
  checkDisplayName,
  checkEmail,
  checkPassword,
  field,
} from "./validation";

describe("checkDisplayName", () => {
  it("trims and accepts 1 to 40 characters", () => {
    expect(checkDisplayName("  Mei  ")).toEqual({ value: "Mei" });
    expect(checkDisplayName("a".repeat(40)).error).toBeUndefined();
  });

  it("refuses empty and 41 characters", () => {
    expect(checkDisplayName("   ").error).toBe("required");
    expect(checkDisplayName("a".repeat(41)).error).toBe("nameLength");
  });

  it("counts a Chinese name by characters", () => {
    expect(checkDisplayName("小明".repeat(20)).error).toBeUndefined();
    expect(checkDisplayName("小明".repeat(21)).error).toBe("nameLength");
  });
});

describe("checkEmail", () => {
  it("accepts a normal address and trims it", () => {
    expect(checkEmail(" a@b.co ")).toEqual({ value: "a@b.co" });
  });

  it.each(["", "a", "a@b", "a b@c.de", "@b.co"])("refuses %j", (value) => {
    expect(checkEmail(value).error).toBeDefined();
  });
});

describe("checkPassword", () => {
  it("needs 8 or more characters", () => {
    expect(checkPassword("1234567")).toBe("passwordShort");
    expect(checkPassword("12345678")).toBeUndefined();
    expect(checkPassword("")).toBe("required");
  });
});

describe("field", () => {
  it("reads a string and ignores a missing value or a file", () => {
    const data = new FormData();
    data.set("a", "x");
    data.set("f", new File(["x"], "x.txt"));
    expect(field(data, "a")).toBe("x");
    expect(field(data, "missing")).toBe("");
    expect(field(data, "f")).toBe("");
  });
});
