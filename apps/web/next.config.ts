import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@warisly/ui", "@warisly/db", "@warisly/lib"],
  // typedRoutes disabled: the registry briefs use dynamic redirect()/<Link> targets
  // (e.g. `/aset/${id}`) which typedRoutes rejects at typecheck.
  async headers() {
    // The heir/trustee links carry a bearer token in the URL path. Suppress the
    // Referer header on those routes so the token can't leak to third parties
    // (analytics, outbound links, CDNs) via referrer.
    return [
      {
        source: "/(klaim|wali)/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
