import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "better-sqlite3",
    "puppeteer",
    "puppeteer-core",
    "@sparticuz/chromium",
  ],
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
