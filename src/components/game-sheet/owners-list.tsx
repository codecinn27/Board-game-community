import { getFormatter, getTranslations } from "next-intl/server";
import { LocalTime } from "@/components/time/local-time";
import { coverInitial } from "@/lib/games/cover-initial";
import { type GameOwner } from "@/lib/games/detail";

type OwnersListProps = {
  owners: GameOwner[];
};

/** Every owner, oldest link first (spec 0008, AC-9). Rows are not links yet. */
export async function OwnersList({ owners }: OwnersListProps) {
  const t = await getTranslations("game.owners");
  const format = await getFormatter();

  return (
    <section aria-labelledby="game-owners" className="flex flex-col gap-3">
      <h2 id="game-owners" className="text-lg font-semibold">
        {t("heading", { count: format.number(owners.length) })}
      </h2>
      {owners.length === 0 ? (
        <p className="text-(--sheet-ink-muted)">{t("none")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-(--sheet-line)">
          {owners.map((owner) => (
            <li
              key={owner.memberId}
              className="flex min-h-14 items-center gap-3 py-2"
            >
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--sheet-chip) font-semibold"
              >
                {coverInitial(owner.displayName)}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {owner.displayName}
              </span>
              <span className="text-sm whitespace-nowrap text-(--sheet-ink-muted)">
                {t.rich("since", {
                  date: () => <LocalTime value={owner.since} monthYear />,
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
