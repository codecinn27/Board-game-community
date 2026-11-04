import { useSyncExternalStore } from "react";
import { loadGameSheet, type SheetResult } from "./actions";
import { type SheetData } from "./sheet-data";
import { type Box } from "./sheet-motion";

// The client store behind the game modal (spec 0008, AC-21). A tap on a card
// opens the modal in the same frame from the card's own data; the full sheet
// is fetched in the background and swapped in. No navigation happens.

/** What a card already knows about its game. Null means the card has no such value. */
export type SheetCard = {
  id: number;
  name: string;
  coverTint: string | null;
  coverPath: string | null;
  ownerCount: number | null;
  avgRecommendation: number | null;
};

export type SheetStatus = "loading" | "ready" | "notfound" | "error";

type SheetState = {
  /** The modal is mounted. It stays true while it animates out. */
  open: boolean;
  /** The exit animation is playing; `finishClose` ends it. */
  closing: boolean;
  card: SheetCard | null;
  status: SheetStatus;
  /** Everything the sheet shows, once `status` is ready. */
  data: SheetData | null;
  tint: string | null;
};

const ANSWER_TIMEOUT_MS = 10_000;

const closed: SheetState = {
  open: false,
  closing: false,
  card: null,
  status: "loading",
  data: null,
  tint: null,
};

let state: SheetState = closed;
let opener: HTMLElement | null = null;
let currentLocale = "en";
// True while the modal holds a history entry of its own (so Back closes it).
let pushed = false;
// The exit is playing and the entry is given back when it ends, so the
// router's re-sync never competes with the animation.
let pendingBack = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const results = new Map<string, SheetResult>();
const inflight = new Map<string, Promise<SheetResult>>();

const keyOf = (id: number, locale: string) => `${locale}:${id}`;

function set(next: Partial<SheetState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function stopTimer() {
  if (timer !== null) clearTimeout(timer);
  timer = null;
}

/** Starts the fetch for a game, once. Safe to call on hover or focus. */
export function prefetchSheet(
  id: number,
  locale: string,
): Promise<SheetResult> {
  const key = keyOf(id, locale);
  const known = results.get(key);
  if (known !== undefined) return Promise.resolve(known);
  const pending = inflight.get(key);
  if (pending !== undefined) return pending;

  const request = loadGameSheet(id, locale)
    .catch((): SheetResult => ({ status: "error" }))
    .then((result: SheetResult) => {
      // Only a good answer is remembered; a failure can be tried again.
      if (result.status !== "error") results.set(key, result);
      inflight.delete(key);
      return result;
    });
  inflight.set(key, request);
  return request;
}

function apply(id: number, result: SheetResult) {
  if (!state.open || state.card?.id !== id) return;
  stopTimer();
  if (result.status === "ready") {
    set({ status: "ready", data: result.data, tint: result.data.tint });
  } else {
    set({ status: result.status });
  }
}

function load(id: number, locale: string) {
  stopTimer();
  timer = setTimeout(() => apply(id, { status: "error" }), ANSWER_TIMEOUT_MS);
  void prefetchSheet(id, locale).then((result) => apply(id, result));
}

/** A plain tap on a card: open the modal now, in the same frame. */
export function openSheet(
  card: SheetCard,
  locale: string,
  from: HTMLElement | null,
) {
  opener = from;
  currentLocale = locale;
  const known = results.get(keyOf(card.id, locale));
  set({
    open: true,
    closing: false,
    card,
    status: "loading",
    data: null,
    tint: card.coverTint,
  });
  // A history entry with the same address, so Back closes the modal and the
  // page behind keeps its scroll. The URL never changes.
  if (pendingBack) {
    // Reopened during the exit: the entry is still there, keep it.
    pendingBack = false;
  } else {
    window.history.pushState(null, "", window.location.href);
    pushed = true;
  }
  if (known !== undefined) apply(card.id, known);
  else load(card.id, locale);
}

/** Close, Esc, or the dimmed area: start the exit. The entry goes back after it. */
export function closeSheet() {
  if (!state.open || state.closing) return;
  stopTimer();
  set({ closing: true });
  if (pushed) {
    pushed = false;
    pendingBack = true;
  }
}

/** The browser's Back already popped our entry: just play the exit. */
export function closeFromBack() {
  if (!state.open || state.closing) return;
  stopTimer();
  pushed = false;
  pendingBack = false;
  set({ closing: true });
}

/** The exit animation ended: unmount the modal. */
export function finishClose() {
  if (!state.open) return;
  set({ open: false, closing: false });
}

/** The modal has unmounted: give back the history entry, and forget the game. */
export function resetSheet() {
  if (state.open) return;
  if (pendingBack) {
    pendingBack = false;
    window.history.back();
  }
  set({ ...closed });
}

export function retrySheet() {
  const id = state.card?.id;
  if (id === undefined) return;
  set({ status: "loading" });
  load(id, currentLocale);
}

/** The element to focus again when the modal closes. */
export function getOpener(): HTMLElement | null {
  return opener;
}

/**
 * Where the tapped card's cover is on screen now, for the open and close
 * animation. Null when there is no card, or it is not in view (scrolled away,
 * or the page changed), and the animation then falls back to a slide and fade.
 */
export function getOriginRect(): Box | null {
  const card = opener;
  if (card === null || !card.isConnected) return null;
  const tile = card.querySelector<HTMLElement>(".aspect-square") ?? card;
  const rect = tile.getBoundingClientRect();
  const inView =
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth;
  return inView
    ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    : null;
}

/** The current state, for code outside React (and tests). */
export function getSheetSnapshot(): SheetState {
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSheetState(): SheetState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => closed,
  );
}
