import { beforeEach, describe, expect, it, vi } from "vitest";

// The editor's Server Action (spec 0013 amendment, AC-19 to AC-22; spec 0014, AC-5 and AC-9). The
// database function is covered by pgTAP; these tests cover the order of steps
// and the cleanup around it, with the Supabase clients faked.

vi.mock("server-only", () => ({}));

const checkAdmin = vi.fn();
vi.mock("@/lib/auth/member-check", () => ({
  checkAdmin: () => checkAdmin(),
}));

const revalidateGames = vi.fn();
vi.mock("@/lib/games/cache", () => ({
  revalidateGames: () => revalidateGames(),
}));

// The member's own session client.
type GameRow = {
  name_zh: string | null;
  description_zh: string | null;
  cover_path: string | null;
  cover_tint: string | null;
  reviewed_at: string | null;
  game_feels: { feel_id: number }[];
  game_themes: { theme_id: number }[];
  game_mechanics: { mechanic_id: number }[];
  game_owners: { member_id: string }[];
};
let current: GameRow | null;
const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: (name: string, args: unknown) => rpc(name, args),
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: current, error: null }),
        }),
      }),
    }),
  }),
}));

// The admin (secret key) client: storage and the cover trash table.
const upload = vi.fn();
const remove = vi.fn();
const move = vi.fn();
const insertTrash = vi.fn();
const deleteTrash = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: (bucket: string) => ({
        upload: (path: string) => upload(bucket, path),
        remove: (paths: string[]) => remove(bucket, paths),
        move: (from: string, to: string, options: unknown) =>
          move(bucket, from, to, options),
      }),
    },
    from: () => ({
      insert: (values: unknown) => ({
        select: () => ({ single: () => insertTrash(values) }),
      }),
      delete: () => ({
        eq: (column: string, value: unknown) => deleteTrash(column, value),
      }),
    }),
  }),
}));

import { saveGame } from "./actions";

const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);

function form(over: Record<string, string | Blob> = {}) {
  const data = new FormData();
  const values: Record<string, string | Blob> = {
    gameId: "5",
    name: "Catan",
    description: "",
    playersMin: "",
    playersMax: "",
    playTimeMin: "",
    playTimeMax: "",
    markReviewed: "false",
    ...over,
  };
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") data.set(key, value);
    else data.set(key, value, "cover");
  }
  return data;
}

function rpcArgs(): Record<string, unknown> {
  const call = rpc.mock.calls[0] as [string, Record<string, unknown>];
  return call[1];
}

beforeEach(() => {
  vi.clearAllMocks();
  checkAdmin.mockResolvedValue({ status: "admin", id: "admin-1" });
  current = {
    name_zh: "卡坦岛",
    description_zh: "好玩",
    cover_path: "old.webp",
    cover_tint: "#112233",
    reviewed_at: null,
    game_feels: [{ feel_id: 1 }, { feel_id: 2 }],
    game_themes: [{ theme_id: 4 }],
    game_mechanics: [],
    game_owners: [{ member_id: "u1" }],
  };
  rpc.mockResolvedValue({ data: "ok", error: null });
  upload.mockResolvedValue({ error: null });
  remove.mockResolvedValue({ error: null });
  move.mockResolvedValue({ error: null });
  insertTrash.mockResolvedValue({ data: { id: 7 }, error: null });
  deleteTrash.mockResolvedValue({ error: null });
});

