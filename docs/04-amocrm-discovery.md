# amoCRM Discovery — как добыть структуру и токены

## Почему пароль из чата я не использую

Ты написал в чате: `vsteh.amocrm.ru / r.voronov@vsteh.ru / 123qwerTY`. Я **не вхожу** в аккаунт, и вот почему:

1. **amoCRM API не аутентифицируется по паролю.** Чтобы дёрнуть `/api/v4/leads`, нужен **OAuth2 access token** (полученный через flow со связкой `client_id`/`client_secret`/`refresh_token`). Логин/пароль работают только в веб-интерфейсе для людей.
2. **Безопасность.** Безопасные практики Anthropic запрещают мне вводить чужие пароли в формы и создавать сессии от твоего имени. Это правильно в том числе для тебя — пароль в чате стоит **прямо сейчас сменить**, поскольку он попал в логи моего разговора.
3. **Нам нужен не разовый вход, а долгоживущий API-доступ** — он создаётся за 5 минут через интерфейс настройки интеграций.

**Действие:**
1. Зайди в `https://vsteh.amocrm.ru` лично (не давай мне)
2. Смени пароль (через профиль → безопасность)
3. Создай интеграцию по инструкции ниже и пришли мне четыре строки: `domain`, `client_id`, `client_secret`, `auth_code` (или `refresh_token`)

---

## ⚠ Заметка про домен

Ты прислал `vsteh.amocrm.ru`, но сайт называется `uletnayaparkovka.ru`. Возможные варианты:
- (a) **`vsteh` — это умбрелла-аккаунт** (`vsteh.ru` = головная компания, паркинг — её бренд). Тогда сделки Улётной парковки лежат внутри `vsteh.amocrm.ru` (нужно понять, в какой воронке)
- (b) **Это ошибка**, у Улётной свой домен `uletnayaparkovka.amocrm.ru` или подобный

Уточни — это влияет на запросы (`AMOCRM_DOMAIN` в `.env`) и на то, фильтруем ли мы сделки по конкретной воронке `pipeline_id`.

---

## Шаг 1. Создание интеграции (5 минут, один раз)

1. Войди в amoCRM: `https://vsteh.amocrm.ru`
2. **Левое меню → значок шестерёнки → «Интеграции»**
3. Кнопка справа сверху: **«Создать интеграцию»** → выбери **«Внешнее приложение»**
4. Заполни форму:

   | Поле | Значение |
   |---|---|
   | Название | `Uletnaya Mobile Platform` |
   | Описание | `Приложение для клиентов и витрина онлайн-броней` |
   | URL приложения | `https://api.uletnayaparkovka.ru` |
   | Redirect URI | `https://api.uletnayaparkovka.ru/api/webhooks/amocrm/oauth` (на старте можно ngrok-URL для локала) |
   | Права доступа | ✅ Доступ к контактам, сделкам, событиям, файлам |

5. После сохранения тебе покажут:
   - **Client ID** (он же `Integration ID`) — пришли мне
   - **Secret key** (`Client Secret`) — пришли мне через защищённый канал (Telegram / зашифрованный файл)
   - **Authorization code** — это одноразовый код (живёт 20 минут), на него нужно сразу обменять `refresh_token`

6. **Webhooks (отдельный раздел):** там же настрой webhook
   - URL: `https://api.uletnayaparkovka.ru/api/webhooks/amocrm`
   - События: ✅ Добавить сделку · ✅ Изменить сделку · ✅ Изменение этапа сделки · ✅ Изменить контакт

---

## Шаг 2. Обмен auth_code → refresh_token (1 запрос)

Это сделать сразу, иначе `auth_code` истекает за 20 минут.

```bash
curl -X POST https://vsteh.amocrm.ru/oauth2/access_token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "ВАШ_CLIENT_ID",
    "client_secret": "ВАШ_CLIENT_SECRET",
    "grant_type": "authorization_code",
    "code": "ВАШ_AUTH_CODE",
    "redirect_uri": "https://api.uletnayaparkovka.ru/api/webhooks/amocrm/oauth"
  }'
```

Ответ:
```json
{
  "token_type": "Bearer",
  "expires_in": 86400,
  "access_token": "eyJ0eXAi...",
  "refresh_token": "def50200...."
}
```

**`refresh_token` — это то, что нам нужно надолго.** Сохраняем его в `.env`:
```
AMOCRM_DOMAIN=vsteh.amocrm.ru
AMOCRM_CLIENT_ID=...
AMOCRM_CLIENT_SECRET=...
AMOCRM_REFRESH_TOKEN=def50200...
AMOCRM_REDIRECT_URI=https://api.uletnayaparkovka.ru/api/webhooks/amocrm/oauth
```

Дальше наш `lib/amocrm.ts` сам обменивает refresh → access по мере необходимости.

---

## Шаг 3. Discovery custom fields

Когда токены будут в `.env`, я запущу discovery-скрипт ниже и получу полную карту custom fields аккаунта.

### Скрипт `discover-amocrm.ts` (запустить локально через `tsx`)

```typescript
// docs/scripts/discover-amocrm.ts
const DOMAIN = process.env.AMOCRM_DOMAIN!;
const TOKEN  = process.env.AMOCRM_ACCESS_TOKEN!;   // из текущей сессии

async function api(path: string) {
  const r = await fetch(`https://${DOMAIN}/api/v4${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return r.json();
}

