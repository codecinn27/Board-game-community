import { describe, expect, it } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b")
  })

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b")
  })

  it("keeps the later Tailwind class when two conflict", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
  })

  it("supports conditional object syntax", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active")
  })

  it("returns an empty string with no input", () => {
    expect(cn()).toBe("")
  })
})
