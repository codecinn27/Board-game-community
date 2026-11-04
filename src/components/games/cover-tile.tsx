import { Dices } from "lucide-react";
import Image from "next/image";
import { coverTheme } from "@/lib/design/cover-tint";
import { coverInitial } from "@/lib/games/cover-initial";
import { coverUrl } from "@/lib/games/cover-url";
import { cn } from "@/lib/utils";

type CoverTileProps = {
  name: string;
  /** `#rrggbb` sampled from the cover; null uses the neutral tile. */
  tint: string | null;
  /** File name in the `covers` bucket; null keeps the tint tile. */
  path?: string | null;
  /** Sets the size and radius; the icon and letter scale with the tile. */
  className?: string;
};

/**
 * A game's cover: its image from the `covers` bucket when it has one, else the
 * stand in: calmed tint, dice icon, and the first character of the name (spec
 * 0006, AC-6). Decorative: the link around it carries the name.
 */
export function CoverTile({ name, tint, path, className }: CoverTileProps) {
  const url = coverUrl(path);
  const theme = tint === null ? null : coverTheme(tint);

  return (
    <div
      aria-hidden
      className={cn(
        "@container relative aspect-square overflow-hidden",
        theme === null && "bg-muted text-foreground",
        className,
      )}
      style={
        theme === null
          ? undefined
          : { backgroundColor: theme.tint, color: theme.ink }
      }
    >
      {url === null ? (
        <>
          <Dices className="absolute top-[10cqw] left-[10cqw] size-[20cqw] opacity-70" />
          <span className="absolute inset-0 flex items-center justify-center text-[length:46cqw] leading-none font-bold">
            {coverInitial(name)}
          </span>
        </>
      ) : (
        <Image
          src={url}
          alt=""
          fill
          sizes="(min-width: 768px) 480px, 100vw"
          className="object-cover"
        />
      )}
    </div>
  );
}
