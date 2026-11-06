import { createServerClient } from "@supabase/ssr";
import { type NextRequest, type NextResponse } from "next/server";
import { requireEnv } from "@/lib/supabase/env";
import { GUEST, sessionFromClaims, type Session } from "./guards";

/** Supabase stores the session in cookies that start with `sb-`. */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => name.startsWith("sb-"));
}

/**
 * Refreshes the member's session when its token has expired and writes the new
 * cookies onto `response` (spec 0001, spec 0010). Visitors with no session
 * cookie cost nothing: no client is built.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<Session> {
  if (!hasSessionCookie(request)) return GUEST;

  const supabase = createServerClient(
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
        getAll: () => request.cookies.getAll(),
        setAll: (items, headers) => {
          items.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
          // Keeps a CDN from caching a response that carries a session.
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  return sessionFromClaims(data?.claims);
}
