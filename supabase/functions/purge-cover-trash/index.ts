// Supabase Edge Function: purge-cover-trash (spec 0013 amendment, AC-23).
// pg_cron calls it once a day through pg_net. It deletes trashed covers older
// than 30 days with the Storage API (deleting `storage.objects` rows in SQL does
// not delete the stored file).
//
// Secrets (see supabase/AGENTS.md):
//   PURGE_SECRET       shared with the cron job (stored in Vault as `purge_secret`)
//   PURGE_SERVICE_KEY  the project's secret key; falls back to the injected
//                      SUPABASE_SERVICE_ROLE_KEY when it is not set
import { createClient } from "npm:@supabase/supabase-js@2";
import { purgeCoverTrash, type TrashClient } from "./purge.ts";

function sameText(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

Deno.serve(async (request) => {
  const secret = Deno.env.get("PURGE_SECRET") ?? "";
  const sent = request.headers.get("x-purge-secret") ?? "";
  if (secret === "" || !sameText(secret, sent)) {
    return new Response("unauthorized", { status: 401 });
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key =
    Deno.env.get("PURGE_SERVICE_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    "";
  if (url === "" || key === "") {
    console.error("purge-cover-trash: missing SUPABASE_URL or service key");
    return new Response("not configured", { status: 500 });
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const client: TrashClient = {
    async listOlderThan(cutoff) {
      const { data, error } = await supabase
        .from("cover_trash")
        .select("id, path, trashed_at")
        .lt("trashed_at", cutoff)
        .order("trashed_at")
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    async removeFile(path) {
      const { error } = await supabase.storage
        .from("covers-trash")
        .remove([path]);
      return error ? error.message : null;
    },
    async deleteRow(id) {
      const { error } = await supabase
        .from("cover_trash")
        .delete()
        .eq("id", id);
      return error ? error.message : null;
    },
  };

  try {
    const result = await purgeCoverTrash(client);
    for (const failure of result.failed) {
      console.error("purge-cover-trash: kept for the next run", failure);
    }
    return Response.json(result);
  } catch (error) {
    console.error("purge-cover-trash failed", error);
    return new Response("error", { status: 500 });
  }
});
