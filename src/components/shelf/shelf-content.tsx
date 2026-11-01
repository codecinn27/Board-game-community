import { useTranslations } from "next-intl";
import { type ShelfData, type ShelfView } from "@/lib/games/shelf";
import { ByOwnerPlaceholder } from "./by-owner-placeholder";
import { ShelfEmpty } from "./shelf-empty";
import { ShelfGrid } from "./shelf-grid";
import { ShelfSwitch } from "./shelf-switch";

type ShelfContentProps = {
  data: ShelfData;
  view: ShelfView;
};

/** Everything under the `h1`: the count, the switch, and one view. */
export function ShelfContent({ data, view }: ShelfContentProps) {
  const t = useTranslations("shelf");

  if (data.games.length === 0) {
    return <ShelfEmpty title={t("empty.title")} body={t("empty.body")} />;
  }

  return (
    <>
      <p className="text-sm text-muted-foreground md:mr-auto md:text-[15px]">
        {t("count", { count: data.games.length })}
      </p>
      <ShelfSwitch view={view} />
      {view === "owner" ? (
        <ByOwnerPlaceholder />
      ) : (
        <ShelfGrid games={data.games} />
      )}
    </>
  );
}
