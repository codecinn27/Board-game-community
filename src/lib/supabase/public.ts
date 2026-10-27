import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";
import type { Database } from "./database.types";

// No cookies, so public pages stay cacheable.
export function createPublicClient() {
  return createSupabaseClient<Database>(
    requireEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL",
    ),
    requireEnv(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
