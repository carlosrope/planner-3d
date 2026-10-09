# Plan de desarrollo — Planificador 2D/3D para planners y salones (Los Mochis)

Versión 1 · 9 de octubre de 2026
Supuesto de trabajo: lo construyes tú con Claude Code, medio tiempo (~20 h por semana).

---

## 0. Decisiones de arquitectura (antes de escribir código)

1. **Código propio, no fork.** El repo base no tiene licencia, lo que significa que todos los derechos están reservados. Además, su arquitectura no sirve para lo que quieres:
   - El "plano" es la cámara 3D vista desde arriba, no un editor 2D.
   - El acomodo de invitados usa arrastre HTML5, que no funciona con el dedo en iPhone.
   - Tiene topes de 24 mesas, 300 invitados y salón de 22 × 28 m.
   - El código está compactado en archivos enormes (`lib/garden.ts`, 77 KB).

   Úsalo solo como referencia visual y de funciones. Si @wawasensei te da licencia, puedes reutilizar geometría de mesas, moods y exportes, y te ahorras unas 30–40 h en la fase 3.
2. **El 2D es la herramienta de trabajo y el 3D es la presentación.** Ambos dibujan el mismo documento (`Layout`), así que cualquier cambio en el plano se ve al instante en 3D. En la v1 no se edita en 3D desde el teléfono, porque es impreciso y frustrante.
3. **Diseñado primero para teléfono.** Debe funcionar con una mano en el teléfono, con panel lateral en iPad horizontal y con Apple Pencil. La laptop es un extra.
4. **El 3D se descarga solo cuando se pide.** El editor 2D abre rápido con datos móviles. El modelo del salón y Three.js se cargan al tocar "Ver en 3D".
5. **Funciona sin internet el día del evento.** Muchos salones tienen mala señal. El plano, el minuto a minuto y los links del staff tienen que funcionar sin conexión.
6. **No es un todo-en-uno.** Quedan fuera el CRM, los contratos, los pagos de clientes y las invitaciones. El producto es plano, 3D, acomodo, logística y minuto a minuto.

---

## 1. Stack

| Pieza | Elección | Por qué |
|---|---|---|
| App | Next.js + React + TypeScript | El mismo stack que ya conoces y que despliega fácil en Vercel |
| Editor 2D | **SVG + `@use-gesture/react`** | Gestos táctiles (pellizcar, arrastrar, girar) con control total. Exporta PDF vectorial nítido. Con 600 sillas va sobrado. Si en la prueba de la semana 1 se arrastra, se cambia a canvas (react-konva) |
| 3D | React Three Fiber + drei | Cargar modelos del salón, repetir muebles sin perder rendimiento y controlar la cámara con mucho menos código que Three.js "a mano" |
| Estado + deshacer | Zustand + zundo | Deshacer y rehacer de todo el documento |
| Base de datos | Neon Postgres | Plan gratuito al inicio |
| Login | Better Auth (Google + enlace por correo) | Gratis y sin depender de otro proveedor |
| Archivos (modelos 3D, PDF) | Cloudflare R2 | 10 GB gratis y sin costo por descarga |
| Uso sin internet | Serwist (PWA) + IndexedDB (Dexie) | Cachea la app y el evento, y guarda una cola de cambios |
| PDF | jsPDF + svg2pdf.js | El plano sale en PDF vectorial desde el mismo SVG |
| Compartir | Web Share API + links `wa.me` | Desde el teléfono se comparte directo a WhatsApp |
| Errores y uso | Sentry y PostHog (planes gratuitos) | Saber qué falla en el teléfono de cada planner |
| Hosting | Vercel Pro (US$20 al mes) | El plan gratuito de Vercel no permite uso comercial |

---

## 2. Modelo de datos

