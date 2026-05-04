#!/usr/bin/env bash
# =========================================================================
# Одноразовая установка production-сервера (Ubuntu 22.04+)
# Запуск с правами sudo:
#   curl -fsSL https://raw.githubusercontent.com/ВЛАДЕЛЕЦ/uletnaya/main/deploy/scripts/setup-server.sh | bash
# Или вручную:
#   bash deploy/scripts/setup-server.sh
# =========================================================================

set -euo pipefail

DEPLOY_DIR="/opt/uletnaya"
DOMAIN="api.uletnayaparkovka.ru"
EMAIL="ariswebru@gmail.com"   # для Let's Encrypt

echo "→ Этот скрипт настроит Ubuntu сервер для запуска uletnaya-api"
echo "  Deploy dir: $DEPLOY_DIR"
echo "  Domain:     $DOMAIN"
read -p "Продолжить? (y/N) " ok
[[ "$ok" == "y" || "$ok" == "Y" ]] || exit 1

# 1. Обновление системы
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw

# 2. Установка Docker + Compose plugin
if ! command -v docker &>/dev/null; then
  echo "→ Установка Docker"
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  echo "  ⚠ Перезайди по SSH чтобы заработал docker без sudo"
fi

# 3. Firewall
echo "→ UFW"
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 4. Создание deploy-директории
echo "→ Подготовка $DEPLOY_DIR"
sudo mkdir -p "$DEPLOY_DIR"
sudo chown "$USER:$USER" "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"/{deploy/nginx,deploy/postgres,deploy/scripts,deploy/letsencrypt,deploy/letsencrypt-www,backups}

echo "→ Скопируй с локальной машины:"
echo "  - docker-compose.yml"
echo "  - deploy/nginx/nginx.conf"
echo "  - deploy/postgres/init.sql"
echo "  - deploy/scripts/cron-jobs.sh, deploy/scripts/crontab"
echo "  - .env.production (заполненный с реальными токенами)"
echo "Или склонируй репо: git clone git@github.com:ВЛАДЕЛЕЦ/uletnaya.git $DEPLOY_DIR/repo"

# 5. Let's Encrypt cert (один раз)
echo
echo "→ После того как DNS направлен на этот сервер, запусти:"
echo "   sudo apt install -y certbot"
echo "   sudo certbot certonly --standalone -d $DOMAIN --email $EMAIL --agree-tos --no-eff-email"
echo "   sudo cp -r /etc/letsencrypt $DEPLOY_DIR/deploy/"
echo "   sudo chown -R \$USER:\$USER $DEPLOY_DIR/deploy/letsencrypt"

echo
echo "→ Авто-обновление cert: добавь в crontab корня:"
echo "   0 3 * * * certbot renew --quiet --deploy-hook 'docker compose -f $DEPLOY_DIR/docker-compose.yml restart nginx'"

echo
echo "→ После всего — запуск:"
echo "   cd $DEPLOY_DIR && docker compose up -d"

echo
echo "✓ Setup завершён."
