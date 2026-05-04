# Self-hosted Deploy — собственный сервер + GitHub Actions

Полный путь от чистого VPS до боевого `api.uletnayaparkovka.ru` с автодеплоем при push в `main`. Без Vercel, без Neon, без Vercel Cron — всё своё.

---

## Архитектура

```
GitHub (main)
   ↓ push
GitHub Actions
   ├─→ docker build → push в ghcr.io/ВЛАДЕЛЕЦ/uletnaya-api:tag
   ├─→ pnpm db:migrate (с DATABASE_URL из секретов)
   └─→ SSH на сервер → docker compose pull api && up -d → healthcheck

[Сервер: Ubuntu 22.04+]
   ├── nginx (TLS термирование, rate limit, gzip)
   │     ↓ proxy_pass
   ├── api (контейнер @uletnaya/api, порт 3000)
   │     ↔
   ├── postgres:16 (контейнер, volume для данных)
   ├── cron (alpine + busybox crond, дёргает /api/cron/* каждые 15 мин)
   └── backups/ (pg_dump каждые сутки в 4:00, ротация 30 дней)
```

---

## Что добавлено в репозиторий

```
├── Dockerfile                              ← multi-stage Node 22 alpine, standalone
├── .dockerignore
├── docker-compose.yml                      ← prod: postgres + api + nginx + cron
├── docker-compose.dev.yml                  ← dev: только postgres
├── .env.production.example                 ← шаблон для /opt/uletnaya/.env.production
├── deploy/
│   ├── nginx/nginx.conf                    ← TLS + rate-limit auth + gzip
│   ├── postgres/init.sql                   ← extensions: uuid-ossp, pg_trgm
│   └── scripts/
│       ├── setup-server.sh                 ← одноразовая настройка Ubuntu
│       ├── crontab                         ← расписание для cron контейнера
│       └── cron-jobs.sh                    ← curl /api/cron/* + pg_backup
├── apps/api/
│   ├── next.config.ts                      ← output: "standalone" (для Docker)
│   └── app/api/cron/sync-amocrm/route.ts  ← аналог Vercel Cron, защищён CRON_SECRET
└── .github/workflows/
    ├── deploy.yml                          ← build → migrate → SSH deploy → notify
    └── ci.yml                              ← lint + typecheck + test docker build на PR
```

**Удалено:**
- `apps/api/vercel.ts` — больше не нужен

---

## Требования к серверу

**Минимум:**
- Ubuntu 22.04+ или Debian 12+
- 2 vCPU, 4 GB RAM, 40 GB SSD (на старте; для трафика 1k DAU хватит надолго)
- Публичный IPv4
- DNS A-запись `api.uletnayaparkovka.ru → IP`

**Где хостить (для 152-ФЗ обязательно РФ):**
- Selectel / Yandex Cloud (Compute) / Timeweb / Beget / VK Cloud
- Любой Linux VPS-провайдер с Docker

---

## Первичная установка сервера

### 1. Создать сервер
SSH-ключ настроен заранее (`ssh-keygen -t ed25519` локально, public key в `~/.ssh/authorized_keys` на сервере).

### 2. Подключиться и запустить setup-скрипт
```bash
ssh user@api.uletnayaparkovka.ru
git clone https://github.com/ВЛАДЕЛЕЦ/uletnaya.git /opt/uletnaya
cd /opt/uletnaya
bash deploy/scripts/setup-server.sh
# Перезайти после установки Docker, чтобы заработал без sudo
exit
ssh user@api.uletnayaparkovka.ru
```

### 3. SSL-сертификат от Let's Encrypt
```bash
sudo apt install -y certbot
sudo certbot certonly --standalone \
  -d api.uletnayaparkovka.ru \
  --email ariswebru@gmail.com \
  --agree-tos --no-eff-email

# Скопировать в проект для монтирования в nginx-контейнер
sudo cp -rL /etc/letsencrypt /opt/uletnaya/deploy/
sudo chown -R $USER:$USER /opt/uletnaya/deploy/letsencrypt

# Авто-обновление в системный cron корня:
echo "0 3 * * * certbot renew --quiet --deploy-hook 'docker compose -f /opt/uletnaya/docker-compose.yml restart nginx'" \
  | sudo tee -a /etc/crontab
```

### 4. Создать `.env.production`
```bash
cd /opt/uletnaya
cp .env.production.example .env.production
nano .env.production    # заполнить реальными секретами
```

