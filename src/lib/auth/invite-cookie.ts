import "server-only";

import { cookies } from "next/headers";
import { connection } from "next/server";
import { requireEnv } from "@/lib/supabase/env";
import { INVITE_COOKIE, verifyInvitePass } from "./invite-pass";

/** Does this request carry a valid, unexpired invite pass cookie? */
export async function hasInvitePass(): Promise<boolean> {
  // Marks this as request time work, so reading the clock below is allowed.
  await connection();
  const value = (await cookies()).get(INVITE_COOKIE)?.value;
  return verifyInvitePass(
    value,
    requireEnv(process.env.INVITE_COOKIE_SECRET, "INVITE_COOKIE_SECRET"),
    Date.now(),
  );
}
