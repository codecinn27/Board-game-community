import { createBrowserClient } from "@supabase/ssr";
import { requireEnv } from "./env";
import type { Database } from "./database.types";

export function createClient() {
  return createBrowserClient<Database>(
    requireEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL",
    ),
    requireEnv(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),
  );
}
