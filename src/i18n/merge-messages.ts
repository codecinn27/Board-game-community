type MessageTree = { [key: string]: string | MessageTree };

function isTree(value: unknown): value is MessageTree {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * English underneath, the other language on top: a key missing on top shows
 * the full English message (with its plural and variable handling), never the
 * raw key (spec 0005, AC-12).
 */
export function deepMerge<T extends MessageTree>(base: T, top: unknown): T {
  if (!isTree(top)) return base;
  const merged: MessageTree = { ...base };
  for (const [key, value] of Object.entries(top)) {
    const under = merged[key];
    if (isTree(under) && isTree(value)) {
      merged[key] = deepMerge(under, value);
    } else if (typeof value === "string" && value !== "") {
      merged[key] = value;
    }
  }
  return merged as T;
}

/** Dotted keys present in `base` but missing (or empty) in `top`. */
export function missingKeys(
  base: unknown,
  top: unknown,
  prefix = "",
): string[] {
  if (!isTree(base)) return [];
  return Object.entries(base).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const other = isTree(top) ? top[key] : undefined;
    if (isTree(value)) return missingKeys(value, other, path);
    return typeof other === "string" && other !== "" ? [] : [path];
  });
}