async function main() {
  console.log("=== Воронки ===");
  const pipelines = await api("/leads/pipelines");
  for (const p of pipelines._embedded.pipelines) {
    console.log(`  ${p.id}: ${p.name}`);
    for (const s of p._embedded.statuses) {
      console.log(`     [${s.id}] ${s.name} (color ${s.color})`);
    }
  }

  console.log("\n=== Custom fields сделок ===");
  const leadFields = await api("/leads/custom_fields");
  for (const f of leadFields._embedded.custom_fields) {
    console.log(`  [${f.id}] ${f.name} (code: ${f.code ?? "—"}, type: ${f.type})`);
    if (f.enums) for (const e of f.enums) console.log(`       enum ${e.id}: ${e.value}`);
  }

  console.log("\n=== Custom fields контактов ===");
  const contactFields = await api("/contacts/custom_fields");
  for (const f of contactFields._embedded.custom_fields) {
    console.log(`  [${f.id}] ${f.name} (code: ${f.code ?? "—"}, type: ${f.type})`);
  }

  console.log("\n=== Последние 5 сделок (для понимания заполнения) ===");
  const leads = await api("/leads?limit=5&with=contacts");
  for (const l of leads._embedded.leads) {
    console.log(`  Lead ${l.id} «${l.name}» status=${l.status_id} price=${l.price}`);
    for (const cf of l.custom_fields_values ?? []) {
      console.log(`     ${cf.field_name ?? cf.field_code ?? cf.field_id}: ${JSON.stringify(cf.values)}`);
    }
  }
}

main().catch(console.error);
```

Запуск:
```bash
cd mobile-platform
pnpm dlx tsx docs/scripts/discover-amocrm.ts
```

Это даст нам:
- ID и названия всех воронок и статусов (нужно для маппинга `bookings.status`)
- Полный список custom fields с типами (нужно для маппинга `airport`, `date_from`, `date_to`, `car_number`, ...)
- Реальные данные 5 сделок (понять, какие поля действительно заполняют менеджеры)

---

## Шаг 4. Что ожидаемо найдём (на основе структуры бизнеса)

| Custom field (предполагаемое) | Тип | Куда замапим |
|---|---|---|
| Аэропорт | select (SVO/DME/VKO) | `bookings.airport` |
| Дата заезда | date | `bookings.date_from` |
| Дата выезда | date | `bookings.date_to` |
| Гос. номер | text | `bookings.car_number` |
| Модель авто | text | `bookings.car_model` |
| Источник | select (сайт/звонок/app) | `bookings.source` |
| Стоимость | number | `bookings.price_kopecks` (умножим на 100) |
| Тариф | select (от 1 дня / от 7 дней / от 30 дней) | `bookings.notes` для начала |
| Терминал | select | `bookings.notes` |

И на стороне контактов:
| Custom field (предполагаемое) | Тип | Куда замапим |
|---|---|---|
| Телефон | phone | `users.phone` |
| Email | email | `users.email` |
| Уровень лояльности | select (если уже есть) | `users.loyalty_tier` |
| Сумма за период | number | вычислить из истории сделок |

---

## Шаг 5. После discovery — обновим `lib/amocrm.ts`

Сейчас в `mobile-platform/apps/api/lib/amocrm.ts` коды custom fields захардкожены строками (`AIRPORT`, `DATE_FROM` и т.д.). После discovery я заменю их на конкретные `field_id` из твоего amoCRM:

```typescript
// до
const customs = Object.fromEntries(
  (full.custom_fields_values ?? []).map(f => [f.field_code ?? `field_${f.field_id}`, f.values?.[0]?.value])
);

// после (с реальными ID)
const FIELDS = {
  AIRPORT:   1234567,   // ← из discovery
  DATE_FROM: 1234568,
  DATE_TO:   1234569,
  CAR_NUMBER:1234570,
} as const;

const byId = Object.fromEntries(full.custom_fields_values.map(f => [f.field_id, f.values?.[0]?.value]));
const airport = byId[FIELDS.AIRPORT];
```

---

## Если custom fields не унифицированы

**Это нормально.** В amoCRM 5+-летнем обычно бардак: кто-то заполняет «Аэропорт», кто-то пишет в «Заметки», кто-то в название лида. План:

1. Создать **единый стандарт полей** в amoCRM (даже 5 минут админ-работы решит проблему)
2. Запустить **backfill-скрипт** — пройти по последним 1-2 годам сделок, парсить из `name` / `notes` ключевые поля по regex и заполнять custom fields
3. С этого момента app пишет правильно, менеджеры приучаются к новой схеме

Это П1 — не блокирует Phase 0, но в Phase 2 разберём чтобы лояльность считалась из чистых данных.

---

## Что мне отправить

После того как ты пройдёшь шаги 1-2, мне нужно (через защищённый канал, **не сюда в чат**):

```
AMOCRM_DOMAIN=vsteh.amocrm.ru
AMOCRM_CLIENT_ID=...
AMOCRM_CLIENT_SECRET=...
AMOCRM_REFRESH_TOKEN=...
```

Дальше я:
1. Запущу discovery-скрипт
2. Покажу тебе карту полей и воронок
3. Зафиксируем маппинг
4. Удалим стабы и врубим LIVE-режим
5. Запустим backfill всех существующих сделок в нашу БД (в shadow-режиме, без записи обратно в amoCRM)

---

## Чек-лист до запуска LIVE-режима

- [ ] Сменён пароль от amoCRM (он засветился в чате)
- [ ] Создана интеграция «Uletnaya Mobile Platform»
- [ ] Получены `client_id` + `client_secret` + `refresh_token`
- [ ] Настроен webhook на `https://api.uletnayaparkovka.ru/api/webhooks/amocrm`
- [ ] Discovery-скрипт прогнан, карта полей зафиксирована
- [ ] Маппинг полей утверждён (что куда летит)
- [ ] Backfill сделан в shadow-режиме (без записи назад в amoCRM)
- [ ] Тестовая бронь из app → создаётся в amoCRM → видна менеджеру
- [ ] Тестовое изменение в amoCRM → webhook → обновление в Postgres → видно в app
