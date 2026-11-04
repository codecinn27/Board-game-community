import { type NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Cover images come from the public `covers` bucket of the Supabase project.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
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
