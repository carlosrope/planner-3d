# Plantea (antes Planner 3D / Espacios 3D)

Planos 2D y 3D de salones reales para wedding planners, planners de XV años y salones de eventos, y de casas para inmobiliarias, en Los Mochis. El plan completo está en [docs/plan-desarrollo.md](docs/plan-desarrollo.md).

## Requisitos

- Node 22 o superior
- PostgreSQL local (en esta Mac: Homebrew `postgresql@18`)

## Arranque

```bash
npm install
cp .env.example .env.local      # llena BETTER_AUTH_SECRET con: openssl rand -base64 32
createdb planner3d
npm run db:migrate              # crea las tablas
npm run db:seed                 # carga el Salón Demostración y la casa Chardonnay
npm run dev
```

- `http://localhost:3000/disenador/salon-demo`: el diseñador con el salón de demostración y una boda de 240 invitados (mesas, pista, escenario, lista de mobiliario, 3D con recorrido). Sin cuenta: guarda en el navegador.
- `http://localhost:3000/disenador/chardonnay`: el diseñador de casas para inmobiliarias (Casa Chardonnay): plano 2D, catálogo de muebles, pisos con precio, quitar muros, medir, 3D con recorrido. `?planta=pa` abre la planta alta.
- `http://localhost:3000/registro` (o `/registro?codigo=…` con un código de referido): crea una cuenta y después un evento (salón) o un proyecto de casa; se abre el diseñador con guardado en la base de datos, distribuciones A/B/C y el botón **Compartir** (enlace `/v/…` de solo vista para el cliente).
- `http://localhost:3000/salones` y `/casas`: catálogo público de lugares publicados (por ciudad en `/salones/los-mochis`), con ficha en `/lugares/[slug]`, 3D de solo vista en `/lugares/[slug]/3d`, QR en `/lugares/[slug]/qr.svg` y letrero para imprimir en `/lugares/[slug]/letrero`.
- `http://localhost:3000/alta`: el dueño de un salón o de un modelo de casa manda su plano (CAD, PDF o foto del croquis), fotos, aforo y contacto; el lugar queda **en conversión**.
- `http://localhost:3000/admin` (correos de `ADMIN_EMAILS`): lugares (carga el JSON del diseñador, cambia estado y dueño, manda el enlace de revisión), cuentas (tipo, plan, módulos, fecha de fin) y pagos por transferencia (confirmar activa el plan).

### Ciclo de un lugar del catálogo

1. **Alta** (`/alta`, sin cuenta): el dueño sube plano y fotos → estado *en conversión*. Si entra con una cuenta de salón o desarrolladora, el lugar queda ligado a su negocio.
2. **Conversión** (ProLink): `tools/cad-import` genera el JSON del diseñador y se carga en `/admin/lugares/[id]` → estado *por confirmar*; desde ahí se manda por WhatsApp el enlace privado `/revisar/[token]`.
3. **Revisión** (dueño, sin cuenta): abre su lugar en 3D, lo confirma (→ *publicado*) o pide correcciones (→ *en conversión* con sus notas).
4. **Publicado**: aparece en el catálogo (si está abierto a todas las planners), tiene enlace, QR y letrero, recibe solicitudes de informes (se guardan y abren el WhatsApp del lugar) y cualquier planner puede crear eventos ahí.
5. **Panel del dueño** (`/lugares`, cuentas de salón o desarrolladora): enlace y QR, solicitudes, eventos planeados ahí, planners invitadas por correo y reporte de los últimos 6 meses.

**Marca y encabezado:** logo "La mesa" en `public/marca/` (guía en `docs/marca-plantea.md`); `src/components/Header.tsx` y `Footer.tsx` van en el `layout.tsx` de toda la app (la portada `src/app/page.tsx` es la página de inicio pública).

**Códigos de referido** (`/negocio` → *Códigos para tus clientes* y panel del lugar; `src/lib/referrals.ts`, tabla `referral_code`): el dueño de un salón (o la planner) genera un código por cliente (nombre y fecha del evento) y se lo manda por WhatsApp con el enlace `/registro?codigo=…`; el cliente crea su cuenta con plan **Con código** (`invitado`: solo ese lugar, un solo evento, vigente hasta 30 días después de la fecha o 90 días sin fecha; el enlace del cliente lleva la marca de quien dio el código; sin proveedores) y el código queda marcado como usado con su evento. Tope por mes según `referralQuota`: salón o desarrolladora 50, planner o inmobiliaria 5; nivel **Ilimitado** (`organization.tier`) sin tope. Plan **Personal** (`personal`): un evento activo a la vez, sin logo, sin proveedores, sin códigos. La ficha pública del salón tiene el campo del código.

