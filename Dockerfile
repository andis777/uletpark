# =========================================================================
# Multi-stage Dockerfile для @uletnaya/api (Next.js 16 standalone)
# Сборка: docker build -t uletnaya/api:latest .
# Запуск: docker run -p 3000:3000 --env-file .env uletnaya/api:latest
# =========================================================================

# ---------- 1. deps: только установка зависимостей (кэшируется лучше) -----
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Включаем pnpm через corepack
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Копируем манифесты для кэшируемого install
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/

# Прод-зависимости (включая dev для сборки)
RUN pnpm install --frozen-lockfile

# ---------- 2. builder: компиляция Next.js ---------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Копируем исходники
COPY . .

# Билд — только api
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @uletnaya/api build

# ---------- 3. runner: минимальный production image -----------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Копируем standalone output (включает минимальный сервер + dependency tree)
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/.next/static ./apps/api/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/public ./apps/api/public

# Drizzle migrations (для запуска при старте контейнера)
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/drizzle ./packages/db/drizzle
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/schema.ts ./packages/db/schema.ts

USER nextjs
EXPOSE 3000

# Healthcheck для compose / k8s
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "apps/api/server.js"]
