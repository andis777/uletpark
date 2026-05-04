import type { NextConfig } from "next";

const config: NextConfig = {
  // Standalone build → минимальный production output для Docker
  // .next/standalone содержит весь сервер с минимальным набором node_modules
  output: "standalone",

  // Транспилируем workspace-пакеты
  transpilePackages: ["@uletnaya/db", "@uletnaya/shared"],

  experimental: {
    serverActions: { allowedOrigins: ["*"] },
  },
};

export default config;
