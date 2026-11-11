import { compareNames } from "./compare-names";

type Named = { name: string };

/**
 * The owners the filter list shows for a typed query: names that contain the
 * text (ignoring case) only, those that start with it first, then A to Z.
 * An empty query keeps every owner in A to Z order.
 */
export function rankOwners<T extends Named>(owners: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  const sorted = [...owners].sort((a, b) => compareNames(a.name, b.name));
  if (needle === "") return sorted;

  const starts: T[] = [];
  const contains: T[] = [];
  for (const owner of sorted) {
    const name = owner.name.toLowerCase();
    if (name.startsWith(needle)) starts.push(owner);
    else if (name.includes(needle)) contains.push(owner);
  }
  return [...starts, ...contains];
}

/** The selection after one click: added when absent, removed when present. */
export function toggleOwner(selected: string[], memberId: string): string[] {
  return selected.includes(memberId)
    ? selected.filter((id) => id !== memberId)
    : [...selected, memberId];
}

/** Sections to show: all of them with no selection, else only the selected ones. */
export function visibleOwners<T extends { memberId: string }>(
  owners: T[],
  selected: string[],
): T[] {
  if (selected.length === 0) return owners;
  return owners.filter((o) => selected.includes(o.memberId));
}
