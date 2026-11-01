import { getFormatter, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { type HomeGame } from "@/lib/games/home";
import { cn } from "@/lib/utils";
import { CoverTile } from "./cover-tile";

type HomeHeroProps = {
  gameCount: number;
  memberCount: number;
  /** The newest games, for the decorative mosaic from `lg`. */
  mosaic: HomeGame[];
};

export async function HomeHero({
  gameCount,
  memberCount,
  mosaic,
}: HomeHeroProps) {
  const [t, format] = await Promise.all([
    getTranslations("home.hero"),
    getFormatter(),
  ]);
  const hasGames = gameCount > 0;

  return (
    <section>
      <Card className="rounded-2xl bg-secondary text-secondary-foreground [--card-spacing:--spacing(5)] lg:[--card-spacing:--spacing(10)]">
        <CardContent className="grid items-center gap-8 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-4">
            <h1 className="flex flex-col gap-1">
              {hasGames ? (
                <>
                  <span className="text-5xl leading-none font-bold text-primary tabular-nums lg:text-8xl">
                    {format.number(gameCount)}
                  </span>
                  <span className="text-xl font-semibold lg:text-3xl">
                    {t("label", { count: gameCount })}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-semibold lg:text-3xl">
                  {t("empty")}
                </span>
              )}
            </h1>
            {hasGames ? (
              <div className="flex flex-col gap-1">
                {memberCount > 0 ? (
                  <p>{t("members", { count: memberCount })}</p>
                ) : null}
                <p className="text-secondary-foreground/80">{t("tagline")}</p>
              </div>
            ) : null}
            <Link
              href="/shelf"
              className={cn(
                buttonVariants({ variant: "default" }),
                "h-12 w-full px-6 text-base focus-visible:ring-offset-2 focus-visible:ring-offset-background md:w-auto",
              )}
            >
              {t("browse")}
            </Link>
          </div>

          {hasGames ? (
            <div
              aria-hidden
              data-testid="mosaic"
              className="hidden grid-cols-3 gap-3 lg:grid"
            >
              {mosaic.map((game) => (
                <CoverTile
                  key={game.id}
                  name={game.name}
                  tint={game.coverTint}
                  className="rounded-xl shadow-sm"
                />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
