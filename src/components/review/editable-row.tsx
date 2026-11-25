"use client";

import { useTranslations } from "next-intl";
import { useState, type MouseEvent, type ReactNode } from "react";
import { SheetLink } from "@/components/game-sheet/sheet-link";
import { type EditorGame, type EditorLists } from "@/lib/games/edit-game";
import { ReviewEditor } from "./review-editor";

type EditableRowProps = {
  game: EditorGame;
  lists: EditorLists;
  /** What the row shows: the Chinese text on /zh when it exists. */
  displayName: string;
  displayDescription: string | null;
  /** The server rendered cover tile. */
  cover: ReactNode;
  /** The server rendered facts under the name (players, who added it). */
  meta: ReactNode;
  /** The server rendered "Looks right" button. */
  actions: ReactNode;
};

/**
 * A "To review" row (spec 0013 amendment, AC-16): the cover, the name, and the
 * description are each a button of at least 44 px that opens the editor.
 */
export function EditableRow({
  game,
  lists,
  displayName,
  displayDescription,
  cover,
  meta,
  actions,
}: EditableRowProps) {
  const t = useTranslations("review.editor");
  const [editing, setEditing] = useState(false);
  const open = () => setEditing(true);

  // The whole top block opens the editor. The name stays the one real button
  // (keyboard and screen readers); a tap on a link inside, "View game page",
  // does its own thing and must not also open the editor.
  function openFromBlock(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest("a")) return;
    open();
  }

  return (
    <li className="flex flex-col gap-3 py-4">
      {/* The block is a mouse and touch shortcut; the name button is the accessible control. */}
      <div
        onClick={openFromBlock}
        className="-mx-2 flex cursor-pointer flex-col gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-muted/50"
      >
        <div className="flex gap-3">
          <div className="size-20 shrink-0 rounded-lg">{cover}</div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <button
              type="button"
              aria-haspopup="dialog"
              className="min-h-11 text-left font-semibold underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {displayName}
            </button>
            {meta}
            <SheetLink
              card={{
                id: game.id,
                name: displayName,
                coverTint: game.coverTint,
                coverPath: game.coverPath,
                ownerCount: game.owners.length,
                avgRecommendation: null,
              }}
              className="inline-flex min-h-11 items-center self-start text-sm underline underline-offset-4"
            >
              {t("gamePage")}
            </SheetLink>
          </div>
        </div>
        {displayDescription === null ? null : (
          <p className="line-clamp-3 text-sm break-words">
            {displayDescription}
          </p>
        )}
      </div>
      {actions}
      {editing ? (
        <ReviewEditor
          game={game}
          lists={lists}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </li>
  );
}
