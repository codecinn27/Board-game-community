import { describe, expect, it } from "vitest";
import { buildTaggingPrompt, type PromptGame } from "./tagging-prompt";

const lists = {
  feels: [{ slug: "party-games", nameEn: "Party Games" }],
  themes: [{ slug: "horror", nameEn: "Horror" }],
  mechanics: [
    { slug: "bluffing", nameEn: "Bluffing", descriptionEn: "Mislead others." },
  ],
};

function game(over: Partial<PromptGame> = {}): PromptGame {
  return {
    id: 7,
    name: "Avalon",
    nameZh: null,
    description: null,
    feels: [],
    themes: [],
    mechanics: [],
    ...over,
  };
}

describe("buildTaggingPrompt", () => {
  it("is null when there are no games", () => {
    expect(buildTaggingPrompt([], lists)).toBeNull();
  });

  it("lists every choice by slug, with mechanic hints", () => {
    const text = buildTaggingPrompt([game()], lists) ?? "";
    expect(text).toContain("- party-games: Party Games");
    expect(text).toContain("- horror: Horror");
    expect(text).toContain("- bluffing: Bluffing (Mislead others.)");
  });

  it("names each game by id and keeps its saved tags", () => {
    const text =
      buildTaggingPrompt(
        [game({ nameZh: "阿瓦隆", feels: ["party-games"] })],
        lists,
      ) ?? "";
    expect(text).toContain("id 7: Avalon (Chinese: 阿瓦隆)");
    expect(text).toContain("already tagged: feels party-games");
  });

  it("shortens a long description to one line", () => {
    const text =
      buildTaggingPrompt(
        [game({ description: `a\n${"x".repeat(300)}` })],
        lists,
      ) ?? "";
    expect(text).toContain("...");
    expect(text).not.toContain("x".repeat(250));
  });
});
