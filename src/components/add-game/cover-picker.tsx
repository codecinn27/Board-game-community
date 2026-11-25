"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { coverTheme } from "@/lib/design/cover-tint";
import { shrinkCover, type CoverError, type ShrunkCover } from "./shrink-cover";

type CoverPickerProps = {
  value: ShrunkCover | null;
  onChange: (value: ShrunkCover | null) => void;
  /** A message from the server (the picture was refused). */
  serverError?: boolean;
  disabled?: boolean;
};

/** The optional cover field: pick, shrink in the browser, preview. */
export function CoverPicker({
  value,
  onChange,
  serverError,
  disabled,
}: CoverPickerProps) {
  const t = useTranslations("addGame.form.cover");
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<CoverError | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // One object URL per picture, given back when it changes or the field goes.
  const blob = value?.blob ?? null;
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
      onChange(await shrinkCover(file));
    } catch (problem) {
      // A failed pick keeps the picture that was there before.
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
  const tint = value === null ? null : coverTheme(value.tint).tint;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {t("label")}
      </label>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <div className="flex items-center gap-3">
        <div
          className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted"
          style={tint === null ? undefined : { backgroundColor: tint }}
        >
          {working ? (
            <Loader2 aria-hidden className="size-6 animate-spin" />
          ) : preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob preview
            <img
              src={preview}
              alt={t("previewAlt")}
              className="size-full object-cover object-top"
            />
          ) : (
            <ImagePlus aria-hidden className="size-6 text-muted-foreground" />
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
            className="max-w-full text-sm file:mr-3 file:min-h-10 file:rounded-lg file:border file:bg-background file:px-3 file:text-sm file:font-medium"
          />
          {value !== null ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 self-start"
              disabled={disabled}
              onClick={() => {
                setError(null);
                onChange(null);
              }}
            >
              <X aria-hidden />
              {t("remove")}
            </Button>
          ) : null}
        </div>
      </div>
      {shown ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {t(shown)}
        </p>
      ) : null}
    </div>
  );
}
