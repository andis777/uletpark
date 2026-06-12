# Minimal outbound-only Exim4 + DKIM for Уletnaya Parkovka
# Сервис без аутентификации внутри docker network — слушает на 25, шлёт во внешние MX.
FROM alpine:3.20

RUN apk add --no-cache exim exim-doc openssl bash tini ca-certificates tzdata \
 && rm -rf /var/cache/apk/*

# Кладём конфиг и стартовый скрипт
COPY exim.conf /etc/exim/exim.conf
COPY start.sh /usr/local/bin/start-mailer.sh
RUN chmod +x /usr/local/bin/start-mailer.sh

# Тома для DKIM ключей и почтовой очереди (persist между перезапусками)
VOLUME ["/etc/exim/dkim", "/var/spool/exim"]

EXPOSE 25

ENV TZ=Europe/Moscow

ENTRYPOINT ["/sbin/tini","--"]
CMD ["/usr/local/bin/start-mailer.sh"]
