import { Bookmark, Plus, Share, Star, Users, X } from "lucide-react";
import { type CSSProperties } from "react";
import { coverTheme } from "@/lib/design/cover-tint";

// A static mock of the game detail sheet in its Cover Tint theme (spec 0004,
// AC-12), for the `/design` page. Feature 9 builds the real sheet. Its colors
// come from data, so they reach the markup only as `--sheet-*` variables.

export type CoverTintSample = {
  name: string;
  /** The average color of the bottom of the cover, `#rrggbb`. */
  sampleHex: string;
  rating: string;
  owners: number;
  players: string;
  minutes: string;
  description: string;
};

export function CoverTintPreview({ sample }: { sample: CoverTintSample }) {
  const theme = coverTheme(sample.sampleHex);
  const vars = {
    "--sheet-sample": sample.sampleHex,
    "--sheet-tint": theme.tint,
    "--sheet-deep": theme.deep,
    "--sheet-ink": theme.ink,
    "--sheet-ink-muted": theme.inkMuted,
    "--sheet-ink-inverse": theme.inkInverse,
    "--sheet-line": theme.line,
    "--sheet-chip": theme.chip,
    "--sheet-card": theme.card,
    "--sheet-glass": theme.glass,
    "--sheet-dock": theme.dock,
  } as CSSProperties;

  const control =
    "outline-none focus-visible:ring-3 focus-visible:ring-(--sheet-ink) focus-visible:ring-offset-2 focus-visible:ring-offset-(--sheet-tint)";

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-center gap-2 text-sm text-muted-foreground">
        <span
          aria-hidden
          className="size-4 shrink-0 rounded border bg-(--sheet-sample)"
          style={vars}
        />
        <span className="font-mono text-xs">
          {sample.sampleHex} → {theme.tint}, ink {theme.ink}
        </span>
      </figcaption>

      <div
        style={vars}
        className="relative flex h-160 w-full max-w-96 flex-col overflow-hidden rounded-[32px] bg-linear-to-b from-(--sheet-tint) from-55% to-(--sheet-deep) text-(--sheet-ink)"
      >
        {/* Cover placeholder in the sampled color, then the fade */}
        <div className="relative h-60 shrink-0 bg-(--sheet-sample)">
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-8xl font-bold text-(--sheet-ink) opacity-25"
          >
            {sample.name.charAt(0)}
          </span>
          {/* Solid tint from 70% down, so the title never sits on raw art */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-b from-(--sheet-tint)/0 to-(--sheet-tint) to-70%" />
          <div className="absolute inset-x-4 top-4 flex justify-between">
            <button
              type="button"
              aria-label="Close"
              className={`flex size-11 items-center justify-center rounded-full border border-(--sheet-line) bg-(--sheet-glass) backdrop-blur-md ${control}`}
            >
              <X className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Share"
              className={`flex size-11 items-center justify-center rounded-full border border-(--sheet-line) bg-(--sheet-glass) backdrop-blur-md ${control}`}
            >
              <Share className="size-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="-mt-8 flex flex-col gap-4 px-5">
          <div className="relative flex flex-col items-center gap-2.5">
            <p className="line-clamp-2 text-center text-3xl leading-tight font-bold tracking-tight">
              {sample.name}
            </p>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-7.5 items-center gap-1.5 rounded-full bg-(--sheet-chip) px-2.5">
                <Star className="size-3.5 fill-current" aria-hidden />
                <span className="tabular-nums">{sample.rating}</span> rating
              </span>
              <span className="inline-flex h-7.5 items-center gap-1.5 rounded-full bg-(--sheet-chip) px-2.5">
                <Users className="size-3.5" aria-hidden />
                <span className="tabular-nums">{sample.owners}</span>
                {sample.owners === 1 ? " owner" : " owners"}
              </span>
            </div>
          </div>

          <dl className="grid grid-cols-3 rounded-[22px] border border-(--sheet-line) bg-(--sheet-card) py-3.5">
            {[
              ["Players", sample.players],
              ["Minutes", sample.minutes],
              ["Owners", String(sample.owners)],
            ].map(([label, value], i) => (
              <div
                key={label}
                className={`flex flex-col-reverse items-center gap-0.5 ${i > 0 ? "border-l border-(--sheet-line)" : ""}`}
              >
                <dd className="text-2xl font-bold whitespace-nowrap tabular-nums">
                  {value}
                </dd>
                <dt className="text-xs font-semibold tracking-wide text-(--sheet-ink-muted) uppercase">
                  {label}
                </dt>
              </div>
            ))}
          </dl>

          <div className="flex flex-col items-start">
            <p className="line-clamp-3">{sample.description}</p>
            <button
              type="button"
              className={`min-h-11 rounded-sm font-bold underline underline-offset-4 ${control}`}
            >
              More
            </button>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-(--sheet-line) bg-(--sheet-dock) p-1.5 shadow-lg backdrop-blur-lg">
          <button
            type="button"
            className={`inline-flex h-12 items-center gap-2 rounded-full bg-(--sheet-ink) px-5 font-bold whitespace-nowrap text-(--sheet-ink-inverse) ${control}`}
          >
            <Plus className="size-4.5" aria-hidden />I own this
          </button>
          <button
            type="button"
            aria-label="Add to a list"
            className={`flex size-12 items-center justify-center rounded-full ${control}`}
          >
            <Bookmark className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </figure>
  );
}
