# amoCRM live sync — импорт сделок и привязка к клиентам

Реализован полный цикл: backfill всех существующих сделок из воронки «Улётная парковка», авто-привязка к пользователям при логине по телефону, admin-панель с кнопкой ручного синка.

---

## Что добавлено

```
apps/api/lib/
├── amocrm.ts                                ← + listLeadsByPhone, listPipelines, findPipelineId, iterateLeads
└── sync-amocrm.ts                           ← syncFromPipeline, linkBookingsToUserByPhone, linkOrphanBookings

apps/api/app/api/
├── auth/verify-otp/route.ts                 ← вызывает linkBookingsToUserByPhone при логине
└── admin/sync/route.ts                      ← POST запустить синк, GET история

apps/api/app/admin/sync/
├── page.tsx                                 ← /admin/sync UI с метриками + историей
└── SyncTrigger.tsx                          ← кнопка с выбором воронки и периода

packages/db/
├── schema.ts                                ← + sync_runs таблица
└── scripts/backfill-amocrm.ts               ← CLI: pnpm amocrm:backfill
```

---

## Как работает поиск воронки

В `vsteh.amocrm.ru` может быть несколько воронок (vsteh — головная компания, паркинг — её бренд). Мы ищем воронку по подстроке имени, case-insensitive, нормализуем `ё ↔ е`.

```typescript
const pipelineId = await findPipelineId("Улётная парковка");
// Найдёт "Улётная парковка", "улетная парковка", "Воронка Улётной парковки", "Парковка - Улётная" и т.п.
```

В UI можно изменить подстроку — например, написать «парковка» если воронка называется иначе.

---

## Как работает извлечение полей

`extractFromLead()` пробует **несколько вариантов имён** для каждого поля, потому что до discovery точные `field_id` неизвестны:

| Поле БД | Пробует ключи custom_fields |
|---|---|
| airport (SVO/DME/VKO) | `AIRPORT`, `airport`, `аэропорт`, `Аэропорт` + парсит ключевые слова `DOM/ДОМ → DME`, `VNU/ВНУ → VKO` |
| dateFrom | `DATE_FROM`, `date_from`, `дата заезда`, `заезд` |
| dateTo | `DATE_TO`, `date_to`, `дата выезда`, `выезд` |
| carNumber | `CAR_NUMBER`, `гос_номер`, `номер` |
| carModel | `CAR_MODEL`, `модель` |

Парсер дат принимает unix timestamp (sec/ms) и ISO-строки.

После discovery (когда мы получим точные `field_id` из реального amoCRM) — заменим эвристики на конкретные ID для надёжности.

---

## Как работает привязка к юзерам

### При логине нового клиента (verify-otp)

```
Клиент вводит +7 909 111 22 33
  → ищем пользователя в users по этому phone — нет
  → создаём user
  → дёргаем amoCRM /contacts?query=+79091112233 — находим контакт #54321
  → дёргаем /contacts/54321?with=leads — список сделок [#1001, #1002, #1003]
  → для каждой:
       если её ещё нет в bookings → INSERT
       если есть, но без user_id → UPDATE userId = новый user.id
  → возвращаем: { isNewUser: true, linkedBookings: 3 }
```

### При ручном backfill / cron

```
Из воронки "Улётная парковка" грузим все 3 000 сделок страницами по 250
  для каждой:
    contact_id = lead.contacts[0].id
    phone = getContact(contact_id).custom_fields_values[PHONE]
    user = users.find(phone)
    upsert booking(amocrm_lead_id, user_id=user?.id ?? null, ...)
```

Сделки **без user_id** становятся «сиротами» — мы их подхватим позже либо при логине клиента, либо запуском `linkOrphanBookings()`.

---

## Запуск

### Через admin UI (рекомендуется для оператора)

1. Зайти `/admin/sync`
2. Проверить banner — должно быть «✓ amoCRM подключён: vsteh.amocrm.ru»
3. Поле «Воронка» — оставить «Улётная парковка» (или подкорректировать)
4. Поле «Дней назад» — `30` для incremental, `0` для backfill всего
5. Кнопка **«Запустить»** → ~30 секунд (зависит от объёма)
6. Внизу появится зелёный баннер: «+47 новых, ~12 обновлено, → 35 привязано»

