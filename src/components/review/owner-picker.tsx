"use client";

import { useTranslations } from "next-intl";
import { type EditorMember } from "@/lib/games/edit-game";
import { cn } from "@/lib/utils";

type OwnerPickerProps = {
  /** Active members plus any current owner who is no longer active. */
  members: readonly EditorMember[];
  selected: readonly string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

/**
 * The owners as a tick list (spec 0013 amendment, AC-17). Every active member
 * can be picked; a current owner who is read only stays in the list, ticked,
 * so saving never drops them by accident.
 */
export function OwnerPicker({
  members,
  selected,
  onChange,
  disabled,
}: OwnerPickerProps) {
  const t = useTranslations("review.editor.owners");

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id],
    );
  }

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-1 text-sm font-medium">{t("title")}</legend>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <ul className="flex max-h-56 flex-col overflow-y-auto rounded-lg border">
          {members.map((member) => {
            const id = `owner-${member.id}`;
            return (
              <li key={member.id} className="border-b last:border-b-0">
                <label
                  htmlFor={id}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 px-3 text-sm hover:bg-muted",
                    disabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={selected.includes(member.id)}
                    onChange={() => toggle(member.id)}
                    className="size-5 accent-primary"
                  />
                  <span className="min-w-0 flex-1 truncate">{member.name}</span>
                  {member.disabled ? (
                    <span className="text-xs text-muted-foreground">
                      {t("readOnly")}
                    </span>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}
