import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Match the file vault's 50 MB upload cap (default Server Action limit is 1 MB).
  // In Next 15.5 this still lives under experimental.
  experimental: {
    serverActions: {
      bodySizeLimit: "52mb",
    },
  },
};

export default nextConfig;
