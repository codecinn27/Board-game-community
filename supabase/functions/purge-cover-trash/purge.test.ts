import { describe, expect, it, vi } from "vitest";
import {
  purgeCoverTrash,
  TRASH_DAYS,
  type TrashClient,
  type TrashRow,
} from "./purge";

// Spec 0013 amendment, AC-23. The Storage and database calls are stubbed.

const NOW = new Date("2026-12-24T03:00:00Z");
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

function row(id: number, days: number): TrashRow {
  return { id, path: `cover-${id}.webp`, trashed_at: daysAgo(days) };
}

function stub(rows: TrashRow[], over: Partial<TrashClient> = {}) {
  const removeFile = vi.fn(
    async (_path: string): Promise<string | null> => null,
  );
  const deleteRow = vi.fn(async (_id: number): Promise<string | null> => null);
  const listOlderThan = vi.fn(async (_cutoff: string) => rows);
  const client: TrashClient = { listOlderThan, removeFile, deleteRow, ...over };
  return { client, removeFile, deleteRow, listOlderThan };
}

describe("purgeCoverTrash", () => {
  it("keeps files for 30 days", () => {
    expect(TRASH_DAYS).toBe(30);
  });

  it("asks for rows older than 30 days before now", async () => {
    const { client, listOlderThan } = stub([]);
    const result = await purgeCoverTrash(client, NOW);
    expect(listOlderThan).toHaveBeenCalledWith(daysAgo(30));
    expect(result).toEqual({ cutoff: daysAgo(30), deleted: 0, failed: [] });
  });

  it("deletes the file then the row for a 31 day old entry", async () => {
    const order: string[] = [];
    const { client, removeFile, deleteRow } = stub([row(1, 31)]);
    removeFile.mockImplementation(async () => {
      order.push("file");
      return null;
    });
    deleteRow.mockImplementation(async () => {
      order.push("row");
      return null;
    });
    const result = await purgeCoverTrash(client, NOW);
    expect(result.deleted).toBe(1);
    expect(order).toEqual(["file", "row"]);
  });

  it("removes the right file and row", async () => {
    const { client, removeFile, deleteRow } = stub([row(7, 31)]);
    await purgeCoverTrash(client, NOW);
    expect(removeFile).toHaveBeenCalledWith("cover-7.webp");
    expect(deleteRow).toHaveBeenCalledWith(7);
  });

  it("leaves a 29 day old entry alone, even if the client returns it", async () => {
    const { client, removeFile, deleteRow } = stub([row(1, 29), row(2, 31)]);
    const result = await purgeCoverTrash(client, NOW);
    expect(result.deleted).toBe(1);
    expect(removeFile).toHaveBeenCalledOnce();
    expect(removeFile).toHaveBeenCalledWith("cover-2.webp");
    expect(deleteRow).toHaveBeenCalledOnce();
  });

  it("treats exactly 30 days as not old enough", async () => {
    const { client, removeFile } = stub([row(1, 30)]);
    expect((await purgeCoverTrash(client, NOW)).deleted).toBe(0);
    expect(removeFile).not.toHaveBeenCalled();
  });

  it("keeps the row when the file cannot be deleted, and carries on", async () => {
    const deleteRow = vi.fn(async (_id: number): Promise<string | null> => null);
    const { client } = stub([row(1, 40), row(2, 40)], {
      removeFile: vi.fn(async (path: string) =>
        path === "cover-1.webp" ? "storage down" : null,
      ),
      deleteRow,
    });
    const result = await purgeCoverTrash(client, NOW);
    expect(result.deleted).toBe(1);
    expect(result.failed).toEqual([
      { id: 1, path: "cover-1.webp", reason: "storage down" },
    ]);
    expect(deleteRow).toHaveBeenCalledOnce();
    expect(deleteRow).toHaveBeenCalledWith(2);
  });

  it("reports a row that cannot be deleted so the next run retries it", async () => {
    const { client } = stub([row(1, 40)], {
      deleteRow: vi.fn(async () => "db down"),
    });
    const result = await purgeCoverTrash(client, NOW);
    expect(result.deleted).toBe(0);
    expect(result.failed[0]?.reason).toBe("db down");
  });

  it("survives a client that throws", async () => {
    const { client } = stub([row(1, 40), row(2, 40)], {
      removeFile: vi.fn(async (path: string) => {
        if (path === "cover-1.webp") throw new Error("network");
        return null;
      }),
    });
    const result = await purgeCoverTrash(client, NOW);
    expect(result.deleted).toBe(1);
    expect(result.failed[0]?.reason).toBe("network");
  });
});
