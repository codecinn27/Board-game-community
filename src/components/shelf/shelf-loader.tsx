import { getTranslations } from "next-intl/server";
import {
  getShelfData,
  parseShelfView,
  type ShelfData,
} from "@/lib/games/shelf";
import { ShelfContent } from "./shelf-content";
import { ShelfError } from "./shelf-error";

type ShelfLoaderProps = {
  /** Passed down unread: only this component, inside `Suspense`, awaits it. */
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function ShelfLoader({ searchParams }: ShelfLoaderProps) {
  const { view } = await searchParams;
  let data: ShelfData | null = null;
  try {
    data = await getShelfData();
  } catch {
    // Leave `data` null: the error block below handles it.
  }

  if (data === null) {
    const t = await getTranslations("shelf.error");
    return (
      <ShelfError title={t("title")} body={t("body")} retryLabel={t("retry")} />
    );
  }
  return <ShelfContent data={data} view={parseShelfView(view)} />;
}
