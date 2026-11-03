import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { gameExists } from "@/lib/games/detail";

const handleIntl = createMiddleware(routing);

const GAME_PATH = new RegExp(
  `^/(${routing.locales.join("|")})/games/([^/]+)/?$`,
);

export default async function proxy(request: NextRequest) {
  // An unknown game id answers 404 here, before any page streams: a route
  // that prerenders for known ids would otherwise serve its shell with 200
  // on the first request for an id it has not seen (spec 0008, AC-1). The
  // rewrite lands on the catch all, which is the translated 404.
  const match = GAME_PATH.exec(request.nextUrl.pathname);
  // A cached read cannot run here, so this is a plain one-row check. If the
  // database is down the request goes on and the page shows its error block.
  if (match !== null && !(await gameExists(match[2] ?? ""))) {
    return NextResponse.rewrite(new URL(`/${match[1]}/_missing`, request.url));
  }

  const response = handleIntl(request);
  // Feature 6 (Member accounts) chains the @supabase/ssr session refresh here,
  // on this response (spec 0001).
  return response;
}

export const config = {
  // Skips API and auth routes, Next internals, and any path with a dot. The
  // second entry brings game paths back in, so `/games/1.5` gets its 404.
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)", "/:locale/games/:id"],
};
