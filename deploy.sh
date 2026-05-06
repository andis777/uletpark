#!/usr/bin/env bash
# =========================================================================
# Улётная Mobile Platform — deploy script
#
# Один скрипт для всех серверных операций. Запуск из /opt/uletnaya:
#   ./deploy.sh init       — первичная установка (compose pull + миграции + seed)
#   ./deploy.sh build      — пересобрать api образ
#   ./deploy.sh up         — запустить весь стек
#   ./deploy.sh down       — остановить стек
#   ./deploy.sh restart    — рестарт api (без БД)
#   ./deploy.sh deploy     — git pull → build → up → healthcheck (CI/CD path)
#   ./deploy.sh migrate    — drizzle-kit push (схема → БД)
#   ./deploy.sh seed       — seed loyalty rules + admin
#   ./deploy.sh logs [api] — посмотреть логи (api по умолчанию)
#   ./deploy.sh status     — статус контейнеров + healthcheck
#   ./deploy.sh backup     — pg_dump → /opt/uletnaya/backups
#   ./deploy.sh shell      — psql в БД
# =========================================================================

set -euo pipefail

DEPLOY_DIR="/opt/uletnaya"
COMPOSE_FILE="docker-compose.fastpanel.yml"
ENV_FILE=".env.production"
DC="docker compose -f $COMPOSE_FILE --env-file $ENV_FILE"
API_URL="http://127.0.0.1:7982"
PUBLIC_URL="http://api.uletnayaparkovka.ru"

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}→${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC}  $*"; }
err()  { echo -e "${RED}✗${NC}  $*" >&2; }

require_dir() {
  if [[ ! -d "$DEPLOY_DIR" ]]; then
    err "Deploy dir $DEPLOY_DIR не существует. Запусти setup-server.sh"
    exit 1
  fi
  cd "$DEPLOY_DIR"
}

require_env() {
  if [[ ! -f "$DEPLOY_DIR/$ENV_FILE" ]]; then
    err "Нет $ENV_FILE. Создай из .env.production.example"
    exit 1
  fi
}

healthcheck() {
  log "Healthcheck $API_URL/api/health..."
  for i in 1 2 3 4 5 6 7 8; do
    if curl -fsS --max-time 5 "$API_URL/api/health" >/dev/null 2>&1; then
      log "✓ API отвечает"
      curl -fsS "$API_URL/api/health"
      echo
      return 0
    fi
    echo "  попытка $i..."
    sleep 3
  done
  err "API не отвечает после 8 попыток"
  $DC logs api --tail 30
  return 1
}

cmd_init() {
  require_dir
  require_env

  log "Инициализация сервера: pull + build + migrate + seed"
  $DC pull postgres cron
  $DC build api
  $DC up -d postgres
  log "Жду postgres healthy..."
  sleep 10
  cmd_migrate
  cmd_seed
  $DC up -d
  healthcheck
  log "✓ Init завершён"
}

cmd_build() {
  require_dir; require_env
  log "Build api образа"
  $DC build api
}

cmd_up() {
  require_dir; require_env
  log "Запуск стека"
  $DC up -d
  sleep 5
  healthcheck
}

cmd_down() {
  require_dir
  log "Остановка стека"
  $DC down
}

cmd_restart() {
  require_dir; require_env
  log "Restart api"
  $DC restart api
  sleep 5
  healthcheck
}

cmd_deploy() {
  require_dir; require_env

  log "Deploy: git pull → build → up → healthcheck"

  if [[ -d .git ]]; then
    log "git fetch + reset --hard origin/main"
    git fetch --all
    git reset --hard origin/main
  else
    warn "Не git-репо, пропускаю pull"
  fi

  $DC build api
  $DC up -d api
  sleep 8

  if healthcheck; then
    log "✓ Deploy успешен"
    docker image prune -f >/dev/null 2>&1 || true
  else
    err "Deploy упал на healthcheck"
    exit 1
  fi
}

cmd_migrate() {
  require_dir; require_env

  log "Drizzle migrate (push schema)"
  PG_PASS=$(grep ^POSTGRES_PASSWORD "$ENV_FILE" | cut -d= -f2-)
  PG_USER=$(grep ^POSTGRES_USER "$ENV_FILE" | cut -d= -f2- || echo "uletnaya")
  PG_DB=$(grep ^POSTGRES_DB "$ENV_FILE" | cut -d= -f2- || echo "uletnaya")

  docker run --rm \
    --network uletnaya_uletnaya \
    -v "$DEPLOY_DIR":/app -w /app \
    -e DATABASE_URL="postgres://${PG_USER:-uletnaya}:${PG_PASS}@postgres:5432/${PG_DB:-uletnaya}" \
    node:22-alpine sh -c '
      corepack enable &&
      corepack prepare pnpm@9.12.0 --activate &&
      pnpm install --no-frozen-lockfile --silent 2>&1 | tail -1 &&
      cd packages/db &&
      pnpm exec drizzle-kit push --force
    '
}

