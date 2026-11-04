# Prompt: card grows into a modal, and shrinks back

Copy everything under the line into Claude Code in another project. It does not
need a library. Change the words in `<angle brackets>` first.

---

Add an open and close animation to my modal in `<path to the modal component>`.
When I tap a card (`<path or name of the card component>`), the card should
appear to grow into the modal. When I close the modal, it should shrink back
into the same card. Do not add an animation library. Use the Web Animations API
(`element.animate`).

## How it should work

This is the FLIP technique (First, Last, Invert, Play).

1. When the modal opens, measure the box of the tapped card's cover or image
   (`getBoundingClientRect`). Measure the modal's real box at rest too.
2. Build a "collapsed" frame that squeezes the modal into the card's box:
   - `scale = min(1, card.width / modal.width)`. Use ONE number for the scale,
     so text is never stretched.
   - `transform: translate(card.left - modal.left px, card.top - modal.top px) scale(scale)`
     with `transform-origin: 0 0`.
   - Crop the bottom with `clip-path` so only the card's height shows:
     `inset(0 0 <max(0, modal.height - card.height / scale)>px 0 round <12 / scale>px)`.
   - The resting frame is `translate(0,0) scale(1)` with
     `clip-path: inset(-120px -120px -120px -120px round 0px)`. The extra room
     keeps a soft glow or shadow from being cut off.
3. Open: `modal.animate([collapsed, rest], { duration: 340, easing: "cubic-bezier(0.2, 0.9, 0.25, 1)" })`.
4. Close: `modal.animate([rest, collapsed], { duration: 260, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" })`.
   Measure the card again at close time, because the page may have scrolled.
5. Fade the dimmed backdrop with a CSS transition of the same length
   (340ms open, 260ms close). Do not use a keyframe fade for it.

Put the frame maths in one small file (for example `modal-motion.ts`) with
three exports: `collapsedFrame(modalBox, cardBox)` (a pure function),
`animateOpen(modal, cardBox | null)` and `animateClose(modal, cardBox | null)`.

## Rules that are easy to get wrong

- **Keep the modal mounted while it closes.** Add a `closing` state. On close,
  set `closing`, run `animateClose`, and unmount only when
  `animation.finished` resolves. If your modal library unmounts on its own
  `open=false`, keep `open` true until the animation ends.
- **Reduced motion:** if `matchMedia("(prefers-reduced-motion: reduce)").matches`,
  skip the animation and open and close at once.
- **No card to grow from** (the card scrolled out of view, or the modal was
  opened some other way): fall back to a 40px slide plus fade.
- **Measure at rest:** call `modal.getAnimations().forEach(a => a.cancel())`
  before measuring, so a half finished animation does not give a wrong box.
- **Backdrop flash:** the stock shadcn/Radix overlay fades with a keyframe that
  ends early, and the backdrop then snaps back to full dark for one frame before
  it unmounts. Use a CSS transition on `opacity` instead.
- **Tailwind 4 moves things with the `translate` property.** If you also animate
  with a Tailwind class, the transition must name `translate`, not `transform`.
  (This is why my first phone slide did not animate at all.)
- Do not hide or move the original card. The modal starts exactly on top of it.

## Check it

1. Unit test `collapsedFrame`: the top left corner lands on the card's corner,
   one uniform scale, the bottom crop matches the card's height, and it never
   scales up.
2. Browser test (Playwright): sample `modal.getBoundingClientRect()` every
   animation frame. The first frame must be on the card's box (within about
   6px) and the last frame must be much bigger. On close, the last frame before
   it unmounts must be back on the card.
3. Browser test: sample the backdrop's computed `opacity` every frame during
   close. It must only ever go down, never back up.
4. Run it at phone width (360px) and desktop width (1280px), and with reduced
   motion turned on.
5. Run my normal checks (`<lint>`, `<typecheck>`, `<tests>`). Tell me which ones
   you ran and which you could not.

## Do not

- Do not add an animation library.
- Do not scale the modal with two different numbers for width and height.
- Do not change anything else in the modal.
