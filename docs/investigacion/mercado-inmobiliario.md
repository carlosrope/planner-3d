# Mercado de planos 2D y modelos 3D de casas para inmobiliarias (México, con foco en Sinaloa)

Investigación al 9 de octubre de 2026. Tipo de cambio usado: **18 MXN por USD** (redondeado). Precios sin IVA salvo que se diga otra cosa.

**Leyenda**
- **[Oficial]** = dato de la página del proveedor, consultada el 9-oct-2026.
- **[Terceros]** = dato de un agregador, nota o anuncio, con su fecha cuando la tiene.
- **[Est.]** = cálculo o estimación propia.
- **[NV]** = no se pudo verificar.

Documento relacionado: [post-x-y-tecnica.md](post-x-y-tecnica.md) cubre el post viral de la cama, la técnica plano → 3D con LLM y las licencias para leer DWG/DXF en una app web. Aquí no se repite.

---

<!-- RESUMEN -->

---

## 1. Quién ofrece esto hoy y a qué precio

### 1.1 SaaS y servicios internacionales

Ninguno de estos productos toma el DWG de una desarrolladora mexicana y entrega, en español, un plano 2D más un 3D recorrible con prueba de muebles y cambio de acabados. Se dividen en cinco grupos.

**a) Captura de casas ya construidas (cámara o celular)**

