"use client";

import { Check, Search, X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import {
  rankOwners,
  toggleOwner,
  visibleOwners,
} from "@/lib/games/owner-filter";
import { cn } from "@/lib/utils";

export type OwnerFilterItem = {
  memberId: string;
  name: string;
  /** The member's section, rendered on the server. */
  section: ReactNode;
};

export type OwnerFilterLabels = {
  label: string;
  placeholder: string;
  clear: string;
  empty: string;
  /** Contains `{name}`, replaced with the member's name. */
  remove: string;
};

type OwnerFilterProps = {
  items: OwnerFilterItem[];
  labels: OwnerFilterLabels;
};

const focusRing =
  "outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Search and pick owners, live (spec 0012). The list stays open while you pick;
 * it closes on Escape or a click outside. No selection shows every owner.
 */
export function OwnerFilter({ items, labels }: OwnerFilterProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const ranked = rankOwners(items, query);
  const shown = visibleOwners(items, selected);
  const chosen = items.filter((i) => selected.includes(i.memberId));

  function toggle(memberId: string) {
    setSelected((now) => toggleOwner(now, memberId));
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div
        ref={root}
        className="relative flex flex-col gap-2"
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-56">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              role="combobox"
              aria-label={labels.label}
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              placeholder={labels.placeholder}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              className={cn(
                "min-h-11 w-full rounded-xl border border-input bg-card pr-3 pl-9 text-base md:text-sm",
                focusRing,
              )}
            />
          </div>

          {chosen.map((item) => (
            <button
              key={item.memberId}
              type="button"
              aria-label={labels.remove.replace("{name}", item.name)}
              onClick={() => toggle(item.memberId)}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-full bg-muted px-3 text-sm font-medium",
                focusRing,
              )}
            >
              {item.name}
              <X aria-hidden className="size-4" />
            </button>
          ))}

          {selected.length > 0 ? (
            <button
              type="button"
              onClick={() => setSelected([])}
              className={cn(
                "inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-primary hover:underline",
                focusRing,
              )}
            >
              {labels.clear}
            </button>
          ) : null}
        </div>

        {open ? (
          <ul
            id={listId}
            role="listbox"
            aria-multiselectable
            aria-label={labels.label}
            className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-md"
          >
            {ranked.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">
                {labels.empty}
              </li>
            ) : (
              ranked.map((item) => {
                const isOn = selected.includes(item.memberId);
                return (
                  <li
                    key={item.memberId}
                    role="option"
                    aria-selected={isOn}
                    tabIndex={0}
                    onClick={() => toggle(item.memberId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggle(item.memberId);
                      }
                    }}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 text-sm hover:bg-muted",
                      isOn && "font-semibold",
                      focusRing,
                    )}
                  >
                    {item.name}
                    {isOn ? (
                      <Check aria-hidden className="size-4 text-primary" />
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>

      <div className="flex w-full flex-col gap-7">
        {shown.map((item) => (
          <div key={item.memberId}>{item.section}</div>
        ))}
      </div>
    </div>
  );
}
