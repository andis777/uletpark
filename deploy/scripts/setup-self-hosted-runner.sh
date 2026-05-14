#!/usr/bin/env bash
# =========================================================================
# One-shot installer for a self-hosted GitHub Actions runner on Ubuntu.
# Target server: 194.87.222.67 (uletnaya prod)
#
# Usage:
#   1) Get a registration token from:
#      https://github.com/andis777/uletpark/settings/actions/runners/new?arch=x64&os=linux
#   2) Copy this script to the server (or run via SSH heredoc)
#   3) sudo bash setup-self-hosted-runner.sh <REGISTRATION_TOKEN>
#
# The script is idempotent — safe to run again to upgrade the runner.
# =========================================================================
set -euo pipefail

REPO_URL="https://github.com/andis777/uletpark"
RUNNER_NAME="${RUNNER_NAME:-$(hostname)}"
RUNNER_LABELS="self-hosted,prod,uletnaya,docker"
RUNNER_USER="github-runner"
RUNNER_DIR="/opt/actions-runner"
DEPLOY_SCRIPT="/usr/local/bin/uletnaya-deploy.sh"

if [ "$(id -u)" -ne 0 ]; then
  echo "✗ Run as root (use sudo)" >&2
  exit 1
fi

TOKEN="${1:-}"
if [ -z "$TOKEN" ]; then
  echo "✗ Usage: sudo bash $0 <REGISTRATION_TOKEN>"
  echo ""
  echo "Get token at: ${REPO_URL}/settings/actions/runners/new?arch=x64&os=linux"
  exit 1
fi

echo "════════════════════════════════════════════════════════════"
echo "  Self-hosted GitHub Actions Runner Setup"
echo "  Repo:   $REPO_URL"
echo "  Name:   $RUNNER_NAME"
echo "  Labels: $RUNNER_LABELS"
echo "════════════════════════════════════════════════════════════"

# 1. Базовые пакеты
echo "→ [1/8] Installing prerequisites..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl jq tar git docker.io
if ! docker --version >/dev/null 2>&1; then
  echo "✗ docker not available after install — abort" >&2
  exit 1
fi

# 2. Пользователь github-runner
echo "→ [2/8] Creating user '$RUNNER_USER'..."
if ! id -u "$RUNNER_USER" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "$RUNNER_USER"
fi
# Добавляем в группу docker (если есть)
if getent group docker >/dev/null; then
  usermod -aG docker "$RUNNER_USER"
fi

# 3. sudo NOPASSWD на deploy-скрипт + docker
echo "→ [3/8] Configuring sudoers..."
cat > /etc/sudoers.d/github-runner <<EOF
$RUNNER_USER ALL=(root) NOPASSWD: $DEPLOY_SCRIPT
$RUNNER_USER ALL=(root) NOPASSWD: /usr/bin/docker
$RUNNER_USER ALL=(root) NOPASSWD: /usr/local/bin/docker
EOF
chmod 440 /etc/sudoers.d/github-runner
visudo -c -f /etc/sudoers.d/github-runner

# 4. Скачать runner (latest)
echo "→ [4/8] Downloading runner..."
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

RUNNER_VER=$(curl -s https://api.github.com/repos/actions/runner/releases/latest \
  | jq -r .tag_name | sed 's/^v//')
echo "    Latest version: v$RUNNER_VER"

# Если уже установлен — остановить старый сервис
if [ -f "$RUNNER_DIR/svc.sh" ]; then
  echo "    Existing installation detected — stopping old service..."
  ./svc.sh stop 2>/dev/null || true
  ./svc.sh uninstall 2>/dev/null || true
fi

# Если уже сконфигурирован — удалить регистрацию (нужен старый token)
if [ -f "$RUNNER_DIR/.runner" ]; then
  echo "    Removing previous runner registration..."
  sudo -u "$RUNNER_USER" ./config.sh remove --token "$TOKEN" 2>/dev/null || \
    echo "    (Old token expired — config will be overwritten)"
