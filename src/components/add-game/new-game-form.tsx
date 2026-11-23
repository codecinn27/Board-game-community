"use client";

import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { addGame } from "@/app/[locale]/games/new/actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  DESCRIPTION_MAX,
  NAME_MAX,
  validateNewGame,
  type GameMatch,
  type NewGameErrorCode,
  type NewGameErrors,
  type NewGameFieldKey,
  type NewGameInput,
} from "@/lib/games/new-game";
import { logFailure, type DebugInfo } from "@/lib/games/debug";
import { CoverPicker } from "./cover-picker";
import { DebugNote } from "./debug-note";
import { GameMatchRow } from "./game-match";
import { RangeSlider } from "./range-slider";
import { type ShrunkCover } from "./shrink-cover";

type NewGameFormProps = {
  initialName: string;
  displayName: string;
  onBack: () => void;
};

type Problem = "generic" | "upload" | "readOnly" | "guest" | null;

/**
 * The manual form (spec 0013, AC-4 to AC-8). Fields are controlled and the
 * form submits through `onSubmit`, because React 19 resets a `<form action>`
 * after it runs and that would lose what was typed.
 */
export function NewGameForm({
  initialName,
  displayName,
  onBack,
}: NewGameFormProps) {
  const t = useTranslations("addGame.form");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<NewGameInput>({
    name: initialName,
    playersMin: "",
    playersMax: "",
    playTimeMin: "",
    playTimeMax: "",
    description: "",
  });
  const [errors, setErrors] = useState<NewGameErrors>({});
  const [cover, setCover] = useState<ShrunkCover | null>(null);
  const [coverRefused, setCoverRefused] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);
  const [debug, setDebug] = useState<DebugInfo | null>(null);
  const [existing, setExisting] = useState<GameMatch | null>(null);
  const [ownedNow, setOwnedNow] = useState(false);

  function change(key: NewGameFieldKey) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setValues((current) => ({ ...current, [key]: value }));
    };
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setProblem(null);
    setDebug(null);
    setCoverRefused(false);
    setExisting(null);

    const checked = validateNewGame(values);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});

    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    data.set("locale", locale);
    if (cover) {
      data.set("cover", cover.blob, "cover");
      data.set("coverTint", cover.tint);
    }

    startTransition(async () => {
      try {
        const result = await addGame(data);
        switch (result.status) {
          case "invalid":
            setErrors(result.fields);
            break;
          case "exists":
            setExisting(result.game);
            setOwnedNow(result.game.mine);
            break;
          case "coverInvalid":
            setCoverRefused(true);
            break;
          case "uploadFailed":
            setProblem("upload");
            setDebug(result.debug ?? null);
            break;
          case "readOnly":
            setProblem("readOnly");
            break;
          case "guest":
            setProblem("guest");
            break;
          case "error":
            setProblem("generic");
            setDebug(result.debug ?? null);
            break;
        }
      } catch (error) {
        // The call never came back: the browser, the network, or Next.js.
        setProblem("generic");
        setDebug(logFailure("frontend", "addGame call failed", error) ?? null);
      }
    });
  }

  function textField(key: "name", maxLength: number) {
    const error = errors[key];
    const id = `new-game-${key}`;
    return (
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={id}>{t(`fields.${key}`)}</FieldLabel>
        <Input
          id={id}
          name={key}
          value={values[key]}
          onChange={change(key)}
          maxLength={maxLength}
          disabled={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          autoComplete="off"
          className="h-11"
        />
        {error ? (
          <FieldError id={`${id}-error`}>{t(`errors.${error}`)}</FieldError>
        ) : null}
      </Field>
    );
  }

  const rangeError = (code: NewGameErrorCode | undefined) =>
    code ? t(`errors.${code}`) : undefined;
  const descriptionError = errors.description;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        {problem ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {t(`problem.${problem}`)}
          </p>
        ) : null}
        {problem ? <DebugNote info={debug} /> : null}

        {existing ? (
          <section
            aria-labelledby="new-game-exists"
            className="flex flex-col gap-1 rounded-xl border bg-card px-4 py-3"
          >
            <h2 id="new-game-exists" className="font-semibold">
              {t("exists")}
            </h2>
            <ul>
              <GameMatchRow
                game={existing}
                displayName={displayName}
                owned={ownedNow}
                onOwned={() => setOwnedNow(true)}
              />
            </ul>
          </section>
        ) : null}

        {textField("name", NAME_MAX * 2)}

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

        <Field data-invalid={descriptionError ? true : undefined}>
          <FieldLabel htmlFor="new-game-description">
            {t("fields.description")}
          </FieldLabel>
          <textarea
            id="new-game-description"
            name="description"
            rows={4}
            value={values.description}
            onChange={change("description")}
            disabled={pending}
            aria-invalid={descriptionError ? true : undefined}
            aria-describedby={
              descriptionError ? "new-game-description-error" : undefined
            }
            className="min-h-28 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30"
          />
          {descriptionError ? (
            <FieldError id="new-game-description-error">
              {t(`errors.${descriptionError}`, { max: DESCRIPTION_MAX })}
            </FieldError>
          ) : null}
        </Field>

        <CoverPicker
          value={cover}
          onChange={(next) => {
            setCover(next);
            setCoverRefused(false);
          }}
          serverError={coverRefused}
          disabled={pending}
        />
      </FieldGroup>

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button
          type="submit"
          className="h-12 flex-1 text-base"
          disabled={pending}
        >
          {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
          {pending ? t("saving") : t("save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 flex-1 text-base"
          disabled={pending}
          onClick={onBack}
        >
          {t("back")}
        </Button>
      </div>
    </form>
  );
}
