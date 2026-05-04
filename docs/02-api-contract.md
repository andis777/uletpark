# API Contract — Улётная Platform

**Base URL:** `https://api.uletnayaparkovka.ru` (prod) · `http://localhost:3000` (dev)

**Auth:** Bearer JWT в `Authorization` header. Токен получается через `/api/auth/verify-otp`.

**Формат ошибок:**
```json
{ "error": "ERROR_CODE", "message"?: "human readable", "issues"?: [...] }
```

**Коды:**
- `400` — невалидное тело
- `401` — нет/невалидный токен или OTP не совпал
- `404` — ресурс не найден
- `429` — rate limit
- `500` — внутренняя ошибка
- `502` — внешняя зависимость (SMS, amoCRM) недоступна

---

## 1. Auth

### 1.1 `POST /api/auth/request-otp`

Запрос кода подтверждения. Код шлётся SMS на указанный номер. В DEV режиме код возвращается в response body для упрощения тестирования.

**Request:**
```json
{ "phone": "+79991234567" }
```
Принимаются варианты: `+79991234567`, `89991234567`, `79991234567`, `9991234567`. Нормализуется на сервере.

**Response 200:**
```json
{ "ok": true, "expiresIn": 300, "devCode": "123456" }
```
`devCode` — только в `NODE_ENV !== "production"`.

**Errors:**
- `400 Invalid phone format`
- `429 TOO_MANY_REQUESTS` (если >3 запросов с номера за 10 минут — TODO)
- `502 SMS_SEND_FAILED`

**curl:**
```bash
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+79991234567"}'
```

---

### 1.2 `POST /api/auth/verify-otp`

Подтверждение кода и получение JWT-токенов. Если пользователя ещё нет — создаётся (с одновременным созданием контакта в amoCRM).

**Request:**
```json
{ "phone": "+79991234567", "code": "123456" }
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "expiresIn": 2592000,
  "user": {
    "id": "uuid",
    "phone": "+79991234567",
    "firstName": null,
    "loyaltyTier": "bronze",
    "loyaltyPoints": 0
  }
}
```

**Errors:**
- `401 OTP_NOT_FOUND_OR_EXPIRED`
- `401 INVALID_CODE`
- `429 TOO_MANY_ATTEMPTS` (>5 попыток ввода)

---

## 2. Bookings

### 2.1 `GET /api/bookings`

