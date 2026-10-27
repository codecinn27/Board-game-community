// Pass the value in, not the name: Next only inlines NEXT_PUBLIC_ vars it can
// see written out as process.env.NAME in the source.
export function requireEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}
