import "server-only";

import { requireEnv } from "@/lib/supabase/env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Checks a widget token with Cloudflare. A token works once, so this is only
 * for actions that do not hand the same token to Supabase (which checks it
 * itself when captcha is on); `verifyInvite` is the one caller.
 */
export async function verifyTurnstile(
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (token === "") return false;
  try {
    const body = new URLSearchParams({
      secret: requireEnv(
        process.env.TURNSTILE_SECRET_KEY,
        "TURNSTILE_SECRET_KEY",
      ),
      response: token,
    });
    const response = await fetcher(VERIFY_URL, { method: "POST", body });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