cmd_seed() {
  require_dir; require_env
  PG_PASS=$(grep ^POSTGRES_PASSWORD "$ENV_FILE" | cut -d= -f2-)
  PG_USER=$(grep ^POSTGRES_USER "$ENV_FILE" | cut -d= -f2- || echo "uletnaya")
  PG_DB=$(grep ^POSTGRES_DB "$ENV_FILE" | cut -d= -f2- || echo "uletnaya")

  log "Seed: loyalty rules + admin"
  docker run --rm \
    --network uletnaya_uletnaya \
    -v "$DEPLOY_DIR":/app -w /app \
    -e DATABASE_URL="postgres://${PG_USER:-uletnaya}:${PG_PASS}@postgres:5432/${PG_DB:-uletnaya}" \
    -e ADMIN_EMAIL="${ADMIN_EMAIL:-ariswebru@gmail.com}" \
    -e ADMIN_PASSWORD="${ADMIN_PASSWORD:-UletnayaAdmin2026!}" \
    node:22-alpine sh -c '
      corepack enable &&
      corepack prepare pnpm@9.12.0 --activate &&
      pnpm install --no-frozen-lockfile --silent 2>&1 | tail -1 &&
      pnpm db:seed:loyalty 2>&1 | tail -5 &&
      pnpm db:seed:admin 2>&1 | tail -3 &&
      pnpm db:migrate:analytics 2>&1 | tail -3
    '
}

cmd_logs() {
  require_dir
  local service="${1:-api}"
  $DC logs -f "$service" --tail 100
}

cmd_status() {
  require_dir
  log "Контейнеры"
  $DC ps
  echo
  log "Public URL"
  curl -fsS --max-time 5 "$PUBLIC_URL/api/health" 2>&1 || echo "  (внешний URL недоступен)"
  echo
  log "Локально"
  curl -fsS --max-time 5 "$API_URL/api/health" 2>&1 || echo "  (локально упал!)"
  echo
}

cmd_backup() {
  require_dir; require_env
  PG_PASS=$(grep ^POSTGRES_PASSWORD "$ENV_FILE" | cut -d= -f2-)
  PG_USER=$(grep ^POSTGRES_USER "$ENV_FILE" | cut -d= -f2- || echo "uletnaya")
  PG_DB=$(grep ^POSTGRES_DB "$ENV_FILE" | cut -d= -f2- || echo "uletnaya")

  mkdir -p "$DEPLOY_DIR/backups"
  local ts; ts=$(date +%Y%m%d-%H%M%S)
  local out="$DEPLOY_DIR/backups/uletnaya-$ts.sql.gz"

  log "Backup в $out"
  docker exec uletnaya-postgres pg_dump \
    -U "${PG_USER:-uletnaya}" -d "${PG_DB:-uletnaya}" \
    --no-owner --no-privileges \
    | gzip > "$out"

  # Чистим бэкапы старше 30 дней
  find "$DEPLOY_DIR/backups" -name "uletnaya-*.sql.gz" -mtime +30 -delete
  log "✓ Backup сделан: $(du -h $out | cut -f1)"
}

cmd_shell() {
  require_dir; require_env
  PG_USER=$(grep ^POSTGRES_USER "$ENV_FILE" | cut -d= -f2- || echo "uletnaya")
  PG_DB=$(grep ^POSTGRES_DB "$ENV_FILE" | cut -d= -f2- || echo "uletnaya")
  log "psql ${PG_USER:-uletnaya}@${PG_DB:-uletnaya}"
  docker exec -it uletnaya-postgres psql -U "${PG_USER:-uletnaya}" -d "${PG_DB:-uletnaya}"
}

cmd_help() {
  cat <<EOF
Улётная — server deploy script

Использование: ./deploy.sh <команда>

  init       первичная установка (compose pull + миграции + seed)
  build      пересобрать api образ
  up         запустить весь стек
  down       остановить стек
  restart    рестарт api (без БД)
  deploy     git pull → build → up → healthcheck (для CI/CD)
  migrate    drizzle-kit push (схема → БД)
  seed       seed loyalty rules + admin
  logs [сервис]   посмотреть логи (api/postgres/cron)
  status     статус контейнеров + healthcheck
  backup     pg_dump в backups/
  shell      psql в БД

Окружение: $DEPLOY_DIR
Compose:   $COMPOSE_FILE
Env:       $ENV_FILE
Public:    $PUBLIC_URL
EOF
}

case "${1:-help}" in
  init)     cmd_init ;;
  build)    cmd_build ;;
  up|start) cmd_up ;;
  down|stop) cmd_down ;;
  restart)  cmd_restart ;;
  deploy)   cmd_deploy ;;
  migrate)  cmd_migrate ;;
  seed)     cmd_seed ;;
  logs)     cmd_logs "${2:-api}" ;;
  status|ps) cmd_status ;;
  backup)   cmd_backup ;;
  shell|psql) cmd_shell ;;
  help|-h|--help) cmd_help ;;
  *)
    err "Неизвестная команда: $1"
    cmd_help
    exit 1
    ;;
esac
