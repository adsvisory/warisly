import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@warisly/ui", "@warisly/db", "@warisly/lib"],
};

export default nextConfig;