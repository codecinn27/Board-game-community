"use client";

import { Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { searchGames } from "@/app/[locale]/games/new/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { logFailure, type DebugInfo } from "@/lib/games/debug";
import { type GameMatch } from "@/lib/games/new-game";
import { DebugNote } from "./debug-note";
import { GameMatchRow } from "./game-match";
import { NewGameForm } from "./new-game-form";

const DEBOUNCE_MS = 250;

type Answer =
  | { text: string; kind: "ok"; results: GameMatch[] }
  | { text: string; kind: "guest" }
  | { text: string; kind: "error"; debug: DebugInfo | null };

type AddGameProps = {
  /** The viewer's display name, shown among the owners after "I own this". */
  displayName: string;
};

/** The Add page body: search first, then the form (spec 0013). */
export function AddGame({ displayName }: AddGameProps) {
  const t = useTranslations("addGame");
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [owned, setOwned] = useState<ReadonlySet<number>>(new Set());
  const [formName, setFormName] = useState<string | null>(null);
  const latest = useRef("");

  const text = query.trim();
  useEffect(() => {
    latest.current = text;
    if (text === "") return;
    const timer = setTimeout(() => {
      searchGames(text).then(
        (state) => {
          // An answer for text the box no longer holds is dropped.
          if (latest.current !== text) return;
          setAnswer(
            state.status === "ok"
              ? { text, kind: "ok", results: state.results }
              : state.status === "guest"
                ? { text, kind: "guest" }
                : { text, kind: "error", debug: state.debug ?? null },
          );
        },
        (error: unknown) => {
          const debug =
            logFailure("frontend", "searchGames call failed", error) ?? null;
          if (latest.current === text) {
            setAnswer({ text, kind: "error", debug });
          }
        },
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  if (formName !== null) {
    return (
      <NewGameForm
        initialName={formName}
        displayName={displayName}
        onBack={() => setFormName(null)}
      />
    );
  }

  const current = answer !== null && answer.text === text ? answer : null;
  const searching = text !== "" && current === null;
  const results = current?.kind === "ok" ? current.results : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <label htmlFor="add-game-search" className="sr-only">
          {t("search.label")}
        </label>
        <Input
          id="add-game-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("search.placeholder")}
          autoComplete="off"
          enterKeyHint="search"
          className="h-12 pr-10 pl-10 text-base"
        />
        {searching ? (
          <Loader2
            aria-hidden
            className="absolute top-1/2 right-3 size-5 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        ) : null}
      </div>

      <div aria-live="polite" className="flex flex-col">
        {current?.kind === "error" ? (
          <p role="alert" className="text-sm text-destructive">
            {t("search.error")}
          </p>
        ) : null}
        {current?.kind === "error" ? <DebugNote info={current.debug} /> : null}
        {current?.kind === "guest" ? (
          <p role="alert" className="text-sm text-destructive">
            {t("search.guest")}{" "}
            <Link
              href={{ pathname: "/sign-in", query: { next: "/games/new" } }}
              className="underline underline-offset-4"
            >
              {t("search.signIn")}
            </Link>
          </p>
        ) : null}
        {current?.kind === "ok" && results.length === 0 ? (
          <p className="text-muted-foreground">{t("search.none")}</p>
        ) : null}
        {results.length > 0 ? (
          <ul className="flex flex-col divide-y">
            {results.map((game) => (
              <GameMatchRow
                key={game.id}
                game={game}
                displayName={displayName}
                owned={game.mine || owned.has(game.id)}
                onOwned={(id) => setOwned((set) => new Set(set).add(id))}
              />
            ))}
          </ul>
        ) : null}
      </div>

      {text === "" ? (
        <p className="text-muted-foreground">{t("search.start")}</p>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-12 text-base"
          onClick={() => setFormName(text)}
        >
          {t("addYourself")}
        </Button>
      )}
    </div>
  );
}
