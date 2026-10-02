import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Plan import reads PDFs and Word files on the server
  serverExternalPackages: ["unpdf", "mammoth"],
  experimental: {
    // Photos (compressed client-side) and pasted plans go through server actions
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default withNextIntl(nextConfig);
