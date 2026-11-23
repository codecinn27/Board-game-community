import { formatDebug, type DebugInfo } from "@/lib/games/debug";

/**
 * Developer note under an Add error: which layer failed and why. It renders
 * only outside production (the server sends `debug` only there too).
 */
export function DebugNote({ info }: { info: DebugInfo | null | undefined }) {
  if (!info || process.env.NODE_ENV === "production") return null;
  return (
    <p
      data-debug
      className="rounded-md border border-dashed px-2 py-1 font-mono text-xs break-words text-muted-foreground"
    >
      {formatDebug(info)}
    </p>
  );
}