```
organizations      id, nombre, tipo (planner | salon), logo, colores de marca
users              id, nombre, email, teléfono
memberships        org_id, user_id, rol (dueño | asistente | staff)
venues             id, nombre, org_dueña (salón, opcional), url del modelo 3D,
                   polígono del piso útil, elementos fijos (columnas, escenario,
                   puertas, salidas de emergencia, contactos eléctricos, cocina),
                   cámaras predefinidas, versión
venue_access       venue_id, org_id   (el salón invita planners)
events             id, org_id, venue_id, tipo (boda | xv | graduación | corporativo),
                   fecha, nombres del cliente, número de invitados, estado
layouts            id, event_id, nombre ("Opción A: pista al centro"), documento JSON, revisión
share_links        token, event_id, layout_id, rol (cliente | staff | proveedor | salón),
                   capas visibles, ¿puede comentar?, vencimiento
comments           id, layout_id, objeto o punto, autor (nombre, sin login), texto, resuelto
```

**Documento `Layout` (JSON)**, que es la fuente de verdad del 2D y del 3D:

```ts
type PlacedObject = {
  id: string; catalogId: string;        // "mesa-redonda-180", "candelabro-piso", "dj"
  x: number; z: number; rotation: number; // metros y grados
  w?: number; d?: number;                 // medidas cuando el objeto se puede ajustar
  label?: string; seats?: number;
  colors?: { mantel?: string; camino?: string; servilleta?: string; flor?: string; silla?: string };
  locked?: boolean; layer: Layer;
};
type Layer = 'mobiliario' | 'decoracion' | 'staff' | 'proveedores' | 'tecnica' | 'rutas' | 'zonas';
type Layout = {
  objects: PlacedObject[];
  guests: Guest[];               // pasa a su propia tabla cuando se necesite
  staff: StaffMember[]; vendors: Vendor[]; zones: Zone[]; routes: Route[];
  timeline: TimelineItem[];
  mood: { mantel: string; flor: string; luz: number; ambiente: string };
};
```

Topes nuevos: hasta **120 mesas, 1,000 invitados y salones de hasta 80 × 80 m**. Las bodas y los XV en Sinaloa pasan con frecuencia de 300 invitados.

---

## 3. Editor 2D táctil (especificación)

### 3.1 Gestos

| Gesto | Plano 2D | Vista 3D |
|---|---|---|
| Arrastrar un dedo sobre el fondo | Mover el plano | Girar la cámara |
| Pellizcar con dos dedos | Zoom | Zoom |
| Arrastrar con dos dedos | Mover el plano | Mover la cámara |
| Tocar un objeto | Seleccionarlo y mostrar la barra de acciones | Seleccionarlo y acercarse |
| Arrastrar un objeto **ya seleccionado** | Moverlo, con imán a la rejilla y a guías | — (solo se ve en la v1) |
| Girar con dos dedos sobre el objeto seleccionado | Rotarlo, con imán cada 15° | — |
| Mantener presionado el fondo (0.5 s) | Menú "Agregar aquí" | — |
| Doble toque | Encuadrar todo | "Ver desde esta mesa" |
| Apple Pencil | Mover con precisión y dibujar rutas | — |

**Regla clave: primero seleccionas y luego arrastras.** Así, al mover el plano no se mueven mesas por accidente. Los elementos del salón (columnas, escenario, puertas) vienen bloqueados.

### 3.2 Pantalla

- **Teléfono:**
  - Arriba, un contador: "52 mesas · 520 lugares · 487 invitados".
  - Al centro, el plano.
  - Abajo, una barra con Agregar, Capas, Invitados, 3D y Más.
  - El catálogo y las propiedades salen en una hoja que sube desde abajo, como en Apple Maps.
- **iPad horizontal:** el catálogo va a la izquierda y las propiedades a la derecha.
- **Barra de acciones del objeto:** rotar 90°, duplicar, eliminar, color, capacidad (8/10/12), número, bloquear, alinear.
- **Botones grandes de deshacer y rehacer**, siempre visibles.
- **Áreas de toque de al menos 44 px**: los controles se dimensionan en píxeles de pantalla, no en metros.
- **Guardado automático**, con el indicador "Guardado" o "Sin conexión, guardado en el teléfono".

### 3.3 Herramientas que ahorran tiempo en el teléfono

- **Llenar un área con mesas:** dibujas un rectángulo, eliges el tipo de mesa y el ancho de pasillo, y se acomodan solas en cuadrícula.
- **Numerar automáticamente** en zigzag, desde la mesa de novios o la mesa de honor.
- **Selección múltiple**, con modo selección o lazo, para mover, alinear y distribuir en grupo.
- **Duplicar en fila:** "+4 a la derecha con 1.2 m de separación".
- **Plantillas de montaje por salón:** "Banquete 300", "Imperial 200" o "Cóctel".
- **Opciones A/B:** duplicas el layout completo para enseñarle dos propuestas al cliente.