Список броней авторизованного пользователя (последние 50, сортировка по `dateFrom DESC`).

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "bookings": [
    {
      "id": "uuid",
      "airport": "SVO",
      "dateFrom": "2026-05-10T10:00:00Z",
      "dateTo": "2026-05-17T10:00:00Z",
      "priceRub": 1050,
      "status": "confirmed",
      "carNumber": "А123БВ77",
      "carModel": "Toyota Camry",
      "loyaltyPointsEarned": 52,
      "loyaltyPointsUsed": 0,
      "source": "app",
      "createdAt": "2026-05-01T08:00:00Z"
    }
  ]
}
```

---

### 2.2 `POST /api/bookings`

Создание новой брони. На стороне amoCRM создаётся лид. В Postgres сохраняется зеркало.

**Request:**
```json
{
  "airport": "SVO",
  "dateFrom": "2026-05-10T10:00:00Z",
  "dateTo": "2026-05-17T10:00:00Z",
  "carNumber": "А123БВ77",
  "carModel": "Toyota Camry",
  "promoCode": "FIRST10",
  "useLoyaltyPoints": 0,
  "notes": "Машина с ребёнком, нужно детское кресло"
}
```

**Response 200:**
```json
{
  "booking": {
    "id": "uuid",
    "airport": "SVO",
    "dateFrom": "2026-05-10T10:00:00Z",
    "dateTo": "2026-05-17T10:00:00Z",
    "priceRub": 945,
    "status": "new",
    "pointsToEarn": 47
  },
  "calc": {
    "days": 7,
    "pricePerDayRub": 150,
    "totalRub": 1050,
    "discountRub": 105,
    "loyaltyDiscountRub": 0,
    "finalRub": 945,
    "pointsToEarn": 47
  }
}
```

**Errors:**
- `400 INVALID_BODY`
- `401 UNAUTHORIZED`
- `502 AMOCRM_FAILED` (если боевой режим и amoCRM API упал)

---

### 2.3 `GET /api/bookings/:id` *(TODO)*

Детали одной брони. Нужно для глубокого экрана с возможностью продлить / отменить.

### 2.4 `POST /api/bookings/:id/cancel` *(TODO)*

Отмена брони. Меняет статус в amoCRM на «закрыто».

---

## 3. Loyalty

### 3.1 `GET /api/loyalty`

Состояние лояльности + последние 20 транзакций.

**Response 200:**
```json
{
  "tier": "silver",
  "points": 1240,
  "referralCode": "UPABC123",
  "nextTier": "gold",
  "progress": 0.62,
  "transactions": [
    { "id": "uuid", "delta": 47, "reason": "booking_completed", "bookingId": "uuid", "createdAt": "..." },
    { "id": "uuid", "delta": -300, "reason": "redeem", "bookingId": "uuid", "createdAt": "..." }
  ]
}
```

### 3.2 `POST /api/loyalty/apply-referral` *(TODO)*

Применить чужой реферальный код при регистрации (даёт 500 ₽ обоим).

---

## 4. Events (своя метрика)

### 4.1 `POST /api/events`

Запись события аналитики. Можно отправлять одно событие или массив (до 50 за раз). Auth опционально — анонимные события записываются без `user_id`.

**Request (single):**
```json
{
  "eventName": "calc_started",
  "sessionId": "abc123",
  "source": "ios",
  "url": "/sheremetevo",
  "properties": { "airport": "SVO", "days": 7 },
  "deviceInfo": { "model": "iPhone 15", "os": "iOS 18.1" }
}
```

**Request (batch):** массив таких объектов.

**Response 200:** `{ "ok": true, "count": 1 }`

**Стандартные имена событий:**

| Имя | Когда | Где |
|---|---|---|
| `app_open` | Запуск app | mobile |
| `page_view` | Открытие экрана/страницы | web + mobile |
| `auth_started` | Вход в форму логина | mobile |
| `auth_completed` | Успешная авторизация | mobile |
| `calc_started` | Открыт калькулятор | web + mobile |
| `calc_changed` | Изменён параметр калькулятора | web + mobile |
| `booking_started` | Нажата «Забронировать» | web + mobile |
| `booking_created` | Бронь создана успешно | web + mobile |
| `loyalty_viewed` | Открыт экран лояльности | mobile |
| `referral_shared` | Расшарен реферальный код | mobile |

---

## 5. Webhooks (входящие)

### 5.1 `POST /api/webhooks/amocrm`

Прилетает от amoCRM при создании / изменении / переходе по статусам сделок и контактов.

**Content-Type:** `application/x-www-form-urlencoded` (специфика amoCRM) или `application/json` (зависит от настройки в amoCRM).

**Тело (упрощённо, после парсинга):**
```json
{
  "leads": {
    "add": [{ "id": 1234, "status_id": 142, "price": 1050 }],
    "update": [...],
    "status": [...]
  },
  "contacts": {
    "add": [...],
    "update": [...]
  }
}
```

**Что делает receiver:**
1. Парсит form-encoded body в дерево
2. По каждому lead вызывает `GET /api/v4/leads/:id` чтобы получить полную структуру с custom fields
3. Делает upsert в `bookings` по `amocrm_lead_id` (UNIQUE)
4. Обновляет статус, цену, raw payload
5. Если статус = `completed` — начисляет лояльность (TODO Phase 2)

**Настройка в amoCRM:** Настройки → Интеграции → Создать → Webhook → URL: `https://api.uletnayaparkovka.ru/api/webhooks/amocrm` → события: добавление сделки, изменение сделки, изменение этапа сделки.

---

## 6. Admin (защищено отдельной сессией)

```
GET  /admin                       — дашборд (HTML)
GET  /admin/bookings              — таблица всех броней (TODO)
GET  /admin/users                 — таблица клиентов (TODO)
GET  /admin/loyalty/rules         — правила лояльности (TODO)
GET  /admin/analytics             — funnel + cohorts (TODO)
POST /admin/api/loyalty/adjust    — ручное начисление/списание баллов (TODO)
```

В этом раунде сделан только `/admin` (dashboard со счётчиками + последние брони).

---

## 7. Health-check

### `GET /api/health`

Простой endpoint для мониторинга (TODO добавить):
```json
{ "ok": true, "ts": "2026-05-04T12:00:00Z", "db": "up", "amocrm": "up" }
```

---

## 8. Versioning

Сейчас `/api/*` без версии. Когда понадобится breaking change — переедем на `/api/v2/*`. Mobile app шлёт `X-App-Version` header — сможем поддерживать legacy.

---

## 9. Rate limiting (TODO)

| Endpoint | Лимит |
|---|---|
| `POST /api/auth/request-otp` | 3 / 10 минут с одного IP+phone |
| `POST /api/events` | 100 / минуту с одного userId |
| Все остальные | 60 / минуту с userId |

Реализация — Upstash Ratelimit (через Vercel Marketplace) или in-memory + Vercel KV.

---

## 10. Тестирование локально

```bash
# 1. Подними API
cd apps/api
cp .env.example .env       # заполни DATABASE_URL
pnpm dev

# 2. Запроси код
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+79991234567"}'
# → { "ok": true, "expiresIn": 300, "devCode": "123456" }

# 3. Войди
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+79991234567","code":"123456"}'
# → { "accessToken": "...", "refreshToken": "...", "user": {...} }

# 4. Получи брони (пусто)
TOKEN="<accessToken>"
curl http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $TOKEN"
# → { "bookings": [] }

# 5. Создай бронь
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"airport":"SVO","dateFrom":"2026-05-10T10:00:00Z","dateTo":"2026-05-17T10:00:00Z","carNumber":"А123БВ77"}'
# → { "booking": {...}, "calc": {...} }
```
