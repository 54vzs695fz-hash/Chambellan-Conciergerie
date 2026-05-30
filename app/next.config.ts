import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/clients/new",
        destination: "/clients/create",
        permanent: true,
      },
    ];
  },
  serverExternalPackages: [
    "better-sqlite3",
    "puppeteer",
    "puppeteer-core",
    "@sparticuz/chromium",
  ],
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