### 3.4 Medidas y validaciones

- Al arrastrar se muestra la distancia a las mesas vecinas y a las paredes.
- Se marca en rojo:
  - un pasillo menor al mínimo (configurable, 1.2 m por defecto);
  - una mesa fuera del piso útil;
  - un objeto que bloquea una puerta o salida de emergencia.
- El contador avisa si faltan lugares para los invitados confirmados.

### 3.5 Catálogo inicial (se modela una vez y lo comparten todos los salones)

| Categoría | Objetos |
|---|---|
| Mobiliario | Mesa redonda 1.5 / 1.8 m (8/10/12 personas), imperial/rectangular, mesa de novios, mesa de honor de XV, periquera, sala lounge |
| Sillas | Tiffany, crossback, avant garde, plegable (cambia en el 3D y en el conteo) |
| Decoración | Candelabro de piso, centro alto, centro bajo, arco floral, telas, trono de quinceañera, letras gigantes |
| Entretenimiento | Pista (lisa o iluminada), escenario/tarima, **banda** (necesita un escenario grande), DJ, pantalla LED, photo booth, cabina 360 |
| Servicio | Barra, mesa de dulces, mesa de postres, pastel, buffet, estación de café |
| Colores por objeto | Mantel, camino, servilleta, flor y cojín de silla, con paletas rápidas y selector libre |

---

## 4. Vista 3D de presentación

- Se carga el modelo del salón: menos de 10 MB, con modelo y texturas comprimidos.
- Las sillas, mesas y centros se dibujan como **objetos repetidos (instancing)**, así que 600 sillas cuestan lo mismo que una.
- Cámaras predefinidas por salón: entrada, pista, mesa de novios o de la quinceañera, vista aérea. También "ver desde esta mesa".
- Ambiente: color de manteles y flores, intensidad de luz, día o noche.
- **Rendimiento según el equipo:** en teléfonos de gama media baja la resolución y se apagan los efectos de brillo. Meta: 30 fps o más en un Samsung Galaxy A de gama media.
- Exporta imagen PNG en alta resolución para mandarla por WhatsApp.
- **Link para el cliente** (pareja o familia de la quinceañera): ve el 2D y el 3D, puede dejar comentarios sobre un punto ("¿la mesa de mis papás más cerca?") y no necesita cuenta.

---

## 5. Invitados y acomodo

- **Importar invitados de tres formas:**
  - Excel o CSV.
  - Google Sheets.
  - **Pegar texto copiado de WhatsApp**, con un nombre por línea.
- **Asignar con toques, sin arrastrar:** tocas a la persona y luego tocas la mesa o el asiento. Funciona igual en iPhone, Android e iPad.
- **Búsqueda y filtros:** sin mesa, por familia o grupo, por dieta o alergia.
- **Hasta 1,000 invitados.**
- **Exportes:** PDF por mesa, PDF alfabético y CSV, más un **buscador de mesa con QR** para la entrada.

---

## 6. Capa de logística (especificación)

Cada capa se puede encender y apagar: Mobiliario · Decoración · Invitados · **Staff · Proveedores · Técnica · Rutas · Zonas**.

### 6.1 Staff
- **Marcadores con ícono por rol:** coordinador, capitán, mesero, barman, hostess, seguridad, valet y limpieza.
- **Secciones de meseros:**
  - Asignas mesas a cada mesero con colores; por ejemplo, Mesero 1 → mesas 1 a 4.
  - **Auto-asignación por cercanía:** agrupa mesas contiguas según una regla configurable, como "1 mesero cada 2–3 mesas".
- Datos de cada persona: nombre, teléfono, turno y zona.
- **Resumen** del tipo "14 meseros · 2 capitanes · 3 barman".