Главное:
- `POSTGRES_PASSWORD` — `openssl rand -base64 24`
- `JWT_SECRET` — `openssl rand -base64 64`
- `CRON_SECRET` — `openssl rand -hex 32`
- `SMSRU_API_ID` — реальный из sms.ru
- `AMOCRM_*` — после OAuth-обмена (см. `04-amocrm-discovery.md`)
- `IMAGE_NAME` — `ВЛАДЕЛЕЦ/uletnaya-api` (например `voronovr/uletnaya-api`)

### 5. Первый запуск
```bash
cd /opt/uletnaya
docker compose pull
docker compose up -d
docker compose logs -f api
```

### 6. Миграции и seed
```bash
# Миграции с локальной машины (через DATABASE_URL с публичным портом)
# или прямо на сервере с DATABASE_URL=postgres://uletnaya:PASSWORD@127.0.0.1:5432/uletnaya
pnpm db:migrate
pnpm db:seed:loyalty
ADMIN_EMAIL=oleg@uletnayaparkovka.ru ADMIN_PASSWORD='Secure!Pass2026' pnpm db:seed:admin
pnpm db:migrate:analytics
```

### 7. Проверка
```bash
curl https://api.uletnayaparkovka.ru/api/health
# → {"ok":true, "db":"up", "amocrm":"live"}

curl https://api.uletnayaparkovka.ru/tracker.js | head -5
# → /*! Улётная Tracker ...

# В браузере: https://api.uletnayaparkovka.ru/admin/login
```

---

## GitHub Actions — auto-deploy

### Настройка GitHub Secrets

В `Settings → Secrets and variables → Actions` добавить:

| Secret | Значение | Назначение |
|---|---|---|
| `DATABASE_URL` | `postgres://uletnaya:PASSWORD@SERVER_IP:5432/uletnaya?sslmode=disable` | Для запуска миграций из CI |
| `DEPLOY_HOST` | `api.uletnayaparkovka.ru` | SSH host |
| `DEPLOY_USER` | `deploy` (отдельный sudo-юзер для CI) | SSH login |
| `DEPLOY_SSH_KEY` | приватный SSH-ключ (`ssh-keygen -t ed25519 -f deploy_key`) | Для appleboy/ssh-action |
| `DEPLOY_PORT` | `22` (или другой) | SSH port |
| `GHCR_PULL_TOKEN` | GitHub PAT с правом `read:packages` | Чтобы сервер скачивал образ |
| `TELEGRAM_BOT_TOKEN` | (опц.) | Уведомления в TG |
| `TELEGRAM_CHAT_ID` | (опц.) | Куда слать уведомление |

### Подготовка deploy-юзера на сервере
```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo mkdir -p /home/deploy/.ssh
sudo cp deploy_key.pub /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys

# Дать права на /opt/uletnaya
sudo chown -R deploy:deploy /opt/uletnaya
```

### Открытие GHCR пакета для сервера
По умолчанию пакеты в GHCR **private**. На сервере нужен PAT для `docker login`:
```bash
# На сервере один раз:
echo "GHCR_PAT" | docker login ghcr.io -u ВЛАДЕЛЕЦ --password-stdin
```
Или Actions делают это сам в `deploy.yml` (уже встроено).

### Запуск
- Push в `main` затронувший `apps/api/**`, `packages/**`, `Dockerfile` или `deploy/**` → автоматический deploy
- Ручной запуск: GitHub UI → Actions → Deploy API → Run workflow

---

## Cron — что и когда запускается

В контейнере `cron` (alpine + busybox crond) по расписанию из `deploy/scripts/crontab`:

| Расписание | Скрипт | Что делает |
|---|---|---|
| `0 * * * *` (каждый час) | `cron-jobs.sh refresh-analytics` | `REFRESH MATERIALIZED VIEW` для analytics |
| `*/15 * * * *` (каждые 15 мин) | `cron-jobs.sh sync-amocrm` | Incremental sync с amoCRM (`sinceDays=1`) |
| `0 4 * * *` (каждые сутки в 4:00) | `cron-jobs.sh pg-backup` | `pg_dump` в `/backups/uletnaya-DATE.sql.gz`, ротация 30 дней |

Каждый скрипт дёргает API-эндпоинт через `curl` с заголовком `Authorization: Bearer $CRON_SECRET`. На сервере api эта проверка стоит — без секрета вернёт `403`.

### Ручной trigger
```bash
docker exec uletnaya-cron sh /cron-jobs.sh sync-amocrm
docker exec uletnaya-cron sh /cron-jobs.sh pg-backup
```

---

## Backup и восстановление

