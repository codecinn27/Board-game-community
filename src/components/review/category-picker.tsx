"use client";

import { Loader2, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition, type KeyboardEvent } from "react";
import { createCategory } from "@/app/[locale]/admin/review/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  categoryLabel,
  validateCategory,
  type CategoryErrors,
  type EditorCategory,
} from "@/lib/games/categories";
import { cn } from "@/lib/utils";

type CategoryPickerProps = {
  categories: readonly EditorCategory[];
  selected: readonly number[];
  onChange: (ids: number[]) => void;
  /** A category was just created: add it to the list the editor shows. */
  onCreated: (category: EditorCategory) => void;
  disabled?: boolean;
};

/**
 * Any number of categories from the fixed list, plus a small form to add one
 * (spec 0013 amendment, AC-17 and AC-25). A new category is ticked at once.
 */
export function CategoryPicker({
  categories,
  selected,
  onChange,
  onCreated,
  disabled,
}: CategoryPickerProps) {
  const t = useTranslations("review.editor.categories");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [nameEn, setNameEn] = useState("");
  const [nameZh, setNameZh] = useState("");
  const [errors, setErrors] = useState<CategoryErrors>({});
  const [note, setNote] = useState<"exists" | "failed" | null>(null);

  function toggle(id: number) {
    onChange(
      selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id],
    );
  }

  function tick(id: number) {
    if (!selected.includes(id)) onChange([...selected, id]);
  }

  function create() {
    if (pending) return;
    setNote(null);
    const checked = validateCategory({ nameEn, nameZh });
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    startTransition(async () => {
      try {
        const result = await createCategory(nameEn, nameZh);
        switch (result.status) {
          case "ok":
            onCreated(result.category);
            tick(result.category.id);
            setNameEn("");
            setNameZh("");
            break;
          case "exists":
            // Show the one that exists, ticked, instead of a second copy.
            if (!categories.some((item) => item.id === result.category.id)) {
              onCreated(result.category);
            }
            tick(result.category.id);
            setNameEn("");
            setNameZh("");
            setNote("exists");
            break;
          case "invalid":
            setErrors(result.errors);
            break;
          default:
            setNote("failed");
        }
      } catch {
        setNote("failed");
      }
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter here adds the category; it must not save the whole game.
    if (event.key === "Enter") {
      event.preventDefault();
      create();
    }
  }

  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="mb-1 text-sm font-medium">{t("title")}</legend>
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const checked = selected.includes(category.id);
            return (
              <li key={category.id}>
                <label
                  className={cn(
                    "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(category.id)}
                    className="sr-only"
                  />
                  {categoryLabel(category, locale)}
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
        <p className="text-sm font-medium">{t("add")}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 flex-col gap-1">
            <Input
              value={nameEn}
              onChange={(event) => setNameEn(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t("nameEn")}
              aria-label={t("nameEn")}
              aria-invalid={errors.nameEn ? true : undefined}
              aria-describedby={
                errors.nameEn ? "category-name-en-error" : undefined
              }
              disabled={pending}
              autoComplete="off"
              className="h-11"
            />
            {errors.nameEn ? (
              <p
                id="category-name-en-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {t(`errors.${errors.nameEn}`)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <Input
              value={nameZh}
              onChange={(event) => setNameZh(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t("nameZh")}
              aria-label={t("nameZh")}
              aria-invalid={errors.nameZh ? true : undefined}
              aria-describedby={
                errors.nameZh ? "category-name-zh-error" : undefined
              }
              disabled={pending}
              autoComplete="off"
              className="h-11"
            />
            {errors.nameZh ? (
              <p
                id="category-name-zh-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {t(`errors.${errors.nameZh}`)}
              </p>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 self-start px-4"
          disabled={pending}
          onClick={create}
        >
          {pending ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : (
            <Plus aria-hidden />
          )}
          {pending ? t("creating") : t("create")}
        </Button>
        {note ? (
          <p
            role={note === "failed" ? "alert" : "status"}
            className={cn(
              "text-sm",
              note === "failed" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {t(note)}
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}
