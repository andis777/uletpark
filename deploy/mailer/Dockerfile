# Minimal outbound-only Exim4 + DKIM for Уletnaya Parkovka
# Сервис без аутентификации внутри docker network — слушает на 25, шлёт во внешние MX.
FROM alpine:3.20

RUN apk add --no-cache exim exim-doc openssl bash tini ca-certificates tzdata \
 && rm -rf /var/cache/apk/*

# Кладём конфиг и стартовый скрипт
COPY exim.conf /etc/exim/exim.conf
COPY start.sh /usr/local/bin/start-mailer.sh
# Exim strict про permissions: файл должен быть root:exim 640 (или 644)
# и НЕ world-writable. После start.sh подставляет hostname в конфиг —
# fixup permissions делаем там, иначе sed-edit ломает права.
RUN chmod +x /usr/local/bin/start-mailer.sh \
 && chown root:exim /etc/exim/exim.conf \
 && chmod 640 /etc/exim/exim.conf

# Тома для DKIM ключей и почтовой очереди (persist между перезапусками)
VOLUME ["/etc/exim/dkim", "/var/spool/exim"]

EXPOSE 25

ENV TZ=Europe/Moscow

ENTRYPOINT ["/sbin/tini","--"]
CMD ["/usr/local/bin/start-mailer.sh"]
