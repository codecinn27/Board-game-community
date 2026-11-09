import "server-only";

import { createAdminClient } from "./admin";

export type EmailKind = "welcome";
export type ClaimResult = "claimed" | "capped" | "duplicate";

/** Reserves one send for this member under the daily cap (spec 0011). */
export async function claimEmailSlot(
  userId: string,
  kind: EmailKind,
  cap: number,
): Promise<ClaimResult> {
  const { data, error } = await createAdminClient().rpc("claim_email_slot", {
    p_user_id: userId,
    p_kind: kind,
    p_cap: cap,
  });
  if (error) throw error;
  if (data === "claimed" || data === "capped" || data === "duplicate") {
    return data;
  }
  throw new Error("claim_email_slot returned an unknown value");
}

export async function markEmailFailed(
  userId: string,
  kind: EmailKind,
): Promise<void> {
  const { error } = await createAdminClient()
    .from("email_sends")
    .update({ status: "failed" })
    .eq("user_id", userId)
    .eq("kind", kind);
  if (error) throw error;
}
