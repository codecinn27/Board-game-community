// Checked by `tsc --noEmit` in `pnpm typecheck`, never run (spec 0005, AC-8).
// If key typing ever stops working, the expect-error below has nothing to
// catch and the type check fails.
import { useTranslations } from "next-intl";

export function useWrongKeyFailsTypecheck() {
  const t = useTranslations("shell");
  // @ts-expect-error: "nope" is not a key under `shell`.
  t("nope");
  return t("brand");
}