**Producción** (15 de octubre): respaldos diarios fuera de Railway y restauración en `docs/respaldos.md` (`backup/`); errores a Sentry y tope de costo en `docs/alertas.md`; "olvidé mi contraseña" con Resend (`src/lib/email.ts`; sin llave, el correo sale en la consola); papelera de 30 días (Proyectos y `/admin/papelera`); rastro de pagos, planes y lugares en `/admin/rastro`; fechas con una sola regla en `src/lib/dates.ts`; cabeceras de seguridad en `src/lib/security-headers.ts`.

**Pruebas de punta a punta** (`npm run test:e2e`, Playwright; la primera vez `npx playwright install chromium`): registro con código, evento con enlace de solo vista y pago por SPEI confirmado en `/admin`. Crean y borran su propia base (`planner3d_prueba`) y levantan su propio servidor en el puerto 3100, así que no tocan la base local.

**Prueba de carga** (`scripts/carga.ts`): crea N cuentas de prueba con su evento, las pone a guardar cambios cada 1–2 s junto con visitantes anónimos y reporta latencias; corre contra un servidor de producción local (`npm run build`, `BETTER_AUTH_URL=http://localhost:3001 npx next start -p 3001`, `npx tsx --env-file=.env.local scripts/carga.ts 100 60`). Resultado del 13 de octubre en esta Mac: 300 personas editando + 60 visitantes, 212 peticiones/s, 0 fallas, guardar p95 11 ms.

**Plan y cobro** (`/negocio` → *Tu plan*): plan, módulos y fecha de fin; datos de SPEI (`SPEI_BANK`, `SPEI_CLABE`, `SPEI_HOLDER`) y subida del comprobante; ProLink lo confirma en `/admin/pagos` y el plan se alarga un mes o un año. Los precios no se muestran en la app: viven en prolink365.com.mx.

### Qué hace el diseñador (salones y casas)

- **Proyectos** en dos secciones: *Eventos en salón* y *Casas*. Una cuenta vacía ve la bienvenida y
  puede cargar proyectos de ejemplo.
- **Mi negocio** (`/negocio`): nombre, logo, color y WhatsApp que aparecen en el enlace del cliente.
- **Salones:** plantillas de montaje (redondas, imperiales, cóctel), lista de invitados (pegar desde
  WhatsApp o Excel, acomodo automático por familias), staff con secciones de meseros, dietas por
  mesa, "Ver desde esta mesa" (abre el recorrido sentado en ese lugar) y hojas para imprimir o guardar
  en PDF (montaje, invitados por mesa y A–Z, meseros, CSV).
- **Proveedores** (salones): DJ, banda, florería, banquete, barra, pastel, dulces, foto y video, photo
  booth, mobiliario… como marcadores en el plano con su ficha (contacto, teléfono, llegada, montaje,
  corriente, puerta de carga, notas y sus piezas). Al tocar uno se resaltan sus cosas y su puerta de carga.
  En el resumen, por hora de llegada; hoja de proveedores y hoja de cada proveedor (PDF) y botón de
  WhatsApp con sus datos. El enlace del cliente no lleva proveedores (los quita el servidor).
- **Casas:** ficha de la propiedad (precio, m², recámaras…) y botón amueblada / sin muebles en el
  enlace del cliente.
- **Recorrido** (3D, salones y casas): velocidad x1/x2/x3 (se recuerda), de pie o sentado, «Ir a…»
  (entrada, pista, cada mesa sentado mirando a la pista, cada cuarto), dos toques en el piso para ir
  ahí (en una mesa: sentarse), mapa que se abre grande para elegir a dónde ir, sensibilidad al mirar y
  vista más amplia en el celular vertical. En escritorio: `1` `2` `3` velocidad, `C` sentarse, doble
  clic para ir.
- **Casas de dos plantas:** los escalones no se atraviesan (el tramo alto flota como losa y debajo se pasa, como
  al medio baño de Chardonnay) y la doble altura no se pisa. Al llegar al pie de la escalera aparece «Subir a la
  planta alta» (arriba, «Bajar a la planta baja»): sube los primeros escalones con fundido y la otra planta abre
  ya en el recorrido, en el desembarco o al pie (`?vista=3d&recorrido=subir|bajar`). Desde arriba se ven por el
  hueco los escalones y el piso de abajo.
- **Visita guiada** (▶ en el recorrido, en su tarjeta de inicio y botón principal de la portada del
  cliente): camina sola esquivando muros y mesas y se detiene a mirar. Salón: entrada, el salón,
  barra / dulces / pastel, una mesa de atrás, una junto a la pista, la mesa principal y la pista. Casa:
  acceso, sala, comedor, cocina, recámaras, baños y servicio, terraza y jardín, con el área de cada
  cuarto. Pausa, siguiente y terminar; mirar o caminar la pone en pausa; x1/x2/x3 también la acelera. En una
  casa de dos plantas termina la planta baja en la escalera y sigue sola arriba (`?planta=pa&vista=3d&recorrido=subir&visita=1`);
  `?visita=1` también arranca la visita en la demostración y en el diseño de la planner.
