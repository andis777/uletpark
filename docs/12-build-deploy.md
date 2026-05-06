# Сборка и деплой — справочник

Два скрипта-обёртки покрывают весь lifecycle:

- **`deploy.sh`** — серверная сторона (на VPS в `/opt/uletnaya`)
- **`build-mobile.sh`** — клиентская сборка (Web/Android/iOS)

---

## deploy.sh — серверный

### Команды

| Команда | Что делает |
|---|---|
| `./deploy.sh init` | Первичная установка: pull образов + миграции + seed правил/админа + старт всего стека |
| `./deploy.sh build` | Пересобрать api Docker-образ |
| `./deploy.sh up` / `start` | Запустить весь стек (postgres + api + cron) |
| `./deploy.sh down` / `stop` | Остановить стек |
| `./deploy.sh restart` | Рестарт api без перезапуска БД |
| `./deploy.sh deploy` | **Для CI/CD:** git pull → build → up → healthcheck |
| `./deploy.sh migrate` | `drizzle-kit push` — синк схемы из `packages/db/schema.ts` в БД |
| `./deploy.sh seed` | Default loyalty rules + admin user + analytics views |
| `./deploy.sh logs [сервис]` | Хвост логов (api по умолчанию) |
| `./deploy.sh status` / `ps` | Статус контейнеров + healthcheck публичного и локального API |
| `./deploy.sh backup` | `pg_dump` в `/opt/uletnaya/backups/uletnaya-YYYYMMDD-HHMMSS.sql.gz`, ротация >30 дней |
| `./deploy.sh shell` / `psql` | Открыть `psql` в контейнере БД |
| `./deploy.sh help` | Справка |

### Где запускать

```bash
ssh root@194.87.222.67
cd /opt/uletnaya
./deploy.sh status
```

### Как обновить код вручную (без GitHub Actions)

```bash
# 1. Внёс правку локально, закоммитил, запушил в git
cd "G:/www2/Улетная парковка/mobile-platform"
git add -A && git commit -m "fix: ..." && git push

# 2. На сервере одной командой
ssh root@194.87.222.67 "/opt/uletnaya/deploy.sh deploy"
```

### Как запустить миграцию схемы

После правок в `packages/db/schema.ts`:
```bash
ssh root@194.87.222.67 "/opt/uletnaya/deploy.sh migrate"
```

`drizzle-kit push --force` сразу применит изменения. Безопасно для аддитивных изменений (новые таблицы/колонки). Для drop/rename — лучше через `drizzle-kit generate` + manual review.

### Сценарий полного восстановления с нуля

Если сервер пересоздан или диск чист:

```bash
ssh root@194.87.222.67
mkdir -p /opt/uletnaya && cd /opt/uletnaya
git clone git@github.com:andis777/uletpark.git .
cp .env.production.example .env.production
nano .env.production   # заполнить секреты
./deploy.sh init
```

Через 5-10 минут API на `127.0.0.1:7982` + Postgres + Cron.

---

## build-mobile.sh — клиентский

### Команды

| Команда | Что делает | Результат |
|---|---|---|
| `./build-mobile.sh web` | Static export через `expo export --platform web` | `apps/mobile/dist-web/` — index.html + JS bundle 1.25 MB |
| `./build-mobile.sh dev` | EAS Build → preview APK для внутреннего теста | Скачиваемый APK на expo.dev |
| `./build-mobile.sh android` | EAS Build → production AAB для Google Play | AAB на expo.dev, готов к submit |
| `./build-mobile.sh ios` | EAS Build → production IPA для App Store | IPA на expo.dev (нужен Apple Dev) |
| `./build-mobile.sh all` | web + android + ios | три артефакта |
| `./build-mobile.sh submit` | `eas submit` последних build'ов | загрузка в сторы |
| `./build-mobile.sh local-android` | Локальный APK через `expo prebuild` + Gradle | `android/app/build/outputs/apk/release/app-release.apk` |

### Web build (готов)

```bash
cd "G:/www2/Улетная парковка/mobile-platform"
./build-mobile.sh web
# → apps/mobile/dist-web/
```

Проверено — собирается за 1-2 минуты, output:
```
dist-web/
├── index.html (1.2 kB)
├── _expo/static/js/web/entry-*.js (1.25 MB)
├── metadata.json
└── assets/  (иконки, сплеш)
```

Можно деплоить на любой статический хостинг или раздавать через nginx как `app.uletnayaparkovka.ru`. Запросы к API (`http://api.uletnayaparkovka.ru`) работают через CORS.

### Native builds (нужен EAS)

Один раз:
```bash
npm i -g eas-cli
eas login   # email + пароль от expo.dev
```

Дальше:
```bash
./build-mobile.sh dev      # preview APK для тестирования (10-15 мин на серверах Expo)
./build-mobile.sh android  # production AAB
./build-mobile.sh ios      # production IPA (нужен Apple Dev $99/год)
```

### iOS — что нужно для production

1. Apple Developer аккаунт ($99/год)
2. App Store Connect → создать App ID `ru.uletnayaparkovka.app`
3. В `apps/mobile/eas.json` заполнить:
   ```json
   "submit": {
     "production": {
       "ios": {
         "appleId": "ваш@email.com",
         "ascAppId": "1234567890",
         "appleTeamId": "ABCD123456"
       }
     }
   }
   ```
4. `./build-mobile.sh ios` → `./build-mobile.sh submit`

### Android — что нужно для production

1. Google Play Console аккаунт ($25 разово)
2. Создать service account и положить JSON в `apps/mobile/play-store-credentials.json` (уже описан в `.gitignore`)
3. В `apps/mobile/eas.json` (уже настроено):
   ```json
   "submit": { "production": { "android": { "track": "internal" } } }
   ```
4. `./build-mobile.sh android` → `./build-mobile.sh submit`

---

## Полный сценарий «релиз новой версии»

После правок на mobile или backend:

```bash
# Локально
cd "G:/www2/Улетная парковка/mobile-platform"
git add -A
git commit -m "feat: новая фича"
git push origin main

# Backend на сервер
ssh root@194.87.222.67 "/opt/uletnaya/deploy.sh deploy"

# Mobile сборка (если поменялся код mobile/)
./build-mobile.sh web      # web статика обновится сразу
./build-mobile.sh android  # AAB для Play Store
./build-mobile.sh ios      # IPA для App Store
./build-mobile.sh submit   # отправить в сторы
```

Total: ~5 мин backend + 20-30 мин native builds (на Expo серверах, в фоне).

---

## CI/CD (опционально)

`.github/workflows/deploy.yml` уже настроен — после push в `main` SSH-конится в `/opt/uletnaya` и сам вызывает `./deploy.sh deploy`. Чтобы заработало — настрой 5 GitHub Secrets (см. `docs/11-github-deploy.md`).

Для mobile build в CI: GitHub Actions может вызвать `eas build` — нужно `EXPO_TOKEN` в secrets. Шаблон workflow добавим если потребуется.
