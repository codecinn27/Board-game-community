import { type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/** The narrow column every auth page sits in (design.md: forms `max-w-xl`). */
export function AuthColumn({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-2 md:py-6">
      {children}
    </div>
  );
}

export function AuthHeading({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
      {body ? <p className="text-muted-foreground">{body}</p> : null}
    </div>
  );
}

/** Shaped like a heading and a form while the page reads the session. */
export function AuthSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="flex flex-col gap-6">
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}
