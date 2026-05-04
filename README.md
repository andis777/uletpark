# Улётная Mobile Platform

Монорепо: backend + mobile (Expo) + admin + своя аналитика, для airport-parking сервиса
[uletnayaparkovka.ru](https://uletnayaparkovka.ru).

**Self-hosted:** Docker + GitHub Actions + nginx + Postgres на собственном VPS.

```
mobile-platform/
├── apps/
│   ├── api/          ← Next.js 16 standalone — API + Admin (Docker container)
│   └── mobile/       ← Expo SDK 53 (iOS + Android, релиз через EAS)
├── packages/
│   ├── db/           ← Drizzle schema + клиент Postgres + миграции
│   └── shared/       ← Общие TS-типы для всех приложений
├── deploy/
│   ├── nginx/        ← TLS termination + rate limit + gzip
│   ├── postgres/     ← init.sql (extensions)
│   └── scripts/      ← setup-server.sh, cron-jobs.sh, crontab
├── .github/workflows/
│   ├── deploy.yml    ← build → migrate → SSH deploy при push в main
│   └── ci.yml        ← lint + typecheck + test docker build на PR
├── Dockerfile, docker-compose.yml, docker-compose.dev.yml
└── docs/             ← 10 файлов с документацией всех фаз и amoCRM-интеграции
```

## Локальный dev

```bash
# 1. Postgres в Docker
docker compose -f docker-compose.dev.yml up -d

# 2. Зависимости
corepack enable
pnpm install

# 3. Окружение
cp .env.example .env
# DATABASE_URL=postgres://uletnaya:dev@localhost:5432/uletnaya

# 4. Миграции и seed
pnpm db:migrate
pnpm db:seed:loyalty
pnpm db:seed:admin
pnpm db:migrate:analytics

# 5. API
pnpm dev:api          # → http://localhost:3000

# 6. Mobile (в другом терминале)
pnpm dev:mobile       # → Expo Dev Tools, iOS Simulator / Expo Go
```

## STUB режим (без боевых ключей)

- `AMOCRM_*` пустые → `lib/amocrm.ts` отдаёт мок-данные
- `SMSRU_API_ID=stub` → OTP пишется в логи API: `📱 [SMS STUB] → +79991234567: код 482917`
- В DEV `request-otp` отдаёт код в response как `devCode`

## Production deploy

См. **[docs/10-self-hosted-deploy.md](./docs/10-self-hosted-deploy.md)** — полный путь от чистого VPS до боевого `api.uletnayaparkovka.ru`.

Краткий путь:
```bash
# На сервере
git clone REPO /opt/uletnaya
cd /opt/uletnaya
bash deploy/scripts/setup-server.sh
sudo certbot certonly --standalone -d api.uletnayaparkovka.ru ...
cp .env.production.example .env.production && nano .env.production
docker compose up -d
```

Дальше — `git push` в main → GitHub Actions сам соберёт образ, накатит миграции и перезапустит контейнер на сервере.

## Тех-стек

| Слой | Что |
|---|---|
| Mobile | Expo SDK 53 + Expo Router 4 + TanStack Query 5 + Secure Store |
| Backend | Next.js 16 App Router (standalone) + Route Handlers |
| DB | Postgres 16 в Docker + Drizzle ORM 0.36 |
| Auth (mobile) | SMS OTP + JWT (jose) |
| Auth (admin) | Email/password + httpOnly cookie session |
| amoCRM | OAuth2 + REST + Webhooks + полный sync |
| SMS | SMS.ru API |
| Push | Expo Push API |
| Аналитика | tracker.js + mobile SDK + Postgres events + materialized views |
| Hosting | Self-hosted VPS (РФ) + Docker + nginx + Let's Encrypt |
| CI/CD | GitHub Actions → ghcr.io → SSH deploy |
| Мониторинг | Sentry + UptimeRobot + Telegram-уведомления |

## Документация

| Файл | Что |
|---|---|
| `02-api-contract.md` | Полный API contract с примерами curl |
| `03-mobile-mockups.html` | 6 экранов mobile в HTML (открыть в браузере) |
| `04-amocrm-discovery.md` | Как получить OAuth-токены и карту custom fields |
| `05-phase-2-loyalty.md` | Лояльность: engine, redeem, рефералы, sync с amoCRM |
| `06-phase-3-admin.md` | Admin Panel: dashboard, заказы, клиенты, аналитика |
| `07-phase-4-analytics.md` | Своя метрика: tracker.js, mobile SDK, cron, voronka |
| `08-phase-5-release.md` | Sentry, rate limit, EAS, store assets, hardening |
| `09-amocrm-live-sync.md` | Live sync: backfill, авто-привязка, admin /sync UI |
| **`10-self-hosted-deploy.md`** | **Self-hosted: Docker + GitHub Actions + nginx (актуально)** |

## Ближайшие шаги

🔴 **Получить OAuth-токены amoCRM** (см. `04-amocrm-discovery.md`):
1. Сменить пароль в `vsteh.amocrm.ru` (засветился в чате)
2. Создать интеграцию → `client_id` / `client_secret` / `auth_code`
3. Обменять `auth_code → refresh_token`
4. Прислать через защищённый канал (не в чат)

🔴 **Подготовить VPS:**
1. Селектел / Yandex Cloud / Timeweb (РФ для 152-ФЗ)
2. Ubuntu 22.04+, 4 GB RAM, 40 GB SSD
3. DNS A-запись `api.uletnayaparkovka.ru → IP`
4. SSH-ключ + `bash deploy/scripts/setup-server.sh`

🟡 **Apple Developer аккаунт** ($99/год, верификация 7-14 дней) — для релиза iOS app
🟡 **Sentry org** (free tier 5k events/мес)
🟡 **SMS.ru** аккаунт (или другой провайдер) — для боевого OTP

После всего этого: deploy за 1 день, тестовый flow за 1 день, публичный релиз за неделю.
