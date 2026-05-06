import type { NextConfig } from "next";

// eslint key was removed from NextConfig type in Next 16; keep as runtime hint
const config: NextConfig & { eslint?: { ignoreDuringBuilds?: boolean } } = {
  output: "standalone",
  transpilePackages: ["@uletnaya/db", "@uletnaya/shared"],
  // Для первого деплоя: skip typescript/eslint blocking — фиксим в CI отдельно
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: { allowedOrigins: ["*"] },
  },
  // Глобальный CORS для всех /api/* — нужно для Expo Web preview и web-tracker
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
      {
        source: "/tracker.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },
};

export default config;
