import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Description } from "./description";
import { SheetError } from "./sheet-error";
import { SheetSkeleton } from "./sheet-skeleton";

const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh }) }));

// Spec 0008, AC-8 and AC-15.

describe("SheetSkeleton", () => {
  // covers: AC-15
  it("is busy and labelled, with the sheet's frame", () => {
    const html = renderToStaticMarkup(<SheetSkeleton label="Loading game" />);

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Loading game"');
    expect(html).toContain("h-[52dvh] max-h-[30rem]");
  });
});

describe("SheetError", () => {
  // covers: AC-15
  it("shows its strings from props, with no message provider", () => {
    const html = renderToStaticMarkup(
      <SheetError
        title="Could not load this game"
        body="Try again in a moment."
        retryLabel="Try again"
      />,
    );

    expect(html).toContain("Could not load this game");
    expect(html).toContain("Try again in a moment.");
    expect(html).toContain("<button");
    expect(html).toContain("Try again");
  });
});

describe("Description", () => {
  // covers: AC-8
  it("starts clamped to 4 lines with no More until the text is measured as cut off", () => {
    const html = renderToStaticMarkup(
      <Description text="A short one." moreLabel="More" lessLabel="Less" />,
    );

    expect(html).toContain("line-clamp-4");
    expect(html).toContain("A short one.");
    expect(html).not.toContain("<button");
  });
});
