// Pass the value in, not the name: Next only inlines NEXT_PUBLIC_ vars it can
// see written out as process.env.NAME in the source.
export function requireEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/**
 * The site's base URL. `NEXT_PUBLIC_SITE_URL` wins; on a Vercel preview build
 * that has no value for it, the preview's own address is used so the build
 * does not fail (spec 0001). Production never falls back: it must be set.
 */
export function siteBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const previewHost =
    process.env.VERCEL_ENV === "preview" ? process.env.VERCEL_URL : undefined;
  return requireEnv(
    configured || (previewHost ? `https://${previewHost}` : undefined),
    "NEXT_PUBLIC_SITE_URL",
  );
}