describe("saveGame: guards", () => {
  it("refuses anyone who is not an active admin and touches nothing", async () => {
    checkAdmin.mockResolvedValue({ status: "forbidden" });
    expect(await saveGame(form())).toEqual({ status: "forbidden" });
    expect(rpc).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it("answers alreadyReviewed for a reviewed game before uploading anything", async () => {
    if (current) current.reviewed_at = "2026-11-20T00:00:00Z";
    const result = await saveGame(
      form({ cover: new Blob([WEBP], { type: "image/webp" }) }),
    );
    expect(result).toEqual({ status: "alreadyReviewed" });
    expect(upload).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("answers invalid with field keys and keeps the database untouched", async () => {
    const result = await saveGame(form({ name: " ", nameZh: "！" }));
    expect(result).toEqual({
      status: "invalid",
      fields: { name: "nameRequired", nameZh: "nameZhSymbols" },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses a picture that is not WebP or JPEG", async () => {
    const result = await saveGame(
      form({ cover: new Blob([new Uint8Array([1, 2, 3, 4])]) }),
    );
    expect(result).toEqual({ status: "coverInvalid" });
    expect(upload).not.toHaveBeenCalled();
  });

  it("refuses a picture over 150 KB", async () => {
    const big = new Uint8Array(153_601);
    big.set(WEBP);
    expect(await saveGame(form({ cover: new Blob([big]) }))).toEqual({
      status: "coverInvalid",
    });
  });
});

describe("saveGame: fields the form does not send keep their saved value", () => {
  it("passes the saved Chinese text, lists, and cover through", async () => {
    await saveGame(form());
    expect(rpcArgs()).toMatchObject({
      p_game_id: 5,
      p_name_zh: "卡坦岛",
      p_description_zh: "好玩",
      p_feel_ids: [1, 2],
      p_theme_ids: [4],
      p_mechanic_ids: [],
      p_owner_ids: ["u1"],
      p_cover_path: "old.webp",
      p_cover_tint: "#112233",
      p_mark_reviewed: false,
    });
    expect(move).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it("uses the lists and Chinese text the form sends, and marks reviewed", async () => {
    await saveGame(
      form({
        nameZh: "",
        feelIds: "[3]",
        mechanicIds: "[7,8]",
        ownerIds: '["u2","u3"]',
        markReviewed: "true",
      }),
    );
    expect(rpcArgs()).toMatchObject({
      p_name_zh: null,
      p_feel_ids: [3],
      p_theme_ids: [4],
      p_mechanic_ids: [7, 8],
      p_owner_ids: ["u2", "u3"],
      p_mark_reviewed: true,
    });
  });
});

describe("saveGame: cover order and cleanup (AC-22)", () => {
  it("uploads first, saves with the new path, then trashes the old file", async () => {
    const result = await saveGame(
      form({
        cover: new Blob([WEBP], { type: "image/webp" }),
        coverTint: "#abcdef",
      }),
    );
    expect(result).toEqual({ status: "ok" });
    expect(upload).toHaveBeenCalledWith(
      "covers",
      expect.stringMatching(/\.webp$/),
    );
    const newPath = rpcArgs().p_cover_path;
    expect(newPath).toMatch(/\.webp$/);
    expect(newPath).not.toBe("old.webp");
    expect(rpcArgs().p_cover_tint).toBe("#abcdef");
    expect(insertTrash).toHaveBeenCalledWith({
      path: "old.webp",
      game_id: 5,
      trashed_by: "admin-1",
    });
    expect(move).toHaveBeenCalledWith("covers", "old.webp", "old.webp", {
      destinationBucket: "covers-trash",
    });
    expect(remove).not.toHaveBeenCalled();
    expect(revalidateGames).toHaveBeenCalled();
  });

  it("drops a tint that is not #rrggbb", async () => {
    await saveGame(form({ cover: new Blob([WEBP]), coverTint: "red" }));
    expect(rpcArgs().p_cover_tint).toBeNull();
  });

  it("removes the cover columns and trashes the file on Remove", async () => {
    const result = await saveGame(form({ removeCover: "true" }));
    expect(result).toEqual({ status: "ok" });
    expect(rpcArgs()).toMatchObject({ p_cover_path: null, p_cover_tint: null });
    expect(upload).not.toHaveBeenCalled();
    expect(move).toHaveBeenCalledOnce();
  });

  it("does not trash anything when the game had no cover", async () => {
    if (current) current.cover_path = null;
    await saveGame(form({ cover: new Blob([WEBP]) }));
    expect(insertTrash).not.toHaveBeenCalled();
    expect(move).not.toHaveBeenCalled();
  });

  it("answers uploadFailed, keeps the old cover, and never calls the database", async () => {
    upload.mockResolvedValue({ error: { message: "boom" } });
    const result = await saveGame(form({ cover: new Blob([WEBP]) }));
    expect(result.status).toBe("uploadFailed");
    expect(rpc).not.toHaveBeenCalled();
    expect(insertTrash).not.toHaveBeenCalled();
  });

  it("removes the new file and trashes nothing when the function errors", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "x" },
    });
    const result = await saveGame(form({ cover: new Blob([WEBP]) }));
    expect(result.status).toBe("error");
    expect(remove).toHaveBeenCalledWith("covers", [
      expect.stringMatching(/\.webp$/),
    ]);
    expect(insertTrash).not.toHaveBeenCalled();
    expect(move).not.toHaveBeenCalled();
  });

  it("removes the new file when the game was reviewed in the meantime", async () => {
    rpc.mockResolvedValue({ data: "reviewed", error: null });
    const result = await saveGame(form({ cover: new Blob([WEBP]) }));
    expect(result).toEqual({ status: "alreadyReviewed" });
    expect(remove).toHaveBeenCalledOnce();
    expect(move).not.toHaveBeenCalled();
  });

  it("removes the new file and names the clash", async () => {
    rpc.mockImplementation(async (name: string) =>
      name === "admin_update_game"
        ? { data: "clash", error: null }
        : {
            data: [{ id: 9, name: "Catan", exact: true, exact_zh: false }],
            error: null,
          },
    );
    const result = await saveGame(form({ cover: new Blob([WEBP]) }));
    expect(result).toEqual({
      status: "clash",
      other: { id: 9, name: "Catan" },
    });
    expect(remove).toHaveBeenCalledOnce();
  });

  it("refuses with forbidden when the function raises 42501", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "no" },
    });
    const result = await saveGame(form({ cover: new Blob([WEBP]) }));
    expect(result).toEqual({ status: "forbidden" });
    expect(remove).toHaveBeenCalledOnce();
  });

  it("keeps the save when moving the old file fails, and drops the bin row", async () => {
    move.mockResolvedValue({ error: { message: "nope" } });
    const result = await saveGame(form({ removeCover: "true" }));
    expect(result).toEqual({ status: "ok" });
    expect(deleteTrash).toHaveBeenCalledWith("id", 7);
  });

  it("keeps the save and leaves the file when the bin row cannot be written", async () => {
    insertTrash.mockResolvedValue({ data: null, error: { message: "nope" } });
    const result = await saveGame(form({ removeCover: "true" }));
    expect(result).toEqual({ status: "ok" });
    expect(move).not.toHaveBeenCalled();
  });
});
