"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { saveGame } from "@/app/[locale]/admin/review/actions";
import { RangeSlider } from "@/components/add-game/range-slider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { type EditorCategory } from "@/lib/games/categories";
import {
  isEditDirty,
  tabForErrors,
  toEditInput,
  validateEditGame,
  type EditGameErrorCode,
  type EditGameErrors,
  type EditGameFieldKey,
  type EditGameInput,
  type EditSnapshot,
  type EditTab,
  type EditorGame,
  type EditorLists,
} from "@/lib/games/edit-game";
import { DESCRIPTION_MAX, NAME_MAX } from "@/lib/games/new-game";
import { cn } from "@/lib/utils";
import { CategoryPicker } from "./category-picker";
import { CoverField, type CoverState } from "./cover-field";
import { OwnerPicker } from "./owner-picker";

type ReviewEditorProps = {
  game: EditorGame;
  lists: EditorLists;
  onClose: () => void;
};

type Problem =
  | { kind: "clash"; name: string | null }
  | {
      kind:
        "alreadyReviewed" | "forbidden" | "notFound" | "uploadFailed" | "error";
    };

const TEXT_KEYS = [
  "name",
  "nameZh",
  "description",
  "descriptionZh",
  "playersMin",
  "playersMax",
  "playTimeMin",
  "playTimeMax",
] as const satisfies readonly EditGameFieldKey[];

const textareaClass =
  "min-h-28 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30";

/**
 * The review editor (spec 0013 amendment, AC-16 to AC-22, AC-25): a bottom sheet
 * at 360 px and a centered dialog from `md` up. Fields are controlled and the
 * form submits through `onSubmit`, so a failed save keeps what was typed.
 */