### 6.2 Proveedores
- Se marcan en el plano: DJ, banda, florista, banquete, pastel, foto y video, mesa de dulces y photo booth.
- Ficha de cada uno: contacto, hora de llegada, inicio y fin de montaje, punto de carga, necesidad eléctrica (W) y notas.
- Al tocar un proveedor se resaltan sus objetos, su zona y su ruta de carga.

### 6.3 Técnica
- Los contactos eléctricos, tableros y tomas se capturan una vez en el modelo del salón.
- **Alerta** si un proveedor que necesita corriente queda a más de X m de un contacto.

### 6.4 Rutas y zonas
- **Rutas:** se dibujan tocando puntos (o con Apple Pencil):
  - servicio, de cocina a las mesas;
  - montaje y carga;
  - entrada de novios o de la quinceañera;
  - salida de emergencia;
  - flujo de invitados.
- **Zonas:** se dibujan como áreas: cocina, back de servicio, carga y descarga, estacionamiento, foto, niños, fumar.
- **Fase posterior:** avisar si una ruta pasa por un pasillo más angosto que el mínimo.

### 6.5 Minuto a minuto ligado al plano
- **Cada momento** tiene hora, duración, título, responsables (staff o proveedores) y **un lugar en el plano** (objeto, zona o punto).
- **Al tocar un momento**, el plano resalta dónde ocurre y quién participa.
- **Plantillas editables:**
  - **Boda:** ceremonia, coctel, entrada de novios, primer baile, brindis, cena, pastel, ramo, víbora de la mar, banda.
  - **XV:** entrada de la quinceañera, vals con chambelanes, vals con papá, brindis, cena, cambio de zapatilla, pastel, baile sorpresa.

### 6.6 Exportes y links por rol (todos se comparten a WhatsApp)

| Para | Qué recibe |
|---|---|
| Cliente | Plano bonito en 2D y 3D con la marca de la planner, y comentarios |
| Salón / rentadora | **Plano de montaje** numerado + **conteo automático de inventario** (45 mesas redondas 1.8 m, 450 sillas Tiffany, 12 candelabros, mantelería por color) |
| Meseros | Su sección con colores, la lista de sus mesas y **dietas y alergias por mesa** ("Mesa 7: 2 vegetarianos, 1 alergia a nuez") |
| Cada proveedor | Su punto en el plano, su hora de llegada, su ruta de carga y el contacto del coordinador |
| Equipo de la planner | Minuto a minuto completo con el plano |

Cada link es de solo lectura, muestra únicamente las capas de ese rol y **funciona sin internet** una vez abierto.

---

## 7. Uso sin internet y modo evento

- **Uso sin internet:**
  - La app instalable (PWA) guarda en el teléfono la app, el evento y su modelo 3D.
  - Los cambios se acumulan en una cola en el teléfono y se sincronizan al volver la señal.
  - Si dos personas cambian el mismo objeto, gana el cambio más reciente, objeto por objeto, y se avisa.
- **Modo evento:**
  - Pantalla de letra grande con el momento actual y el siguiente.
  - Palomear momentos completados.
  - Botón de llamar al responsable.
  - Acceso rápido al plano por capas.

---

## 8. Fases, horas y entregables

| Fase | Contenido | Horas | Entregable verificable |
|---|---|---|---|
| **0. Validación** | Licencia; reunir los croquis y minutos a minutos reales de 3 planners; medir el salón #1 | 6–10 | Lista de funciones confirmada con planners |
| **1. Base** | Repo, login, organizaciones, eventos, catálogo de salones, todo en español, despliegue | 30–40 | Una planner entra, crea un evento y elige el salón |
| **2. Editor 2D táctil** | Gestos, selección, imán, medidas, catálogo, herramientas rápidas, deshacer, guardado automático | 55–75 | Acomodar 40 mesas en menos de 5 min desde un iPhone |
| **3. 3D de presentación** | Salón #1 en 3D, muebles repetidos, colores, cámaras, link para el cliente, PNG | 35–50 | La pareja abre el link en WhatsApp y recorre su montaje |
| **4. Invitados** | Importar, asignar con toques, búsqueda, PDF, QR | 25–35 | Acomodar 300 invitados desde el teléfono |
| **5. Logística** | Staff, proveedores, técnica, rutas, zonas, minuto a minuto, exportes y links por rol, inventario | 40–55 | Plano de meseros y hoja de proveedor listos para WhatsApp |
| **6. Sin internet + modo evento** | PWA, cola de cambios, sincronización, modo evento | 25–35 | Editar en modo avión y que sincronice al volver la señal |
| **7. Salones** | Panel del salón, invitar planners, plantillas de montaje propias | 20–30 | El salón comparte su modelo con 3 planners |
| **8. Cobro** | Planes, límites, factura (al principio pagos manuales por SPEI) | 10–20 | Primer cobro |
| **Total desarrollo** | | **~250–350 h** | |
| Contenido en paralelo | Modelar 5 salones + kit de muebles | 50–80 | Biblioteca local en 3D |

