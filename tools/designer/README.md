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
   - Recorrido: arrastrar mira hacia donde se arrastra (en el original estaba al revés que el mouse),
     velocidad x1/x2/x3, de pie / sentado, «Ir a…», dos toques para ir, mapa, sensibilidad y vista más
     amplia en pantallas verticales. Los lugares de salones (pista, mesas) salen de `eventos.js`
     (`walkSpots`). «Ver desde esta mesa» abre el recorrido sentado (`View3D.viewFrom`).
   - Visita guiada (`View3D.tour()`): paradas armadas en `tourStops()` y caminos con A* en una rejilla de
     25 cm que esquiva muros, escalones y muebles; si no hay camino a pie, la parada se alcanza con fundido.

3. **Páginas** (`src/lib/designer/page.ts`): inyectan antes del primer `<script>` los datos del lugar
   (`window.__CASA__`), en salones el catálogo y los modelos de eventos (`src/designer/eventos/`), y en
   diseños guardados el anfitrión (`src/designer/host.js`):
   - `/disenador/[lugar]`: demostración sin cuenta (`chardonnay`, `salon-demo`); guarda en el navegador.
   - `/eventos/[id]`: diseño del evento en la base de datos, distribuciones A/B/C y Compartir.
   - `/v/[token]`: enlace de solo vista para el cliente; puede mover cosas para probar, no se guarda.

## Salones

- `salon_demo.py` genera `src/designer/salones/salon-demo.json` (salón ficticio de 28 × 44 m) con
  `setup`: la zona para mesas y dónde van escenario, pista, DJ, barra, dulces, pastel y mesa principal.
- `src/lib/designer/starter.ts` arma el montaje inicial según invitados y tipo de evento (boda: mesa de
  novios; XV: mesa de honor y trono) con mesas redondas de 10 alrededor de la pista.
- `src/designer/eventos/catalogo.json` es el catálogo de eventos (lo usan el diseñador y el montaje);
  `modelos.js` los dibuja en 2D y 3D; `eventos.js` numera mesas, cuenta sillas y arma la lista de
  mobiliario. `proveedores.js` (se carga antes de `eventos.js`, que le pasa sus ayudantes) maneja los
  marcadores de proveedor, su ficha, sus hojas y el mensaje de WhatsApp; en 3D no se dibujan.
- Un salón real se agrega igual que una casa: plano desde AutoCAD con `tools/cad-import`, más su `setup`.

El 3D carga three.js desde jsDelivr, así que necesita internet.
