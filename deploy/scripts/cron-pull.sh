#!/usr/bin/env bash
# =========================================================================
# Cron-pull fallback: каждые 2 минуты сервер сам себя обновляет, если
# заметил, что origin/main ушёл вперёд.
# Срабатывает только если GitHub Actions runner упал/перегружен.
#
# Установка (раз):
#   sudo cp deploy/scripts/cron-pull.sh /usr/local/bin/uletnaya-cron-pull.sh
#   sudo chmod +x /usr/local/bin/uletnaya-cron-pull.sh
#   sudo touch /var/log/uletnaya-cron-pull.log
#   (crontab -l 2>/dev/null | grep -v uletnaya-cron-pull; \
#    echo "*/2 * * * * /usr/local/bin/uletnaya-cron-pull.sh") | sudo crontab -
# =========================================================================
set -euo pipefail
APP_DIR=/opt/uletnaya
LOG=/var/log/uletnaya-cron-pull.log
LOCK=/tmp/uletnaya-cron-pull.lock

# Single-instance lock (flock)
exec 9>"$LOCK" || exit 0
flock -n 9 || exit 0

cd "$APP_DIR"

before=$(git rev-parse HEAD 2>/dev/null || echo "none")
git fetch --quiet origin main 2>/dev/null || exit 0
after=$(git rev-parse origin/main 2>/dev/null || echo "none")

[ "$before" = "$after" ] && exit 0  # ничего не изменилось

echo "[$(date -u +%FT%TZ)] cron-pull: $before → $after" >> "$LOG"
bash /usr/local/bin/uletnaya-deploy.sh >> "$LOG" 2>&1
