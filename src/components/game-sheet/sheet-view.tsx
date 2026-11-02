import { Star, Users } from "lucide-react";
import { type ReactNode } from "react";
import { CoverTile } from "@/components/games/cover-tile";
import { LocalTime } from "@/components/time/local-time";
import { NEUTRAL_SHEET_TINT } from "@/lib/games/neutral-tint";
import { cn } from "@/lib/utils";
import { Description } from "./description";
import { type SheetData } from "./sheet-data";
import { ShareButton, ShareProvider } from "./share-button";
import { SHEET_TITLE_ID, sheetStyle } from "./sheet-theme";

type SheetViewProps = {
  data: SheetData;
  /** `overlay` sits in the modal; `page` sits in the app shell. */
  variant: "overlay" | "page";
  /** The Close control: a button in the modal, a link on the page. */
  closeControl: ReactNode;
  /** The title's heading level: 1 on its own page, 3 inside `/design`. */
  headingLevel?: 1 | 3;
};

const chip =
  "inline-flex min-h-8 items-center gap-1.5 rounded-full bg-(--sheet-chip) px-3 text-sm font-semibold tabular-nums";

/**
 * The sheet (spec 0008, AC-4 to AC-11), drawn from plain data. The page and
 * the modal both render this, so their content cannot differ. Every color is
 * a `--sheet-*` variable set from the cover tint.
 */
export function SheetView({
  data,
  variant,
  closeControl,
  headingLevel = 1,
}: SheetViewProps) {
  const Title = headingLevel === 1 ? "h1" : "h3";

  return (
    <ShareProvider
      title={data.name}
      path={data.sharePath}
      labels={{ copied: data.share.copied, copyFailed: data.share.copyFailed }}
    >
      <article
        style={sheetStyle(data.tint)}
        className={cn(
          "relative flex flex-col bg-linear-to-b from-(--sheet-tint) from-55% to-(--sheet-deep) text-(--sheet-ink)",
          variant === "page" &&
            "mx-auto w-full max-w-lg overflow-clip rounded-[28px]",
        )}
      >
        <div className="relative h-[52dvh] max-h-[30rem] shrink-0 overflow-hidden">
          <div className="size-full origin-center in-data-starting-style:scale-105 motion-safe:transition-transform motion-safe:duration-280 motion-safe:ease-out">
            <CoverTile
              name={data.name}
              tint={data.tint ?? NEUTRAL_SHEET_TINT}
              className="aspect-auto size-full rounded-none"
            />
          </div>
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-b from-transparent to-(--sheet-tint)"
          />
          <div className="absolute top-4 left-4">{closeControl}</div>
          <div className="absolute top-4 right-4">
            <ShareButton variant="glass" label={data.share.label} />
          </div>
        </div>

        <div className="flex flex-col gap-6 px-5 pb-6">
          <div className="flex flex-col items-center gap-3">
            <Title
              id={SHEET_TITLE_ID}
              className="line-clamp-2 text-center text-3xl font-bold tracking-tight"
            >
              {data.name}
            </Title>
            <div className="flex flex-wrap justify-center gap-2">
              {data.rating === null ? null : (
                <span className={chip}>
                  <Star aria-hidden className="size-4 fill-current" />
                  <span aria-hidden>{data.rating.text}</span>
                  <span className="sr-only">{data.rating.label}</span>
                </span>
              )}
              <span className={chip}>
                <Users aria-hidden className="size-4" />
                <span aria-hidden>{data.ownerChip.text}</span>
                <span className="sr-only">{data.ownerChip.label}</span>
              </span>
            </div>
          </div>

          <dl className="grid grid-cols-3 divide-x divide-(--sheet-line) rounded-[22px] border border-(--sheet-line) bg-(--sheet-card) py-4">
            {data.stats.map((stat) => (
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

          {data.description === null ? null : (
            <Description
              text={data.description.text}
              moreLabel={data.description.more}
              lessLabel={data.description.less}
            />
          )}

          <section
            aria-labelledby="game-owners"
            className="flex flex-col gap-3"
          >
            <h2 id="game-owners" className="text-lg font-semibold">
              {data.owners.heading}
            </h2>
            {data.owners.rows.length === 0 ? (
              <p className="text-(--sheet-ink-muted)">{data.owners.none}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-(--sheet-line)">
                {data.owners.rows.map((owner) => (
                  <li
                    key={owner.memberId}
                    className="flex min-h-14 items-center gap-3 py-2"
                  >
                    <span
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--sheet-chip) font-semibold"
                    >
                      {owner.initial}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {owner.name}
                    </span>
                    <span className="text-sm whitespace-nowrap text-(--sheet-ink-muted)">
                      {data.owners.sinceBefore}
                      <LocalTime value={owner.since} monthYear />
                      {data.owners.sinceAfter}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div
          className={cn(
            "sticky z-10 mt-auto px-4 pt-2",
            variant === "page"
              ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] pb-2 md:bottom-4"
              : "bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))]",
          )}
        >
          <div className="flex items-center gap-2 rounded-full border border-(--sheet-line) bg-(--sheet-dock) p-2 backdrop-blur-md">
            <button
              type="button"
              disabled
              className="flex min-h-12 flex-1 cursor-not-allowed flex-col items-center justify-center rounded-full bg-(--sheet-ink) px-4 leading-tight font-semibold text-(--sheet-ink-inverse)"
            >
              {data.dock.own}
              <span className="text-xs font-medium">{data.dock.soon}</span>
            </button>
            <ShareButton variant="dock" label={data.share.label} />
          </div>
        </div>
      </article>
    </ShareProvider>
  );
}
