#!/bin/sh
# =========================================================================
# Cron jobs runner — запускается в alpine cron контейнере.
# Дёргает HTTP-эндпоинты api контейнера с CRON_SECRET в заголовке.
# Заменяет Vercel Cron в self-hosted setup.
# =========================================================================

set -e
ACTION="$1"

API="http://api:3000"
SECRET="${CRON_SECRET:?CRON_SECRET env var required}"

case "$ACTION" in
  refresh-analytics)
    echo "[$(date -Iseconds)] refresh-analytics"
    curl -fsS -X GET "$API/api/cron/refresh-analytics" \
      -H "Authorization: Bearer $SECRET"
    echo
    ;;

  sync-amocrm)
    echo "[$(date -Iseconds)] sync-amocrm (incremental)"
    curl -fsS -X POST "$API/api/cron/sync-amocrm" \
      -H "Authorization: Bearer $SECRET" \
      -H "Content-Type: application/json" \
      -d '{"sinceDays":1}'
    echo
    ;;

  pg-backup)
    DATE=$(date +%Y%m%d-%H%M)
    OUT="/backups/uletnaya-$DATE.sql.gz"
    mkdir -p /backups
    echo "[$(date -Iseconds)] pg-backup → $OUT"
    PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
      -h postgres \
      -U "${POSTGRES_USER:-uletnaya}" \
      -d "${POSTGRES_DB:-uletnaya}" \
      --no-owner --no-privileges \
      | gzip > "$OUT"
    # Удаляем бэкапы старше 30 дней
    find /backups -name "uletnaya-*.sql.gz" -mtime +30 -delete
    echo "Backup OK: $(du -h $OUT | cut -f1)"
    ;;

  *)
    echo "Usage: $0 {refresh-analytics|sync-amocrm|pg-backup}"
    exit 1
    ;;
esac
