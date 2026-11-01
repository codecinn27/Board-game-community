import { Skeleton } from "@/components/ui/skeleton";

type ShelfSkeletonProps = {
  /** "Loading games", from the server translations. */
  label: string;
};

/**
 * The loading shape for both views: a count bar, the switch, and six cards
 * with the real card's footprint. It lays out in the page's flex row, beside
 * the `h1`, like the real content.
 */
export function ShelfSkeleton({ label }: ShelfSkeletonProps) {
  return (
    <>
      <Skeleton aria-hidden className="h-5 w-20 md:mr-auto" />
      <Skeleton
        aria-hidden
        className="h-13 w-full rounded-xl md:w-75 md:self-center"
      />
      <ul
        aria-busy="true"
        aria-label={label}
        className="grid w-full grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-6 md:gap-x-4 xl:grid-cols-10"
      >
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="flex flex-col gap-2">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </li>
        ))}
      </ul>
    </>
  );
}
