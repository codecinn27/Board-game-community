"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Kind = "players" | "playTime";

type PresetKey =
  | "players.presets.solo"
  | "players.presets.two"
  | "players.presets.twoToFour"
  | "players.presets.threeToSix"
  | "players.presets.sixPlus"
  | "playTime.presets.quick"
  | "playTime.presets.halfHour"
  | "playTime.presets.hour"
  | "playTime.presets.long";

type Preset = { key: PresetKey; lo: number; hi: number };

type Scale = {
  min: number;
  max: number;
  step: number;
  presets: Preset[];
  ticks: number[];
};

// The slider covers the common range. The last stop means "this much or more"
// and saves the number itself (12 players, 240 minutes).
const SCALES: Record<Kind, Scale> = {
  players: {
    min: 1,
    max: 12,
    step: 1,
    presets: [
      { key: "players.presets.solo", lo: 1, hi: 1 },
      { key: "players.presets.two", lo: 2, hi: 2 },
      { key: "players.presets.twoToFour", lo: 2, hi: 4 },
      { key: "players.presets.threeToSix", lo: 3, hi: 6 },
      { key: "players.presets.sixPlus", lo: 6, hi: 12 },
    ],
    ticks: [1, 4, 8, 12],
  },
  playTime: {
    min: 5,
    max: 240,
    step: 5,
    presets: [
      { key: "playTime.presets.quick", lo: 5, hi: 30 },
      { key: "playTime.presets.halfHour", lo: 30, hi: 60 },
      { key: "playTime.presets.hour", lo: 60, hi: 120 },
      { key: "playTime.presets.long", lo: 120, hi: 240 },
    ],
    ticks: [5, 60, 120, 180, 240],
  },
};

type RangeSliderProps = {
  kind: Kind;
  /** The saved ends as the form holds them: "" when not set. */
  minValue: string;
  maxValue: string;
  onChange: (min: string, max: string) => void;
  disabled?: boolean;
  /** A message under the control (from the server). */
  error?: string | undefined;
};

const thumb =
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:mt-2 [&::-webkit-slider-thumb]:size-7 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-sm " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background " +
  "[&:focus-visible::-webkit-slider-thumb]:ring-4 [&:focus-visible::-webkit-slider-thumb]:ring-ring/50 [&:focus-visible::-moz-range-thumb]:outline-3 [&:focus-visible::-moz-range-thumb]:outline-ring/50";

/**
 * One two handle slider for a "from to" pair (spec 0013, AC-4), with quick
 * picks above it. It keeps the form's own fields as strings, so validation
 * and the Server Action do not change. "Not set" clears both ends.
 */
export function RangeSlider({
  kind,
  minValue,
  maxValue,
  onChange,
  disabled,
  error,
}: RangeSliderProps) {
  const t = useTranslations(`addGame.form.range.${kind}`);
  const tCommon = useTranslations("addGame.form.range");
  const format = useFormatter();
  const id = useId();
  const scale = SCALES[kind];
  const [top, setTop] = useState<"lo" | "hi">("lo");

  const lo = minValue === "" ? null : Number(minValue);
  const hi = maxValue === "" ? null : Number(maxValue);
  const isSet = lo !== null && hi !== null && !Number.isNaN(lo + hi);

  const clamp = (value: number) =>
    Math.min(scale.max, Math.max(scale.min, value));
  const sliderLo = isSet ? clamp(lo) : scale.min;
  const sliderHi = isSet ? clamp(hi) : scale.max;
  const span = scale.max - scale.min;

  const show = (value: number) =>
    value >= scale.max ? `${format.number(value)}+` : format.number(value);

  let summary = tCommon("notSet");
  if (isSet) {
    summary =
      lo === hi
        ? t("single", { value: show(lo), count: lo })
        : t("span", { min: show(lo), max: show(hi) });
  }

  function drag(which: "lo" | "hi", raw: string) {
    const value = Number(raw);
    let nextLo = isSet ? sliderLo : scale.min;
    let nextHi = isSet ? sliderHi : scale.max;
    if (which === "lo") {
      nextLo = value;
      if (nextLo > nextHi) nextHi = nextLo;
    } else {
      nextHi = value;
      if (nextHi < nextLo) nextLo = nextHi;
    }
    onChange(String(nextLo), String(nextHi));
  }

  const handle = (which: "lo" | "hi") => (
    <input
      type="range"
      id={`${id}-${which}`}
      min={scale.min}
      max={scale.max}
      step={scale.step}
      value={which === "lo" ? sliderLo : sliderHi}
      disabled={disabled}
      aria-label={t(which === "lo" ? "lowest" : "highest")}
      aria-valuetext={show(which === "lo" ? sliderLo : sliderHi)}
      onChange={(event) => drag(which, event.target.value)}
      onPointerDown={() => setTop(which)}
      style={{ zIndex: top === which ? 2 : 1 }}
      className={cn(
        "pointer-events-none absolute inset-0 h-11 w-full appearance-none bg-transparent disabled:opacity-50 [&::-moz-range-track]:h-11 [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-11 [&::-webkit-slider-runnable-track]:bg-transparent",
        thumb,
      )}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span id={`${id}-label`} className="text-sm leading-snug font-medium">
          {t("label")}
        </span>
        <span
          aria-live="polite"
          className="font-semibold text-primary tabular-nums"
        >
          {summary}
        </span>
      </div>

      <div
        role="group"
        aria-labelledby={`${id}-label`}
        className="flex flex-wrap gap-2"
      >
        {scale.presets.map((preset) => {
          const on = isSet && lo === preset.lo && hi === preset.hi;
          return (
            <Button
              key={preset.key}
              type="button"
              variant={on ? "default" : "outline"}
              aria-pressed={on}
              disabled={disabled}
              className="h-10 rounded-full px-4"
              onClick={() => onChange(String(preset.lo), String(preset.hi))}
            >
              {tCommon(preset.key)}
            </Button>
          );
        })}
        <Button
          type="button"
          variant={isSet ? "outline" : "default"}
          aria-pressed={!isSet}
          disabled={disabled}
          className="h-10 rounded-full px-4"
          onClick={() => onChange("", "")}
        >
          {tCommon("notSet")}
        </Button>
      </div>

      <div className="relative h-11">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
        <div
          className={cn(
            "absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary",
            !isSet && "opacity-25",
          )}
          style={{
            left: `${((sliderLo - scale.min) / span) * 100}%`,
            right: `${100 - ((sliderHi - scale.min) / span) * 100}%`,
          }}
        />
        {handle("lo")}
        {handle("hi")}
      </div>

      <div
        aria-hidden
        className="flex justify-between text-xs text-muted-foreground tabular-nums"
      >
        {scale.ticks.map((tick) => (
          <span key={tick}>{show(tick)}</span>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
