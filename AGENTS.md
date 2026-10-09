<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Proyecto

- Plan y alcance: `docs/plan-desarrollo.md`. Estructura y comandos: `README.md`.
- Interfaz en español (México); código e identificadores en inglés; unidades en metros.
- `src/lib/layout/` no depende de React ni de Next: mantenlo puro y cubierto por `npm test`.
- Toda lectura o escritura de datos pasa por `src/lib/dal.ts`, que verifica sesión y permisos.
- Con Cache Components, cualquier lectura de sesión o `params` va dentro de `<Suspense>`.
- Antes de terminar un cambio: `npm run typecheck && npm run lint && npm test`.
