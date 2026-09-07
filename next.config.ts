import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root explicitly — otherwise Next.js's root inference
  // picks up a stray package-lock.json in the home directory (this repo
  // lives under ~/Desktop/cryptic-dragon-ecommerce/storefront) and warns.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
