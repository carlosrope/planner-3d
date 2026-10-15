# Servicio de respaldo diario para Railway (cron). Imagen con pg_dump/pg_restore y aws-cli.
# pg_dump debe ser igual o más nuevo que el Postgres de Railway (18 en octubre de 2026; sirve también para versiones anteriores).
ARG PG_VERSION=18
FROM postgres:${PG_VERSION}-alpine
RUN apk add --no-cache aws-cli coreutils
WORKDIR /app
COPY respaldo.sh restaurar.sh ./
RUN chmod +x respaldo.sh restaurar.sh
ENV BACKUP_DIR=/tmp/respaldos
CMD ["./respaldo.sh"]
