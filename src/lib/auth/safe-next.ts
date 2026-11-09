/**
 * The only way a `next` value may reach a redirect (spec 0010, AC-6). Accepts a
 * plain path on this site (one leading `/`); anything else becomes `/`.
 * `next` has no language prefix: the redirect adds it.
 */
export function safeNext(value: string | null | undefined): string {
  if (typeof value !== "string" || value === "") return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  // Backslashes and control characters are read as slashes by some browsers.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  // A scheme can hide after the slash only through a host, which `//` and `\`
  // already rule out; this guards a decoded form such as `/%2F%2Fevil.com`.
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || decoded.includes("\\")) return "/";
  } catch {
    return "/";
  }
  return value;
}

/** `/en/shelf` for locale `en` and next `/shelf`; `/en` for `/`. */
export function localePath(locale: string, next: string): string {
  const path = safeNext(next);
  return `/${locale}${path === "/" ? "" : path}`;
}
