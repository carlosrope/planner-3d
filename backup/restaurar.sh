#!/bin/sh
# Restaura un respaldo de Plantea en una base (vacía o existente: se reemplazan las tablas).
#
#   ./backup/restaurar.sh ARCHIVO.dump  postgres://usuario:clave@host:5432/base_destino
#   ./backup/restaurar.sh s3://bucket/plantea/plantea-AAAAMMDD-HHMMSSZ.dump  postgres://...   (con S3_* definidas)
#
# Nunca apunta a producción sin querer: pide escribir SI cuando la base destino no termina en "_restauracion"
# ni en "_prueba", salvo que RESTAURAR_FORZAR=1.
set -eu

SRC="${1:?Uso: restaurar.sh ARCHIVO|s3://... DATABASE_URL_DESTINO}"
TARGET="${2:?Falta la URL de la base destino}"

case "$SRC" in
  s3://*)
    : "${S3_ENDPOINT:?Falta S3_ENDPOINT}"
    export AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY_ID:?Falta S3_ACCESS_KEY_ID}"
    export AWS_SECRET_ACCESS_KEY="${S3_SECRET_ACCESS_KEY:?Falta S3_SECRET_ACCESS_KEY}"
    export AWS_DEFAULT_REGION="${S3_REGION:-auto}"
    export AWS_EC2_METADATA_DISABLED=true
    LOCAL="${BACKUP_DIR:-./respaldos}/$(basename "$SRC")"
    mkdir -p "$(dirname "$LOCAL")"
    echo "[restaurar] descargando $SRC"
    aws --endpoint-url "$S3_ENDPOINT" s3 cp "$SRC" "$LOCAL" --only-show-errors
    SRC="$LOCAL"
    ;;
esac

[ -f "$SRC" ] || { echo "[restaurar] no existe $SRC" >&2; exit 1; }
DBNAME="$(echo "$TARGET" | sed 's#.*/##; s#?.*##')"
case "$DBNAME" in
  *_restauracion|*_prueba) ;;
  *)
    if [ "${RESTAURAR_FORZAR:-}" != "1" ]; then
      printf '[restaurar] La base destino es "%s". Se van a reemplazar sus tablas. Escribe SI para seguir: ' "$DBNAME"
      read -r ok
      [ "$ok" = "SI" ] || { echo "[restaurar] cancelado"; exit 1; }
    fi
    ;;
esac

echo "[restaurar] pg_restore → $DBNAME"
pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --dbname "$TARGET" "$SRC"
echo "[restaurar] tablas y filas en $DBNAME:"
for t in $(psql "$TARGET" -Atc "select tablename from pg_tables where schemaname = 'public' order by 1"); do
  echo "  $t: $(psql "$TARGET" -Atc "select count(*) from \"$t\"")"
done
psql "$TARGET" -Atc "select 'migraciones aplicadas: ' || count(*) from drizzle.__drizzle_migrations" || true
echo "[restaurar] listo"
