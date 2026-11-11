import { describe, expect, it } from "vitest";
import { rankOwners, toggleOwner, visibleOwners } from "./owner-filter";

// Spec 0012, AC-16 to AC-19.

const owners = [
  { memberId: "4", name: "Sara" },
  { memberId: "1", name: "Arif" },
  { memberId: "3", name: "Mei" },
  { memberId: "2", name: "Marisa" },
];

describe("rankOwners", () => {
  // covers: AC-18
  it("lists everyone A to Z for an empty query", () => {
    expect(rankOwners(owners, "  ").map((o) => o.name)).toEqual([
      "Arif",
      "Marisa",
      "Mei",
      "Sara",
    ]);
  });

  // covers: AC-18
  it("puts names that start with the text before names that contain it", () => {
    expect(rankOwners(owners, "ar").map((o) => o.name)).toEqual([
      "Arif",
      "Marisa",
      "Sara",
    ]);
  });

  // covers: AC-18
  it("ignores case and hides names that do not match", () => {
    expect(rankOwners(owners, "MEI").map((o) => o.name)).toEqual(["Mei"]);
    expect(rankOwners(owners, "zzz")).toEqual([]);
  });
});

describe("toggleOwner", () => {
  // covers: AC-19
  it("adds an owner, then removes it on the second click", () => {
    const once = toggleOwner([], "1");
    expect(once).toEqual(["1"]);
    expect(toggleOwner(once, "3")).toEqual(["1", "3"]);
    expect(toggleOwner(once, "1")).toEqual([]);
  });
});

describe("visibleOwners", () => {
  // covers: AC-16
  it("shows every owner with no selection", () => {
    expect(visibleOwners(owners, [])).toHaveLength(4);
  });

  // covers: AC-17
  it("shows only the selected owners, keeping the original order", () => {
    expect(visibleOwners(owners, ["3", "4"]).map((o) => o.name)).toEqual([
      "Sara",
      "Mei",
    ]);
  });
});
