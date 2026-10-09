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
npm run db:seed                 # carga el Salón Demostración
npm run dev
```

- `http://localhost:3000/prototipo`: el editor sin cuenta; guarda en el navegador.
- `http://localhost:3000/registro`: crea una cuenta, después un evento, y se abre el editor con guardado en la base de datos.

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
    persistence.ts Guardado automático (navegador o servidor con revisiones).
  app/
    prototipo/     Editor sin cuenta.
    eventos/       Lista de eventos, crear evento y editor con guardado.
    api/layouts/   Guardado del plano con control de revisión.
drizzle/           Migraciones SQL.
scripts/seed.ts    Carga el salón de demostración.
```

## Convenciones

- Unidades en metros; `x` hacia la derecha, `z` hacia abajo; rotación en grados, sentido horario.
- El documento `LayoutDoc` es la única fuente de verdad: el 2D lo dibuja y el 3D lo dibujará.
- Código en inglés, interfaz en español.
