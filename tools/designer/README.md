# Diseñador de casas

Adaptación de [floorplan-3d](https://github.com/wy51ai/floorplan-3d) (© 2026 wuyi, licencia MIT;
ver `upstream/LICENSE`). `upstream/` es la copia sin cambios del original; `upstream/COMMIT`
dice de qué versión es.

## Cómo se arma

1. **Datos de la casa** (`src/designer/casas/<casa>.json`): `tools/cad-import/to_designer.py`
   convierte la casa importada de AutoCAD (`src/lib/layout/houses/<casa>.json`) al formato del
   diseñador (milímetros, `y` hacia abajo): muros, ventanas, puertas, canceles, cuartos con su piso,
   cotas, flecha de entrada, escalera, inicio del recorrido y muebles. Los ajustes que no salen del
   CAD (nombres de puertas, pisos, muebles, aberturas que se ignoran) están en
   `tools/cad-import/<casa>.designer.json`.

   ```bash
   python3 -m venv .venv && .venv/bin/pip install ezdxf numpy contourpy
   .venv/bin/python tools/cad-import/to_designer.py src/lib/layout/houses/chardonnay.json \
     tools/cad-import/chardonnay.designer.json src/designer/casas/chardonnay.json
   ```

2. **Diseñador** (`src/designer/disenador.html`): `python3 tools/designer/adapt.py` toma el original
   y aplica los cambios con reemplazos exactos (si el original cambia, el script falla en vez de
   generar algo roto):
   - Los datos vienen de `window.__CASA__`; cada planta es un plano (`?planta=pb|pa`).
   - Español por defecto (`es.json`, `nombres-es.json`, `plantillas-es.json`); inglés se conserva.
   - Pisos con precio en pesos y pisos de exterior (concreto, pasto, deck); la doble altura no se cobra.
   - Altura por planta, ventanas con repisa propia, escalera en 3D, cámaras y sombras a escala de la casa.
   - En el celular la barra se reduce a tres renglones; en pantallas grandes queda igual que el original.

3. **Ruta** `/disenador/[casa]` (`src/app/disenador/[casa]/route.ts`): inyecta los datos antes del
   primer `<script>` y regresa la página.

El 3D carga three.js desde jsDelivr, así que necesita internet.
