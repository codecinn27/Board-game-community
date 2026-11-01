import { getFormatter, getTranslations } from "next-intl/server";
import { formatRange } from "@/lib/games/detail";

type StatsCardProps = {
  playersMin: number | null;
  playersMax: number | null;
  playTimeMin: number | null;
  playTimeMax: number | null;
  ownerCount: number;
};

/** Players, Minutes, and Owners (spec 0008, AC-7). */
export async function StatsCard({
  playersMin,
  playersMax,
  playTimeMin,
  playTimeMax,
  ownerCount,
}: StatsCardProps) {
  const t = await getTranslations("game.stats");
  const format = await getFormatter();

  function show(min: number | null, max: number | null): string {
    const range = formatRange(min, max);
    if (range.kind === "unknown") return t("unknown");
    if (range.kind === "single") return format.number(range.value);
    return `${format.number(range.min)}–${format.number(range.max)}`;
  }

  const stats = [
    { label: t("players"), value: show(playersMin, playersMax) },
    { label: t("minutes"), value: show(playTimeMin, playTimeMax) },
    { label: t("owners"), value: format.number(ownerCount) },
  ];

  return (
    <dl className="grid grid-cols-3 divide-x divide-(--sheet-line) rounded-[22px] border border-(--sheet-line) bg-(--sheet-card) py-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex min-w-0 flex-col items-center gap-1 px-2"
        >
          <dt className="text-xs tracking-wide text-(--sheet-ink-muted) uppercase">
            {stat.label}
          </dt>
          <dd className="text-2xl font-bold whitespace-nowrap text-(--sheet-ink) tabular-nums">
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