fi

TARBALL="actions-runner-linux-x64-${RUNNER_VER}.tar.gz"
curl -L -o "$TARBALL" \
  "https://github.com/actions/runner/releases/download/v${RUNNER_VER}/${TARBALL}"
tar xzf "$TARBALL"
rm "$TARBALL"
chown -R "$RUNNER_USER":"$RUNNER_USER" "$RUNNER_DIR"

# 5. Зарегистрировать runner
echo "→ [5/8] Registering runner with GitHub..."
sudo -u "$RUNNER_USER" ./config.sh \
  --url "$REPO_URL" \
  --token "$TOKEN" \
  --name "$RUNNER_NAME" \
  --labels "$RUNNER_LABELS" \
  --work "_work" \
  --unattended \
  --replace

# 6. Установить как systemd-сервис
echo "→ [6/8] Installing systemd service..."
./svc.sh install "$RUNNER_USER"
./svc.sh start
sleep 2
./svc.sh status | head -5

# 7. Создать deploy-скрипт
echo "→ [7/8] Installing deploy script at $DEPLOY_SCRIPT..."
cat > "$DEPLOY_SCRIPT" <<'EOF'
#!/usr/bin/env bash
# Деплой uletnaya — вызывается self-hosted runner через sudo.
# Идемпотентен. Логи: journalctl -t uletnaya-deploy.
set -euo pipefail
APP_DIR=/opt/uletnaya
LOG_TAG=uletnaya-deploy

log() { echo "[$(date -u +%FT%TZ)] $*"; logger -t "$LOG_TAG" "$*"; }

cd "$APP_DIR"

log "→ git fetch + reset to origin/main..."
git fetch --quiet origin main
git reset --hard origin/main

log "→ docker compose build api..."
docker compose -f docker-compose.fastpanel.yml --env-file .env.production build api

log "→ docker compose up -d api..."
docker compose -f docker-compose.fastpanel.yml --env-file .env.production up -d api

log "→ docker image prune..."
docker image prune -f >/dev/null

log "→ healthcheck on 127.0.0.1:7982/api/health..."
for i in 1 2 3 4 5 6 7 8; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:7982/api/health || echo 000)
  if [ "$code" = "200" ]; then
    log "✓ healthy on attempt $i"
    exit 0
  fi
  log "  retry $i: HTTP $code"
  sleep 4
done

log "✗ healthcheck failed after 8 attempts"
docker compose -f docker-compose.fastpanel.yml logs api --tail 30
exit 1
EOF
chmod +x "$DEPLOY_SCRIPT"

# 8. Проверить git-доступ
echo "→ [8/8] Verifying git access from /opt/uletnaya..."
if [ -d /opt/uletnaya/.git ]; then
  cd /opt/uletnaya
  if git ls-remote origin >/dev/null 2>&1; then
    echo "    ✓ Git remote OK"
  else
    echo "    ⚠ Git remote unreachable. Set up Deploy Key:"
    echo "       1) ssh-keygen -t ed25519 -N '' -f /root/.ssh/github_deploy -C uletnaya-deploy"
    echo "       2) cat /root/.ssh/github_deploy.pub  ← add to $REPO_URL/settings/keys"
    echo "       3) git remote set-url origin git@github.com:andis777/uletpark.git"
  fi
else
  echo "    ⚠ /opt/uletnaya not a git repo — set it up first."
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✓ Self-hosted runner installed and running"
echo "  ✓ Deploy script:  $DEPLOY_SCRIPT"
echo "  ✓ Service:        actions.runner.andis777-uletpark.${RUNNER_NAME}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Check status:    ${RUNNER_DIR}/svc.sh status"
echo "Stream logs:     journalctl -u 'actions.runner.andis777-uletpark.*' -f"
echo "Runner UI:       ${REPO_URL}/settings/actions/runners  (must be 'Idle')"
echo ""
echo "Next: update .github/workflows/deploy.yml to use:"
echo "       runs-on: [self-hosted, uletnaya]"
