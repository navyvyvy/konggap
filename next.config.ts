import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "1";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  ...(isGitHubPages ? {
    output: "export",
    basePath: "/konggap",
    assetPrefix: "/konggap/",
    trailingSlash: true,
    images: { unoptimized: true },
  } : {}),
};

export default nextConfig;
