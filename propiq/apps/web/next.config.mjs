import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: false,
  },
  // Forward Propify API calls (from the static demo HTML and from server
  // components in this app) to the Express API. This keeps the demo's
  // hard-coded `/api/propify/*` URLs working unchanged.
  async rewrites() {
    return [
      {
        source: "/api/propify/:path*",
        destination: `${API_BASE}/api/propify/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
