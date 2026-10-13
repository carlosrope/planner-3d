# Importar una casa desde AutoCAD

Convierte el plano arquitectónico de una casa (DWG) en el JSON que usa el editor 2D/3D. Se hace **una vez por modelo de casa**; todas las unidades del mismo modelo la reutilizan.

## Requisitos (solo en la Mac de desarrollo)

- LibreDWG: `brew install libredwg` (convierte DWG → DXF). Es GPL: se usa como herramienta local y **no** se incluye en la app.
- Python con ezdxf (licencia MIT):

```bash
python3 -m venv .venv-cad && .venv-cad/bin/pip install -r tools/cad-import/requirements.txt numpy contourpy matplotlib
```

## Pasos

1. Copia los planos a `planos/` (está fuera de git) y conviértelos:

   ```bash
   cd planos && mkdir -p _dxf && for f in *.dwg; do dwg2dxf -y -o "_dxf/${f%.dwg}.dxf" "$f"; done
   ```

2. Elige la hoja correcta. En un juego de constructora:
   - **ARQ** son los arquitectónicos;
   - **AC** acabados;
   - **AL** albañilería;
   - **CA** puertas y ventanas;
   - **EST** estructurales.

   Usa la que tenga planta baja y planta alta con capas `A-MUROS`, `A-PUERTAS` y `A-VENTANAS`. Si un bloque sale vacío (pasa con DWG de AutoCAD 2018), busca las mismas plantas en otra hoja con formato más viejo.

3. Copia `chardonnay.config.json` y ajusta:
   - `window`: la zona del dibujo de cada planta, en coordenadas del DXF;
   - `origin`: la esquina del lote (izquierda, fondo);
   - `rooms`, `slabs` y `stairs`: lo que el CAD no trae limpio. `rooms[].view` es el punto de vista de "ver desde dentro".

4. Corre el importador:

   ```bash
   .venv-cad/bin/python tools/cad-import/import_house.py tools/cad-import/chardonnay.config.json tools/cad-import/houses/chardonnay.json
   ```

5. Conviértela al formato del diseñador con `to_designer.py` (ver `tools/designer/README.md`), agrégala a la
   lista de `scripts/seed.ts` y cárgala a la base con `npm run db:seed`. Para un lugar registrado por su dueño
   (`/alta`), sube el JSON desde `/admin/lugares/[id]` → "Plano del diseñador": el lugar pasa a "por confirmar" y
   ahí mismo está el enlace de revisión para mandárselo por WhatsApp.

## Qué sale

Por planta:
- **Muros** como polígonos: `muro`, `tablaroca`, `antepecho` (bajo ventana) y `barda` (límite del lote).
- **Vanos** de puertas y ventanas: la caja de cada uno; en las puertas incluye el barrido de la hoja.
- **Trazos** del plano (muebles fijos, escalones, exteriores) en formato compacto.
- **Losas, cuartos y escalera.**

Con esto el editor valida choques con muros, puertas bloqueadas y ventanas tapadas, y el 3D levanta la casa.

## Chardonnay (modelo de ejemplo)

- **Fuente:** `ARQ-05 (CORTES)`. Trae planta baja y planta alta de la misma referencia, así que coinciden.
- **Por qué no ARQ-01,02:** está en formato AutoCAD 2018, y LibreDWG pierde el bloque de la planta alta.
- **Versión:** base de 172.17 m² (96.71 en planta baja + 75.46 en planta alta) en un lote de 10 × 20 m, la misma del folleto `CHARDONNAY.pdf`. Las versiones con ampliación (210.93 y 253.13 m²) están en las mismas hojas y se pueden importar igual.
- **Ojo:** los estructurales `EST-2246-*` dicen "PROTOTIPO RHAPIS" por dentro. Conviene confirmar con la constructora que corresponden a Chardonnay.

## Salones de eventos (desde el 12 de octubre de 2026)

El mismo importador sirve para un salón: la diferencia es la configuración.

1. **Capas.** Si el CAD del salón no usa `A-MUROS`, `A-PUERTAS`, `A-VENTANAS`, se mapean en la configuración de
   importación con `"layers": {"walls": {"MUROS": "muro", "COLUMNAS": "muro"}, "lines": {"PUERTAS": "puerta"},
   "openings": {"PUERTAS": "puerta"}}`. Las columnas van como muros (polígonos cerrados).
2. **`"kind": "salon"`** en la configuración de importación y en la del diseñador.
3. **Puertas.** Si el CAD trae bloques de puerta se detectan solas; si no, van en `extraDoors` (metros).
4. **`setup`** (obligatorio en salones, en metros): la zona libre para mesas (`tables`: `[x0, z0, x1, z1]`) y dónde van los
   fijos (`stage`, `dance`, `head`, `dj`, `bar`, `dessert`, `cake`, cada uno `{cx, cy, w?, d?, rot?}`). Con eso `starter.ts`
   arma el montaje inicial según los invitados. `guests` es opcional (invitados de la demostración).
5. **`maxRoom`** sube solo a 3,000 m² en salones (un salón principal mide cientos de m²).

Ejemplo completo con un DXF sintético del Salón Demostración (sirve para probar sin esperar un plano real):

```bash
.venv-cad/bin/python tools/cad-import/salon_prueba_dxf.py planos/_dxf/salon-prueba.dxf
.venv-cad/bin/python tools/cad-import/import_house.py tools/cad-import/salon-prueba.config.json tools/cad-import/salones/salon-prueba.json
.venv-cad/bin/python tools/cad-import/to_designer.py tools/cad-import/salones/salon-prueba.json \
  tools/cad-import/salon-prueba.designer.json tools/cad-import/salones/salon-prueba.designer.json
```

Sale un salón de 28 × 44 m con 22 muros, 10 puertas, 5 cuartos y las zonas de montaje; se carga a la base como `venue`
con `kind: "salon"` y `plan` igual al JSON generado (o se agrega a `scripts/seed.ts`).

**Control de exactitud antes de publicar un salón real:** comparar cinco medidas con láser (largo, ancho, una diagonal,
altura al plafón y la puerta principal) contra el plano importado; tolerancia de 5 cm. Columnas, escenario fijo, barra y
puertas se confirman con fotos. El dueño revisa su enlace y confirma antes de que el salón pase a "publicado".

El entorno necesita además `matplotlib` (lo usa `to_designer.py`): `.venv-cad/bin/pip install ezdxf numpy contourpy matplotlib`.
