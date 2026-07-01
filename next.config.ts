import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "1";
const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  ...(isStaticExport ? {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
  } : {}),
  ...(isGitHubPages ? {
    basePath: "/konggap",
    assetPrefix: "/konggap/",
  } : {}),
};

export default nextConfig;
