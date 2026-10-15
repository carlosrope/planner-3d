# Errores y alertas de Plantea

## Sentry (errores del servidor y del celular de cada planner)

La app manda los errores a Sentry **solo si existe la variable `SENTRY_DSN`**; sin ella no hace nada.

- **Servidor:** `src/instrumentation.ts` (`onRequestError` de Next.js) reporta cualquier error de una página, una
  acción o una ruta de la API, con la ruta y el navegador.
- **Navegador:** `src/components/ErrorReporter.tsx` (en todas las páginas de React) y un script equivalente en el
  diseñador (`src/lib/designer/page.ts`) mandan los errores de JavaScript a `/api/errores`, que los pasa a Sentry.
  Máximo 5 por página. No se carga ningún script de terceros ni se expone el DSN.
- Sin SDK: `src/lib/sentry.ts` arma el "envelope" y lo manda por HTTP (pruebas en `sentry.test.ts`).
  No hay trazas de rendimiento ni repetición de sesión (no hacen falta con pocos clientes).

**Lo que hace el usuario (10 min):**
1. Crear cuenta gratis en https://sentry.io con el correo de ProLink (plan Developer: 5,000 errores al mes).
2. *Create project* → plataforma **Next.js** → nombre `plantea`. Copiar el **DSN** (Settings → Client Keys).
3. En Railway, servicio de la app → *Variables* → `SENTRY_DSN=<el DSN>` y redesplegar.
4. En Sentry → *Alerts* → *Create alert* → "Issues": avisar por correo cuando aparezca un error nuevo
   (es la opción por omisión del proyecto; confirmar que esté activa).
5. Probar: abrir en el navegador de la app la consola y escribir `setTimeout(() => { throw new Error("prueba Sentry") })`;
   debe aparecer en Sentry en menos de un minuto.

## Tope y alerta de costo en Railway

Railway cobra por uso. Para que un error (un bucle, un ataque) no genere una factura grande:

1. https://railway.com → avatar → **Workspace settings → Usage** (o *Billing*).
2. **Usage limits**: poner un **límite duro** (*Hard limit*) — sugerido **$20 USD/mes** (el gasto real hoy es de
   $5–10 USD; supuesto, confirmar en esa misma pantalla) — y una **alerta** (*Custom email alert*) en **$10 USD**.
   Al llegar al límite duro Railway apaga los servicios: mejor una caída avisada que una factura sin tope.
3. Revisar el gasto el primer viernes de cada mes (ritual del viernes) y subir el tope si crecen los clientes.

Ojo: la CLI de Railway en la Mac mini está con otra cuenta; esto se hace en la web con la cuenta de ProLink.