export function ReviewEditor({ game, lists, onClose }: ReviewEditorProps) {
  const t = useTranslations("review.editor");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [initial] = useState(() => toEditInput(game));
  const initialOwnerIds = game.owners.map((owner) => owner.id);
  const [values, setValues] = useState<EditGameInput>(initial);
  const [categories, setCategories] = useState<readonly EditorCategory[]>(
    lists.categories,
  );
  const [categoryIds, setCategoryIds] = useState<number[]>(game.categoryIds);
  const [ownerIds, setOwnerIds] = useState<string[]>(initialOwnerIds);
  const [cover, setCover] = useState<CoverState>({
    change: "keep",
    picked: null,
  });
  const [tab, setTab] = useState<EditTab>("en");
  const [errors, setErrors] = useState<EditGameErrors>({});
  const [coverRefused, setCoverRefused] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Active members, plus any current owner who is not active (kept, ticked).
  const members = [
    ...lists.members,
    ...game.owners.filter(
      (owner) => !lists.members.some((member) => member.id === owner.id),
    ),
  ];

  const snapshot = (): EditSnapshot => ({
    fields: values,
    categoryIds,
    ownerIds,
    cover: cover.change,
  });
  const initialSnapshot: EditSnapshot = {
    fields: initial,
    categoryIds: game.categoryIds,
    ownerIds: initialOwnerIds,
    cover: "keep",
  };
  const dirty = isEditDirty(initialSnapshot, snapshot());

  function set(key: EditGameFieldKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  // Closing with unsaved changes asks first (AC-19).
  function requestClose() {
    if (pending) return;
    if (dirty) setConfirming(true);
    else onClose();
  }

  function save(approve: boolean) {
    if (pending) return;
    setProblem(null);
    setCoverRefused(false);
    setConfirming(false);

    const checked = validateEditGame(values);
    if (!checked.ok) {
      setErrors(checked.errors);
      setTab((current) => tabForErrors(checked.errors, current));
      return;
    }
    setErrors({});

    // Nothing changed: close without a call, unless the game is also approved.
    if (!dirty && !approve) {
      onClose();
      return;
    }

    const data = new FormData();
    data.set("gameId", String(game.id));
    for (const key of TEXT_KEYS) data.set(key, values[key]);
    data.set("categoryIds", JSON.stringify(categoryIds));
    data.set("ownerIds", JSON.stringify(ownerIds));
    data.set("markReviewed", approve ? "true" : "false");
    if (cover.change === "replace" && cover.picked) {
      data.set("cover", cover.picked.blob, "cover");
      data.set("coverTint", cover.picked.tint);
    } else if (cover.change === "remove") {
      data.set("removeCover", "true");
    }

    startTransition(async () => {
      try {
        const result = await saveGame(data);
        switch (result.status) {
          case "ok":
            router.refresh();
            onClose();
            break;
          case "invalid":
            setErrors(result.fields);
            setTab((current) => tabForErrors(result.fields, current));
            break;
          case "clash":
            setProblem({ kind: "clash", name: result.other?.name ?? null });
            break;
          case "coverInvalid":
            setCoverRefused(true);
            break;
          case "alreadyReviewed":
          case "notFound":
            // The row is stale: show why and refresh it.
            setProblem({ kind: result.status });
            router.refresh();
            break;
          case "uploadFailed":
          case "forbidden":
          case "error":
            setProblem({ kind: result.status });
            break;
        }
      } catch {
        setProblem({ kind: "error" });
      }
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save(false);
  }

  const message = (code: EditGameErrorCode) =>
    t(`errors.${code}`, { max: DESCRIPTION_MAX });
  const rangeError = (code: EditGameErrorCode | undefined) =>
    code ? message(code) : undefined;

  function textField(key: "name" | "nameZh", label: string, id: string) {
    const error = errors[key];
    return (
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input
          id={id}
          value={values[key]}
          onChange={(event) => set(key, event.target.value)}
          maxLength={NAME_MAX * 2}
          disabled={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          autoComplete="off"
          className="h-11"
        />
        {error ? (
          <FieldError id={`${id}-error`}>{message(error)}</FieldError>
        ) : null}
      </Field>
    );
  }

  function descriptionField(
    key: "description" | "descriptionZh",
    label: string,
    id: string,
  ) {
    const error = errors[key];
    return (
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <textarea
          id={id}
          rows={5}
          value={values[key]}
          onChange={(event) => set(key, event.target.value)}
          disabled={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={textareaClass}
        />
        {error ? (
          <FieldError id={`${id}-error`}>{message(error)}</FieldError>
        ) : null}
      </Field>
    );
  }

  const tabHasError = (keys: readonly EditGameFieldKey[]) =>
    keys.some((key) => errors[key] !== undefined);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="inset-x-0 top-auto bottom-0 left-0 max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-b-none p-4 sm:max-w-none md:top-1/2 md:bottom-auto md:left-1/2 md:max-w-xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-b-xl"
      >
        <DialogHeader>
          <DialogTitle className="text-lg">{t("title")}</DialogTitle>
          <DialogDescription>{t("intro")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <FieldGroup>
            {problem ? (
              <p
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {problem.kind === "clash"
                  ? problem.name === null
                    ? t("problem.clashUnknown")
                    : t("problem.clash", { name: problem.name })
                  : t(`problem.${problem.kind}`)}
              </p>
            ) : null}
            {coverRefused ? (
              <p
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {t("problem.coverInvalid")}
              </p>
            ) : null}

            <div className="flex flex-col gap-3">
              <div
                role="tablist"
                aria-label={t("tabs.label")}
                className="flex gap-2"
              >
                {(["en", "zh"] as const).map((key) => {
                  const invalid = tabHasError(
                    key === "en"
                      ? ["name", "description"]
                      : ["nameZh", "descriptionZh"],
                  );
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      id={`review-edit-tab-${key}`}
                      aria-selected={tab === key}
                      aria-controls={`review-edit-panel-${key}`}
                      onClick={() => setTab(key)}
                      className={cn(
                        "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium",
                        tab === key
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-background hover:bg-muted",
                        invalid && "border-destructive",
                      )}
                    >
                      {t(`tabs.${key}`)}
                    </button>
                  );
                })}
              </div>
              {tab === "en" ? (
                <div
                  role="tabpanel"
                  id="review-edit-panel-en"
                  aria-labelledby="review-edit-tab-en"
                  className="flex flex-col gap-4"
                >
                  {textField("name", t("fields.name"), "review-edit-name")}
                  {descriptionField(
                    "description",
                    t("fields.description"),
                    "review-edit-description",
                  )}
                </div>
              ) : (
                <div
                  role="tabpanel"
                  id="review-edit-panel-zh"
                  aria-labelledby="review-edit-tab-zh"
                  className="flex flex-col gap-4"
                >
                  <p className="text-sm text-muted-foreground">{t("zhHint")}</p>
                  {textField(
                    "nameZh",
                    t("fields.nameZh"),
                    "review-edit-name-zh",
                  )}
                  {descriptionField(
                    "descriptionZh",
                    t("fields.descriptionZh"),
                    "review-edit-description-zh",
                  )}
                </div>
              )}
            </div>

            <RangeSlider
              kind="players"
              minValue={values.playersMin}
              maxValue={values.playersMax}
              onChange={(min, max) =>
                setValues((current) => ({
                  ...current,
                  playersMin: min,
                  playersMax: max,
                }))
              }
              disabled={pending}
              error={rangeError(errors.playersMin ?? errors.playersMax)}
            />

            <RangeSlider
              kind="playTime"
              minValue={values.playTimeMin}
              maxValue={values.playTimeMax}
              onChange={(min, max) =>
                setValues((current) => ({
                  ...current,
                  playTimeMin: min,
                  playTimeMax: max,
                }))
              }
              disabled={pending}
              error={rangeError(errors.playTimeMin ?? errors.playTimeMax)}
            />

            <CategoryPicker
              categories={categories}
              selected={categoryIds}
              onChange={setCategoryIds}
              onCreated={(category) =>
                setCategories((current) => [...current, category])
              }
              disabled={pending}
            />

            <OwnerPicker
              members={members}
              selected={ownerIds}
              onChange={setOwnerIds}
              disabled={pending}
            />

            <CoverField
              name={game.name}
              coverPath={game.coverPath}
              coverTint={game.coverTint}
              value={cover}
              onChange={(next) => {
                setCover(next);
                setCoverRefused(false);
              }}
              serverError={coverRefused}
              disabled={pending}
            />
          </FieldGroup>

          {confirming ? (
            <div
              role="alertdialog"
              aria-labelledby="review-edit-discard-title"
              className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3"
            >
              <div className="flex flex-col gap-1">
                <p id="review-edit-discard-title" className="font-semibold">
                  {t("discard.title")}
                </p>
                <p className="text-sm">{t("discard.body")}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  className="h-11 px-4"
                  onClick={() => setConfirming(false)}
                >
                  {t("discard.keep")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-4"
                  onClick={onClose}
                >
                  {t("discard.discard")}
                </Button>
              </div>
            </div>
          ) : null}

          <DialogFooter className="sticky bottom-0 z-20 bg-popover sm:flex-row-reverse sm:justify-start">
            <Button type="submit" className="h-11 px-4" disabled={pending}>
              {pending ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : null}
              {pending ? t("saving") : t("save")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11 px-4"
              disabled={pending}
              onClick={() => save(true)}
            >
              {t("saveAndApprove")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 px-4"
              disabled={pending}
              onClick={requestClose}
            >
              {t("cancel")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
