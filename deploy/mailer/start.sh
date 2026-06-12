#!/bin/bash
set -euo pipefail

# ENV (передаются через docker-compose):
DOMAIN="${MAIL_DOMAIN:-uletnayaparkovka.ru}"
HOSTNAME="${MAIL_HOSTNAME:-mail.${DOMAIN}}"
DKIM_DIR="/etc/exim/dkim"

mkdir -p "$DKIM_DIR" /var/spool/exim /var/log/exim
chown -R exim:exim /etc/exim /var/spool/exim /var/log/exim 2>/dev/null || true

# 1. Генерируем DKIM ключ если ещё нет
if [ ! -f "$DKIM_DIR/dkim.private" ]; then
  echo "[mailer] Генерирую DKIM RSA 2048..."
  openssl genrsa -out "$DKIM_DIR/dkim.private" 2048 2>/dev/null
  openssl rsa -in "$DKIM_DIR/dkim.private" -pubout -out "$DKIM_DIR/dkim.public" 2>/dev/null
  chmod 600 "$DKIM_DIR/dkim.private"
  chown exim:exim "$DKIM_DIR/dkim.private" 2>/dev/null || true
fi

# 2. Печатаем DNS-записи которые нужно прописать
PUB_KEY=$(grep -v '^-' "$DKIM_DIR/dkim.public" | tr -d '\n')
echo ""
echo "================================================================"
echo "  DNS-записи которые нужно ДОБАВИТЬ в зону ${DOMAIN}:"
echo "================================================================"
echo ""
echo "1) SPF (TXT для @ или ${DOMAIN}.):"
echo "   v=spf1 ip4:194.87.222.67 ~all"
echo ""
echo "2) DKIM (TXT для mail._domainkey.${DOMAIN}.):"
echo "   v=DKIM1; k=rsa; p=${PUB_KEY}"
echo ""
echo "3) DMARC (TXT для _dmarc.${DOMAIN}.):"
echo "   v=DMARC1; p=none; rua=mailto:postmaster@${DOMAIN}; pct=100; aspf=r; adkim=r"
echo ""
echo "4) Hostname (A для ${HOSTNAME}.):"
echo "   194.87.222.67"
echo ""
echo "5) Попроси хостинг прописать PTR (rDNS) для 194.87.222.67:"
echo "   → ${HOSTNAME}"
echo ""
echo "================================================================"
echo ""

# 3. Подставляем env в конфиг
sed -i \
  -e "s|MAILER_HOSTNAME|${HOSTNAME}|g" \
  -e "s|MAILER_DOMAIN|${DOMAIN}|g" \
  /etc/exim/exim.conf

# Восстанавливаем strict permissions после sed-правки
chown root:exim /etc/exim/exim.conf
chmod 640 /etc/exim/exim.conf
chown root:exim /etc/exim 2>/dev/null || true
chmod 750 /etc/exim 2>/dev/null || true

# 4. Проверяем конфиг
echo "[mailer] Проверка конфига..."
exim -bV >/dev/null 2>&1 || true
exim -bP -C /etc/exim/exim.conf primary_hostname || (echo "config error"; exim -bP -C /etc/exim/exim.conf 2>&1 | head -20; exit 1)

# 5. Запуск
echo "[mailer] Запускаю Exim daemon на 0.0.0.0:25..."
# -bd: daemon mode listening on smtp port
# -q15m: процессить очередь каждые 15 минут
# -v: verbose (письма в stdout)
# -d: debug (без +dkim т.к. Alpine собран без него)
exec exim -bd -q15m -v -C /etc/exim/exim.conf
