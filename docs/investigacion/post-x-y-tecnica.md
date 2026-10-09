# Post viral de @scheemunai ("¿cabe la cama nueva en el cuarto de Mila?") y la técnica plano/foto → 2D + 3D interactivo

Investigación al 9 de octubre de 2026. Todas las horas están en UTC.

**Leyenda:** **[V]** = verificado en la fuente citada · **[I]** = inferencia propia · **[NV]** = no se pudo verificar.

**Método:**
- Datos del post obtenidos con las API públicas de fxtwitter y vxtwitter, incluido el listado de publicaciones del autor.
- La miniatura del video se revisó a resolución completa.
- Búsquedas en la web, Hacker News (Algolia), npm, la API de GitHub y páginas de proveedores.
- **No** se descargó el video.
- X devuelve 402 a quien no inicia sesión. Los espejos tipo nitter estaban caídos o detrás de un reto anti-bot que no se intentó saltar. Reddit bloqueó las consultas sin sesión.

---

## 0. Resumen ejecutivo

1. **Cómo se hizo (según el autor, [V]):** en un segundo mensaje, respondiéndose a sí mismo, dice que lo hizo con su propio "arnés" de agentes, CRHQ ([post](https://x.com/scheemunai/status/2103186426720665729)). CRHQ ejecuta Claude Code con una suscripción de Claude en un VPS propio ([crhq.ai](https://crhq.ai)).
2. **Prompt, entradas y costo:** el autor **no** publicó el prompt, las entradas (fotos, medidas), el costo ni el tiempo de este caso ([claudevideo.org](https://claudevideo.org/videos/bedroom-planner-pairs-a-floor-plan-with-a-3d-walkthrough)).
3. **Lo que muestra el video [V, por la miniatura]:** una **app web hecha a la medida, en croata**. Tiene:
   - un plano 2D acotado a la izquierda;
   - un visor 3D a la derecha del plano, con vista exterior y modo de recorrido;
   - un panel de distribuciones A, B y C con verificaciones de choques y de holguras;
   - controles de puerta, persiana, día/noche y altura de la mirada (adulto o niña).

   No es un render de IA de imagen ni de video. Es software, casi seguro Three.js (ver §3).
4. **El patrón no es único:** en las dos semanas siguientes al lanzamiento de Opus 5.5 (22 sep 2026) hubo varios demos parecidos. Por ejemplo:
   - una app de "¿cabe la cama?" en español que probó 3,932 posiciones;
   - una casa en Three.js reconstruida desde un PDF de planos, con unas 37 mil líneas de código y 185 pruebas.
5. **Límite conocido de los LLM:** generan **código** (Three.js o Blender). No producen mallas ni medidas fiables por sí mismos. Las pruebas independientes muestran errores de proporción, puertas faltantes y muebles encimados cuando no hay medidas reales ([RoomSketcher](https://www.roomsketcher.com/blog/can-claude-create-floor-plans/), [weel](https://weel.co.jp/?p=131302)).
6. **DWG/DXF en una app web comercial:**
   - **DXF:** se resuelve con piezas MIT (`dxf-parser`, `dxf`, `three-dxf-loader`, `@mlightcad/cad-viewer`).
   - **DWG:** hay tres caminos:
     - LibreDWG, que es **GPL-3.0+** y riesgoso si se envía al navegador;
     - ODA, cuya membresía *Sustaining* cuesta **US$7,500 el primer año y US$4,500 por renovación** y es la que se requiere para web/SaaS;
     - servicios en la nube (Autodesk APS) o un parser propietario.

---

## 1. El post: datos verificados

| Campo | Valor | Fuente |
|---|---|---|
| URL / ID | `x.com/scheemunai/status/2103059885361598633` | [fxtwitter API](https://api.fxtwitter.com/scheemunai/status/2103059885361598633) [V] |
| Autor | Shimecki (@scheemunai), cuenta verificada "individual". Seguidores: 5,218 | ídem [V] |
| Bio del autor | "holding company" de productos SaaS: CRHQ.ai (arnés de agentes), TranscriptAPI y zeropointstudio.io | ídem [V] |
| Fecha | 2026-09-24 09:52:04 UTC, unas 41 h después del anuncio de Opus 5.5 (2026-09-22 16:31 UTC) | ídem; [anuncio @claudeai](https://x.com/claudeai/status/2102435511222890900) [V] |
| Texto | La esposa pregunta si la IA puede mostrar cómo quedará la cama nueva en el cuarto de Mila. Él responde que sí y adjunta el video bajo el rótulo "Opus 5.5:" | ídem [V] |
| Métricas al 9-oct-2026 | 373,134 vistas · 3,014 likes · 1,896 guardados · 93 reposts · 16 citas · 74 respuestas | ídem [V] |
| Video | 87.294 s · 1280×720 H.264 (variantes 480×270, 640×360 y HLS). Sin texto alternativo | ídem; [vxtwitter](https://api.vxtwitter.com/scheemunai/status/2103059885361598633) [V] |
| Hilo del autor | Una sola respuesta suya, publicada a las 18:14:54 UTC del mismo día (12,694 vistas, 39 likes, 2 respuestas) | [fxtwitter thread](https://api.fxtwitter.com/2/thread/2103186426720665729) [V] |
| Destacado por Anthropic | @claudeai lo citó el 25-sep-2026 en su hilo de "favoritos" de Opus 5.5, como 7.º elemento (129,024 vistas). El autor lo celebró | [hilo @claudeai](https://x.com/claudeai/status/2103515655760982273), [cita](https://x.com/claudeai/status/2103515670428238179), [autor](https://x.com/scheemunai/status/2103526730380316945) [V] |
| Indexado por terceros | claudevideo.org lo clasifica como "Interactive". Dice que el creador no publicó el prompt ni nombró herramientas | [claudevideo.org](https://claudevideo.org/videos/bedroom-planner-pairs-a-floor-plan-with-a-3d-walkthrough) [V] |

---

## 2. ¿Cómo se hizo?

### 2.1 Lo que dice el autor [V]
- **Respuesta en su propio hilo (24-sep, 18:14 UTC):** "This was done with https://crhq.ai." En la misma respuesta añade que corre unos 50 agentes a la vez, que construyen y hacen crecer sus productos, y que también hacen cosas divertidas como esta ([post](https://x.com/scheemunai/status/2103186426720665729)).
- **Proyecto del día anterior (robot de cuerda en un cuarto infantil, en Three.js):** el autor publicó las condiciones de ejecución:
  - Opus 5.5 con esfuerzo "Max";
  - threejs;
  - US$173.23 de costo;
  - 7 h 58 min de trabajo.

  Ese post ([2102788223835463902](https://x.com/scheemunai/status/2102788223835463902)) es la referencia más cercana de cómo trabaja. Para la cama **no** dio esas cifras.
- **26-sep:** dice que necesita GPU en el VPS donde hace con Claude todo el render de sus videos ([post](https://x.com/scheemunai/status/2103731410984911228)). Es decir, sus videos se generan o graban en un servidor, con un agente.
- **28-sep, proyecto del pinball:** el agente construyó una página `/studio` que graba automáticamente el material de apoyo y luego montó el video ([post](https://x.com/scheemunai/status/2104475552660824147)).
- **6-oct, otro proyecto con el mismo método:** atribuye otro proyecto a Opus 5.5 con CRHQ en dos días ([post](https://x.com/scheemunai/status/2107484358622031900)).

### 2.2 Qué es CRHQ [V]
- Es un arnés de agentes autoalojado: "compañeros" de IA que corren en tu propio servidor ([crhq.ai](https://crhq.ai)).
- Corre **Claude Code con suscripción de Claude**, además de Codex, Cursor Agents y Z.ai/GLM. El modelo se elige por sesión.
- Funciones:
  - equipos de agentes que se delegan tareas;
  - rotación de suscripciones al llegar a los límites;
  - entorno de desarrollo en el VPS con navegador, pruebas, despliegue y monitoreo.
- Precio: US$19 por una prueba de 7 días, luego US$299 al mes.
- Hay un post en HN que muestra que los agentes de CRHQ entregan artefactos HTML en vivo ([HN 48079610](https://news.ycombinator.com/item?id=48079610)).

### 2.3 Pipeline probable [I]
Esto se deduce de §2.1, §2.2 y la miniatura; no está confirmado.
1. **Entrada:** medidas del cuarto (270 × 370 cm), medidas de la cama nueva (140 × 200 cm) y del mobiliario existente, más fotos del cuarto como referencia visual. En la UI hay detalles específicos: pared rosa con estrellas, cuadros, lámpara de nube, radiador y persiana.
2. **Construcción:** Claude Code (Opus 5.5) dentro de CRHQ genera una app web de una sola página con Three.js, o R3F. Incluye:
   - un plano 2D (SVG o canvas) sincronizado con la escena 3D;
   - muebles **procedurales**, hechos con primitivas y texturas, no modelos de catálogo;
   - lógica de reglas para choques y holguras.
3. **Video:** una grabación de pantalla o una captura automática en el VPS. En la miniatura se ven barras negras arriba y abajo y un cursor de flecha, lo que sugiere grabación del navegador.

### 2.4 Lo que no se pudo verificar [NV]
- **Respuestas y citas:** X bloquea la lectura sin sesión. Se probaron xcancel (suspendido), varios nitter (caídos o con reto anti-bot) y Reddit (bloqueado). Solo se identificó una de las 16 citas: la de @claudeai.
- **Datos del proceso:** el prompt, si se usaron fotos o solo medidas, el costo, la duración y si la app está publicada en alguna URL.
- **Supuesta respuesta de Boris Cherny (@bcherny):** un resumen generado por un buscador afirma que respondió elogiando este uso. No se encontró el post, y el listado público de @bcherny vía fxtwitter salió vacío. **No citar.**

---

## 3. Qué muestra el video (análisis de la miniatura)

Miniatura: [yU6y3fQtRO9dTJEm.jpg](https://pbs.twimg.com/amplify_video_thumb/2103059810547568640/img/yU6y3fQtRO9dTJEm.jpg), 1200×675. Toda la UI está en **croata**. Las traducciones son propias.

**Encabezado [V]**
- "Milina soba" (el cuarto de Mila) · 270 × 370 cm · cama nueva 140 × 200.
- Pestañas:
  - **A · Cama contra la pared derecha** (marcada "Recomendada");
  - **B · Cama contra la pared rosa**;
  - **C · Cama atravesada bajo la ventana**;
  - **Ahora (sin cama)**.
- A la derecha: deshacer, "Compartir" y ayuda.

**Columna izquierda: "Tlocrt" (planta) [V]**
- Ayuda: arrastrar · girar · doble clic = 90°.
- Muebles con cotas:
  - Cama 164×223 (incluye el marco);
  - Cómoda 160×48;
  - Ropero 100×58;
  - Silla 56×56;
  - Repisa 40×30;
  - Librero abierto (las cotas no se leen bien);
  - escritorio.
- Elementos de la habitación: ventana, puerta con su arco de apertura, alfombra redonda, cotas generales de 270 cm y 370 cm, y barra de escala de 1 m.
- Zona "**Fuera del cuarto**": un área para dejar los muebles que no se necesitan.

**Centro: visor 3D [V]**
- Modos: "Vista exterior" o "Recorrido por el cuarto".
- Cámaras: oblicua / desde arriba / pared rosa / pared derecha.
- Iluminación: día o noche.
- La escena es un "diorama" con dos paredes recortadas y bastante detalle:
  - piso de madera, ventana con paisaje y cortinas;
  - cuadros, estrellas en la pared, lámpara de nube;
  - cama tapizada con cabecera, librero, escritorio, silla y alfombra.

**Columna derecha: panel de distribución [V]**
- **Descripción de la opción A:** el ropero se va a la esquina junto a la puerta; la cama, contra la pared derecha con la cabecera hacia la ventana; el resto se queda. Aviso: "Modificado. Esta es tu versión de la distribución A."
- **Validaciones con ✓ y ⚠:**
  - la cómoda, el escritorio y la repisa no se mueven;
  - entrada amplia;
  - el librero va detrás de la puerta;
  - ⚠ la cabecera tapa parte del radiador;
  - ⚠ paso de unos 58 cm entre la cómoda y la cama.
- **"Revisión (3)":** la cama bloquea el lugar de la silla, tapa parte de la ventana y queda frente al radiador.
- **Ajustes de vista:**
  - puerta abierta a 70°;
  - persiana al 62 %;
  - ropa de cama encendida o apagada;
  - altura de la mirada en el recorrido: adulto o Mila;
  - calidad 3D: la mejor o rápida.
- **"Mis distribuciones":** guardar una versión con nombre.

**Qué pasa probablemente en los 87 s [I]**
- Cambiar entre A, B, C y "Ahora".
- Arrastrar muebles en 2D y ver la actualización en 3D.
- Pasar de la vista exterior al recorrido a altura de niña.
- Pasar de día a noche, abrir la puerta y mover la persiana.
- Ver cómo cambian los avisos.

claudevideo.org lo resume como plano acotado más recorrido 3D en primera persona ([fuente](https://claudevideo.org/videos/bedroom-planner-pairs-a-floor-plan-with-a-3d-walkthrough)).

**Lo que no hay [I]:** ningún indicio de IA de imagen o video, ni de modelos de catálogo de marca. Todo apunta a geometría y lógica generadas como código.

---

## 4. Contexto: la ola de demos de Opus 5.5 (22 sep – 9 oct 2026)

Todos los posts se verificaron con la API de fxtwitter.

| Post | Qué es | Cómo dicen que se hizo |
|---|---|---|
| [@goofyninjaaa, 25-sep](https://x.com/goofyninjaaa/status/2103540288136315331) (en español) | App "¿cabe la cama?". Cuarto de 3.00×3.40 m, puerta de 80 cm, clóset de 1.20×0.60 y cama de 1.40×1.90. Plano a escala y 3D sincronizados | Opus 5.5 con su prompt de medidas. Probó 3,932 posiciones, 108 sin conflicto; la mejor deja 70 cm por lado. Marca choque con el clóset, puerta bloqueada o paso menor a 60 cm. 47 min |
| [@aayush4soni, 27-sep](https://x.com/aayush4soni/status/2104181266459644283) | Casa familiar en Three.js a partir de un PDF de planos de 5 páginas más 1 imagen de fachada | Leyó los planos y marcó 15 discrepancias de cotas. Más de 500 muebles. Unas 37 mil líneas de JS, 185 pruebas unitarias y 56 de navegador. Captura de video determinista, subagentes, unos 2 días |
| [@techartist_, 22-sep](https://x.com/techartist_/status/2102503719762018434) | Casa de boceto a obra terminada en 4 etapas | Three.js + TSL |
| [@techartist_, 23-sep](https://x.com/techartist_/status/2102813614797472162) | Microdepartamento que se transforma a lo largo del día | Three.js + TSL |
| [@higgsfield_ai, 22-sep](https://x.com/higgsfield_ai/status/2102499166635352354) | Foto de casa y planos convertidos en modelo de Blender, más visor offline en el navegador (etapas, muros en rayos X, recorrido amueblado) | Opus 5.5 en Higgsfield |
| [@AJtheMongol, 27-sep](https://x.com/AJtheMongol/status/2104214187522318512) | Casa diseñada como código: 14 planos, 5 cálculos, visor 3D y export CAD (conceptual) | Opus 5.5 |
| [@Ayu_AI_0912, 24-sep](https://x.com/Ayu_AI_0912/status/2103021748551872907) | Plano convertido en animación de Blender | Opus 5.5 + Blender |

**Antecedente directo, mayo 2026:** Felix Rieseberg (Claude Cowork) mostró un flujo en el que Claude:
- toma un plano sin unidades;
- saca la escala de las medidas de la cochera que encontró en un permiso;
- genera un plano medido, luego un planificador 2D de muebles y luego un recorrido 3D con muebles arrastrables;
- lee los recibos de muebles en Gmail para obtener las medidas reales.

Fuentes: [ChatPRD/How I AI](https://www.chatprd.ai/how-i-ai/felix-rieseberg-claude-code-cowork-workflows-for-3d-house-design-and-hardware-buddy), [workflow](https://www.chatprd.ai/how-i-ai/workflows/how-to-create-an-interactive-3d-house-model-from-a-floor-plan-using-ai) y [Lenny's](https://www.lennysnewsletter.com/p/how-the-engineer-behind-claude-cowork).

**Claude Design:** un usuario convirtió un croquis a mano en un plano 3D interactivo y lo exportó como **GLB** ([note.com, 25-sep-2026](https://note.com/chi3jp/n/n9384b2903070?hl=en)).

---

## 5. La técnica en general, 2025–2026

### 5.1 LLM → código 3D: cómo funciona y dónde falla
- **Cómo funciona:** el modelo no genera mallas. Escribe código de Three.js o de la API Python de Blender (muros, vanos, techos, muebles) que se ejecuta en un entorno de render ([weel.co.jp, 5-oct-2026](https://weel.co.jp/?p=131302)).
- **Patrón que sí funciona en los demos de 2026:**
  1. Calibrar la escala con **una medida confiable**.
  2. Extruir los muros respetando los vanos.
  3. Tener muebles como objetos arrastrables.
  4. Validar con renders o pruebas.

  Fuentes: [Rieseberg](https://www.chatprd.ai/how-i-ai/workflows/how-to-create-an-interactive-3d-house-model-from-a-floor-plan-using-ai) y [@aayush4soni](https://x.com/aayush4soni/status/2104181266459644283).
- **Fallas documentadas:** en la prueba de RoomSketcher (13-may-2026, actualizada el 30-jul-2026), Claude produjo:
  - puertas faltantes;
  - proporciones que no cuadran;
  - muebles encimados;
  - una escalera inventada en la conversión de un croquis;
  - un 3D "apretado" respecto del 2D.

  Su conclusión: rara vez sirve como plano real ([RoomSketcher](https://www.roomsketcher.com/blog/can-claude-create-floor-plans/)).
- **Postura de Planner 5D (4-sep-2026):** usar Claude para el brief y el concepto, y su software para medidas exactas ([Planner 5D](https://planner5d.com/blog/claude-for-interior-design/)).
- **IA vision dentro de un producto:** Home 3D Plan usa Claude Vision para reconocer planos (PNG/JPEG/WebP; PDF en el roadmap). Tiene un modo Opus para planos densos y uno Sonnet para los rápidos. La salida es un proyecto 3D editable con muros, vanos y muebles de catálogo. Cuesta unos US$0.005 por reconocimiento con la API key del usuario. Precisión reportada: 80–95 % con fotos o croquis ([home3dplan](https://home3dplan.com/features/ai-plan-recognition)).
- **Otros proveedores:** Gemini genera simulaciones interactivas en el chat desde abril de 2026, sin mención de planos ([Google](https://blog.google/innovation-and-ai/products/gemini-app/3d-models-charts/)). No se encontró un caso documentado de GPT o Gemini que convierta una imagen de plano en una escena Three.js comparable a los de Opus 5.5 [NV].

### 5.2 Herramientas especializadas: plano, escaneo y 3D

| Herramienta | Entrada → salida | Integración | Fuente |
|---|---|---|---|
| **Planner 5D** | JPG/PNG/PDF a 3D editable con reconocimiento IA. Servicio B2B de 1–3 min más revisión humana. DWG/DXF solo vía API (según el buscador) | API B2B | [soporte](https://support.planner5d.com/en/articles/14434484-how-to-upload-a-floor-plan), [API](https://tool.planner5d.com/api) [V parcial] |
| **RoomSketcher** | "AI Convert" de JPG/PNG/PDF a plano editable. Live 3D con vuelo y cámara en primera persona. FloorCapture con LiDAR | API poco documentada | [AI Convert](https://www.roomsketcher.com/features/ai-convert/), [Live 3D](https://help.roomsketcher.com/hc/en-us/articles/213187689) |
| **Floorplanner** | Editor embebible; exportación 2D y 3D por piso | API v2 con sandbox, Basic Auth y tokens por proyecto | [docs](https://docs.floorplanner.com) |
| **Archilogic** | Plano a modelo en aproximadamente 1 día hábil | Floor Plan SDK (WebGL), 3D Embed API, REST/GraphQL y **servidor MCP** para agentes. Aún no exporta DXF, IFC ni glTF | [llms.txt](https://developers.archilogic.com/llms.txt) |
| **Homestyler / Coohom** (Manycore) | Reconocimiento de planos desde foto, escaneo o PDF (Homestyler). Coohom se centra en diseñar y renderizar | — | [Homestyler](https://www.homestyler.com/article/ai-floor-plan-recognition?lang=ko_KR), [GenRoom sobre Coohom](https://genroom.io/blog/coohom-review-best-alternatives) |
| **CubiCasa** | Escaneo con teléfono a 2D, 3D, tour, reporte de superficie (GLA) y CAD. Gratis para listados en EE. UU. | API no pública [NV] | [Software Advice](https://www.softwareadvice.com/architecture/cubicasa-profile/), [xpay](https://www.xpay.sh/agent-ready-index/cubicasa/) |
| **magicplan** | Escaneo AR/LiDAR a plano. Exporta ESX, FML y PDF; DXF sin confirmar | — | [producto](https://magicplan.app/product/sketch) |
| **Polycam** | LiDAR a plano 2D. Exporta DXF (plano o nube de puntos), PDF y CSV. Plan Business | — | [formatos](https://learn.poly.cam/hc/en-us/articles/27756102599572), [DWG](https://poly.cam/blog/scan-to-dwg-export-floor-plans-for-autocad-workflows) |
| **Matterport** | Gemelo digital. Property Intelligence (medidas automáticas), Defurnish (quita muebles con IA), Marketing Cloud con MLS | SDK | [Defurnish](https://www.geoweeknews.com/news/sometimes-a-quick-look-is-all-you-need), [Property Intelligence](https://www.rismedia.com/2024/02/20/matterport-launches-property-intelligence/) |
| **IKEA Kreativ** | Escaneo del cuarto, borrado de muebles, colocación de productos a escala. Modo recámara con motor de reglas | Cerrado | [Apartment Therapy](https://www.apartmenttherapy.com/ikeas-app-update-removes-furniture-37097182) |

### 5.3 Rediseño y amueblado virtual (imagen, no 3D medible)
Todas trabajan sobre la foto. Ninguna garantiza escala, así que **no sirven para validar si un mueble cabe** [I].
- **Collov AI:** quita muebles y amuebla para listados. Desde unos US$0.27 por render; licencia MLS.
- **REimagineHome:** productos comprables con filtro de presupuesto; US$14–99 al mes.
- **Spacely AI:** créditos desde fines de 2025; también exteriores.
- **Interior AI:** sin plan gratuito; US$29–99 al mes según la fuente.
- **RoomGPT:** el código es open source MIT ([repo](https://github.com/Nutlope/roomGPT)), sin actividad desde 2024.

Comparativas usadas: [rework](https://resources.rework.com/tools/ai-tools/best-ai-interior-design-tools-2026) y [fast.io](https://www.fast.io/resources/best-ai-interior-design-tools-2026.md). Los precios varían entre fuentes.

### 5.4 Open source para web: editores y CAD

| Proyecto | Para qué | Licencia | Fuente |
|---|---|---|---|
| three.js / react-three-fiber | Motor 3D y renderer React | MIT / MIT | [three](https://github.com/mrdoob/three.js), [r3f](https://github.com/pmndrs/react-three-fiber) |
| blueprint3d (2021, abandonado) / blueprint3d-modern (TS, 2026) | Planta 2D y 3D con muebles; extrusión de muros | MIT / MIT | [original](https://github.com/furnishup/blueprint3d), [modern](https://github.com/charmlinn/blueprint3d-modern) |
| react-planner (cvdlab) | Dibujar planta 2D y navegarla en 3D | MIT | [repo](https://github.com/cvdlab/react-planner) |
| dxf-parser / three-dxf / three-dxf-loader / dxf | Parseo de DXF y dibujo en Three.js | MIT | [npm dxf-parser](https://www.npmjs.com/package/dxf-parser), [three-dxf-loader](https://github.com/prolincur/three-dxf-loader), [dxf](https://github.com/skymakerolof/dxf) |
| dxf-viewer (vagran) | Visor DXF 2D con WebGL | **MPL-2.0** | [repo](https://github.com/vagran/dxf-viewer) |
| @mlightcad/cad-viewer | Visor y editor DWG/DXF 100 % en el navegador; tiene demo en Next.js | MIT. **DWG es opcional** mediante un paquete GPL | [repo](https://github.com/mlightcad/cad-viewer) |
| @thatopen/components / web-ifc | BIM/IFC en la web | MIT / MPL-2.0 | npm: [components](https://www.npmjs.com/package/@thatopen/components), [web-ifc](https://www.npmjs.com/package/web-ifc) |
| Raster-to-Vector (FloorplanTransformation) | Imagen de plano a vectores | MIT | [repo](https://github.com/art-programmer/FloorplanTransformation) |
| CubiCasa5k | Dataset de 5k planos | **CC BY-NC 4.0**: no apto para entrenar un producto comercial | [repo](https://github.com/CubiCasa/CubiCasa5k) |
| SpatialLM (Manycore, NeurIPS 2025) | Nube de puntos a layout estructurado (muros, puertas, objetos) | Pesos del codificador **CC BY-NC 4.0**; partes Apache/Llama | [README](https://cdn.jsdelivr.net/gh/manycore-research/spatiallm@main/README.md) |
| Holodeck (AI2) | LLM a entornos 3D | Apache-2.0 | [repo](https://github.com/allenai/Holodeck) |
| Detectron2 + Swin (Show HN, feb-2026) | Plano a polígonos en JSON para extruir. AP50 de 67 %; en CPU tarda menos de 10 s | Servicio, sin código | [HN](https://news.ycombinator.com/item?id=47092547) |

---

## 6. Licencias para importar DWG/DXF en una app web comercial

No es asesoría legal; validar con un abogado.

**DXF (formato abierto y documentado)** [V]
- `dxf-parser` 1.1.2, MIT, sin actividad desde 2024 ([npm](https://registry.npmjs.org/dxf-parser/latest)).
- `dxf` 5.3.1, MIT.
- `three-dxf-loader` 5.5.0, MIT, compatible con R3F.
- Parser interno de `@mlightcad/data-model`, MIT.
- `dxf-viewer`, MPL-2.0: es copyleft **por archivo**. Si modificas sus archivos, esos cambios deben publicarse.

**DWG con LibreDWG** [V]
- Es **GPLv3 o posterior** y el copyright es de la FSF, que rechazó relicenciar en 2012 ([manual GNU](https://www.gnu.org/software/libredwg/manual/html_node/Overview.html), [Wikipedia](https://en.wikipedia.org/wiki/LibreDWG)).
- Sus derivados también son GPL-3.0: `@mlightcad/libredwg-web` y `@mlightcad/libredwg-converter` (npm).
- mlightcad advierte del "riesgo de propagación GPL" para productos cerrados y ofrece un parser propietario ([README](https://github.com/mlightcad/cad-viewer)).
- `dwg2dxf-converter` se declara MIT, pero incluye un binario WASM de LibreDWG con GPLv3. Que la app quede "separada" es solo la opinión de su autor ([README](https://cdn.jsdelivr.net/npm/dwg2dxf-converter@1.0.4/README.md)).
- Lectura práctica [I]:
  - **Enviar el WASM al navegador cuenta como distribución.** Hay que ofrecer el código fuente de LibreDWG y, si se considera obra combinada, también el de tu app.
  - **Convertir DWG→DXF en el servidor** con el CLI de LibreDWG como proceso aparte, sin distribuirlo, no activa la obligación de publicar el código, porque GPLv3 no es AGPL.

**DWG con ODA (Open Design Alliance)** [V] ([precios](https://www.opendesign.com/pricing.md), [FAQ](https://www.opendesign.com/faq/question/how-can-i-join-open-design-alliance-and-use-your-sdks.md))

| Membresía | Primer año | Renovación anual | Alcance |
|---|---|---|---|
| Commercial | US$3,000 | US$2,250 | Escritorio o móvil, menos de 100 copias al año |
| **Sustaining** | US$7,500 | US$4,500 | **Requerida para web/SaaS**, distribución ilimitada |
| Founding | US$37,500 | US$18,000 | Incluye código fuente |

- Es suscripción: si la cancelas, **pierdes el derecho a distribuir** el producto.
- No hay revendedores.

**Autodesk** [V parcial]
- **APS Model Derivative:** conversión en la nube con Flex tokens, unos 0.1–0.5 por trabajo según la página de precios citada por el buscador ([APS pricing](https://aps.autodesk.com/pricing)).
- **RealDWG** (C++/.NET): se licencia a través de Tech Soft 3D; precio no público ([APS](https://aps.autodesk.com/developer/overview/realdwg-oem)).

**Datasets y modelos:** CubiCasa5k y los pesos de SpatialLM son **no comerciales** (ver §5.4).

---

## 7. Implicaciones para una app web en español (Next.js + Three.js) de visualización 2D/3D inmobiliaria y prueba de muebles

1. **La UI del post es una buena especificación:**
   - el 2D y el 3D comparten el mismo documento (la arquitectura que ya prevé `plan-desarrollo.md`);
   - escenarios A, B, C y "Ahora", con "mi versión" guardada y compartible;
   - zona "fuera del cuarto";
   - doble clic para girar 90°.

   Es lo que generó 1,896 guardados.
2. **El valor está en las validaciones, no en el render:**
   - choques;
   - paso libre mínimo (60 cm según el post en español y la miniatura);
   - puertas y cajones con su arco de apertura;
   - ventanas y radiadores tapados;
   - "¿cabe por la puerta o la escalera?".

   Conviene un motor de reglas determinista en TypeScript, más un buscador de posiciones por fuerza bruta (el demo en español probó 3,932) para proponer distribuciones.
3. **Lo que debe controlar el usuario:**
   - **La escala:** pedir al menos una medida confiable, o leerla del plano, el DXF o el escaneo LiDAR.
   - **Las medidas de los muebles:** salen del catálogo o de la ficha del producto, no de la IA. Los LLM fallan justo ahí.
4. **El LLM, como asistente y no como fuente de verdad:**
   - genera un JSON validado con un esquema, con piezas, posiciones y justificación;
   - explica cada distribución, como el panel "Raspored";
   - resume los avisos en español.

   Esto da la sensación de "Opus lo hizo" sin depender de código generado en cada sesión.
5. **Recorrido a altura configurable** (adulto o niño, comprador o inquilino) y **día/noche**. Son poco costosos en R3F y ayudan mucho a vender. La calidad 3D debe poder bajarse a "rápida" en teléfonos.
6. **Importación de planos por niveles:**
   - **v1:** imagen o PDF con reconocimiento por IA, más corrección manual y calibración de escala (patrón de Home 3D Plan, Planner 5D y RoomSketcher).
   - **v2:** DXF con un parser MIT.
   - **v3:** DWG solo si hay demanda, convirtiendo **en el servidor** con un CLI GPL aislado, o con ODA Sustaining o un parser propietario. Nunca enviar LibreDWG WASM al cliente de una app cerrada.
7. **Inmobiliario:** competir con Matterport, CubiCasa y Floorplanner en "plano + 3D + amueblar con medidas reales". La IA de imagen (Collov, REimagine) sirve como capa decorativa, no para medir. El catálogo de muebles locales a escala, con enlace de compra, es la ventaja diferencial frente a IKEA Kreativ.
8. **Licencias limpias:** three, R3F, drei, blueprint3d-modern y react-planner son MIT y sirven de referencia. Evitar CubiCasa5k y SpatialLM para entrenar. Revisar MPL-2.0 si se usan web-ifc o dxf-viewer.
9. **Contenido de lanzamiento:** el formato que se viraliza es una pregunta doméstica más una pantalla compartida corta (de 30 a 90 s) que alterna escenarios. Conviene preparar una plantilla de video o GIF exportable desde la propia app.

---

## Fuentes principales
- Post y metadatos: https://api.fxtwitter.com/scheemunai/status/2103059885361598633 · https://api.vxtwitter.com/scheemunai/status/2103059885361598633 · https://api.fxtwitter.com/2/profile/scheemunai/statuses
- Respuesta del autor en su propio hilo: https://x.com/scheemunai/status/2103186426720665729
- Destacado por Anthropic: https://x.com/claudeai/status/2103515670428238179
- Anuncio de Opus 5.5: https://x.com/claudeai/status/2102435511222890900
- Ficha en el índice: https://claudevideo.org/videos/bedroom-planner-pairs-a-floor-plan-with-a-3d-walkthrough
- CRHQ: https://crhq.ai · https://news.ycombinator.com/item?id=48079610
- El resto de las fuentes está enlazado en cada fila.
