import "server-only";

import { type createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type MemberCheck =
  | { status: "guest" }
  | { status: "readOnly"; id: string }
  | { status: "active"; id: string; displayName: string | null };

/**
 * Who is calling a Server Action, from the verified claims and the member's
 * own profile row (never user editable metadata). A missing profile counts as
 * an active member (spec 0013).
 */
export async function checkMember(supabase: Client): Promise<MemberCheck> {
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims.sub;
  if (!id) return { status: "guest" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("status, display_name")
    .eq("id", id)
    .maybeSingle();
  if (profile?.status === "disabled") return { status: "readOnly", id };
  return { status: "active", id, displayName: profile?.display_name ?? null };
}
