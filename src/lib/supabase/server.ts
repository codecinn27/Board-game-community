import { createServerClient } from "@supabase/ssr";
import { requireEnv } from "./env";
import type { Database } from "./database.types";
import { cookies } from "next/headers";

// Cookie aware client: carries the signed in member into row level security.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    requireEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL",
    ),
    requireEnv(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (items) => {
          try {
            items.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component; the proxy refreshes the session.
          }
        },
      },
    },
  );
}
