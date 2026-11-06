import { safeNext } from "./safe-next";

export type Session = {
  signedIn: boolean;
  /** Signed in through an emailed link (a reset link opens this kind). */
  viaEmailLink: boolean;
};

export const GUEST: Session = { signedIn: false, viaEmailLink: false };

/** Reads the method list of a verified claim set (`amr`). */
export function sessionFromClaims(
  claims: { sub?: unknown; amr?: unknown } | null | undefined,
): Session {
  if (!claims || typeof claims.sub !== "string" || claims.sub === "")
    return GUEST;
  const methods = Array.isArray(claims.amr)
    ? claims.amr.map((entry: unknown) =>
        typeof entry === "object" && entry !== null && "method" in entry
          ? String((entry as { method: unknown }).method)
          : "",
      )
    : [];
  return {
    signedIn: true,
    viaEmailLink: methods.includes("otp") || methods.includes("recovery"),
  };
}

/**
 * Where a request for `path` (no language prefix) must be sent first, or null
 * to carry on (spec 0010, AC-12). The result has no language prefix either.
 */
export function authRedirect(
  path: string,
  search: URLSearchParams,
  session: Session,
): string | null {
  const clean = path.length > 1 ? path.replace(/\/+$/, "") : path;
  if (clean === "/me" && !session.signedIn) return "/sign-in?next=/me";
  if (
    (clean === "/sign-in" || clean === "/forgot-password") &&
    session.signedIn
  ) {
    return safeNext(search.get("next"));
  }
  if (clean === "/reset-password") {
    if (!session.signedIn) return "/forgot-password";
    if (!session.viaEmailLink) return "/";
  }
  return null;
}
