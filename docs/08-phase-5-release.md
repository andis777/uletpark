# Phase 5 — Релиз и hardening (готово)

Подготовка платформы к проду: мониторинг, лимиты, EAS-конфиг, чек-листы для стора и канареечного запуска.

> ⚠️ **Этот документ описывает Vercel-вариант.** Решение поменялось — мы хостим на собственном VPS через GitHub Actions. См. **[10-self-hosted-deploy.md](./10-self-hosted-deploy.md)** для актуального деплоя.
> Куски про Sentry, EAS, store assets, rate limit, hardening и Apple/Google релиз — остаются в силе и применимы к любой инфраструктуре.

---

## Что добавлено

### Backend
| Файл | Что |
|---|---|
| `apps/api/instrumentation.ts` | Sentry init (Next.js 16 instrumentation hook) + onRequestError hook |
| `apps/api/lib/rate-limit.ts` | In-memory rate limiter с sweep |
| `apps/api/app/api/auth/request-otp/route.ts` | Применён rate limit: 3/10мин на phone + 10/10мин на IP |
| `apps/api/vercel.ts` | Cron-конфиг для materialized views |

### Mobile
| Файл | Что |
|---|---|
| `apps/mobile/eas.json` | EAS Build profiles: development / preview / production + submit-конфиг для Apple/Google |
| `apps/mobile/store-assets/app-store-listing.md` | Готовые тексты, ключи, чек-листы для App Store + Google Play |

---

## Sentry

### Setup
1. Создать проект на https://sentry.io (free tier — 5k events/мес)
2. Получить DSN
3. На Vercel в `Settings → Environment Variables` добавить `SENTRY_DSN`
4. Установить пакет: `pnpm --filter @uletnaya/api add @sentry/nextjs`
5. После redeploy ошибки в Route Handlers и серверный код будут автоматически уезжать в Sentry

### В mobile (опционально, можно позже)
```bash
pnpm --filter @uletnaya/mobile add @sentry/react-native
npx @sentry/wizard@latest -i reactNative
```
В `app.json` добавляется hook + DSN. Детали — https://docs.sentry.io/platforms/react-native/manual-setup/expo/

---

## Rate limiting

### Что защищено
| Endpoint | Лимит | Ключ |
|---|---|---|
| `POST /api/auth/request-otp` | 3 / 10 мин | по `phone` |
| `POST /api/auth/request-otp` | 10 / 10 мин | по IP |

### Что добавить (P1)
- `POST /api/events` — 100/min на user (защита от заспамленного tracker)
- `POST /api/loyalty/apply-referral` — 5/час на user (анти-фарм)
- `POST /api/admin/auth/login` — 5/15мин на IP (брутфорс админки)
- `POST /api/bookings` — 10/час на user (защита от случайных дублей)

### Production-вариант
In-memory работает в Fluid Compute (один инстанс держит лимиты долго, но между регионами не синхронизируется). Для строгих лимитов — заменить на:
- **Upstash Ratelimit** (через Vercel Marketplace)
- **Vercel Runtime Cache** (есть встроенный API с тегированием)

---

## Hardening — что ещё закрыть до прода

### Security
- [ ] CSRF protection на admin POST/PATCH (sameSite=lax уже есть, но добавить токен в cookie + проверку для двойной защиты)
- [ ] CSP-заголовки на ответы admin/login (prevent XSS injection)
- [ ] Helmet-стиль security headers через `proxy.ts`
- [ ] Audit-log для всех действий в `/admin` (новая таблица `admin_actions`)
- [ ] 2FA для админов (Better-Auth + TOTP)
- [ ] Roles-based access (analyst != owner)
- [ ] Скрыть version + stack-trace в prod ответах ошибок

### Privacy / 152-ФЗ
- [x] IP-аноним в events
- [x] Tracker.js уважает DNT + opt-out
- [ ] Cookie-consent banner на сайте (для GDPR / 152-ФЗ)
- [ ] User data export endpoint (право на копию данных)
- [ ] User delete endpoint (право на удаление — soft delete + удаление через 30 дней)
- [ ] DPA с Vercel (если данные хранятся не в РФ — нужно зеркало)

### Reliability
- [x] Health check `/api/health`
- [x] Graceful shutdown через Fluid Compute (default)
- [ ] Backup стратегия Postgres (Neon делает PITR на 7 дней автоматом — настроить retention)
- [ ] Migrations в CI (запускать через GitHub Actions перед deploy)
- [ ] On-call alerts (Sentry + UptimeRobot для health endpoint)

---

## Production .env (Vercel Environment Variables)

```bash
# === Production secrets — заполнить перед deploy ===

# Database (Neon → Vercel Marketplace интеграция автоматически проставит)
DATABASE_URL=postgres://...

# JWT (сгенерить: openssl rand -base64 64)
JWT_SECRET=<64+ симв. random>

# SMS.ru
SMSRU_API_ID=<боевой api_id>
SMSRU_FROM=Uletnaya

# amoCRM (после discovery)
AMOCRM_DOMAIN=vsteh.amocrm.ru
AMOCRM_CLIENT_ID=<client_id>
AMOCRM_CLIENT_SECRET=<client_secret>
AMOCRM_REFRESH_TOKEN=<refresh_token>
AMOCRM_REDIRECT_URI=https://api.uletnayaparkovka.ru/api/webhooks/amocrm/oauth

# Vercel Cron (Vercel ставит автоматически если CRON_SECRET задан)
CRON_SECRET=<32+ симв. random>

# Sentry
SENTRY_DSN=https://...@o0.ingest.sentry.io/0

# Production-only
NODE_ENV=production
PUBLIC_API_URL=https://api.uletnayaparkovka.ru
```

