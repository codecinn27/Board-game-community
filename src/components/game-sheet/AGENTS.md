# Game sheet

The game detail sheet (scope feature 9, [spec 0008](../../../docs/specs/0008-game-detail-sheet.md)). A tap on a card opens it as a modal on the same page; `/games/[id]` shows the same sheet as a plain page for direct visits and shared links.

## How it fits together

- `sheet-link.tsx` (client): the link every game card uses (`ShelfCard`, `JustAdded`, `TopRated`). A plain left tap opens the modal and does not navigate. Modifier clicks keep the normal link. Hover, focus, and touch start fetching the sheet early.
- `sheet-store.ts` (client): the store behind the modal. It holds the tapped card, the loading state, the fetched sheet, and a per language result cache. It adds one history entry with the same URL on open, and gives it back after the exit animation (`resetSheet`), so Back closes the modal.
- `sheet-host.tsx` (client): the one Dialog (shadcn Dialog over Base UI), mounted once in `src/app/[locale]/layout.tsx`. It shows `sheet-preview.tsx` (from the card's own data) first, then the sheet.
- `actions.tsx`: the Server Action `loadGameSheet(id, locale)`. It reads `getGameDetail` and returns plain data (`SheetData`, built by `sheet-data.ts`).
- `sheet-view.tsx`: draws the sheet from `SheetData`. The modal and the page both render it, so they cannot differ. `game-sheet.tsx` is the server wrapper the page uses; `game-sheet-loader.tsx` reads the game for the page and handles the 404 and the error block.
- `sheet-theme.ts`: the `--sheet-*` variables from `coverTheme()`. `NEUTRAL_SHEET_TINT` lives in `src/lib/games/neutral-tint.ts` so client code can import it without the dummy data.

## Rules

- All colors on the sheet come from the `--sheet-*` variables. No `#hex`, `oklch()`, or `bg-[...]` colors in this folder (a test scans the files).
- A Server Action has no route: `next/root-params` fails there, so the language is passed in (`loadGameSheet(id, locale)`, `intl.ts`).
- Return plain data from the action, never rendered UI. UI that uses client components fails in the action with "Could not find the module in the React Client Manifest".
- The modal's open and close motion is `sheet-motion.ts` (FLIP with the Web Animations API): the modal is squeezed into the tapped card's cover box and animated to its real box, and back. The store has a `closing` phase so the Dialog stays mounted while it shrinks; `finishClose` unmounts it. Time the backdrop fade (a CSS transition) with the modal, and do not use the stock keyframe fade: it snapped back to dark before unmount (see [docs/modal-close-flash.md](../../../docs/modal-close-flash.md)). If you animate with a Tailwind class, name the property Tailwind 4 really uses (`translate`, not `transform`).
- Client strings come in as props (`SheetHostLabels`, `SheetData`), so `IntlClientProvider` does not grow.
- Dates use `LocalTime` (`monthYear` for "Since Aug 2026").

## Tests

Vitest next to the code (`game-sheet.test.tsx`, `sheet-store.test.ts`, `sheet-states.test.tsx`). Browser checks are in `e2e/game-sheet.spec.ts`, and `/design` previews the real sheet in four states plus the skeleton and the error block.

_Drafted by /sync from the introducing change, worth a quick human pass._