### Через CLI (для DevOps)

```bash
# Backfill всего:
PIPELINE="Улётная парковка" pnpm amocrm:backfill

# Только обновлённые после даты:
PIPELINE="Улётная парковка" SINCE=2025-01-01 pnpm amocrm:backfill
```

### Автоматический cron (каждый час)

В `apps/api/vercel.ts` уже есть структура для cron. Добавить новый запуск:

```typescript
crons: [
  { path: "/api/cron/refresh-analytics", schedule: "0 * * * *" },
  { path: "/api/cron/sync-amocrm", schedule: "*/15 * * * *" },   // каждые 15 минут
]
```

(Endpoint `/api/cron/sync-amocrm` нужно создать аналогично `refresh-analytics` — пока не добавлен, потому что разовый webhook + ручной sync через UI обычно достаточно.)

---

## Что увидит клиент в mobile app

Когда клиент **с существующими сделками в amoCRM** впервые входит в приложение:

1. Вводит телефон, получает SMS
2. Вводит код → авторизация
3. **Auto-flow:** мы дёргаем `linkBookingsToUserByPhone(user.id, "+79091112233")`
4. amoCRM отдаёт список лидов — 5 штук
5. INSERT/UPDATE в `bookings`, проставляется `user_id`
6. Клиент попадает на главный экран → нажимает «Брони» → видит **все 5 свои реальных заказов** из amoCRM

Без дополнительных действий клиента, без переписки в чате с менеджером.

---

## Sync history (`sync_runs`)

В `/admin/sync` показывает 10 последних запусков:

| Запущено | Тип | Кем | Статус | Получено | + Новые | ~ Обновл. | → К юзеру | Длит. |
|---|---|---|---|---|---|---|---|---|
| 5.04.2026 14:32 | manual | r.voronov@vsteh.ru | success | 2 847 | +12 | ~2 835 | 1 432 | 47с |
| 5.04.2026 13:00 | cron | cron | success | 23 | +5 | ~18 | 7 | 4с |

Из таблицы `sync_runs` (новая в schema.ts). После следующего `pnpm db:generate && pnpm db:migrate` — таблица создастся.

---

## Чек-лист после получения OAuth ключей

- [ ] Заполнить в `.env.production` (Vercel env vars):
  ```
  AMOCRM_DOMAIN=vsteh.amocrm.ru
  AMOCRM_CLIENT_ID=<из интеграции>
  AMOCRM_CLIENT_SECRET=<из интеграции>
  AMOCRM_REFRESH_TOKEN=<после auth_code обмена>
  ```
- [ ] Сделать миграцию: `pnpm db:generate && pnpm db:migrate`
- [ ] Проверить `/api/health` → должно быть `amocrm: "live"`
- [ ] Открыть `/admin/sync` → проверить banner «✓ amoCRM подключён»
- [ ] Запустить sync `sinceDays=0` (backfill всего)
- [ ] Проверить `/admin/bookings` — заказы появились
- [ ] Войти в mobile app со своим номером (или тестовым) → должен увидеть свои заказы
- [ ] Запустить `linkOrphanBookings` — все ли клиенты подцеплены
- [ ] Поставить cron на 15 минут (incremental sync)

---

## Что нельзя сделать без discovery

После того как ты пришлёшь `client_id/secret/refresh_token`, я смогу:

1. Запустить discovery-скрипт → получить **точные field_id** для:
   - `airport`
   - `date_from`, `date_to`
   - `car_number`, `car_model`
   - `loyalty_tier` (если уже есть в amoCRM)
   - `phone` контакта (точный код кастомного поля, обычно `PHONE`)

2. Заменить эвристики `extractFromLead()` на конкретные `byId[FIELD_AIRPORT]` — это надёжнее, особенно если в amoCRM есть несколько похожих полей.

3. Включить `syncTierToAmocrm()` — записывать наш `loyalty_tier` обратно в кастомное поле контакта, чтобы менеджеры видели уровень клиента.

4. Замапить **точные `status_id`** в нашей воронке. Сейчас захардкожено: `142 = completed`, `143 = cancelled`. Возможно, в твоей воронке другие ID — discovery покажет.
