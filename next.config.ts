import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
