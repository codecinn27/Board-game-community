import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.notFound");
  return { title: t("title"), robots: { index: false } };
}

export default async function NotFound() {
  const t = await getTranslations("common.notFound");

  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <h1 className="text-2xl font-semibold md:text-3xl">{t("title")}</h1>
      <p className="max-w-xl text-muted-foreground">{t("body")}</p>
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "default" }),
          "min-h-11 px-4 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        {t("home")}
      </Link>
    </div>
  );
}
