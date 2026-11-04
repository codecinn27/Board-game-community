"use client";

import { useLocale } from "next-intl";
import { type MouseEvent, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { openSheet, prefetchSheet, type SheetCard } from "./sheet-store";

type SheetLinkProps = {
  card: SheetCard;
  className?: string;
  children: ReactNode;
};

/**
 * A game card's link (spec 0008, AC-21). Still a real link to the game page,
 * so open in new tab, copy link, and no JavaScript all work. A plain left tap
 * opens the modal on this page instead of navigating. Hover, focus, and touch
 * start fetching the sheet early, so by the tap it is often already here.
 */
export function SheetLink({ card, className, children }: SheetLinkProps) {
  const locale = useLocale();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    const plain =
      !event.defaultPrevented &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey;
    if (!plain) return;
    event.preventDefault();
    openSheet(card, locale, event.currentTarget);
  }

  function warm() {
    void prefetchSheet(card.id, locale);
  }

  return (
    <Link
      href={`/games/${card.id}`}
      prefetch={false}
      className={className}
      onClick={onClick}
      onPointerEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
    >
      {children}
    </Link>
  );
}
