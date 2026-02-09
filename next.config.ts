import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["@pdftron/pdfnet-node", "@napi-rs/canvas", "sharp", "canvas", "pdfjs-dist"],
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
