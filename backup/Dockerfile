# Servicio de respaldo diario para Railway (cron). Imagen con pg_dump/pg_restore y aws-cli.
# La versión de pg_dump debe ser igual o mayor que la del Postgres de Railway: ajustar PG_VERSION.
ARG PG_VERSION=17
FROM postgres:${PG_VERSION}-alpine
RUN apk add --no-cache aws-cli coreutils
WORKDIR /app
COPY respaldo.sh restaurar.sh ./
RUN chmod +x respaldo.sh restaurar.sh
ENV BACKUP_DIR=/tmp/respaldos
CMD ["./respaldo.sh"]
