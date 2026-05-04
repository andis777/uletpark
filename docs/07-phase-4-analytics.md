# Phase 4 — Своя метрика (готово)

Отдельный «свой Mixpanel» для веб-сайта и приложения. Без third-party (без Google Analytics / Яндекс.Метрики), все данные — в Postgres.

---

## Что получили

```
apps/api/
├── public/tracker.js                                ← ~3 КБ браузерный SDK для сайта
├── app/api/events/route.ts                          ← ingestion (с CORS, IP-аноним)
├── app/api/events/session/route.ts                  ← агрегация сессий
├── app/api/cron/refresh-analytics/route.ts          ← Vercel Cron: каждый час
└── vercel.ts                                        ← cron-конфиг (Next.js 16)

apps/mobile/lib/analytics.ts                         ← session, device info, утилиты
apps/mobile/app/_layout.tsx                          ← initAnalytics() при старте app
apps/mobile/app/(auth)/login.tsx                     ← screen_view + auth_started/completed
apps/mobile/app/booking/new.tsx                      ← screen_view + calc_started + booking_created
apps/mobile/app/(tabs)/index.tsx                     ← booking_started

packages/db/scripts/migrate-analytics-views.ts       ← BRIN-индекс + 2 materialized views
```

---

## Tracker для сайта (`tracker.js`)

### Установка на uletnayaparkovka.ru (WordPress)

В **Внешний вид → Theme File Editor → header.php** вставить **перед `</head>`**:

```html
<script async
        src="https://api.uletnayaparkovka.ru/tracker.js"
        data-api="https://api.uletnayaparkovka.ru"
        data-site="uletnayaparkovka.ru"></script>
```

Альтернативно — через плагин **Insert Headers and Footers** (уже стоит на сайте? Если нет — поставить).

### Что собирает автоматически

| Событие | Когда |
|---|---|
| `page_view` | загрузка любой страницы + SPA-навигация (pushState/popstate) |
| `scroll_depth` | при достижении 25 / 50 / 75 / 100% страницы |
| `click` | по элементам с `data-track="cta-name"` |
| `click_phone` | клик по `tel:` |
| `click_email` | клик по `mailto:` |
| `click_telegram` | клик по `t.me/...` или `telegram.me/...` |
| `click_whatsapp` | клик по `wa.me/...` |
| `booking_started` | по тексту кнопки «Забронировать» (fallback) |
| `calc_started` | по тексту «Рассчитать» |
| `page_exit` | при `beforeunload` с `dwellMs` (время на странице) |

### Ручная разметка ключевых элементов (рекомендуется)

В шаблонах темы `air1` добавить атрибуты к важным CTA:

```html
<a href="/sheremetevo" data-track="hero-svo-card">Шереметьево</a>
<a href="/uletnaya-nochevka" data-track="cross-sell-nochevka">Улётная ночёвка</a>
<button data-track="hero-bron">Забронировать</button>
<a href="tel:+79099148881" data-track="header-phone">+7 909 ...</a>
```

Это даст конкретику в воронке: «нажали именно hero-bron», а не «какая-то кнопка».

### Privacy

- Уважает заголовок `Do Not Track` — не загружается
- Поддерживает opt-out через `localStorage`: `window.upOptOut()` / `window.upOptIn()`
- IP-адрес анонимизируется на бэкенде (последний октет → 0)
- В `events.deviceInfo.ip` хранится только anonymized IP
- Cookies не использует — session_id живёт в `sessionStorage`
- 100% контроль данных — ничего не уходит к третьим лицам

---

## Mobile SDK

`apps/mobile/lib/analytics.ts` — обёртка над `sendEvent()`:

```typescript
import { analytics } from "@/lib/analytics";

// в screen
analytics.screenView("booking_new");
analytics.bookingStarted();
analytics.calcChanged({ airport: "SVO", days: 7 });

// в lifecycle (auto)
initAnalytics();   // зовётся в _layout.tsx — отслеживает app_open/resume/background
```

Session ID генерится один раз, кэшируется в `expo-secure-store`, обновляется если прошло 30+ минут без активности.

Device info собирается автоматически: `os`, `osVersion`, `appVersion`, `deviceModel`.

---

## База данных: индексы и views

Запуск:
```bash
pnpm db:migrate:analytics
```

**Индексы:**
- `events_ts_brin` — BRIN-индекс по `ts` (~копейки места, быстрый range scan)
- `events_user_event_ts` — для запросов «показать события юзера X типа Y по убыванию ts»

**Materialized views:**
- `mv_user_first_seen` — первая активность каждого пользователя + cohort_week / cohort_month → для retention
- `mv_daily_active` — DAU / sessions / events по дням (90 дней) → для гистограмм

Обновление: автоматически каждый час через Vercel Cron (`/api/cron/refresh-analytics`).
Защита cron: `Authorization: Bearer $CRON_SECRET` (Vercel сам ставит, нужно только определить env-var).

---

## Воронка для админки

В `/admin/analytics` уже работает воронка из 5 шагов:
1. `page_view` — любой просмотр сайта
2. `app_open` — запуск приложения
3. `calc_started` — открыт калькулятор
4. `booking_started` — нажал «Забронировать»
5. `booking_created` — успешная бронь

После подключения tracker.js на сайт реальные числа польются за минуты.

---

## Что отложено (Phase 5)

| Что | Когда | Зачем |
|---|---|---|
| Click heatmap (координаты x/y, scroll-time) | После запуска tracker | Тяжёлый трафик, добавит +20% объёма events |
| Server-side session replay | P3 | Не критично пока |
| GeoIP enrichment (страна/город из IP) | Phase 5 | Нужен MaxMind dataset / Vercel GeoIP edge |
| Анти-fraud для booking_created | Phase 5 | Detection бот-трафика |
| GDPR cookie banner на сайте | Phase 5 | Сейчас работает только DNT |

---

## Тестовый сценарий

```bash
# 1. На сайте: открой консоль → window.upTrack('test', { hello: 'world' })
# Должно отправиться на /api/events

# 2. В app: после запуска посмотри логи бэка — увидишь app_open, screen_view login и т.д.

# 3. В /admin/analytics — воронка должна показать ненулевые числа после 5 минут активности
```

---

## Что мерить через 30 дней после запуска

| Метрика | Целевое значение |
|---|---|
| DAU (web + app combined) | ≥ 200/день к концу первого месяца |
| Конверсия `page_view → booking_created` | ≥ 1.5% (для airport parking — отлично) |
| Drop-off `calc_started → booking_started` | ≤ 65% |
| Drop-off `booking_started → booking_created` | ≤ 30% |
| Доля app vs web | по факту, для понимания channel mix |
| Retention W1 | ≥ 15% (нормально для transactional service) |
