import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type ViewerState =
  { kind: "guest" } | { kind: "member"; id: string; email: string | null };

/**
 * Who is looking, from the verified claims (never `getSession()`, which trusts
 * the cookie). Reading it reads cookies, so call it only inside `Suspense`
 * (the nav and the auth pages), never in a cached page body (spec 0010).
 */
export const getViewer = cache(async (): Promise<ViewerState> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { kind: "guest" };
  return {
    kind: "member",
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
});
