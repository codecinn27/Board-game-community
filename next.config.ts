import { networkInterfaces } from "node:os";
import { type NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Cover images come from the public `covers` bucket of the Supabase project.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// YC: need this cause Nextjs1 prevent the javascript chunks to be render in dev, therefore configure this in order to run the js, when mobile access to this ip that run this program in the same network
// Dev only: allow this machine's LAN IPv4 addresses (for phone testing on Wi-Fi).
// Read when the dev server starts, so a new IP is picked up after a restart.
const lanAddresses = Object.values(networkInterfaces())
  .flatMap((infos) => infos ?? [])
  .filter((info) => info.family === "IPv4" && !info.internal)
  .map((info) => info.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanAddresses,
  images: {
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: "https",
            hostname: new URL(supabaseUrl).hostname,
            pathname: "/storage/v1/object/public/covers/**",
          },
        ]
      : [],
  },
  cacheComponents: true,
  partialPrefetching: true,
  cacheLife: {
    // Spec 0009: the game reads. An edit made in the dashboard shows within
    // 5 minutes; writes made by the app clear the `games` tag at once.
    games: { stale: 300, revalidate: 300, expire: 3600 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default createNextIntlPlugin()(nextConfig);
