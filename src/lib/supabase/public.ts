import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// No cookies, so public pages stay cacheable.
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