### Backups автоматические
- В `/opt/uletnaya/backups/uletnaya-YYYYMMDD-HHMM.sql.gz`
- Ротация 30 дней (старше — удаляются)
- Размер: для 100k записей ≈ 50 MB сжатый

### Куда лить дальше (рекомендуется)
- **Yandex Object Storage** или **Selectel S3** — `aws s3 cp` (с настройкой `~/.aws/config` для российского endpoint)
- Cron ниже + добавить шаг `aws s3 sync /opt/uletnaya/backups s3://bucket/`

### Восстановление
```bash
gunzip < backups/uletnaya-20260405-0400.sql.gz \
  | docker exec -i uletnaya-postgres psql -U uletnaya -d uletnaya
```

---

## Локальная разработка

```bash
# 1. Поднять только Postgres
docker compose -f docker-compose.dev.yml up -d

# 2. Запустить api в watch
cp .env.example .env
# DATABASE_URL=postgres://uletnaya:dev@localhost:5432/uletnaya
pnpm install
pnpm db:migrate
pnpm db:seed:loyalty
pnpm db:seed:admin
pnpm dev:api
# → http://localhost:3000
```

В dev:
- amoCRM: STUB (если `AMOCRM_*` пустые)
- SMS: пишется в консоль (если `SMSRU_API_ID=stub`)
- OTP: возвращается в response как `devCode`

---

## Что отличается от Vercel-варианта

| Что | Vercel | Self-hosted |
|---|---|---|
| Hosting | Vercel Functions | Docker на VPS |
| DB | Neon (serverless) | Postgres 16 в контейнере на том же VPS |
| Deployment trigger | git push → Vercel build | git push → GitHub Actions → SSH |
| Cron | Vercel Cron в `vercel.ts` | busybox crond в alpine-контейнере |
| TLS | Vercel автоматом | Let's Encrypt + nginx + cron renewal |
| Logs | Vercel Logs | `docker compose logs` или Loki/Grafana |
| Scaling | автоматическое | вертикальный (увеличить VPS) или K8s |
| Cost | $20/мес Pro + Neon | VPS 4GB ≈ 800-1500 ₽/мес у RU-провайдеров |
| 152-ФЗ | надо зеркало | OK сразу (РФ-сервер) |

**Главный плюс self-hosted:** все данные клиентов в РФ, нет вопросов с 152-ФЗ.
**Главный минус:** ты сам отвечаешь за uptime, бэкапы, security patches.

---

## Чек-лист перед боевым запуском

### Сервер
- [ ] VPS создан в РФ (Selectel / Yandex Cloud / Timeweb)
- [ ] DNS A-запись `api.uletnayaparkovka.ru → IP` настроена
- [ ] SSH-доступ настроен (отдельный `deploy` юзер)
- [ ] `bash deploy/scripts/setup-server.sh` выполнен
- [ ] Let's Encrypt cert получен и смонтирован
- [ ] `.env.production` заполнен реальными секретами
- [ ] `docker compose up -d` поднял все 4 контейнера
- [ ] Healthcheck `/api/health` отвечает 200

### GitHub
- [ ] Все 5 обязательных secrets заведены (DATABASE_URL, DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY, GHCR_PULL_TOKEN)
- [ ] Тестовый push в main → workflow прошёл успешно
- [ ] Образ появился в `ghcr.io/ВЛАДЕЛЕЦ/uletnaya-api`

### Backups
- [ ] Cron в контейнере работает (`docker logs uletnaya-cron`)
- [ ] Первый pg-backup создан в `/opt/uletnaya/backups/`
- [ ] (Опц.) Настроена выгрузка в Yandex Object Storage

### Безопасность
- [ ] UFW открыт только 22, 80, 443
- [ ] Postgres порт 5432 закрыт наружу (`127.0.0.1:5432:5432` в compose)
- [ ] SSH запрещён по паролю (`PasswordAuthentication no` в `/etc/ssh/sshd_config`)
- [ ] Fail2ban установлен (`apt install fail2ban`)
- [ ] Регулярные обновления: `unattended-upgrades` включён

### Мониторинг
- [ ] Sentry DSN заведён в `.env.production`
- [ ] (Опц.) UptimeRobot пингует `/api/health` каждые 5 мин
- [ ] (Опц.) Telegram-уведомления о деплоях в Actions работают

---

## Деплой mobile app (без изменений)

Mobile app собирается через **EAS Build** (это сервис Expo, не Vercel). В `EXPO_PUBLIC_API_URL` указываем `https://api.uletnayaparkovka.ru` — приложение работает с self-hosted API так же, как с Vercel-API.

См. `apps/mobile/eas.json` и `08-phase-5-release.md`.
