# Установка оптимизаций WordPress — uletnayaparkovka.ru

Три независимых пакета. Можно ставить по одному, в любом порядке. Откат — удалить файл.

| # | Что | Где | Эффект |
|---|---|---|---|
| 1 | **mu-plugin** оптимизации | `wp-content/mu-plugins/uletnaya-optimize.php` | TTFB 1200мс → 50мс, -300кБ JS |
| 2 | **`.htaccess`** улучшения | `/www/uletnayaparkovka.ru/.htaccess` (в начало) | gzip+brotli, WebP, immutable-cache |
| 3 | **Виджет брони** | Любая WP-страница, Custom HTML | заявки в amoCRM + Telegram + email |

---

## Бэкап перед стартом (обязательно)

```bash
# Через SSH на сервере
ssh root@194.87.222.67
cd /www/uletnayaparkovka.ru

# Бэкап .htaccess
cp .htaccess .htaccess.bak-$(date +%Y%m%d)

# Бэкап БД (опционально, на всякий)
mysqldump u0241430_default -p > ~/wp-backup-$(date +%Y%m%d).sql
# Введите MySQL пароль: SqPWdk20qXrDApgO
```

---

## Пакет 1 — mu-plugin

### Через FTP (FileZilla)
1. Открыть FTP подключение к Beget:
   - **Хост:** `37.140.192.179` (или `ftp.uletnayaparkovka.ru`)
   - **Логин:** `u0241430`
   - **Пароль:** `Vk9Dmp7z8ah9YFAO`
2. Перейти в `/www/uletnayaparkovka.ru/wp-content/`
3. Если папки `mu-plugins/` нет — создать её
4. Скопировать `deploy/wordpress/mu-plugins/uletnaya-optimize.php` в эту папку
5. Проверить права: должны быть `644`

### Через wp-admin
1. Не получится — mu-plugins не управляются через админку. Только FTP.

### Проверка после установки
```bash
curl -sI https://uletnayaparkovka.ru/ | grep X-Uletnaya
# Должно быть:
# X-Uletnaya-Cache: MISS    (первый запрос)
# X-Uletnaya-Optimize: 1.0.0
```

Повторный запрос той же страницы должен показать `X-Uletnaya-Cache: HIT` и быть в 20× быстрее.

### Откат
Удалить файл `wp-content/mu-plugins/uletnaya-optimize.php` через FTP. Кеш сам сотрётся через 5 минут (или сразу — удалить `wp-content/cache/uletnaya/`).

---

## Пакет 2 — .htaccess

### Через FTP
1. Скачать текущий `/www/uletnayaparkovka.ru/.htaccess` локально как `.htaccess.bak`
2. Открыть `deploy/wordpress/htaccess-snippet.txt` локально
3. Вставить **в начало** существующего `.htaccess` (перед `# BEGIN WordPress`)
4. Загрузить обратно

**Полный итоговый файл должен выглядеть так:**

```apache
# (вставка из htaccess-snippet.txt — gzip, expires, WebP, security)
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css ...
</IfModule>
... (наш блок до конца "Block PHP execution") ...

# BEGIN WordPress
# (оригинальные WP-правила — не трогать!)
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteRule ^index\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
</IfModule>
# END WordPress
```

### Проверка
```bash
curl -sI https://uletnayaparkovka.ru/wp-content/themes/air1/assets/css/bootstrap.min.css | grep -iE "(cache|expires|encoding)"
# Cache-Control: public, max-age=31536000, immutable
# Expires: ...
# Content-Encoding: gzip (или br)
```

### Откат
Загрузить через FTP `.htaccess.bak` обратно как `.htaccess`. Готово.

---

## Пакет 3 — виджет брони на главной

### Шаг 1 — добавить виджет на страницу
1. wp-admin → **Pages** → найти главную (обычно «Главная» / «Главная страница»)
2. Edit → **«+» (Add block)** → найти **«Custom HTML»**
3. Открыть `deploy/wordpress/booking-widget.html` локально
4. Скопировать **весь** код и вставить в Custom HTML блок
5. Update

