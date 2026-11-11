/**
 * Name A to Z: lowercased with `toLowerCase()` (not the locale version), then
 * compared one character at a time by code point; the shorter name wins a tie.
 * Ties on the whole name are broken by the caller, by id.
 */
export function compareNames(a: string, b: string): number {
  const left = Array.from(a.toLowerCase());
  const right = Array.from(b.toLowerCase());
  const shared = Math.min(left.length, right.length);
  for (let i = 0; i < shared; i++) {
    const diff =
      (left[i]?.codePointAt(0) ?? 0) - (right[i]?.codePointAt(0) ?? 0);
    if (diff !== 0) return diff;
  }
  return left.length - right.length;
}
