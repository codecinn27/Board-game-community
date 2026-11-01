import { Skeleton } from "@/components/ui/skeleton";

type SheetSkeletonProps = {
  /** "Loading game", from the server translations. */
  label: string;
};

/** The loading shape: same frame as the sheet, so nothing jumps when it fills. */
export function SheetSkeleton({ label }: SheetSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      role="status"
      className="flex flex-col bg-background"
    >
      <Skeleton className="h-[52dvh] max-h-[30rem] shrink-0 rounded-none" />
      <div className="flex flex-col gap-6 px-5 pt-4 pb-6">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-9 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-22 w-full rounded-[22px]" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        <Skeleton className="h-14 w-full rounded-full" />
      </div>
    </div>
  );
}
