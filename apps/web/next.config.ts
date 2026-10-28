import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@adspaces/shared", "@adspaces/db"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default config;
