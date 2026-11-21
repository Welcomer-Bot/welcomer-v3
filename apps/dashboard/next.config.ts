import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
  cacheComponents: true,
  partialPrefetching: true,
  redirects() {
    return Promise.resolve([
      {
        source: "/servers/:serverId",
        destination: "/servers/:serverId/configurations",
        permanent: false,
      },
    ]);
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

export default nextConfig;
