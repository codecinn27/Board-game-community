"use client";

import { Check } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { CoverTile } from "@/components/games/cover-tile";
import { markOwned } from "@/components/game-sheet/own-actions";
import { invalidateSheet } from "@/components/game-sheet/sheet-store";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { compareNames } from "@/lib/games/compare-names";
import { localized } from "@/lib/games/localized";
import { type GameMatch } from "@/lib/games/new-game";

const NAMES_SHOWN = 3;

/** "Owned by Arif and Jun", or "Nobody owns this yet". */
export function OwnerNames({ names }: { names: string[] }) {
  const t = useTranslations("addGame.owners");
  const format = useFormatter();
  if (names.length === 0) return <>{t("none")}</>;
  const shown = names.slice(0, NAMES_SHOWN);
  const rest = names.length - shown.length;
  const parts = rest > 0 ? [...shown, t("others", { count: rest })] : shown;
  return <>{t("list", { names: format.list(parts) })}</>;
}

type GameMatchRowProps = {
  game: GameMatch;
  /** The viewer's display name, added to the owners after "I own this". */
  displayName: string;
  /** Called after the viewer was added, so the parent keeps it between searches. */
  onOwned?: (id: number) => void;
  /** The viewer already owns it, or just marked it. */
  owned: boolean;
};

/** One found game: cover, name (a link to its page), owners, and "I own this". */
export function GameMatchRow({
  game,
  displayName,
  onOwned,
  owned,
}: GameMatchRowProps) {
  const t = useTranslations("addGame.result");
  const shownName = localized(game.name, game.nameZh, useLocale());
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Marked just now: the viewer's name joins the list, A to Z.
  const names =
    owned && !game.mine
      ? [...game.ownerNames, displayName].sort(compareNames)
      : game.ownerNames;

  async function own() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const result = await markOwned(game.id);
      if (result.status === "owned") {
        invalidateSheet(game.id);
        onOwned?.(game.id);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <CoverTile
        name={shownName}
        tint={game.coverTint}
        path={game.coverPath}
        className="size-16 shrink-0 rounded-lg"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link
          href={`/games/${game.id}`}
          className="truncate font-semibold underline-offset-4 hover:underline"
        >
          {shownName}
        </Link>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          <OwnerNames names={names} />
        </p>
        {failed ? (
          <p role="alert" className="text-sm text-destructive">
            {t("error")}
          </p>
        ) : null}
      </div>
      {owned ? (
        <span className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-primary">
          <Check aria-hidden className="size-4" />
          {t("owned")}
        </span>
      ) : (
        <Button
          type="button"
          className="h-11 shrink-0 px-4"
          disabled={busy}
          onClick={() => void own()}
        >
          {t("own")}
        </Button>
      )}
    </li>
  );
}
