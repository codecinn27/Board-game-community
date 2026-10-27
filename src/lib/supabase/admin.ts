import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";
import type { Database } from "./database.types";

// The only place the secret key is used. It bypasses row level security.
export function createAdminClient() {
  return createClient<Database>(
    requireEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL",
    ),
    requireEnv(process.env.SUPABASE_SECRET_KEY, "SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
