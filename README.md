# Planner 3D

Planos 2D (y pronto 3D) de salones reales para wedding planners, planners de XV años y salones de eventos en Los Mochis. El plan completo está en [docs/plan-desarrollo.md](docs/plan-desarrollo.md).

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
- `http://localhost:3000/registro`: crea una cuenta y después un evento (salón) o un proyecto de casa; se abre el diseñador con guardado en la base de datos, distribuciones A/B/C y el botón **Compartir** (enlace `/v/…` de solo vista para el cliente).
- `http://localhost:3000/prototipo` y `/prototipo/casa`: el editor anterior (React), solo en el navegador.

### Probar en el iPhone

1. La Mac y el iPhone deben estar en la misma red Wi-Fi.
2. En la Mac: `npm run dev:lan`.
3. En Safari del iPhone abre `http://IP-DE-LA-MAC:3000/prototipo`. La IP se ve con `ipconfig getifaddr en0`.
4. Si macOS pregunta si permite conexiones entrantes a `node`, acepta.

Para medir la fluidez real usa la versión de producción: `npm run build && npm run start:lan`, y en el editor ve a **Más → Mostrar medidor de fluidez** y **Más → Prueba de rendimiento: 60 mesas**.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` / `dev:lan` | Servidor de desarrollo (solo esta Mac / visible en la red local) |
| `npm run build` / `start:lan` | Versión de producción |
| `npm test` | Pruebas de geometría, validaciones y herramientas del plano |
| `npm run typecheck` / `lint` | Tipos y estilo |
| `npm run db:generate` | Genera una migración después de cambiar `src/lib/db/schema.ts` |
| `npm run db:migrate` / `db:seed` | Aplica migraciones / carga datos de demostración |

## Estructura

```
src/
  lib/
    layout/        Núcleo del plano, sin React: tipos, catálogo, geometría,
                   validaciones (pasillos, encimados, salidas) y herramientas
                   (llenar con mesas, numerar, montaje inicial).
    db/            Esquema de Drizzle y conexión a Postgres.
    auth.ts        Better Auth (correo y contraseña).
    dal.ts         Acceso a datos con verificación de sesión y permisos.
  components/editor/
    store.tsx      Estado del editor con deshacer/rehacer (zustand + zundo).
    PlanCanvas.tsx Plano SVG y gestos táctiles.
    shapes.tsx     Dibujo del salón, objetos y medidas.
    panels.tsx     Barras y hojas (catálogo, capas, avisos, inventario).
    distributions.ts Distribuciones A/B/C: un estado por distribución y guardado
                   automático (navegador o servidor con revisiones).
    DistributionBar.tsx Pestañas A/B/C y su hoja (nombre, descripción, recomendada).
    Scene3D.tsx    Vista 3D (React Three Fiber), se descarga solo al abrirla.
  app/
    prototipo/     Editor sin cuenta.
    eventos/       Lista de eventos, crear evento y editor con guardado.
    api/layouts/   Guardar, renombrar o eliminar una distribución.
    api/events/[id]/layouts/ Crear una distribución nueva del evento.
  app/disenador/[casa]/ Diseñador de demostración (salón o casa) sin cuenta.
  app/eventos/[id]/ Diseñador del evento con guardado en el servidor.
  app/v/[token]/   Enlace de solo vista para el cliente.
  designer/        disenador.html (generado), host.js (guardado, A/B/C, compartir),
                   eventos/ (catálogo, modelos 2D/3D y lógica de salones),
                   casas/ y salones/ (planos generados).
  lib/designer/    Tipos, validación, montaje inicial de salones y armado de la página.
  lib/layout/houses/ Casas importadas de AutoCAD (JSON) y su amueblado de ejemplo.
tools/cad-import/  Importador DWG/DXF → casa (ver su README).
tools/designer/    Adaptación del diseñador floorplan-3d (ver su README).
docs/investigacion/ Notas de investigación (post de X, mercado inmobiliario).
drizzle/           Migraciones SQL.
scripts/seed.ts    Carga el salón de demostración y la casa Chardonnay.
```

## Convenciones

- Unidades en metros; `x` hacia la derecha, `z` hacia abajo; rotación en grados, sentido horario.
- El documento `LayoutDoc` es la única fuente de verdad: el 2D y el 3D lo dibujan.
- Código en inglés, interfaz en español.

## Código de terceros

El diseñador de casas (`src/designer/disenador.html`) es una adaptación de
[floorplan-3d](https://github.com/wy51ai/floorplan-3d), © 2026 wuyi, licencia MIT.
La copia original y su licencia están en `tools/designer/upstream/`.
