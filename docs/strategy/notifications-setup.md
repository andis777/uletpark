# Настройка уведомлений о лидах

После деплоя нового `/api/leads` endpoint лиды отправляются:
1. В **amoCRM** — создаётся сделка + контакт
2. В **Telegram-группу** через бота
3. На **email** менеджера

Все три канала — независимы. Если какой-то отвалится, остальные продолжают работать.

---

## ENV переменные на сервере

Открой `/opt/uletnaya/.env.production` через SSH и добавь:

```bash
# === Telegram ===
TELEGRAM_BOT_TOKEN=123456789:AAEhB...                # токен бота из @BotFather
TELEGRAM_CHAT_ID=-1001234567890                       # ID группы (отрицательный для group/supergroup)

# === Email (SMTP) ===
SMTP_HOST=smtp.beget.com                              # SMTP-хост (или smtp.yandex.ru / smtp.mail.ru)
SMTP_PORT=465                                         # 465 = SSL, 587 = STARTTLS
SMTP_USER=uletnayaparkovka@gmail.com                  # логин
SMTP_PASS=xxxxxxxxxxxx                                # пароль приложения (НЕ обычный пароль почты)
SMTP_FROM=noreply@uletnayaparkovka.ru                 # от кого
SMTP_TO=manager@uletnayaparkovka.ru,owner@example.com # кому (можно несколько через запятую)

# === amoCRM (уже было) ===
AMOCRM_DOMAIN=uletnaya.amocrm.ru
AMOCRM_CLIENT_ID=xxx-xxx-xxx
AMOCRM_CLIENT_SECRET=xxxxxxxx
AMOCRM_REFRESH_TOKEN=xxxxxxxx
```

После правки — перезапусти контейнер:
```bash
cd /opt/uletnaya
docker compose -f docker-compose.fastpanel.yml restart api
```

---

## Как получить Telegram токен и chat_id

### Шаг 1 — создать бота
1. Открыть [@BotFather](https://t.me/BotFather) в Telegram
2. Команда `/newbot`
3. Имя: `Улётная Заявки Bot`
4. Username: `uletnaya_leads_bot` (или любой свободный, обязательно заканчивается на `_bot`)
5. BotFather пришлёт токен вида `123456789:AAEhBaPDvgvR4oH-...` — это `TELEGRAM_BOT_TOKEN`

### Шаг 2 — создать группу для заявок
1. В Telegram создать новую группу «Улётная Заявки»
2. Добавить туда бота как админа
3. Написать любое сообщение в группе

### Шаг 3 — получить chat_id
В браузере открыть:
```
https://api.telegram.org/bot<ВАШ_ТОКЕН>/getUpdates
```

В ответе найти `"chat":{"id":-1001234567890,...}` — это `TELEGRAM_CHAT_ID` (с минусом).

---

## Как получить SMTP-данные

### Вариант A — Gmail с паролем приложения
1. Google Account → Security → 2-Step Verification (включить)
2. App passwords → New app password → "Mail" → "Other (Custom name)"
3. Скопировать 16-символьный пароль → это `SMTP_PASS`
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=uletnayaparkovka@gmail.com
SMTP_PASS=<пароль приложения>
```

### Вариант B — Яндекс.Почта
1. Яндекс → Настройки → Безопасность → Пароли приложений
2. Создать пароль для "Почта"
```
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=mail@uletnayaparkovka.ru
SMTP_PASS=<пароль приложения>
```

### Вариант C — Beget SMTP
1. Beget панель → Почта → Создать ящик `noreply@uletnayaparkovka.ru`
```
SMTP_HOST=smtp.beget.com
SMTP_PORT=465
SMTP_USER=noreply@uletnayaparkovka.ru
SMTP_PASS=<пароль ящика>
```

---

## Тест

После деплоя:

```bash
curl -X POST https://api.uletnayaparkovka.ru/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Тест Тестов",
    "phone": "+79991234567",
    "service": "parking",
    "dateFrom": "2026-06-01",
    "dateTo": "2026-06-05",
    "source": "test"
  }'
```

Ожидаемый ответ:
```json
{
  "ok": true,
  "leadId": null,
  "notifications": {
    "amocrm": "sent",
    "telegram": "sent",
    "email": "sent"
  },
  "price": 1200
}
```

Если `telegram: "NOT_CONFIGURED"` — токена нет в env.
Если `telegram: "HTTP_400"` — токен есть, но `chat_id` неправильный.
Если `email: "NOT_CONFIGURED"` — SMTP не настроен.

В Telegram-группе должно появиться сообщение:
```
🚀 Новая заявка

Услуга: 🅿️ Парковка
Имя: Тест Тестов
Телефон: +79991234567
Даты: 2026-06-01 → 2026-06-05 (4 суток)
Расчёт: 1 200 ₽
Источник: test

⏰ 14.05.2026, 23:25 МСК
```
