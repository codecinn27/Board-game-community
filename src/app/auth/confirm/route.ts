import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { localePath, safeNext } from "@/lib/auth/safe-next";
import { hasLocale, routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

// Email links (spec 0010): the confirmation mail after sign up, and the reset
// mail. Both carry a `token_hash` the person's browser hands to us.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawLocale = params.get("locale");
  const locale = hasLocale(rawLocale) ? rawLocale : routing.defaultLocale;
  const type = params.get("type");
  const tokenHash = params.get("token_hash");
  const next = safeNext(params.get("next"));

  const failed = () =>
    NextResponse.redirect(
      new URL(`/${locale}/sign-in?error=link`, request.url),
    );
  if ((type !== "signup" && type !== "recovery") || !tokenHash) return failed();

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: type satisfies EmailOtpType,
    token_hash: tokenHash,
  });
  if (error) return failed();

  // A reset link always lands on the new password page.
  const target = type === "recovery" ? "/reset-password" : next;
  return NextResponse.redirect(
    new URL(localePath(locale, target), request.url),
  );
}
