#!/usr/bin/env bash
# =========================================================================
# Ручная выкатка API на боевой сервер.
#
# ЗАЧЕМ ЭТО НУЖНО: workflow "Deploy API" бежит на self-hosted runner
# (5065331-st93568) и собирает/поднимает контейнеры У СЕБЯ, а публичный
# api.uletnayaparkovka.ru обслуживает ДРУГАЯ машина (PROD_HOST).
# Поэтому CI-деплой до прода не доезжает — выкатываем этим скриптом.
#
# ПОЧЕМУ НЕ СОБИРАЕМ НА СЕРВЕРЕ: там мало RAM и ~3 ГБ свободного диска.
# Собираем локально и стримим готовый образ по SSH.
#
# Использование:
#   ./deploy/scripts/deploy-to-prod.sh            # собрать + выкатить
#   SKIP_BUILD=1 ./deploy/scripts/deploy-to-prod.sh   # выкатить уже собранный образ
#
# Переменные окружения (можно переопределить):
#   PROD_HOST  — хост прода            (по умолчанию 46.151.25.228)
#   SSH_KEY    — ppk-ключ для plink    (по умолчанию /e/www/.ssh/root_aris.ppk)
#   REMOTE_DIR — каталог с compose     (по умолчанию /opt/uletnaya)
# =========================================================================
set -euo pipefail

PROD_HOST="${PROD_HOST:-46.151.25.228}"
SSH_KEY="${SSH_KEY:-/e/www/.ssh/root_aris.ppk}"
REMOTE_DIR="${REMOTE_DIR:-/opt/uletnaya}"
COMPOSE_FILE="docker-compose.fastpanel.yml"
IMAGE="uletnaya/api:local"

cd "$(dirname "$0")/../.."   # корень репозитория

COMMIT="$(git rev-parse HEAD)"
SHORT="$(git rev-parse --short HEAD)"

# plink (Windows/Git Bash) или обычный ssh — что найдётся
if command -v plink.exe >/dev/null 2>&1 || [ -x "$(dirname "$SSH_KEY")/plink.exe" ]; then
  PLINK="$(dirname "$SSH_KEY")/plink.exe"
  remote() { echo y | "$PLINK" -ssh -i "$SSH_KEY" -batch "root@$PROD_HOST" "$1"; }
  remote_stdin() { "$PLINK" -ssh -i "$SSH_KEY" -batch "root@$PROD_HOST" "$1"; }
else
  remote() { ssh "root@$PROD_HOST" "$1"; }
  remote_stdin() { ssh "root@$PROD_HOST" "$1"; }
fi

echo "==> Выкатка $SHORT на $PROD_HOST"

# --- Проверка, что рабочая копия чистая (иначе выкатим не то, что в git) ---
if [ -n "$(git status --porcelain)" ]; then
  echo "!! В рабочей копии есть незакоммиченные изменения:"
  git status --short
  echo "!! Прод должен соответствовать коммиту. Закоммить или спрячь их (git stash)."
  exit 1
fi

# --- 1) Сборка локально (APP_COMMIT попадёт в /api/health) ---
if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "==> Сборка образа (linux/amd64, APP_COMMIT=$SHORT)..."
  docker build --platform linux/amd64 --build-arg "APP_COMMIT=$COMMIT" -t "$IMAGE" .
fi

# --- 2) Освобождаем место и стримим образ ---
echo "==> Свободное место на сервере до выкатки:"
remote "df -h / | tail -1"
remote "docker image prune -f >/dev/null 2>&1 || true"

echo "==> Стримим образ на сервер (~220 МБ)..."
docker save "$IMAGE" | gzip -1 | remote_stdin "gunzip | docker load"

# --- 3) Пересоздаём контейнер ---
# ВАЖНО: --env-file .env.production ОБЯЗАТЕЛЕН. На сервере нет .env, а POSTGRES_PASSWORD
# и DATABASE_URL собираются интерполяцией compose (${POSTGRES_PASSWORD}). Без env-файла
# пароль подставится пустым → api не подключится к БД (db:down), а postgres пересоздастся.
echo "==> Поднимаем api..."
remote "cd $REMOTE_DIR && docker compose --env-file .env.production -f $COMPOSE_FILE up -d api"

# --- 4) Проверка: сервис жив И отдаёт ИМЕННО этот коммит ---
echo "==> Проверка health..."
for i in 1 2 3 4 5 6; do
  body="$(remote "curl -s --max-time 8 http://127.0.0.1:7982/api/health" || true)"
  case "$body" in *'"ok":true'*) break ;; esac
  echo "   попытка $i — ещё поднимается..."
  sleep 5
done
echo "   health: $body"

deployed="$(printf '%s' "$body" | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p')"
if [ "$deployed" != "$COMMIT" ]; then
  echo "!! Прод отдаёт коммит '$deployed', а ожидался '$COMMIT' — выкатка НЕ применилась."
  exit 1
fi

echo "==> Публичный URL:"
curl -s --max-time 10 https://api.uletnayaparkovka.ru/api/health || true
echo ""
echo "✓ Готово: прод обновлён до $SHORT"
