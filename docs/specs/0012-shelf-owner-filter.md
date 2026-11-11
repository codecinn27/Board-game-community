# 0012 · Shelf: owner filter on the By owner view

**Status**: Assumed
**Date**: 2026-11-11
**Authorized by**: engineer, during /develop (answers given in chat)

## Owed decision
How the By owner view filters by owner: search, multi select, and how the choice is applied.

## Assumption built on
- A filter sits above the owner sections. Focusing its search field opens a list of every owner (A to Z).
- Typing narrows the list to names that contain the text (ignoring case); names that start with the text come first, then the rest in A to Z order.
- One click on an owner selects or unselects it. The list stays open so several owners can be picked. It closes on Escape or a click outside.
- The choice applies live, on the client, over the data already loaded (no navigation, no loading skeleton, no URL parameter).
- Selected owners show as removable chips beside the search field. A Clear button (shown only when something is selected) empties the selection. There is no Done button.
- No selection means every owner is shown.
- All text goes through next-intl in English and Chinese.

## Code area
`src/lib/games/owner-filter.ts`, `src/components/shelf/owner-filter.tsx`, `src/components/shelf/owner-shelves.tsx`, `messages/*.json`

## Requirements
- AC-16: with no owner selected, every owner section shows.
- AC-17: selecting owners shows only their sections, live, in A to Z order.
- AC-18: typing ranks names that start with the text first, then names that contain it; others are hidden from the list.
- AC-19: the list stays open after a click; Clear empties the selection.

## Ratify
This decision was recorded by /develop, not deliberated. Run `/architect shelf owner filter`
to deliberate and ratify it. Until then it stays flagged as an owed decision; it does not block marking the feature `done`.