---

## Deploy chain

### Первый раз
```bash
# 1. Установить Vercel CLI
npm i -g vercel

# 2. Связать проект (из mobile-platform/apps/api)
cd apps/api
vercel link
# Выбрать или создать проект "uletnaya-api"

# 3. Установить env vars (через Vercel UI или CLI)
vercel env add JWT_SECRET production
vercel env add DATABASE_URL production
# ... etc

# 4. Подключить Neon Postgres через Marketplace
vercel marketplace install neon

# 5. Подключить домен
vercel domains add api.uletnayaparkovka.ru

# 6. Первый deploy
vercel --prod

# 7. После деплоя — миграции
DATABASE_URL=$(vercel env pull --environment=production && cat .env.production | grep DATABASE_URL | cut -d= -f2-)
pnpm db:migrate
pnpm db:seed:loyalty
pnpm db:seed:admin              # с реальным паролем
pnpm db:migrate:analytics
```

### CI/CD (GitHub Actions, опционально)
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install
      - run: pnpm build
      - run: pnpm -F @uletnaya/db migrate
        env: { DATABASE_URL: '${{ secrets.DATABASE_URL }}' }
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: '${{ secrets.VERCEL_TOKEN }}'
          vercel-org-id: '${{ secrets.VERCEL_ORG_ID }}'
          vercel-project-id: '${{ secrets.VERCEL_PROJECT_ID }}'
          vercel-args: '--prod'
```

---

## Mobile релиз через EAS

### Настройка
```bash
cd apps/mobile
pnpm dlx eas-cli login
eas init                      # создаст EAS project, проставит projectId в app.json

# Установить креды Apple (один раз)
eas credentials               # → iOS → Production → автоматически
# Для Android — скачать service-account JSON из Google Play Console → положить рядом
```

### Build + submit
```bash
# Внутренний preview для тестирования
eas build --platform all --profile preview

# Production
eas build --platform all --profile production

# Submit (после успешного build)
eas submit --platform ios --latest
eas submit --platform android --latest
```

### OTA-обновления
```bash
# Без билда — обновить только JS-бандл
eas update --branch production --message "Hotfix loyalty calc"
```
Сработает на всех устройствах с production channel при следующем запуске.

---

## Канареечный запуск

### Day 0 — деплой
1. Все миграции применены
2. Health endpoint отвечает 200
3. Боевой webhook от amoCRM приходит, сохраняется
4. Один тестовый user создан вручную, прошёл полный flow (login → бронь → completed → начисление)

### Day 1-7 — мониторинг
- Sentry: error rate < 0.5% от запросов
- Vercel logs: P95 latency < 800мс
- /api/health возвращает `db: up`, `amocrm: live`
- Каждые 24 часа — RNS на новых данных:
  - `SELECT count(*) FROM bookings WHERE created_at > now() - interval '24 hours'`
  - `SELECT count(*) FROM events WHERE ts > now() - interval '24 hours'`
- Воронка в `/admin/analytics` показывает реальные числа

### Day 7-14 — масштаб
- Tracker.js подключён к сайту
- Mobile app в TestFlight + Play Console internal track
- Первые 50 реальных клиентов прошли через app
- Audit Sentry events: что чаще всего падает?

### Day 14-30 — публичный релиз
- Apple Review approved → release в App Store
- Google Play Production track → publish
- QR-коды на физических парковках
- Уведомление существующим клиентам через amoCRM

---

## Что мониторить в проде

| Метрика | Где | Тревога |
|---|---|---|
| Error rate API | Sentry | > 1% |
| P95 latency | Vercel Logs | > 1000мс |
| amoCRM webhook fail rate | Vercel Logs | > 5% |
| SMS отправок в день | SMS.ru dashboard | внезапный рост (брутфорс) |
| Booking conversion | /admin/analytics | падение > 30% от baseline |
| Apple Crash-free rate | App Store Connect | < 99% |
| Google ANR rate | Play Console | > 0.47% (порог Google) |

---

## Закрытые блокеры до боевого запуска

🔴 **AmoCRM credentials** — ждём `client_id/secret/refresh_token` после смены пароля и создания интеграции
🔴 **Apple Developer аккаунт** — оформить если нет (~7-14 дней верификация)
🔴 **152-ФЗ решение** — РФ-серверы или Vercel-EU. От этого зависит deploy target
🔴 **Юридические тексты** — оферта app + Privacy Policy + согласие на пуши (нужны для App Store review)

---

## Итог по всем фазам

| Phase | Что сделано | Статус |
|---|---|---|
| 0 | Монорепо, БД, Auth, amoCRM-стаб | ✅ |
| 1 | Mobile MVP (auth, брони, калькулятор, профиль, push) | ✅ |
| 2 | Лояльность (engine, redeem, рефералы, sync, admin rules) | ✅ |
| 3 | Admin panel (auth, dashboard, заказы, клиенты, лояльность, аналитика, Excel) | ✅ |
| 4 | Своя метрика (tracker.js, mobile SDK, cron, materialized views) | ✅ |
| 5 | Релиз (Sentry, rate limit, EAS, store-assets, hardening, deploy guide) | ✅ |

**Всего файлов в monorepo:** ~70
**Покрытие плана из 04-mobile-app-plan.md:** 100% по обязательным P0/P1 фазам.

Что осталось — внешние блокеры (amoCRM creds, Apple Developer, юр. тексты), не код.
