"use client";

import { ImagePlus, Loader2, Undo2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import {
  shrinkCover,
  type CoverError,
  type ShrunkCover,
} from "@/components/add-game/shrink-cover";
import { CoverTile } from "@/components/games/cover-tile";
import { Button } from "@/components/ui/button";
import { coverTheme } from "@/lib/design/cover-tint";
import { type CoverChange } from "@/lib/games/edit-game";

export type CoverState = { change: CoverChange; picked: ShrunkCover | null };

type CoverFieldProps = {
  name: string;
  coverPath: string | null;
  coverTint: string | null;
  value: CoverState;
  onChange: (value: CoverState) => void;
  /** The server refused the picture. */
  serverError?: boolean;
  disabled?: boolean;
};

/**
 * The cover in the editor (spec 0013 amendment, AC-18): the current picture with
 * Replace and Remove. A new picture is shrunk in the browser like the Add flow.
 * Nothing changes on the server until Save.
 */
export function CoverField({
  name,
  coverPath,
  coverTint,
  value,
  onChange,
  serverError,
  disabled,
}: CoverFieldProps) {
  const t = useTranslations("review.editor.cover");
  const tPick = useTranslations("addGame.form.cover");
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<CoverError | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // One object URL per picked picture, given back when it changes or goes.
  const blob = value.picked?.blob ?? null;
  useEffect(() => {
    if (blob === null) return;
    const url = URL.createObjectURL(blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL only exists after mount
    setPreview(url);
    return () => {
      URL.revokeObjectURL(url);
      setPreview(null);
    };
  }, [blob]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setWorking(true);
    setError(null);
    try {
      onChange({ change: "replace", picked: await shrinkCover(file) });
    } catch (problem) {
      // A failed pick keeps whatever was there before.
      setError(
        problem === "coverTooBig" || problem === "coverTooDetailed"
          ? problem
          : "coverUnreadable",
      );
    } finally {
      setWorking(false);
      if (input.current) input.current.value = "";
    }
  }

  const shown = error ?? (serverError ? "coverUnreadable" : null);
  const hasCurrent = coverPath !== null;
  const canRemove =
    value.change === "replace" || (value.change === "keep" && hasCurrent);
  const pickedTint =
    value.picked === null ? null : coverTheme(value.picked.tint).tint;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {t("title")}
      </label>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <div className="flex items-start gap-3">
        <div
          className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted"
          style={
            pickedTint === null ? undefined : { backgroundColor: pickedTint }
          }
        >
          {working ? (
            <Loader2 aria-hidden className="size-6 animate-spin" />
          ) : value.change === "replace" && preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob preview
            <img
              src={preview}
              alt={tPick("previewAlt")}
              className="size-full object-cover object-top"
            />
          ) : value.change === "remove" ? (
            <ImagePlus aria-hidden className="size-6 text-muted-foreground" />
          ) : (
            <CoverTile
              name={name}
              tint={coverTint}
              path={coverPath}
              className="size-24 rounded-none"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <input
            ref={input}
            id={id}
            type="file"
            accept="image/*"
            disabled={disabled || working}
            aria-invalid={shown ? true : undefined}
            aria-describedby={shown ? `${id}-error` : undefined}
            onChange={(event) => void pick(event.target.files?.[0])}
            className="sr-only"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 px-4"
              disabled={disabled || working}
              onClick={() => input.current?.click()}
            >
              <ImagePlus aria-hidden />
              {t("replace")}
            </Button>
            {canRemove ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 px-4"
                disabled={disabled || working}
                onClick={() => {
                  setError(null);
                  onChange({ change: "remove", picked: null });
                }}
              >
                <X aria-hidden />
                {t("remove")}
              </Button>
            ) : null}
            {value.change !== "keep" ? (
              <Button
                type="button"
                variant="ghost"
                className="h-11 px-4"
                disabled={disabled || working}
                onClick={() => {
                  setError(null);
                  onChange({ change: "keep", picked: null });
                }}
              >
                <Undo2 aria-hidden />
                {t("undo")}
              </Button>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {value.change === "remove"
              ? t("willRemove")
              : value.change === "replace"
                ? t("newPicture")
                : hasCurrent
                  ? t("current")
                  : t("none")}
          </p>
        </div>
      </div>
      {shown ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {tPick(shown)}
        </p>
      ) : null}
    </div>
  );
}
