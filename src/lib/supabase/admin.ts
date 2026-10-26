import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// The only place the secret key is used. It bypasses row level security.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
