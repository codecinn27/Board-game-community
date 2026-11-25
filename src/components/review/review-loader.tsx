import { notFound } from "next/navigation";
import {
  getFormatter,
  getLocale,
  getMessages,
  getTranslations,
} from "next-intl/server";
import { CoverTile } from "@/components/games/cover-tile";
import { LocalTime } from "@/components/time/local-time";
import { IntlClientProvider } from "@/i18n/intl-client-provider";
import { Link } from "@/i18n/navigation";
import { getViewer } from "@/lib/auth/viewer";
import { formatRange } from "@/lib/games/detail";
import { localized } from "@/lib/games/localized";
import { type EditorLists } from "@/lib/games/edit-game";
import {
  getEditorLists,
  getReviewQueue,
  type ReviewQueue,
  type ReviewRow,
} from "@/lib/games/review";
import {
  parseReviewShown,
  parseReviewTab,
  REVIEW_PAGE_SIZE,
  type ReviewTab,
} from "@/lib/games/review-params";
import { cn } from "@/lib/utils";
import { EditableRow } from "./editable-row";
import { ReviewButton } from "./review-button";

type ReviewLoaderProps = {
  /** Passed down unread: only this component, inside `Suspense`, awaits it. */
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * The Review page body (spec 0013, AC-13 and AC-14). Anyone who is not an
 * active admin gets the not found page. Never cached: it must be live.
 */
export async function ReviewLoader({ searchParams }: ReviewLoaderProps) {
  const viewer = await getViewer();
  if (
    viewer.kind !== "member" ||
    viewer.role !== "admin" ||
    viewer.status !== "active"
  ) {
    notFound();
  }

  const params = await searchParams;
  const tab = parseReviewTab(params.tab);
  const shown = parseReviewShown(params.shown);
  const [t, messages] = await Promise.all([
    getTranslations("review"),
    getMessages(),
  ]);

  let queue: ReviewQueue | null = null;
  // The editor's choices are only needed on the To review tab.
  let lists: EditorLists = {
    feels: [],
    themes: [],
    mechanics: [],
    members: [],
  };
  try {
    [queue, lists] = await Promise.all([
      getReviewQueue(tab, shown),
      tab === "todo" ? getEditorLists() : Promise.resolve(lists),
    ]);
  } catch (error) {
    console.error("getReviewQueue failed", error);
  }

  return (
    <>
      <nav aria-label={t("tabs.label")} className="flex gap-2">
        {(["todo", "done"] as const).map((key) => (
          <Link
            key={key}
            href={key === "todo" ? "/admin/review" : "/admin/review?tab=done"}
            aria-current={key === tab ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium",
              key === tab
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted",
            )}
          >
            {t(`tabs.${key}`)}
          </Link>
        ))}
      </nav>

      {queue === null ? (
        <p role="alert" className="text-destructive">
          {t("error")}
        </p>
      ) : queue.rows.length === 0 ? (
        <p className="text-muted-foreground">{t(`empty.${tab}`)}</p>
      ) : (
        <>
          {/* Only the editor and the range sliders need strings in the browser. */}
          <IntlClientProvider
            messages={{
              // `LocalTime` sits inside the rows and needs its own strings.
              common: { time: messages.common.time },
              addGame: {
                form: {
                  range: messages.addGame.form.range,
                  cover: messages.addGame.form.cover,
                },
              },
              review: { editor: messages.review.editor },
            }}
          >
            <ul className="flex flex-col divide-y">
              {queue.rows.map((row) => (
                <ReviewItem key={row.id} row={row} tab={tab} lists={lists} />
              ))}
            </ul>
          </IntlClientProvider>
          {queue.total > queue.rows.length ? (
            <Link
              scroll={false}
              href={{
                pathname: "/admin/review",
                query: {
                  ...(tab === "done" ? { tab } : {}),
                  shown: String(shown + REVIEW_PAGE_SIZE),
                },
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-lg border px-4 font-medium hover:bg-muted"
            >
              {t("showMore")}
            </Link>
          ) : null}
        </>
      )}
    </>
  );
}

async function ReviewItem({
  row,
  tab,
  lists,
}: {
  row: ReviewRow;
  tab: ReviewTab;
  lists: EditorLists;
}) {
  const [t, format, locale] = await Promise.all([
    getTranslations("review.row"),
    getFormatter(),
    getLocale(),
  ]);
  // The Chinese text shows on /zh when it exists (spec 0013, AC-24).
  const shownName = localized(row.name, row.nameZh, locale);
  const shownDescription = localized(
    row.description,
    row.descriptionZh,
    locale,
  );

  function range(min: number | null, max: number | null): string {
    const value = formatRange(min, max);
    if (value.kind === "unknown") return t("unknown");
    if (value.kind === "single") return format.number(value.value);
    return `${format.number(value.min)}–${format.number(value.max)}`;
  }

  const cover = (
    <CoverTile
      name={shownName}
      tint={row.coverTint}
      path={row.coverPath}
      className="size-20 shrink-0 rounded-lg"
    />
  );
  const facts = (
    <>
      <p className="text-sm text-muted-foreground">
        {t("players")}: {range(row.playersMin, row.playersMax)} · {t("minutes")}
        : {range(row.playTimeMin, row.playTimeMax)}
      </p>
      <p className="text-sm text-muted-foreground">
        {t("addedBy", { name: row.addedBy ?? t("unknownMember") })} ·{" "}
        <LocalTime value={row.createdAt} />
      </p>
      {tab === "done" && row.reviewedAt !== null ? (
        <p className="text-sm text-muted-foreground">
          {t("reviewedBy", { name: row.reviewedBy ?? t("setAtImport") })} ·{" "}
          <LocalTime value={row.reviewedAt} />
        </p>
      ) : null}
    </>
  );
  const button = (
    <ReviewButton
      gameId={row.id}
      mode={tab === "todo" ? "done" : "undo"}
      label={tab === "todo" ? t("looksRight") : t("notReviewed")}
      errorLabel={t("actionError")}
    />
  );

  // To review: the cover, name, and description open the editor (AC-16).
  if (tab === "todo") {
    return (
      <EditableRow
        game={{
          id: row.id,
          name: row.name,
          nameZh: row.nameZh,
          description: row.description,
          descriptionZh: row.descriptionZh,
          playersMin: row.playersMin,
          playersMax: row.playersMax,
          playTimeMin: row.playTimeMin,
          playTimeMax: row.playTimeMax,
          coverPath: row.coverPath,
          coverTint: row.coverTint,
          feelIds: row.feelIds,
          themeIds: row.themeIds,
          mechanicIds: row.mechanicIds,
          owners: row.owners,
        }}
        lists={lists}
        displayName={shownName}
        displayDescription={shownDescription}
        cover={cover}
        meta={facts}
        actions={button}
      />
    );
  }

  // Reviewed: no editor; the name keeps its link to the game page.
  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex gap-3">
        {cover}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Link
            href={`/games/${row.id}`}
            className="font-semibold underline-offset-4 hover:underline"
          >
            {shownName}
          </Link>
          {facts}
        </div>
      </div>
      {shownDescription === null ? null : (
        <p className="line-clamp-3 text-sm break-words">{shownDescription}</p>
      )}
      {button}
    </li>
  );
}
