# Phase 3 — Admin Panel (готово)

Полноценная админка для команды Улётной парковки: дашборд, заказы, клиенты, лояльность, аналитика. Доступ — по cookie-сессии (email/password).

---

## Структура

```
apps/api/
├── proxy.ts                                ← Next.js 16: proxy (бывший middleware) защищает /admin/*
├── lib/admin-auth.ts                       ← signAdminSession + cookie helpers + bcrypt
├── app/admin/
│   ├── login/page.tsx                      ← /admin/login
│   ├── layout.tsx
│   ├── page.tsx                            ← /admin (dashboard + 14d chart + recent)
│   ├── _components/Shell.tsx               ← sidebar + nav
│   ├── _components/Filters.tsx             ← debounced search/status/airport
│   ├── bookings/page.tsx                   ← таблица + фильтры + пагинация + Excel-кнопка
│   ├── bookings/[id]/page.tsx              ← детали брони
│   ├── bookings/[id]/StatusEditor.tsx
│   ├── users/page.tsx                      ← таблица клиентов + поиск
│   ├── users/[id]/page.tsx                 ← профиль + история заказов + транзакции лояльности
│   ├── users/[id]/LoyaltyAdjuster.tsx      ← + начислить / − списать
│   ├── loyalty/page.tsx                    ← правила
│   ├── loyalty/RulesEditor.tsx             ← карточки правил + форма создания + toggle active
│   └── analytics/page.tsx                  ← funnel, по аэропортам, тиры
└── app/api/admin/
    ├── auth/{login,logout}/route.ts
    ├── bookings/route.ts                   ← list + PATCH
    ├── bookings/[id]/route.ts              ← GET + PATCH (status)
    ├── users/[id]/route.ts                 ← GET + PATCH
    ├── loyalty-rules/route.ts              ← CRUD правил
    ├── loyalty-adjust/route.ts             ← ручная корректировка баллов
    ├── analytics/route.ts                  ← данные для дашборда (JSON API)
    └── export/bookings/route.ts            ← CSV-экспорт с фильтрами
```

---

## Защита доступа

Файл `apps/api/proxy.ts` (в Next.js 16 заменил `middleware.ts`):

- Любой `/admin/*` без валидной cookie `admin_session` → редирект на `/admin/login?next=...`
- Любой `/api/admin/*` без cookie → 401 JSON
- Cookie httpOnly, sameSite=lax, expires 7 дней
- Внутри cookie — JWT (HS256) с теми же `JWT_SECRET`, что у клиентского mobile-токена

---

## Создание первого админа

```bash
# Дефолт (только для DEV!): admin@uletnaya.ru / admin
pnpm db:seed:admin

# Прод-вариант:
ADMIN_EMAIL=oleg@uletnayaparkovka.ru ADMIN_PASSWORD='Secure!Pass2026' \
  pnpm db:seed:admin
```

---

## Что можно делать

### Дашборд
- 4 метрики: всего заказов, за 7 дней, клиентов, выручка 30 дней
- Гистограмма по дням (14 дней) — каждая колонка кликабельна (tooltip)
- Последние 8 заказов

### Заказы
- Таблица с поиском (телефон / имя / номер машины), фильтрами (статус, аэропорт), пагинацией по 30
- Кнопка `↓ Excel` — скачивает CSV (UTF-8 BOM, открывается в Excel и Numbers без шаманств)
- Drill-down → карточка заказа: вся инфо, raw_amocrm payload, **изменение статуса вручную**
- Изменение статуса на «Завершена» автоматически запустит начисление лояльности

### Клиенты
- Таблица с поиском (телефон / имя / email / реферальный код), статистика по каждому: тариф, баллы, кол-во заказов, потрачено
- Drill-down → профиль: история заказов (20), транзакции лояльности (20), панель **корректировки баллов** (+ начислить / − списать с указанием причины)

### Лояльность
- Карточки активных правил с тумблером ON/OFF
- Форма «Добавить правило» с примерами JSON-конфига
- Изменения применяются сразу (PATCH в БД)

### Аналитика
- **Воронка 30 дней:** Просмотр сайта → Запуск app → Калькулятор → Нажал «Забронировать» → Создал бронь, с показом drop-off на каждом шаге
- По аэропортам: total, completed, conversion %, выручка
- Распределение по тирам (Bronze / Silver / Gold)

> Воронка пустая, пока tracker.js не подключён к сайту. См. Phase 4.

---

## Безопасность (что есть и что отложено)

| Что | Статус |
|---|---|
| Cookie httpOnly + secure в prod | ✅ |
| Защита всех `/admin` через proxy | ✅ |
| Bcrypt для хранения пароля | ✅ |
| CSRF protection | ⏳ Phase 5 (Better-Auth даст из коробки) |
| 2FA / TOTP | ⏳ Phase 5 |
| Audit log админских действий | ⏳ TODO (новая таблица `admin_actions`) |
| Rate limit на /login | ⏳ Phase 5 |
| Roles-based access (analyst can't edit) | ⏳ TODO (сейчас все роли видят всё) |

---

## Чек-лист после деплоя

- [ ] `pnpm db:migrate` накатил все таблицы
- [ ] `pnpm db:seed:loyalty` создал default rules
- [ ] `pnpm db:seed:admin` создал первого админа (с реальным паролем)
- [ ] Зашёл в `/admin/login`, вошёл успешно
- [ ] Дашборд показывает данные (хотя бы нули)
- [ ] Создал тестовую бронь из mobile → она появилась в `/admin/bookings`
- [ ] Сменил статус на «Завершена» в админке → у клиента в `/admin/users/[id]` начислились баллы
- [ ] Скачал Excel-экспорт, открыл — данные читаются корректно
- [ ] Открыл `/admin/loyalty` — правила отображаются, тумблер работает

---

## Следующая фаза

**Phase 4** — своя метрика: tracker.js на сайте + SDK в mobile + ingestion endpoint + расширенный funnel/cohorts. Фундамент уже есть (`/api/events`, `events` таблица в БД), остаётся клиентская часть и cohort-материализованные представления.
