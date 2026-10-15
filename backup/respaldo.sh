#!/bin/sh
# Respaldo diario de la base de Plantea (Postgres) fuera de Railway.
#
# 1. pg_dump en formato "custom" (comprimido, restaurable con pg_restore).
# 2. Verifica que el archivo se pueda leer (pg_restore --list).
# 3. Si hay variables S3_*, lo sube a un bucket compatible con S3 (Cloudflare R2, Backblaze B2, AWS S3)
#    y borra los respaldos de más de BACKUP_KEEP_DAYS días (30 por omisión).
# Sin variables S3_*, el archivo se queda en BACKUP_DIR (./respaldos): útil en local.
#
# Variables:
#   DATABASE_URL        obligatoria (postgres://usuario:clave@host:5432/base)
#   BACKUP_DIR          carpeta local de trabajo (./respaldos)
#   BACKUP_KEEP_DAYS    días que se conservan en el bucket (30)
#   S3_BUCKET           nombre del bucket; sin él no se sube nada
#   S3_ENDPOINT         https://<account-id>.r2.cloudflarestorage.com (R2) o el de tu proveedor
#   S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY
#   S3_REGION           "auto" en R2 (por omisión)
#   S3_PREFIX           carpeta dentro del bucket (plantea)
set -eu

# Limpia espacios, saltos de línea y comillas que a veces se cuelan al pegar las variables en Railway.
clean() { printf '%s' "$1" | tr -d '\r\n"'"'"'' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'; }
for v in S3_BUCKET S3_ENDPOINT S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY S3_REGION S3_PREFIX; do
  eval "val=\${$v:-}"
  [ -n "$val" ] && eval "$v=\$(clean \"\$val\")"
done
# El endpoint va sin barra final ni el nombre del bucket.
[ -n "${S3_ENDPOINT:-}" ] && S3_ENDPOINT="$(printf '%s' "$S3_ENDPOINT" | sed 's#/*$##')"
[ -n "${S3_ENDPOINT:-}" ] && [ -n "${S3_BUCKET:-}" ] && S3_ENDPOINT="${S3_ENDPOINT%/$S3_BUCKET}"

: "${DATABASE_URL:?Falta DATABASE_URL}"
DIR="${BACKUP_DIR:-./respaldos}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
PREFIX="${S3_PREFIX:-plantea}"
STAMP="$(date -u +%Y%m%d-%H%M%SZ)"
FILE="$DIR/plantea-$STAMP.dump"

mkdir -p "$DIR"
echo "[respaldo] pg_dump → $FILE"
pg_dump --format=custom --compress=6 --no-owner --no-privileges --file "$FILE" "$DATABASE_URL"
pg_restore --list "$FILE" >/dev/null
SIZE="$(wc -c <"$FILE" | tr -d ' ')"
echo "[respaldo] listo: $SIZE bytes"

if [ -z "${S3_BUCKET:-}" ]; then
  echo "[respaldo] sin S3_BUCKET: el respaldo se queda en $FILE"
  exit 0
fi

: "${S3_ENDPOINT:?Falta S3_ENDPOINT}"
export AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY_ID:?Falta S3_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${S3_SECRET_ACCESS_KEY:?Falta S3_SECRET_ACCESS_KEY}"
export AWS_DEFAULT_REGION="${S3_REGION:-auto}"
export AWS_EC2_METADATA_DISABLED=true
KEY="$PREFIX/plantea-$STAMP.dump"

echo "[respaldo] subiendo a s3://$S3_BUCKET/$KEY"
aws --endpoint-url "$S3_ENDPOINT" s3 cp "$FILE" "s3://$S3_BUCKET/$KEY" --only-show-errors
# Comprueba que el objeto existe y pesa lo mismo.
REMOTE_SIZE="$(aws --endpoint-url "$S3_ENDPOINT" s3api head-object --bucket "$S3_BUCKET" --key "$KEY" --query ContentLength --output text)"
[ "$REMOTE_SIZE" = "$SIZE" ] || { echo "[respaldo] ERROR: tamaño remoto $REMOTE_SIZE ≠ $SIZE" >&2; exit 1; }
echo "[respaldo] subido y verificado"

# Borra respaldos viejos (por nombre: plantea-AAAAMMDD-...). R2 no soporta reglas de ciclo de vida por API
# desde aws-cli, así que se hace aquí.
LIMIT="$(date -u -d "-$KEEP_DAYS days" +%Y%m%d 2>/dev/null || date -u -v-"$KEEP_DAYS"d +%Y%m%d)"
aws --endpoint-url "$S3_ENDPOINT" s3api list-objects-v2 --bucket "$S3_BUCKET" --prefix "$PREFIX/plantea-" --query 'Contents[].Key' --output text 2>/dev/null \
  | tr '\t' '\n' | grep -v '^None$' | while read -r old; do
    [ -n "$old" ] || continue
    day="$(echo "$old" | sed -n 's/.*plantea-\([0-9]\{8\}\)-.*/\1/p')"
    if [ -n "$day" ] && [ "$day" -lt "$LIMIT" ]; then
      echo "[respaldo] borrando $old (más de $KEEP_DAYS días)"
      aws --endpoint-url "$S3_ENDPOINT" s3 rm "s3://$S3_BUCKET/$old" --only-show-errors
    fi
  done
rm -f "$FILE"
echo "[respaldo] terminado"
