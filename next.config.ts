import { type NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
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
