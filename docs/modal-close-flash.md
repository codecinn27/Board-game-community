# Game modal: the close flash

Spec: [0008 game detail sheet](specs/0008-game-detail-sheet.md), AC-22.
Code: `src/components/game-sheet/sheet-host.tsx`.

## 1. What the issue was

When you closed the game modal (click outside, Esc, or Close), the screen
flashed for a moment, like a "lightning shock". No request was sent. It only
happened in the browser.

I measured the close frame by frame. There were two separate bugs:

| # | Bug | What you saw |
|---|-----|--------------|
| 1 | The dark backdrop faded out too early, then jumped back to full dark for one frame before it was removed | A brief dark flash |
| 2 | On phones the sheet had no slide animation at all | The sheet vanished instantly |

Things I checked and ruled out: layout shift, the modal reopening, network
requests, console errors, and scroll position. All were clean.

## 2. Before and after

### Bug 1: the backdrop

**Before** (the stock shadcn overlay, which uses a short keyframe fade):

```tsx
<DialogOverlay className="bg-foreground/50 supports-backdrop-filter:backdrop-blur-none" />
```

The stock overlay brings `duration-100` and `animate-out fade-out-0`. The
backdrop reached 0% at about 170ms, then snapped back to 100% at about 230ms
while the sheet was still on screen.

**After** (its own fade, same timing as the sheet):

```tsx
<DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-foreground/50
  data-ending-style:opacity-0 data-starting-style:opacity-0
  motion-safe:transition-opacity motion-safe:duration-280 motion-safe:ease-out
  motion-safe:data-ending-style:duration-200" />
```

### Bug 2: the phone slide

**Before:**

```tsx
motion-safe:transition-[transform,opacity]
```

**After:**

```tsx
motion-safe:transition-[translate,opacity]
```

### Measured result

| | Before | After |
|---|---|---|
| Desktop backdrop | 0.78, 0.20, 0.00, then back to **1.00** | 0.74, 0.23, 0.04, gone |
| Phone sheet | gone in under 60ms, no slide | slides 26%, 68%, 89%, 98% over 200ms |

## 3. What is this issue called, and how to fix it

**Bug 1** is an exit animation snap back. A CSS keyframe animation does not
keep its last frame unless `animation-fill-mode: forwards` is set. When it
ends, the element returns to its normal style (fully dark) and stays that way
until it is removed from the page. Also, the backdrop (100ms) and the sheet
(200ms) had different durations, so they could never end together.

How to fix it:
- Use a CSS transition driven by `data-starting-style` and `data-ending-style`
  (Base UI sets these), not a keyframe animation. A transition ends at the
  final value and has nothing to snap back to.
- Give the backdrop and the sheet the same duration and easing.

**Bug 2** is a transition on the wrong CSS property. Tailwind 4 moves things
with the `translate` property, but my transition listed `transform`. A
transition only animates the property it names, so nothing animated.

How to fix it: name the property that actually changes
(`transition-[translate,opacity]`).

## How to spot this kind of issue next time

- Sample `getComputedStyle(...).opacity` and `.translate` on every animation
  frame during the close, and check the values only move one way. This is
  what the test `closing fades the backdrop out in step with the sheet`
  in `e2e/game-sheet.spec.ts` does.
- In Chrome DevTools, open the Animations panel, or use Performance with
  screenshots turned on, and look at the frames around the close.
- If a flash is visible but the Network tab is empty, suspect the animation,
  not the data.
