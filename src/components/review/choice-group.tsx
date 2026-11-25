"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  choiceHint,
  choiceLabel,
  type EditorChoice,
} from "@/lib/games/choices";
import { cn } from "@/lib/utils";

type ChoiceGroupProps = {
  legend: string;
  choices: readonly EditorChoice[];
  selected: readonly number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
};

/**
 * One fixed group of choices (feel, theme, or mechanics) as tick boxes, in the
 * order given. A choice with a description shows it as a hint under its label
 * (spec 0014, AC-4).
 */
export function ChoiceGroup({
  legend,
  choices,
  selected,
  onChange,
  disabled,
}: ChoiceGroupProps) {
  const t = useTranslations("review.editor.groups");
  const locale = useLocale();

  function toggle(id: number) {
    onChange(
      selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id],
    );
  }

  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      {choices.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {choices.map((choice) => {
            const checked = selected.includes(choice.id);
            const hint = choiceHint(choice, locale);
            return (
              <li key={choice.id}>
                <label
                  className={cn(
                    "flex min-h-11 cursor-pointer flex-col justify-center rounded-2xl border px-4 py-2 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(choice.id)}
                    className="sr-only"
                  />
                  <span>{choiceLabel(choice, locale)}</span>
                  {hint === null ? null : (
                    <span
                      className={cn(
                        "max-w-64 text-xs",
                        checked
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground",
                      )}
                    >
                      {hint}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}
