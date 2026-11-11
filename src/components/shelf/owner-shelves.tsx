import { useTranslations } from "next-intl";
import { SheetLink } from "@/components/game-sheet/sheet-link";
import { CoverTile } from "@/components/games/cover-tile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { coverInitial } from "@/lib/games/cover-initial";
import { type OwnerShelf } from "@/lib/games/shelf";
import { cn } from "@/lib/utils";
import { OwnerFilter } from "./owner-filter";

type OwnerShelvesProps = {
  owners: OwnerShelf[];
};

const focusRing =
  "outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// Full class names, so Tailwind can see them (it cannot build a class at runtime).
const avatarColors = [
  "bg-cover-1",
  "bg-cover-2",
  "bg-cover-3",
  "bg-cover-4",
  "bg-cover-5",
  "bg-cover-6",
] as const;

/** The avatar color of a member: sum of the id's character codes, modulo 6 (spec 0007, AC-14). */
export function avatarColor(memberId: string): string {
  let sum = 0;
  for (const char of memberId) sum += char.codePointAt(0) ?? 0;
  return avatarColors[sum % avatarColors.length] ?? "bg-cover-1";
}

/** The By owner view: a filter, then one section per member (spec 0007, 0012). */
export function OwnerShelves({ owners }: OwnerShelvesProps) {
  const t = useTranslations("shelf.byOwner");

  return (
    <OwnerFilter
      labels={{
        label: t("filter.label"),
        placeholder: t("filter.placeholder"),
        clear: t("filter.clear"),
        empty: t("filter.empty"),
        remove: t("filter.remove", { name: "{name}" }),
      }}
      items={owners.map((owner) => ({
        memberId: owner.memberId,
        name: owner.name,
        section: (
          <OwnerSection
            owner={owner}
            count={t("count", { count: owner.games.length })}
          />
        ),
      }))}
    />
  );
}

/** One member: avatar, name, game count, and a row of covers that scrolls inside itself. */
function OwnerSection({ owner, count }: { owner: OwnerShelf; count: string }) {
  const headingId = `owner-${owner.memberId}`;

  return (
    <section
      key={owner.memberId}
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full font-semibold text-foreground",
            avatarColor(owner.memberId),
          )}
        >
          {coverInitial(owner.name)}
        </span>
        <h2 id={headingId} className="text-lg font-semibold">
          {owner.name}
        </h2>
        <p className="text-sm text-muted-foreground">{count}</p>
      </div>

      <ScrollArea className="-mx-(--page-gutter) md:mx-0">
        <ul className="flex w-max gap-2.5 px-(--page-gutter) pb-2 md:gap-3.5 md:px-0">
          {owner.games.map((game) => (
            <li key={game.id} className="w-24 shrink-0 md:w-30">
              <SheetLink
                card={{
                  id: game.id,
                  name: game.name,
                  coverTint: game.coverTint,
                  coverPath: game.coverPath,
                  ownerCount: null,
                  avgRecommendation: null,
                }}
                className={cn("flex flex-col gap-2 rounded-xl", focusRing)}
              >
                <CoverTile
                  name={game.name}
                  tint={game.coverTint}
                  path={game.coverPath}
                  className="w-full rounded-xl"
                />
                <span className="line-clamp-2 text-sm leading-5 font-semibold">
                  {game.name}
                </span>
              </SheetLink>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </section>
  );
}
