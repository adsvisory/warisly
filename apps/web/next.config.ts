import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@warisly/ui", "@warisly/db", "@warisly/lib"],
  // typedRoutes disabled: the registry briefs use dynamic redirect()/<Link> targets
  // (e.g. `/aset/${id}`) which typedRoutes rejects at typecheck.
};

export default withNextIntl(nextConfig);
