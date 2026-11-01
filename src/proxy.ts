import { type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const handleIntl = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const response = handleIntl(request);
  // Feature 6 (Member accounts) chains the @supabase/ssr session refresh here,
  // on this response (spec 0001).
  return response;
}

export const config = {
  // Skips API and auth routes, Next internals, and any path with a dot.
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
