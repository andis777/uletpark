# Phase 2 — Лояльность (готово)

## Что реализовано

### Backend
- **`lib/loyalty.ts`** — движок:
  - `awardForBooking(bookingId)` — идемпотентное начисление 5% кешбэка при `status = completed`
  - `redeemForBooking({userId, bookingId, points, maxPriceRub})` — списание баллов 1:1 ₽
  - `applyReferralCode({newUserId, code})` — применение чужого кода, +500 ₽ приглашённому, биндинг `referredBy`
  - `awardReferrerOnFirstCompleted(userId)` — отложенный +500 ₽ рефереру при первой завершённой брони friend
  - `recalcTier(userId)` — пересчёт тира по сумме `completed`-броней (Bronze 0 / Silver ≥5 000 ₽ / Gold ≥25 000 ₽)
  - `progressToNextTier(userId)` — прогресс для UI

- **Endpoints:**
  - `GET  /api/loyalty` — статус + до 20 транзакций + прогресс до следующего тира
  - `POST /api/loyalty/apply-referral` — применить чужой код
  - `POST /api/bookings` — добавлен параметр `useLoyaltyPoints` → списание после успешного создания
  - `POST /api/webhooks/amocrm` — auto-award + auto-recalc тира при `status_id = 142`
  - `GET/POST/PATCH /api/admin/loyalty-rules` — CRUD правил (защищён `X-Admin-Key`)

- **`lib/amocrm-sync.ts`** — стаб: после смены тира зеркалит в amoCRM custom field контакта (включится после получения `field_id` в Phase 0 discovery).

### Database
- Default rules через seed: `pnpm db:seed:loyalty`
  ```
  cashback_pct      → { pct: 5 }
  tier_threshold    → silver: 5 000 ₽, gold: 25 000 ₽
  referral_bonus    → invited 500 ₽, referrer 500 ₽
  ```

### Mobile
- **Loyalty экран** обновлён:
  - Карточка тира с прогрессом (с осмысленным «ещё X ₽ до следующего тира»)
  - Реферальный код + кнопка «Поделиться» (нативный share-sheet)
  - Введение чужого кода (`+ У меня есть реферальный код`)
  - История транзакций (последние 20) с человекочитаемыми reason
- **New Booking** обновлён:
  - Toggle «Использовать баллы» (если есть)
  - Live preview: показывает дисконт по баллам в summary
  - При создании баллы списываются атомарно

### Admin
- `/admin/loyalty` — таблица правил + примеры curl для CRUD (UI-форма — Phase 3, пока через API)

---

## Атомарность и идемпотентность

| Сценарий | Защита |
|---|---|
| Webhook прилетел дважды (amoCRM ретраит) | `awardForBooking` проверяет наличие `loyalty_transactions` с `reason='booking_completed'` для этого `booking_id` — пропуск |
| Юзер дважды нажал «Бронировать» с одним номером | На стороне клиента — `useMutation` блокирует. На бэке: `bookings.amocrm_lead_id UNIQUE` → upsert |
| Юзер ввёл реферальный код дважды | `users.referredBy IS NOT NULL` → возвращаем `ALREADY_USED` |
| Юзер ввёл свой собственный код | Проверка `referrer.id !== newUser.id` → `SELF_REFERRAL` |
| Списание больше доступного | `Math.min(requested, user.points, totalRub)` — ниже не уйдёт |

---

## Что не покрыто (TODO Phase 3+)

1. **Точная идемпотентность реферера.** Сейчас `awardReferrerOnFirstCompleted` использует подсчёт completed-броней — это работает, если webhook не задвоит транзакцию награды. Для строгой идемпотентности — отдельная таблица `referral_payouts (referrer_id, referee_id PK)`.
2. **Истечение баллов.** Сейчас баллы вечные. Бизнес может захотеть «12 месяцев инактивности → сгорают» — добавить `loyalty_transactions.expires_at` и cron job.
3. **Промокоды (не рефералы).** Сейчас в калькуляторе хардкод `FIRST10` = -10%. Заменить на таблицу `promo_codes` с правилами (одноразовый, для новых клиентов, по аэропорту и т.д.).
4. **Admin UI для правил.** Сейчас CRUD только через curl. В Phase 3 сделаем форму.
5. **AmoCRM tier sync.** Стаб ждёт `field_id` от discovery (Phase 0).

---

## Тестирование локально

```bash
# 1. Запустить API + БД
cd mobile-platform
pnpm install
cp .env.example .env
# В .env: DATABASE_URL, JWT_SECRET. SMSRU и AMOCRM можно оставить stub.
pnpm db:migrate
pnpm db:seed:loyalty
pnpm dev:api

# 2. Войти, получить токен
TOKEN=$(curl -s -X POST localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+79991234567"}' | jq -r '.devCode' | xargs -I{} \
  curl -s -X POST localhost:3000/api/auth/verify-otp \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"+79991234567\",\"code\":\"{}\"}" | jq -r '.accessToken')

# 3. Посмотреть лояльность (до начислений: 0 баллов)
curl localhost:3000/api/loyalty -H "Authorization: Bearer $TOKEN"

# 4. Создать бронь
BOOKING_ID=$(curl -s -X POST localhost:3000/api/bookings \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"airport":"SVO","dateFrom":"2026-05-10T10:00:00Z","dateTo":"2026-05-17T10:00:00Z","carNumber":"А123БВ77"}' \
  | jq -r '.booking.id')

# 5. Симулировать amoCRM webhook (status → completed)
# В STUB-режиме getLead вернёт мок с `status_id = 142` → completed
curl -X POST localhost:3000/api/webhooks/amocrm \
  -H "Content-Type: application/json" \
  -d '{"leads":{"status":[{"id":'$BOOKING_ID',"status_id":142}]}}'
# Внутри — awardForBooking → +52 балла (5% от 1050)

# 6. Снова посмотреть лояльность — должны увидеть 52 балла + транзакцию
curl localhost:3000/api/loyalty -H "Authorization: Bearer $TOKEN"
```

---

## Чек-лист перед Phase 3

- [ ] Seed правил выполнен (`pnpm db:seed:loyalty`)
- [ ] Завершена бронь в стабе → начислились баллы
- [ ] Проверен реферальный flow: новый юзер вводит код → +500 ₽ обоим (после первой брони друга)
- [ ] Проверено списание баллов при создании брони
- [ ] Тиры пересчитываются после `recalcTier` (можно вызвать вручную)
- [ ] `/admin/loyalty` показывает правила
