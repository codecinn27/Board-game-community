// The recycle bin purge (spec 0013 amendment, AC-23). Plain TypeScript with no
// imports, so the Edge Function (Deno) and Vitest both run it. The storage and
// database calls come in through `TrashClient`, which the tests stub.

/** Trashed covers are kept this long, then deleted for good. */
export const TRASH_DAYS = 30;

export type TrashRow = { id: number; path: string; trashed_at: string };

export type TrashClient = {
  /** Rows trashed before the cutoff (an ISO time), oldest first. */
  listOlderThan(cutoff: string): Promise<TrashRow[]>;
  /** Deletes the file from `covers-trash`; returns an error message or null. */
  removeFile(path: string): Promise<string | null>;
  /** Deletes the `cover_trash` row; returns an error message or null. */
  deleteRow(id: number): Promise<string | null>;
};

export type PurgeFailure = { id: number; path: string; reason: string };

export type PurgeResult = {
  cutoff: string;
  deleted: number;
  failed: PurgeFailure[];
};

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Deletes every trashed cover older than 30 days: the file through the Storage
 * API first, then its row. A failure keeps the row, so the next run retries; it
 * never stops the other files. A row the list returned that is not old enough is
 * skipped, so a wrong answer from the client cannot delete a young file.
 */
export async function purgeCoverTrash(
  client: TrashClient,
  now: Date = new Date(),
): Promise<PurgeResult> {
  const cutoff = new Date(now.getTime() - TRASH_DAYS * 24 * 60 * 60 * 1000);
  const result: PurgeResult = {
    cutoff: cutoff.toISOString(),
    deleted: 0,
    failed: [],
  };

  for (const row of await client.listOlderThan(result.cutoff)) {
    if (!(new Date(row.trashed_at).getTime() < cutoff.getTime())) continue;
    try {
      const fileError = await client.removeFile(row.path);
      if (fileError !== null) {
        result.failed.push({ id: row.id, path: row.path, reason: fileError });
        continue;
      }
      const rowError = await client.deleteRow(row.id);
      if (rowError !== null) {
        result.failed.push({ id: row.id, path: row.path, reason: rowError });
        continue;
      }
      result.deleted += 1;
    } catch (error) {
      result.failed.push({
        id: row.id,
        path: row.path,
        reason: reasonOf(error),
      });
    }
  }
  return result;
}