| Producto | Qué hace | Precio USD | Precio MXN [Est.] | Fuente |
|---|---|---|---|---|
| Matterport | Gemelo digital 3D, tour, plano esquemático | Professional "desde 50 espacios por $245/mes" (paquete con cámara Pro3 de $1,995). Plano esquemático $14.99–$39.99 por plano. MatterPak $59. Servicio de captura $238–$325 por casa de hasta 3,000 ft² (unos 280 m²) | $4,410/mes; plano $270–$720; captura $4,300–$5,850 | [Oficial: planes](https://matterport.com/plans), [Oficial: captura](https://matterport.com/capture-services) |
| CubiCasa | Plano 2D/3D escaneando con el celular | Lite $0 (EE. UU.), Plus $15, Plus 3D $65 por pedido; CAD +$35; video +$85 | $270 / $1,170 por casa | [Terceros: TrustRadius](https://www.trustradius.com/products/cubicasa/pricing), [Terceros: REcolorado](https://recolorado.com/?p=24461) |
| magicplan | Escaneo LiDAR, planos, presupuestos de obra | Mínimo 10 proyectos al mes; proyecto extra $40. Con 15 proyectos: $375–$600/mes según plazo | $720 por proyecto extra | [Oficial](https://www.magicplan.app/pricing); cifras mensuales [Terceros: SaaSworthy, NV] |
| Giraffe360 | Cámara robótica en renta: fotos, plano, tour | "Desde $360/mes" en EE. UU. (ya no aparece en la página); £159/mes en Reino Unido | ~$6,500/mes | [Oficial, sin precio visible](https://www.giraffe360.com/us/price) [NV] |

Matterport subió precios el 20-may-2025 ([Oficial](https://matterport.com/blog/subscription-pricing-update)) y CoStar terminó de comprarla el 28-feb-2025 (dato reportado por el subagente con base en el 10-Q y BusinessWire [NV en este documento]). Su función de IA "Defurnish" (quitar muebles) ya está en la página de planes; el amueblado con IA seguía como "próximamente" [NV].

**b) Tours 360 con fotos (sin modelo 3D)**

| Producto | Precio USD | MXN [Est.] | Fuente |
|---|---|---|---|
| Kuula | Pro $20/mes anual ($24 mensual); Business $36/mes anual ($48 mensual) | $360–$864/mes | [Oficial](https://kuula.co/page/pricing) |
| CloudPano | Pro $22.50/mes, Pro Plus $33/mes, Commercial $199+/mes (todos anuales). La misma portada también dice "Pro desde $19" | $405–$3,580/mes | [Oficial, portada](https://www.cloudpano.com/) |

**c) Editores de planos y diseño de interiores (el cliente dibuja)**

| Producto | Precio USD | MXN [Est.] | Fuente |
|---|---|---|---|
| RoomSketcher | Pro $12/mes anual o $24 mensual; Team $35–$70/mes (5 usuarios). Plano por encargo $38 por piso (desde $18 con Pro). "AI Convert" $20 por piso. Render 3D $4 en plan gratis | Pro $216–$432/mes; plano $324–$684 | [Oficial](https://www.roomsketcher.com/pricing/) |
| Floorplanner | Créditos a $1.63 cada uno; exportar 3D cuesta 2 (SD) a 20 (8K) créditos. Plus $5/mes y Pro $29/mes según terceros | crédito ≈ $29 | [Oficial](https://floorplanner.com/pricing); Plus/Pro [Terceros, NV] |
| Planner 5D | Premium $19.99/mes o $59.99/año; Professional $49.99/mes o $399.99/año. Incluye reconocimiento de planos por IA (subes la imagen y sale el 3D editable) | Desde México muestra $375/mes o $1,100/año (Premium) y $935/mes o $7,500/año (Professional) | [Oficial](https://planner5d.com/pricing) |
| Coohom | Pro $29, Élite $69 (la página no aclara si es mensual); terceros dicen $29/mes o $300/año y $69/mes o $699/año | $522–$1,242/mes | [Oficial](https://www.coohom.com/pricing) |
| Homestyler | Pro+ desde $6.8/mes; Master+ desde $11.8/mes; Team $19.9 por usuario | $122–$358/mes | [Oficial](https://www.homestyler.com/pricing) |
| Cedreo | Proyecto único $139; Pro $129/mes | $2,500 por proyecto | [Terceros: G2/Capterra, NV] |

**d) Conversión de planos CAD a 2D/3D y visores 3D web**

| Producto | Qué hace | Precio USD | MXN [Est.] | Fuente |
|---|---|---|---|---|
| Archilogic | Convierte JPG/PDF/**DWG/DXF** en gemelo digital; exporta glTF e IFC. Enfocado en oficinas | Conversión $329 por plano en plan gratis; Plus $24.90 y Pro $59 **por plano al mes** (paquetes anuales desde 10 planos, conversión incluida) | $5,900 por conversión; $450–$1,060 por plano al mes | [Oficial](https://www.archilogic.com/pricing) |
| Shapespark | Publica un modelo 3D como recorrido web | Starter $19/mes (3 escenas), Standard $49 (25), Plus $99 (50), Premium $249 (150) | $342–$4,480/mes | [Oficial](https://www.shapespark.com/pricing) |
| BoxBrownie | Redibujo de plano 2D $30–$35; plano 3D $35–$40; render interior o exterior $350; render 360 $500. Desde IP mexicana todo sale 20% más barato | Plano 3D $630–$720; render $6,300 | [Oficial](https://www.boxbrownie.com/us/pricing) |
| Getfloorplan | Plano 2D → plano 3D, renders y tour 360 con IA | $20–$69 por proyecto | $360–$1,240 | [Terceros, NV] |
| Planos 3D por encargo | Bella Virtual desde $69.95 (3D) y $19.95 (2D); CADCrowd $100–$450 por piso con freelancer o $200–$700 con despacho | $1,260 (3D) a $12,600 | [Terceros, NV] |

**e) Staging virtual con IA (amueblar fotos, no un modelo 3D medible)**

| Producto | Precio USD | MXN [Est.] | Fuente |
|---|---|---|---|
| Virtual Staging AI | $16–$79/mes (anual) por 6–150 fotos: $0.53–$2.67 por foto | $10–$48 por foto | [Oficial](https://www.virtualstagingai.app/prices) |
| REimagineHome | $14–$99/mes (30–900 créditos) | $252–$1,780/mes | [Oficial](https://www.reimaginehome.ai/pricing) |
| Collov AI | $19–$127/mes (60–526 fotos) | $342–$2,290/mes | [Oficial](https://collov.ai/pricing) |
| ApplyDesign | $7–$25 por imagen (monedas) | $126–$450 | [Oficial](https://www.applydesign.io/pricing) |
| roOomy | Staging $49–$69 por foto; staging de un modelo Matterport desde $434 (menos de 700 ft²) o $0.42 por ft² | $880–$1,240 por foto; ≈ $81 por m² en Matterport | [Oficial](https://www.rooomy.com/order) |
| Styldod | $16–$23 por imagen | $290–$410 | [Oficial](https://www.styldod.com/virtual-staging) |
| BoxBrownie | Staging $30 por imagen ($24 desde México); 360 $60 | $430–$540 | [Oficial](https://www.boxbrownie.com/us/pricing) |

**f) Herramientas de "¿cabe el mueble?" para el comprador**

- **IKEA Kreativ:** gratis; escanea el cuarto con fotos (mejor con LiDAR), borra los muebles y coloca productos IKEA. Solo catálogo IKEA ([TechRadar, 2022](https://www.techradar.com/news/ikeas-new-iphone-app-can-delete-and-replace-your-old-furniture)); en feb-2025 la app sumó vista 3D y AR de productos ([Martechvibe](https://martechvibe.com/article/ikea-announces-mobile-app-enhancements)). No confirmé si está disponible en México [NV].
- **Wayfair Muse:** gratis, lanzado en feb-2025, aplica estilos a la foto de un cuarto ([Terceros, NV para 2026]).
- **Planner 5D:** realidad aumentada en la app, incluida en Premium ([Oficial](https://planner5d.com/pricing)).
- **El post viral** (@scheemunai, 24-sep-2026, unas 373 mil vistas) era una app web hecha a la medida con Three.js, no un producto a la venta. Detalle en [post-x-y-tecnica.md](post-x-y-tecnica.md) y en el [post original](https://x.com/scheemunai/status/2103059885361598633).

**g) Visualización para preventa (desarrollos sin construir)**

| Proveedor | Precio | MXN [Est.] | Fuente |
|---|---|---|---|
| VTOPIA (Argentina): gemelo digital del edificio en Unreal, renders y videos | US$10,000–$15,000 por proyecto | $180,000–$270,000 | [iProfesional](https://www.iprofesional.com/realestate/411084-como-es-la-tecnologia-para-recorrer-un-edificio-sin-construir-antes-de-comprar-departamento) (la página dice 22-ago-2024; el buscador la fecha en 2026) |
| Configurador 3D a la medida (estudios de software) | €3,000–€20,000; otro estudio cotiza $5,000–$12,000 por el configurador y $15,000–$40,000 por el sitio completo | $90,000–$720,000 | [Terceros, NV] |
| 360Pros (EE. UU.) | Tour de preventa desde $3,995; con mezcla de unidades desde $7,995 | $72,000–$144,000 | [Terceros, NV] |
| PropVR (India/EAU) | Digitalización de $649–$1,200 por plano | $11,700–$21,600 | [Terceros, NV] |
| Treedis | Growth $49.99/mes (50 espacios); Business $169.99/mes (200 espacios) | $900–$3,060/mes | [Terceros: xpay, may-2026] |
| Unreal Engine | Gratis para empresas con ingresos menores a US$1M al año | — | [Terceros, NV] |

Sin precio público: 3D Estate, EnvisioXR, SmartPixel, Habiteo, PROJEVIZ (plantilla de Unreal Engine 5).

<!-- MEXICO_PROVEEDORES -->

---

<!-- MARKETING_MX -->

### 2.3 ¿Los tours 3D y los planos aumentan prospectos o ventas?

**Lo primero: casi toda la evidencia es de casas usadas en EE. UU.** Ahí el tour compite contra buenas fotos. En preventa no hay casa que fotografiar, así que el 3D sustituye a la casa, no a las fotos. Eso puede hacer que el efecto en preventa sea mayor, pero **no encontré ningún estudio que lo mida** [Est.].

**Datos independientes (académicos o de asociaciones)**

- **Harvard Business School e Ivey (Troncoso y Zhang):** 75,178 ventas en Los Ángeles vía Redfin, mar-2019 a mar-2021; 22% con tour 3D. Sin controlar la calidad de fotos y texto, el tour se asocia con +1.1% de precio. Con esos controles, el efecto **no es significativo**. La reducción de días en el mercado fue sobre todo temporal (pandemia). El tour sirve más en zonas de inmobiliarias pequeñas y colonias menos buscadas, y ayuda al comprador a descartar casas antes de visitarlas ([HBS Working Knowledge, 5-dic-2023](https://www.library.hbs.edu/working-knowledge/are-virtual-tours-still-worth-it-in-real-estate-evidence-from-75000-home-sales)).
- **Anderson, Freybote y Manis, *Journal of Real Estate Finance and Economics* (2024):** 34,359 ventas de casas unifamiliares en EE. UU. El tour virtual afecta el precio de casas **habitadas** (directamente y a través del tiempo en el mercado), con signo distinto según el segmento de precio. **No tiene efecto** en casas desocupadas ([Springer](https://www.springerprofessional.de/en/the-impact-of-virtual-marketing-strategies-on-the-price-tom-rela/23227228)).
- **NAR, Profile of Home Staging 2025** (encuesta a agentes, feb-2025): 83% de los agentes de compradores dicen que amueblar la casa ayuda al comprador a imaginarla como su hogar. Lo que más importa amueblar: sala (37%), recámara principal (34%) y cocina (23%). Calificaron como "muy importante": fotos 73%, staging físico 57%, video 48%, tours virtuales 43% ([NAR, 6-may-2025](https://www.nar.realtor/press-releases/nar-report-reveals-home-staging-boosts-sale-prices-and-reduces-time-on-market)). Es opinión de agentes, no medición de ventas.
- **NAR, Generational Trends 2025** (vía resumen de terceros): 57% de los compradores que buscan en internet califican el plano como "muy útil", contra 41% el tour virtual y 83% las fotos ([Webtonic](https://www.webtonic.io/blog/real-estate-native-advertising-statistics)) [NV en el PDF original]. En 2022, el plano también le ganaba al tour: 55% contra 43% ([F8 Real Estate](https://f8re.com/post/the-surprising-importance-of-floor-plans-in-the-home-search-process)).
- **Rightmove (portal del Reino Unido), 2013:** 1 de cada 5 compradores ignora un anuncio sin plano y más de un tercio es menos propenso a preguntar; las medidas de los cuartos son lo más valorado del plano ([Rightmove, 14-jun-2013](https://www.rightmove.co.uk/news/articles/property-news/maximise-chances-finding-buyer-floorplan/)). Es viejo y sin metodología publicada.

**Lo que dicen los proveedores (tienen interés en el resultado)**

- **Matterport:** las casas con tour 3D se vendieron "hasta 9% más caro" y "hasta 31% más rápido". Muestra de 143,575 anuncios de 2016 a 2019, de los que 3,935 tenían tour ([Matterport](https://matterport.com/blog/3d-tours-properties-sell-31-faster-and-higher-price)).
- **Zillow** (vende su propio tour 3D): los anuncios con tour 3D tienen 81% más vistas y 53% más guardados ([RealTrends, sin fecha](https://www.realtrends.com/blog/wp-json/wp/v2/posts/3112)). Con plano interactivo, 60% más vistas y 79% más guardados (Consumer Housing Trends 2022, citado en [Zillow 3D Home](https://www.zillow.com/marketing/3d-home/); la página bloqueó la consulta directa) [NV].
- **Zillow, Consumer Housing Trends 2021** (encuesta de mar. a ago. 2021): 56% de los compradores dicen que perdieron tiempo visitando casas que habrían descartado si hubieran entendido el plano; 74% dicen que un plano dinámico les ayuda a decidir; 81% visitaría una casa si el anuncio trae un plano que le guste. En una encuesta de 2022, 71% de los vendedores dijo que prefiere contratar al agente que ofrece tour virtual o plano interactivo ([Zillow, 15-jun-2022](https://zillow.mediaroom.com/2022-06-15-Zillow-expands-and-improves-AI-powered-interactive-tours,-helping-home-shoppers-move-with-speed-and-confidence)). Este último dato le sirve al asesor para **ganar exclusivas**, no solo para vender.
- **BoxBrownie (2021):** en 25,000 anuncios de portales de EE. UU., 94% no tenía tour virtual y solo 16% tenía plano ([NAR](https://www.nar.realtor/news/real-estate-news/94-of-listings-dont-include-a-virtual-tour)).
- **Matterport, citado por Expansión:** "95% de los compradores preguntan por visitas virtuales 3D". No dice que la muestra sea mexicana ([Expansión, 3-sep-2024](https://expansion.mx/tecnologia/2024/09/03/recorridos-virtuales-en-inmuebles-hacen-que-venda-mi-departamento)).

**México:** no encontré ningún estudio, ni de Inmuebles24, Lamudi u otro portal, que mida el efecto de tours o planos en prospectos o ventas en México. Lo único concreto es la anécdota de Expansión: un departamento de 75 m² en venta 5 meses solo con fotos; el dueño pagó $3,000 MXN por un tour 360, recibió más preguntas y vendió unos 2 meses después ([Expansión, 3-sep-2024](https://expansion.mx/tecnologia/2024/09/03/recorridos-virtuales-en-inmuebles-hacen-que-venda-mi-departamento)).

**Conclusión práctica [Est.]:** la evidencia seria no respalda prometer "vendes X% más caro". Sí respalda tres cosas: (1) los compradores valoran más el **plano con medidas** que el tour; (2) ver la casa amueblada ayuda a imaginarla, sobre todo sala, recámara principal y cocina; (3) el 3D sirve para **filtrar** prospectos antes de la visita. Para vender el servicio conviene prometer menos visitas en balde y más prospectos calificados, y medirlo con cada cliente.

---

## 3. El juego de planos de una desarrolladora mexicana: qué trae cada hoja y cuál usar

### 3.1 De dónde sale esta sección

- **No hay una norma nacional de siglas.** Cada despacho pone sus claves. Los municipios piden plantas, cortes, fachadas, instalaciones y estructura firmados por el Director Responsable de Obra (DRO), pero no fijan siglas. Por ejemplo, Ciudad Madero pide plantas, cortes y fachadas; plantas y cortes de instalaciones hidráulicas, sanitarias y eléctricas con el trazo de tuberías; y la firma del DRO en cada hoja ([Ciudad Madero](https://ciudadmadero.gob.mx/wp-content/uploads/2022/04/LICENCIA-DE-CONSTRUCCION-NUEVA-Y-AMP.-MAYOR-A-60-M2-2.01.2.pdf)). En Culiacán se pide el proyecto firmado por DRO, deslinde, número oficial y constancia de zonificación ([Tus Buenas Noticias, 9-sep-2025](https://www.tusbuenasnoticias.com/noticias/actualidad/2025/09/09/49928-costos-y-requisitos-de-permisos-de-construccion-en-culiacan-2025)).
- **La división académica coincide con la de las desarrolladoras.** El temario de proyecto ejecutivo de la UNAM separa: trazo y albañilería; acabados en muros, pisos y plafones; carpintería; cancelería; herrería; instalaciones eléctrica, hidrosanitaria y de gas; y estructura ([UNAM DGIRE](https://dgire.unam.mx/images/planes/lic/03/3069.pdf); el PDF no se pudo leer directo y el contenido viene del extracto del buscador).
- **La fuente principal es el juego real que ya está en el repo:** `planos/`, prototipo "Chardonnay" de un fraccionamiento de Los Mochis, fechado en enero de 2025, a escala 1:75. Los DWG ya estaban convertidos a DXF en `planos/_dxf/` (con LibreDWG, a juzgar por los `.log`). Leí capas, bloques y textos con un script propio.
- **Ese juego no trae IE (eléctrica) ni IH (hidráulica);** solo ARQ, AC, AL, CA y EST, más una ficha comercial en PDF. Lo que digo de IE e IH viene del temario y de los requisitos municipales, no de archivos reales.

### 3.2 Qué trae cada hoja (juego Chardonnay)

| Hoja | Contenido real | ¿Sirve para el 2D/3D? |
|---|---|---|
| **ARQ-01,02 Plantas arquitectónicas** | Planta baja, alta y azotea, cada una **sin y con ampliación** (cochera; cochera + recámara). Terreno de 10 × 20 m (200 m²). Superficies: 172.17 m² base, 210.93 con cochera, 253.13 con ampliación. Niveles: piso terminado (NPT), losa a +2.90 y +5.80, pretiles a +6.35 y +7.05. Capas útiles: `A-MUROS` (contorno de muros como polilíneas cerradas), `A-MUR-CALIDAD` (relleno de muros), `A-PUERTAS` y `A-VENTANAS` (bloques dinámicos con atributos), `A-CANCELERIA`, `A-ESCALON` (escalera), `A-MUEBLES` y `A-MUEBLES FIJOS` (cocina, baños, clósets), `Ar-Area` (**16 polígonos cerrados de cuartos**), `Ar-Texto` y `Ar-Niveles` (etiqueta de cuarto con nombre, nivel y área), `A-COTAS`, `A-EJES`, `A-JARDIN`, `A-AUTOS` | **Sí, es la fuente principal.** Muros, vanos, nombres y áreas de cuartos, escalera y muebles fijos |
| **ARQ-03,04 Alzados** | Fachadas principal, laterales y posterior, con y sin cochera o ampliación. Hay una segunda versión "propuesta" con fachada de piedra | Alturas de ventanas y pretiles; forma de la fachada para el 3D exterior |
| **ARQ-05 Cortes** | Cortes con niveles de losas y alturas, con nombres de cuartos (sala, comedor, cocina, recámaras, baño vestidor, lavandería, cochera) | Altura de muros y dobles alturas (la sala es de doble altura) |
| **AC-01 Acabados en muros y plafones** | Símbolos de acabado inicial, intermedio y final por muro; productos con marca y clave de color (por ejemplo, pintura Behr "Coconut Twist" GR-W14; block cara de piedra; perfil de madera sintética color ipé; pretil Behr "Burnished Pewter"). Plafón de vigueta y bovedilla | **Sí, para colores y materiales** de muros |
| **AC-02 Acabados en pisos** | Piso por cuarto: porcelanato 0.60 × 1.20 en planta baja y baños; piso tipo madera 0.20 × 1.20 en recámaras de planta alta; zoclos; concreto estampado exterior; pasto. Cantidades con 15% de desperdicio | **Sí, para texturas de piso** |
| **AC-03 Acabados en alzados** | Materiales de fachada (cantera gris, panel de madera sintética, pintura) | Para el 3D exterior |
| **AC-04 Cortes de baños** | Alzados interiores de cada baño, con muebles y accesorios de marca y modelo (lavabo, inodoro, regadera, monomandos), cubiertas de cuarzo, espejos y muebles de carpintería | Detalle fino de baños; opcional |
| **AL-01,02 Albañilerías** | Tipos de muro (block de jal de carga 15 × 20 × 40; muros sin carga 10 × 20 × 40; block arquitectónico en bardas), 334 cotas de muros y pretiles. **Ojo:** el cuadro de datos dice "Casa Palmito, prototipo 157 m²", copiado de otro proyecto | Espesor real de muros; opcional |
| **CA-01 Cancelería y puertas** | Tabla de puertas P1–P10 y canceles C1–C19 con cuarto, forma (fijo, abatible, corredizo), ancho, alto y material (aluminio negro con cristal claro de 6 mm; puertas de tambor de nogal) | **Sí, para medidas exactas de vanos** y tipo de apertura |
| **EST** (dos archivos: 3 recámaras 172.17 m² y 4 recámaras 253.13 m²) | Losa de cimentación, contratrabes, castillos, trabes, vigueta y bovedilla, armados | No, salvo el espesor de losa |
| **IE Instalación eléctrica** (no viene en este juego) | Según el temario y los reglamentos: plantas de iluminación y de contactos, apagadores, tablero, cuadro de cargas | Opcional: ubicar lámparas y contactos para "¿dónde va la tele?" |
| **IH / IS Hidráulica y sanitaria** (no viene) | Agua fría y caliente, isométricos, drenaje, registros, cisterna | No |
| **Ficha comercial (CHARDONNAY.pdf)** | Plantas a color con muebles, lista de espacios y **precios**: $4,741,561.80 (172.17 m²), $5,809,012.20 (+cochera, 210.93 m²) y $6,971,200.20 (+cochera y recámara, 253.13 m²) | Para revisar a ojo y para mostrar las variantes con su precio |

### 3.3 Cuál usar y qué esperar

1. **Base:** ARQ-01,02 (plantas). Trae muros, puertas, ventanas, cuartos con nombre y área, escalera y muebles fijos.
2. **Medidas de vanos:** CA-01. **Alturas:** ARQ-05 (cortes) y ARQ-03,04 (alzados).
3. **Acabados para el modo "colores y materiales":** AC-01, AC-02 y AC-03. Ya traen marca y clave de color, así que el 3D puede usar los acabados reales de la desarrolladora.
4. **Variantes:** cada prototipo viene sin y con ampliaciones, y cada variante tiene su precio (aquí la diferencia llega a $2.2 millones). Un 3D que cambie entre "base", "+cochera" y "+recámara" sirve para vender ampliaciones [Est.].

**Problemas reales del archivo:**
- La planta está **anidada en bloques** (un bloque por nivel) y todas las demás hojas insertan la planta base `AR-01-REC` como referencia.
- Los atributos de puertas existen ("Número de puerta", "Tipo", "Cuarto") pero **se quedaron con el valor de ejemplo** ("Cambiame", "Carpintería", "0101"). No se puede confiar en ellos; hay que leer la geometría.
- Hay datos copiados de otros proyectos: la hoja AL dice "Casa Palmito, prototipo 157 m²", y el bloque del membrete conserva el nombre de otro proyecto. Hay que revisar cada hoja contra la ficha comercial.
- Los nombres de capa son de este despacho. Otro despacho usará otros. Por eso conviene un flujo **semiautomático con revisión humana** y no prometer conversión automática [Est.].

**Aspecto legal:** todas las hojas dicen que la información es propiedad exclusiva del despacho y que copiarla sin autorización escrita viola la Ley Federal del Derecho de Autor. La ley protege la obra arquitectónica (art. 13, fr. VIII) y reserva al titular la reproducción en cualquier medio (art. 27) ([LFDA art. 13](https://mley.mx/LFDA/articulo/13/), [art. 27](https://mley.mx/LFDA/articulo/27/)). **El contrato con la desarrolladora debe incluir permiso por escrito para convertir y publicar los planos** (de la desarrolladora y, si el despacho conserva los derechos, del despacho). Además, el membrete trae nombres y cédulas de los responsables: **hay que quitarlo** de lo que se publique.

---

<!-- SECCION4 -->

---

<!-- NV -->

---

<!-- RECOMENDACION -->
