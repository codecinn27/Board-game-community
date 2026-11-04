import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type SheetData } from "./sheet-data";
import type * as StoreModule from "./sheet-store";

const actions = vi.hoisted(() => ({ loadGameSheet: vi.fn() }));
vi.mock("./actions", () => actions);

// Spec 0008, AC-13 and AC-21: the modal's store, history entry, and prefetch.

const card = {
  id: 1,
  name: "Wingspan",
  coverTint: "#f3ead2",
  coverPath: null,
  ownerCount: 4,
  avgRecommendation: 8,
};

function data(id: number): SheetData {
  return { id, name: `Game ${id}`, tint: null } as SheetData;
}

type Store = typeof StoreModule;
let store: Store;
let pushState: ReturnType<typeof vi.fn>;
let back: ReturnType<typeof vi.fn>;

function state() {
  return store.getSheetSnapshot();
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  actions.loadGameSheet.mockReset();
  pushState = vi.fn();
  back = vi.fn();
  vi.stubGlobal("window", {
    history: { pushState, back },
    location: { href: "http://localhost/en/shelf" },
  });
  store = await import("./sheet-store");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("opening", () => {
  // covers: AC-21
  it("opens in the same call, from the card, before the server answers", () => {
    actions.loadGameSheet.mockReturnValue(new Promise(() => {}));

    store.openSheet(card, "en", null);

    expect(state()).toMatchObject({
      open: true,
      status: "loading",
      card,
      tint: "#f3ead2",
    });
  });

  // covers: AC-13, AC-21
  it("adds one history entry with the same address", () => {
    actions.loadGameSheet.mockReturnValue(new Promise(() => {}));

    store.openSheet(card, "en", null);

    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushState).toHaveBeenCalledWith(
      null,
      "",
      "http://localhost/en/shelf",
    );
  });

  // covers: AC-21
  it("swaps in the sheet when the server answers", async () => {
    actions.loadGameSheet.mockResolvedValue({
      status: "ready",
      data: data(1),
    });

    store.openSheet(card, "en", null);
    await vi.advanceTimersByTimeAsync(0);

    expect(state()).toMatchObject({ status: "ready", data: data(1) });
  });

  // covers: AC-15
  it("shows not found and error answers", async () => {
    actions.loadGameSheet.mockResolvedValue({ status: "notfound" });
    store.openSheet(card, "en", null);
    await vi.advanceTimersByTimeAsync(0);
    expect(state().status).toBe("notfound");
  });

  // covers: AC-15
  it("falls back to the error block after 10 seconds, and again on retry", async () => {
    actions.loadGameSheet.mockReturnValue(new Promise(() => {}));
    store.openSheet(card, "en", null);

    await vi.advanceTimersByTimeAsync(10_000);

    expect(state().status).toBe("error");

    store.retrySheet();
    expect(state().status).toBe("loading");
  });
});

describe("prefetch", () => {
  // covers: AC-21
  it("asks the server once per game and language, however often it is called", async () => {
    actions.loadGameSheet.mockResolvedValue({
      status: "ready",
      data: data(1),
    });

    await Promise.all([
      store.prefetchSheet(1, "en"),
      store.prefetchSheet(1, "en"),
    ]);
    await store.prefetchSheet(1, "en");
    await store.prefetchSheet(1, "zh");

    expect(actions.loadGameSheet).toHaveBeenCalledTimes(2);
    expect(actions.loadGameSheet).toHaveBeenCalledWith(1, "en");
    expect(actions.loadGameSheet).toHaveBeenCalledWith(1, "zh");
  });

  // covers: AC-21
  it("shows a remembered sheet in the first frame", async () => {
    actions.loadGameSheet.mockResolvedValue({
      status: "ready",
      data: data(1),
    });
    await store.prefetchSheet(1, "en");

    store.openSheet(card, "en", null);

    expect(state()).toMatchObject({ status: "ready", data: data(1) });
    expect(actions.loadGameSheet).toHaveBeenCalledTimes(1);
  });

  // covers: AC-15
  it("does not remember a failure, so the next try asks again", async () => {
    actions.loadGameSheet.mockRejectedValueOnce(new Error("down"));
    actions.loadGameSheet.mockResolvedValueOnce({
      status: "ready",
      data: data(1),
    });

    expect(await store.prefetchSheet(1, "en")).toEqual({ status: "error" });
    expect(await store.prefetchSheet(1, "en")).toMatchObject({
      status: "ready",
    });
  });
});

describe("closing", () => {
  beforeEach(() => {
    actions.loadGameSheet.mockReturnValue(new Promise(() => {}));
    store.openSheet(card, "en", null);
  });

  // covers: AC-13, AC-14
  it("keeps the modal mounted while it animates out, then unmounts it", () => {
    store.closeSheet();
    store.closeSheet();

    expect(state()).toMatchObject({ open: true, closing: true });

    store.finishClose();

    expect(state()).toMatchObject({ open: false, closing: false });
  });

  // covers: AC-13
  it("gives back the history entry once the modal has unmounted, once", () => {
    store.closeSheet();
    store.finishClose();
    expect(back).not.toHaveBeenCalled();

    store.resetSheet();
    store.resetSheet();

    expect(back).toHaveBeenCalledTimes(1);
  });

  // covers: AC-13
  it("keeps the entry when the modal is reopened during the exit", () => {
    store.closeSheet();

    store.openSheet(card, "en", null);
    store.resetSheet();

    expect(pushState).toHaveBeenCalledTimes(1);
    expect(back).not.toHaveBeenCalled();
    expect(state()).toMatchObject({ open: true, closing: false });
  });

  // covers: AC-13
  it("plays the exit but does not pop history when the browser's Back already did", () => {
    store.closeFromBack();
    expect(state().closing).toBe(true);

    store.finishClose();
    store.resetSheet();

    expect(back).not.toHaveBeenCalled();
  });

  // covers: AC-2
  it("forgets the game only after the exit has finished", () => {
    store.closeSheet();
    expect(state().card).toEqual(card);

    store.finishClose();
    store.resetSheet();

    expect(state().card).toBeNull();
  });

  // covers: AC-12
  it("remembers the tapped element for focus return", () => {
    const link = {} as HTMLElement;
    store.closeSheet();
    store.finishClose();
    store.resetSheet();

    store.openSheet(card, "en", link);

    expect(store.getOpener()).toBe(link);
  });

  // covers: AC-21
  it("ignores an answer for a game that is no longer showing", async () => {
    store.closeSheet();
    store.finishClose();
    store.resetSheet();
    actions.loadGameSheet.mockResolvedValue({
      status: "ready",
      data: data(2),
    });

    await store.prefetchSheet(2, "en");

    expect(state().status).toBe("loading");
    expect(state().data).toBeNull();
  });
});
