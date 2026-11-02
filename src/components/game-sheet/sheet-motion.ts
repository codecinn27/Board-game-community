// The open and close motion of the game modal (spec 0008, AC-14): the card
// grows into the modal and shrinks back into the card. It is the FLIP
// technique (First, Last, Invert, Play) written with the Web Animations API,
// so no animation library is needed.
//
// The modal is squeezed to the card's width with ONE uniform scale (so the
// text is never stretched) and its bottom is cropped to the card's height with
// `clip-path`. Animating that back to the modal's real box looks like the card
// opening up. The cover is at the top of both, so they line up.

/** A rectangle in viewport pixels. */
export type Box = { left: number; top: number; width: number; height: number };

export const OPEN_MS = 340;
export const CLOSE_MS = 260;
const OPEN_EASING = "cubic-bezier(0.2, 0.9, 0.25, 1)";
const CLOSE_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

/** The card's corner radius (`rounded-xl`), in pixels. */
const CARD_RADIUS = 12;
/** Room around the modal in the resting clip, so its soft glow is not cut off. */
const GLOW_ROOM = 120;
/** The slide and fade used when there is no card to grow from. */
const FALLBACK_OFFSET = 40;

type Frame = Pick<Keyframe, "transform" | "clipPath" | "opacity"> & {
  transformOrigin: string;
};

/** The modal at rest: no move, no scale, nothing cropped. */
const rest: Frame = {
  transform: "translate(0px, 0px) scale(1)",
  clipPath: `inset(${-GLOW_ROOM}px ${-GLOW_ROOM}px ${-GLOW_ROOM}px ${-GLOW_ROOM}px round 0px)`,
  opacity: 1,
  transformOrigin: "0 0",
};

/** The modal squeezed into the card's box. Pure, so it can be tested. */
export function collapsedFrame(modal: Box, card: Box): Frame {
  // Never grow the modal's first frame: a card wider than the modal stays 1:1.
  const scale = Math.min(1, card.width / modal.width);
  const dx = card.left - modal.left;
  const dy = card.top - modal.top;
  // The part of the modal (in its own pixels) that the card's height can show.
  const cropBottom = Math.max(0, modal.height - card.height / scale);
  const radius = CARD_RADIUS / scale;
  return {
    transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
    clipPath: `inset(0px 0px ${cropBottom}px 0px round ${radius}px)`,
    opacity: 1,
    transformOrigin: "0 0",
  };
}

/** The frame used with no card to grow from: a short slide and fade. */
function fallbackFrame(): Frame {
  return {
    transform: `translate(0px, ${FALLBACK_OFFSET}px) scale(1)`,
    clipPath: rest.clipPath,
    opacity: 0,
    transformOrigin: "0 0",
  };
}

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Stops any motion in progress, so the modal can be measured at rest. */
function settle(modal: HTMLElement): Box {
  modal.getAnimations().forEach((animation) => animation.cancel());
  const rect = modal.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

/** The card grows into the modal. Null when reduced motion is on. */
export function animateOpen(
  modal: HTMLElement,
  card: Box | null,
): Animation | null {
  if (reducedMotion()) return null;
  const box = settle(modal);
  const from = card === null ? fallbackFrame() : collapsedFrame(box, card);
  return modal.animate([from, rest], {
    duration: OPEN_MS,
    easing: OPEN_EASING,
  });
}

/** The modal shrinks back into the card. Null when reduced motion is on. */
export function animateClose(
  modal: HTMLElement,
  card: Box | null,
): Animation | null {
  if (reducedMotion()) return null;
  const box = settle(modal);
  const to = card === null ? fallbackFrame() : collapsedFrame(box, card);
  // Hold the last frame until React unmounts the modal.
  return modal.animate([rest, to], {
    duration: CLOSE_MS,
    easing: CLOSE_EASING,
    fill: "forwards",
  });
}
