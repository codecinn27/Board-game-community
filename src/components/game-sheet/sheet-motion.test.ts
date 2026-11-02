import { describe, expect, it } from "vitest";
import { collapsedFrame, type Box } from "./sheet-motion";

// Spec 0008, AC-14: the card grows into the modal and shrinks back.

const modal: Box = { left: 384, top: 40, width: 512, height: 720 };
const card: Box = { left: 60, top: 367, width: 102, height: 102 };

describe("collapsedFrame", () => {
  // covers: AC-14
  it("puts the modal's top left corner on the card's top left corner", () => {
    const frame = collapsedFrame(modal, card);

    expect(frame.transform).toBe(
      `translate(${card.left - modal.left}px, ${card.top - modal.top}px) scale(${card.width / modal.width})`,
    );
    expect(frame.transformOrigin).toBe("0 0");
  });

  // covers: AC-14
  it("scales by one number, so text is never stretched", () => {
    const frame = collapsedFrame(modal, card);

    expect(String(frame.transform)).toMatch(/scale\([0-9.]+\)$/);
    expect(String(frame.transform)).not.toContain(",)");
  });

  // covers: AC-14
  it("crops the bottom so only the card's height shows", () => {
    const frame = collapsedFrame(modal, card);
    const scale = card.width / modal.width;
    const crop = modal.height - card.height / scale;

    expect(frame.clipPath).toContain(`inset(0px 0px ${crop}px 0px`);
  });

  // covers: AC-14
  it("rounds the corners like the card, in the modal's own pixels", () => {
    const frame = collapsedFrame(modal, card);
    const scale = card.width / modal.width;

    expect(frame.clipPath).toContain(`round ${12 / scale}px`);
  });

  // covers: AC-14
  it("never scales up, and never crops a negative amount", () => {
    const wide: Box = { left: 0, top: 0, width: 900, height: 2000 };

    const frame = collapsedFrame(modal, wide);

    expect(frame.transform).toContain("scale(1)");
    expect(frame.clipPath).toContain("inset(0px 0px 0px 0px");
  });
});
