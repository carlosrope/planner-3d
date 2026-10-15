# Respaldos de la base de Plantea

La base de datos vive en Postgres de Railway. Railway guarda sus propios respaldos del volumen, pero si la cuenta
o el proyecto se pierden, se pierden con ellos. Por eso cada día se saca un `pg_dump` y se guarda **fuera de
Railway**, en un bucket compatible con S3 (destino elegido: **Cloudflare R2**, 10 GB gratis; sirve cualquier otro).

Carpeta `backup/`:

- `respaldo.sh`: `pg_dump` en formato custom (comprimido), verificación, subida al bucket y limpieza de los de más
  de 30 días (`BACKUP_KEEP_DAYS`). Sin `S3_BUCKET` deja el archivo en `respaldos/` (local).
- `restaurar.sh`: restaura un archivo (local o `s3://…`) en la base que se le indique y lista cuántas filas quedó
  con cada tabla. Si la base destino no termina en `_restauracion` ni `_prueba`, pide escribir `SI`.
- `Dockerfile`: imagen con `pg_dump`/`pg_restore` y `aws-cli` para correrlo como **cron** en Railway.

## Probar en local (hecho el 15 de octubre de 2026)

```bash
export DATABASE_URL="$(grep ^DATABASE_URL .env.local | cut -d= -f2-)"
./backup/respaldo.sh                      # deja respaldos/plantea-AAAAMMDD-HHMMSSZ.dump
createdb planner3d_restauracion
./backup/restaurar.sh respaldos/plantea-*.dump "${DATABASE_URL%/*}/planner3d_restauracion"
```

Resultado del 15 de octubre: 352 KB, 16 tablas y las 11 migraciones restauradas en una base nueva con los mismos
conteos que la original (3 cuentas, 4 lugares, 10 eventos, 15 distribuciones, 6 archivos, 1 pago).

## Ponerlo a correr cada día en Railway (lo hace el usuario; ≈ 20 min)

1. **Cloudflare R2** (cuenta de ProLink, no la de Diluvium): R2 → *Create bucket* → nombre `plantea-respaldos`,
   ubicación automática. Luego *Manage R2 API Tokens* → *Create API token* con permiso **Object Read & Write**
   solo para ese bucket. Apuntar: Access Key ID, Secret Access Key y el endpoint
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
2. **Railway** → el proyecto de Plantea → *+ New* → *GitHub Repo* → el mismo repo `carlosrope/planner-3d`.
   En *Settings* del servicio nuevo: *Root Directory* = `backup`, *Builder* = Dockerfile (lo detecta solo).
   En *Cron Schedule*: `15 9 * * *` (9:15 UTC = 2:15 a.m. en Los Mochis). Railway corre el contenedor a esa hora y
   lo apaga cuando el script termina.
3. **Variables** del servicio de respaldo:
   - `DATABASE_URL` = la URL **pública** del Postgres de Railway (`${{Postgres.DATABASE_PUBLIC_URL}}`) o la interna
     (`${{Postgres.DATABASE_URL}}`) si el servicio está en el mismo proyecto.
   - `S3_BUCKET=plantea-respaldos`, `S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`,
     `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION=auto`, `S3_PREFIX=plantea`.
   - Si el Postgres de Railway es más nuevo que 18, cambiar `ARG PG_VERSION` en `backup/Dockerfile`
     (`pg_dump` tiene que ser igual o más nuevo que el servidor; se ve en la pestaña del Postgres en Railway).
4. Probarlo una vez a mano: en el servicio de respaldo, *Deploy* → *Run now* (o quitar el cron, desplegar y ver el
   log: debe terminar con `[respaldo] subido y verificado`). Después revisar en R2 que exista el archivo.
5. **Cada mes** (ritual del viernes): bajar el último respaldo y restaurarlo en local con `restaurar.sh` para
   confirmar que sirve. Un respaldo que nunca se restauró no es un respaldo.

## Restaurar en producción (solo si se perdió la base)

1. Crear un Postgres nuevo en Railway (o vaciar el actual) y copiar su URL.
2. Con las variables `S3_*` en la terminal:
   `RESTAURAR_FORZAR=1 ./backup/restaurar.sh s3://plantea-respaldos/plantea/plantea-AAAAMMDD-HHMMSSZ.dump "postgres://…"`
3. Apuntar `DATABASE_URL` de la app al Postgres nuevo y redesplegar. Las migraciones ya vienen en el respaldo
   (tabla `drizzle.__drizzle_migrations`), así que `npm start` no vuelve a aplicarlas.
