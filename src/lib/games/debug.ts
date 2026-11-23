// Debug trail for the Add flow, so a failure says which layer broke: the
// browser (frontend), the Server Action (backend), or Postgres and Storage
// (database). Always logged; only shown to the developer outside production.

export type DebugLayer = "frontend" | "backend" | "database";

export type DebugInfo = {
  layer: DebugLayer;
  /** The step that failed, such as `rpc add_game` or `storage upload`. */
  stage: string;
  code?: string;
  message?: string;
  hint?: string;
};

type ErrorLike = {
  code?: unknown;
  message?: unknown;
  hint?: unknown;
  details?: unknown;
};

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value !== "" ? value : undefined;

/** The one line every Add failure logs: `[add-game][database] rpc add_game ...`. */
export function describeFailure(
  layer: DebugLayer,
  stage: string,
  error?: unknown,
): DebugInfo {
  const source: ErrorLike =
    typeof error === "object" && error !== null ? (error as ErrorLike) : {};
  const info: DebugInfo = { layer, stage };
  const code = text(source.code);
  const message =
    text(source.message) ?? (typeof error === "string" ? error : undefined);
  const hint = text(source.hint) ?? text(source.details);
  if (code !== undefined) info.code = code;
  if (message !== undefined) info.message = message;
  if (hint !== undefined) info.hint = hint;
  return info;
}

export function formatDebug(info: DebugInfo): string {
  const parts = [`[add-game][${info.layer}] ${info.stage}`];
  if (info.code) parts.push(`code=${info.code}`);
  if (info.message) parts.push(`message=${info.message}`);
  if (info.hint) parts.push(`hint=${info.hint}`);
  return parts.join(" ");
}

/**
 * Logs a failure and returns what the screen may show. In production nothing
 * is returned, so a visitor never sees database messages.
 */
export function logFailure(
  layer: DebugLayer,
  stage: string,
  error?: unknown,
): DebugInfo | undefined {
  const info = describeFailure(layer, stage, error);
  console.error(formatDebug(info), error instanceof Error ? error : "");
  return process.env.NODE_ENV === "production" ? undefined : info;
}