**Corrección a mi estimado anterior (80–120 h):** ese número era para adaptar el repo sin edición táctil ni logística. Con este alcance son unas **250–350 h**. A 20 h por semana son **3 a 4.5 meses**.

### MVP para el piloto (8–11 semanas)
Fases **1 + 2 + 3 + 4 + logística mínima** (marcadores de staff, secciones de meseros, marcadores de proveedores y PDF por rol): unas **160–220 h**.
Quedan para después del piloto: rutas, técnica, zonas, modo sin internet completo, modo evento y panel de salones.

---

## 9. Pruebas y dispositivos

- **Equipos de prueba:**
  - iPhone 12 o posterior (Safari).
  - iPhone SE, para pantalla chica.
  - iPad con Apple Pencil.
  - **Samsung Galaxy A de gama media**, muy común en México.
  - Laptop con Chrome.
- **Ojo con iPhone:** todos los navegadores de iPhone usan el motor de Safari, así que probar en Chrome de iPhone no cuenta como otra prueba.
- **Pruebas automáticas** con Playwright emulando teléfono para los flujos clave: crear evento, acomodar, asignar invitados, compartir.
- **Prueba en equipo real** al cerrar cada fase.
- **Metas de rendimiento:**
  - El editor 2D se puede usar en menos de 3 s con datos móviles.
  - El plano se mueve a 60 fps con 60 mesas y 600 sillas.
  - El 3D corre a 30 fps o más en Galaxy A.
  - Modelo del salón de 10 MB o menos.
  - Memoria por debajo de unos 300 MB en iPhone, porque arriba de eso Safari puede tumbar el 3D.

---

## 10. Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| El alcance crece hacia un "todo-en-uno" | Lista cerrada en la sección 0.6; todo lo nuevo pasa por las planners del piloto |
| Particularidades de Safari en iPhone: zoom de página, altura de pantalla, el 3D se cae por memoria | Bloquear el zoom de la página sobre el plano, usar unidades de altura modernas, poner límites de texturas y recuperar el 3D si se cae |
| Conflictos al sincronizar tras usar la app sin internet | Gana el cambio más reciente objeto por objeto; aviso de "otra persona editó"; un editor activo a la vez en la v1 |
| 3D lento en Android de gama media | Objetos repetidos, calidad según el equipo y el 3D como algo opcional |
| Medidas mal tomadas en el salón | Medidor láser, validar contra el plano del salón y aviso "verificar con el salón" en los PDF |
| SVG lento con muchos objetos | Prueba en la semana 1; si falla, cambiar a canvas sin tocar el modelo de datos |

---

## 11. Semana 1 — primeras tareas para Claude Code

1. Crear el proyecto Next.js con TypeScript; conectar Neon y Better Auth; desplegar en Vercel Pro; crear el espacio en R2.
2. Crear las tablas de la sección 2 y los tipos `Layout`, `PlacedObject` y `Layer`, más el catálogo en JSON.
3. **Prueba de factibilidad (la parte más riesgosa primero):** plano SVG con mover, pellizcar, seleccionar y arrastrar 60 mesas y 600 sillas. Probarlo en iPhone y en un Galaxy A reales. Al final de la semana se decide entre SVG y canvas.
4. Medir el salón #1 y capturarlo en JSON (piso útil, columnas, escenario, puertas, salidas, contactos eléctricos) **antes** de modelarlo en 3D.
5. Pedirles a 3 planners un croquis y un minuto a minuto reales. Son la referencia para las plantillas y los exportes por rol.