- **Video de la visita** (● en el recorrido; solo la planner y la demostración, no el enlace del cliente): graba la
  visita guiada en video vertical 720×1280 (MP4 en iPhone y Chrome) con la marca, el nombre de cada parada, una
  portada y un cierre con el contacto. En pantalla se ve el video tal cual; pausar la visita pausa el video y ✕
  entrega lo grabado. Al final: verlo, compartirlo (WhatsApp, Instagram, guardar) o descargarlo. Se graba por
  planta (el video no puede cruzar el cambio de página); la planta baja cierra con la escalera.
- **Compartir:** enlace `/v/…` de solo vista; al compartir se elige si abre directo la **visita guiada**
  (`?visita=1`, se recuerda la elección) o la portada de la marca. Vista previa para WhatsApp con la
  huella de la imagen en el enlace y en la imagen (`?v=`), para que al volver a compartir no salga la
  imagen vieja del caché. WhatsApp del negocio y comentarios del cliente (💬 en el diseñador).
- Borradores del aviso de privacidad y los términos en `docs/legal/` (pendientes de revisión legal).

### Probar en el iPhone

1. La Mac y el iPhone deben estar en la misma red Wi-Fi.
2. En la Mac: `npm run dev:lan`.
3. En Safari del iPhone abre `http://IP-DE-LA-MAC:3000/disenador/salon-demo` (o `/eventos` con tu cuenta). La IP se ve con `ipconfig getifaddr en0`.
4. Si macOS pregunta si permite conexiones entrantes a `node`, acepta.

Para probar la versión de producción en el iPhone: `npm run build && npm run start:lan`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` / `dev:lan` | Servidor de desarrollo (solo esta Mac / visible en la red local) |
| `npm run build` / `start:lan` | Versión de producción (`npm start` aplica las migraciones pendientes antes de arrancar; así se despliega en Railway) |
| `npm test` | Pruebas del diseñador (montaje inicial, documento guardado) y de salones (invitados, proveedores) |
| `npm run typecheck` / `lint` | Tipos y estilo |
| `npm run db:generate` | Genera una migración después de cambiar `src/lib/db/schema.ts` |
| `npm run db:migrate` / `db:seed` | Aplica migraciones / carga datos de demostración |

## Estructura

```
src/
  app/
    eventos/         Proyectos (eventos en salón y casas), crear y abrir.
    eventos/[id]/    Diseñador del evento con guardado en el servidor.
    disenador/[casa]/ Diseñador de demostración (salón o casa) sin cuenta.
    v/[token]/       Enlace de solo vista para el cliente (y su imagen de vista previa).
    negocio/         Marca del negocio (nombre, logo, color, WhatsApp) y Tu plan (SPEI y comprobantes).
    alta/            Alta pública de un salón o modelo (plano, fotos, contacto).
    revisar/[token]/ El dueño revisa su lugar en 3D y lo confirma o pide correcciones.
    salones/, casas/ Catálogo público por ciudad; lugares/[slug]/ ficha, 3D, foto, QR, letrero y panel del dueño.
    admin/           Administración de ProLink: lugares, cuentas y pagos (ADMIN_EMAILS).
    api/             Distribuciones, compartir, comentarios y plantillas de montaje.
  designer/          disenador.html (generado), host.js (guardado, A/B/C, compartir, portada),
                     eventos/ (catálogo, modelos 2D/3D, salones y proveedores),
                     casas/ y salones/ (planos generados).
  lib/
    designer/        Tipos, validación del documento, montaje inicial de salones y armado de la página.
    db/              Esquema de Drizzle y conexión a Postgres.
    auth.ts          Better Auth (correo y contraseña).
    dal.ts           Acceso a datos con verificación de sesión y permisos.
    domain.ts        Catálogos del negocio (tipos de evento, secciones, roles, capas).
tools/cad-import/    Importador DWG/DXF → casa (ver su README); houses/ guarda las casas importadas.
tools/designer/      Adaptación del diseñador floorplan-3d (ver su README).
docs/investigacion/  Notas de investigación (post de X, mercado inmobiliario).
drizzle/             Migraciones SQL.
scripts/seed.ts      Carga el salón de demostración y la casa Chardonnay.
```

## Convenciones

- El plano del diseñador va en milímetros con `y` hacia abajo; el 3D, en metros. Rotación en grados, sentido horario.
- Cada distribución es un `DesignDoc` (`src/lib/designer/types.ts`): el 2D y el 3D lo dibujan, y se valida al guardar
  (`src/lib/designer/schema.ts`; un campo que no esté ahí se pierde al guardar).
- Código en inglés, interfaz en español.

## Código de terceros

El diseñador de casas (`src/designer/disenador.html`) es una adaptación de
[floorplan-3d](https://github.com/wy51ai/floorplan-3d), © 2026 wuyi, licencia MIT.
La copia original y su licencia están en `tools/designer/upstream/`.