### Шаг 2 — добавить переменные API на сервер (для лидов)
SSH:
```bash
ssh root@194.87.222.67
cd /opt/uletnaya
nano .env.production
```

Добавить или проверить (если уже есть):
```bash
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
SMTP_HOST=smtp.beget.com
SMTP_PORT=465
SMTP_USER=noreply@uletnayaparkovka.ru
SMTP_PASS=...
SMTP_TO=manager@uletnayaparkovka.ru
```

Перезапустить контейнер:
```bash
docker compose -f docker-compose.fastpanel.yml restart api
```

### Шаг 3 — проверка
1. Открыть `https://uletnayaparkovka.ru/` в режиме инкогнито
2. Виджет должен показаться, цена считаться при изменении дат
3. Заполнить форму тестовыми данными:
   - Имя: Тест
   - Телефон: +7 999 999 99 99
   - Даты: завтра-послезавтра
4. Нажать «Забронировать»
5. Проверить:
   - В **Telegram-группе** появилось сообщение
   - На **email менеджера** пришло письмо
   - В **amoCRM** создана сделка

### Тест без UI
```bash
curl -X POST https://api.uletnayaparkovka.ru/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CLI Test",
    "phone": "+79991234567",
    "service": "parking",
    "dateFrom": "2026-06-01",
    "dateTo": "2026-06-05",
    "source": "curl"
  }'
```

Должно вернуть:
```json
{
  "ok": true,
  "leadId": ...,
  "notifications": {
    "amocrm": "sent",
    "telegram": "sent",
    "email": "sent"
  },
  "price": 1200
}
```

### Откат виджета
В WordPress: Pages → Edit → удалить Custom HTML блок → Update.

---

## Замер скорости — до/после

### Перед установкой
```bash
curl -s -o /dev/null -w "TTFB: %{time_starttransfer}s · Total: %{time_total}s · Size: %{size_download}b\n" https://uletnayaparkovka.ru/
```

Запиши: TTFB обычно **0.6-1.2 секунды**.

### После установки
Тот же запрос дважды. Первый раз (cache miss) ~0.6с, второй (HIT) **~0.05с**.

Используй PageSpeed Insights:
```
https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fuletnayaparkovka.ru
```

Цели после оптимизации:
- **Performance score:** 85+ (было ~40-60)
- **LCP:** < 2.5с (было ~4-6с)
- **CLS:** < 0.1
- **TBT:** < 200мс

---

## Что НЕ сделано (но можно)

| Что | Как добавить |
|---|---|
| WebP-конверсия PNG-картинок темы | Плагин **WebP Express** или ручная конвертация через `cwebp` |
| Минификация HTML | Плагин **Autoptimize** |
| Combine CSS/JS файлов | Плагин **Autoptimize** |
| HTTP/2 push | Серверная настройка Beget (тех. поддержка) |
| Удаление дублей gtag/metric.js | Через wp-admin: **Appearance → Theme File Editor → header.php** (опасно — лучше через дочернюю тему) |

---

## Что если что-то сломалось

1. **Сайт показывает белый экран** → удалить `mu-plugins/uletnaya-optimize.php` через FTP
2. **Internal Server Error 500** → восстановить `.htaccess.bak` через FTP
3. **Кеш не сбрасывается** → удалить папку `wp-content/cache/uletnaya/` через FTP
4. **Виджет не показывается** → проверь Custom HTML блок на странице, убедись что Page status = Published
5. **Форма шлёт, но не доходит** → проверь `.env.production` на сервере + `docker compose logs api` на 194.87.222.67

---

## Контакты для проблем

- Логи API: `journalctl -t uletnaya-deploy -n 100 --no-pager`
- Логи WP cache: `tail -f /var/log/uletnaya-cron-pull.log` (если cron-pull установлен)
- Docker контейнер: `docker compose -f docker-compose.fastpanel.yml logs api --tail 50`
