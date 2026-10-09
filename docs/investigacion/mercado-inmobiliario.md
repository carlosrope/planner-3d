# Mercado de planos 2D y modelos 3D de casas para inmobiliarias (México, con foco en Sinaloa)

Investigación al 9 de octubre de 2026. Tipo de cambio usado: **18 MXN por USD** (redondeado). Precios sin IVA salvo que se diga otra cosa.

**Leyenda**
- **[Oficial]** = dato de la página del proveedor, consultada el 9-oct-2026.
- **[Terceros]** = dato de un agregador, nota o anuncio, con su fecha cuando la tiene.
- **[Est.]** = cálculo o estimación propia.
- **[NV]** = no se pudo verificar.

Documento relacionado: [post-x-y-tecnica.md](post-x-y-tecnica.md) cubre el post viral de la cama, la técnica plano → 3D con LLM y las licencias para leer DWG/DXF en una app web. Aquí no se repite.

---

## Resumen

- **Nadie ofrece exactamente esto en Sinaloa.** Los SaaS internacionales (Matterport, CubiCasa, RoomSketcher) necesitan la casa construida o que alguien la dibuje, y están en inglés y en dólares. Los competidores mexicanos de "maqueta digital" (ArchVerse en Mazatlán, Volumento, Polygon, hauzd) apuntan a **torres y conjuntos** en Unreal, sin precio público salvo Volumento (desde $4,000 al mes por proyecto). No apareció ningún proveedor en Los Mochis.
- **Escala de precios en México:** tour 360 o render suelto $1,000–$6,000; Matterport de una casa ~$5,200; paquete de renders de preventa $25,000–$40,000; maqueta en Unreal a la medida, del orden de cientos de miles (VTOPIA en Argentina: US$10,000–$15,000).
- **Hoy se vende con ficha a color, renders y casa muestra.** Los tours casi no existen en los portales: 1 de 664 anuncios en Mazatlán en Mercado Libre; del orden de 2% con recorrido 360 en Inmuebles24.
- **La evidencia independiente es tibia:** con buenas fotos, el tour 3D no sube el precio de forma significativa (Harvard, 75,000 ventas). Lo que sí valoran los compradores es el **plano con medidas** (57% lo califica "muy útil", contra 41% el tour) y ver la casa amueblada. Las cifras grandes ("31% más rápido", "81% más vistas") son de Matterport y Zillow, que venden el producto. No hay estudios mexicanos ni de preventa.
- **La hoja correcta es ARQ (plantas):** trae muros, puertas, ventanas, polígonos de cuartos con nombre y área, escalera y muebles fijos. Se completa con CA (medidas de vanos), cortes y alzados (alturas) y AC (acabados con marca y color). EST, IE e IH casi no sirven para el 3D.
- **Precio sugerido para empezar:** $12,000–$20,000 por prototipo para la desarrolladora (se reusa en todas las casas del modelo) más $1,500–$3,000 al mes; $490–$3,000 por anuncio para asesores; prueba de muebles gratis para el comprador como captador de prospectos.
- **Sinaloa está difícil:** Culiacán con ventas de vivienda nueva -60% a -80% por la violencia; Los Mochis más caro y recibiendo familias que rentan. Mazatlán sigue construyendo torres, con compradores mayormente de otras ciudades de México.

---

## 1. Quién ofrece esto hoy y a qué precio

### 1.1 SaaS y servicios internacionales

Ninguno de estos productos toma el DWG de una desarrolladora mexicana y entrega, en español, un plano 2D más un 3D recorrible con prueba de muebles y cambio de acabados. Se dividen en siete grupos.

**a) Captura de casas ya construidas (cámara o celular)**

| Producto | Qué hace | Precio USD | Precio MXN [Est.] | Fuente |
|---|---|---|---|---|
| Matterport | Gemelo digital 3D, tour, plano esquemático | Professional "desde 50 espacios por $245/mes" (paquete con cámara Pro3 de $1,995). Plano esquemático $14.99–$39.99 por plano. MatterPak $59. Servicio de captura $238–$325 por casa de hasta 3,000 ft² (unos 280 m²) | $4,410/mes; plano $270–$720; captura $4,300–$5,850 | [Oficial: planes](https://matterport.com/plans), [Oficial: captura](https://matterport.com/capture-services) |
| CubiCasa | Plano 2D/3D escaneando con el celular | Lite $0 (EE. UU.), Plus $15, Plus 3D $65 por pedido; CAD +$35; video +$85 | $270 / $1,170 por casa | [Terceros: TrustRadius](https://www.trustradius.com/products/cubicasa/pricing), [Terceros: REcolorado](https://recolorado.com/?p=24461) |
| magicplan | Escaneo LiDAR, planos, presupuestos de obra | Mínimo 10 proyectos al mes; proyecto extra $40. Con 15 proyectos: $375–$600/mes según plazo | $720 por proyecto extra | [Oficial](https://www.magicplan.app/pricing), [ayuda oficial](https://help.magicplan.app/magicplan-pro-subscriptions); cifras mensuales [Terceros: SaaSworthy, sin fecha](https://www.saasworthy.com/product/magicplan-app/pricing) |
| Giraffe360 | Cámara robótica en renta: fotos, plano, tour | "Desde $360/mes" en EE. UU. (ya no aparece en la página); £159/mes en Reino Unido | ~$6,500/mes | [Oficial, sin precio visible](https://www.giraffe360.com/us/price) [NV] |

Matterport subió precios el 20-may-2025 ([Oficial](https://matterport.com/blog/subscription-pricing-update)) y CoStar terminó de comprarla el 28-feb-2025 ([Wikipedia](https://en.wikipedia.org/wiki/Matterport)). Su función de IA "Defurnish" (quitar muebles) ya está en la página de planes; el amueblado con IA seguía como "próximamente" [NV].

**b) Tours 360 con fotos (sin modelo 3D)**

| Producto | Precio USD | MXN [Est.] | Fuente |
|---|---|---|---|
| Kuula | Pro $20/mes anual ($24 mensual); Business $36/mes anual ($48 mensual) | $360–$864/mes | [Oficial](https://kuula.co/page/pricing) |
| CloudPano | Pro $22.50/mes, Pro Plus $33/mes, Commercial $199+/mes (todos anuales). La misma portada también dice "Pro desde $19" | $405–$3,580/mes | [Oficial, portada](https://www.cloudpano.com/) |

**c) Editores de planos y diseño de interiores (el cliente dibuja)**

| Producto | Precio USD | MXN [Est.] | Fuente |
|---|---|---|---|
| RoomSketcher | Pro $12/mes anual o $24 mensual; Team $35–$70/mes (5 usuarios). Plano por encargo $38 por piso (desde $18 con Pro). "AI Convert" $20 por piso. Render 3D $4 en plan gratis | Pro $216–$432/mes; plano $324–$684 | [Oficial](https://www.roomsketcher.com/pricing/) |
| Floorplanner | Créditos a $1.63 cada uno; exportar 3D cuesta 2 (SD) a 20 (8K) créditos. Plus $5/mes y Pro $29/mes según terceros | crédito ≈ $29 | [Oficial](https://floorplanner.com/pricing); Plus/Pro [Terceros: Capterra](https://www.capterra.com/p/164017/Floorplanner/) |
| Planner 5D | Premium $19.99/mes o $59.99/año; Professional $49.99/mes o $399.99/año. Incluye reconocimiento de planos por IA (subes la imagen y sale el 3D editable) | Desde México muestra $375/mes o $1,100/año (Premium) y $935/mes o $7,500/año (Professional) | [Oficial](https://planner5d.com/pricing) |
| Coohom | Pro $29, Élite $69 (la página no aclara si es mensual) | $522–$1,242/mes | [Oficial](https://www.coohom.com/pricing) |
| Homestyler | Pro+ desde $6.8/mes; Master+ desde $11.8/mes; Team $19.9 por usuario | $122–$358/mes | [Oficial](https://www.homestyler.com/pricing) |
| Cedreo | Proyecto único $139 (20 renders); Pro $129/mes (40 renders) | $2,500 por proyecto; $2,320/mes | [Terceros: Capterra](https://www.capterra.com/p/177284/Cedreo/pricing/), [PricingSaaS](https://pricingsaas.com/companies/cedreo) |

**d) Conversión de planos CAD a 2D/3D y visores 3D web**

| Producto | Qué hace | Precio USD | MXN [Est.] | Fuente |
|---|---|---|---|---|
| Archilogic | Convierte JPG/PDF/**DWG/DXF** en gemelo digital; exporta glTF e IFC. Enfocado en oficinas | Conversión $329 por plano en plan gratis; Plus $24.90 y Pro $59 **por plano al mes** (paquetes anuales desde 10 planos, conversión incluida) | $5,900 por conversión; $450–$1,060 por plano al mes | [Oficial](https://www.archilogic.com/pricing) |
| Shapespark | Publica un modelo 3D como recorrido web | Starter $19/mes (3 escenas), Standard $49 (25), Plus $99 (50), Premium $249 (150) | $342–$4,480/mes | [Oficial](https://www.shapespark.com/pricing) |
| BoxBrownie | Redibujo de plano 2D $30–$35; plano 3D $35–$40; render interior o exterior $350; render 360 $500. Desde IP mexicana todo sale 20% más barato | Plano 3D $630–$720; render $6,300 | [Oficial](https://www.boxbrownie.com/us/pricing) |
| Getfloorplan | Plano 2D → plano 3D, renders y tour 360 con IA | $20–$69 por proyecto (con tour 360: $35–$45) | $360–$1,240 | [Terceros: genai.works](https://genai.works/applications/getfloorplan), [topai.tools](https://topai.tools/t/getfloorplan); sin precio oficial |
| Planos 3D por encargo | Bella Virtual desde $69.95 por plano 3D amueblado y acotado, hecho desde tus planos, en 2–4 días hábiles. CadCrowd: $100–$450 por proyecto con freelancer; $200–$700 por piso con despacho | $1,260 (Bella Virtual) a $12,600 | [Bella Virtual](https://www.bellavirtual.com/pages/3d-floor-plans), [CadCrowd](https://www.cadcrowd.com/blog/?p=37370) |

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
- **Wayfair Muse:** gratis, lanzado en feb-2025 en lugar de Decorify; aplica estilos a la foto de un cuarto y enlaza a productos de Wayfair ([Furniture Today, 11-feb-2025](https://www.furnituretoday.com/e-commerce/wayfair-retools-its-consumer-ideation-experience-replacing-decorify-with-muse)). No confirmé si sigue activo en 2026 [NV].
- **Planner 5D:** realidad aumentada en la app, incluida en Premium ([Oficial](https://planner5d.com/pricing)).
- **El post viral** (@scheemunai, 24-sep-2026, unas 373 mil vistas) era una app web hecha a la medida con Three.js, no un producto a la venta. Detalle en [post-x-y-tecnica.md](post-x-y-tecnica.md) y en el [post original](https://x.com/scheemunai/status/2103059885361598633).

**g) Visualización para preventa (desarrollos sin construir)**

| Proveedor | Precio | MXN [Est.] | Fuente |
|---|---|---|---|
| VTOPIA (Argentina): gemelo digital del edificio en Unreal, renders y videos | US$10,000–$15,000 por proyecto | $180,000–$270,000 | [iProfesional](https://www.iprofesional.com/realestate/411084-como-es-la-tecnologia-para-recorrer-un-edificio-sin-construir-antes-de-comprar-departamento) (la página dice 22-ago-2024; el buscador la fecha en 2026) |
| Configurador 3D a la medida (freelancers y agencias web) | Configurador de unidades US$5,000–$12,000; sitio completo de desarrolladora con configurador US$15,000–$40,000; mantenimiento US$300–$650 al mes | $90,000–$720,000 | [Svilenkovic](https://www.svilenkovic.com/3d/real-estate-developer-3d), [Kolonell, 2026](https://kolonell.com/en/blog/real-estate-developer-software-cost-2026) (precios de agencias, no auditados) |
| 360Pros (Canadá/EE. UU.) | Tour de preventa renderizado desde US$3,995; con mezcla de unidades desde US$7,995 | $72,000–$144,000 | [360Pros](https://360pros.net/?p=11115) (sin fecha) |
| PropVR | Conversión de plano 2D a tour 3D: US$649–$1,200 por plano | $11,700–$21,600 | [Página de Notion atribuida a PropVR, sin fecha](https://sunderj91.notion.site/Convert-2D-plans-to-3D-virtual-tours-0218f648948e4ec79c49f7776bf50a16) [NV]; [Capterra, sin precio](https://www.capterra.com/p/210020/propvr/) |
| Treedis (gemelos digitales sobre escaneos) | Growth $41.99–$49.99/mes; Business $139.99–$169.99/mes | $760–$3,060/mes | [Terceros: SaaSworthy](https://www.saasworthy.com/product/treedis/pricing) |
| Unreal Engine (motor que usan ArchVerse y otros) | Gratis para empresas con ingresos menores a US$1M al año; arriba, US$1,850 por usuario al año; regalías si se licencia a terceros una app que corre Unreal | — | [Epic, 2024](https://www.unrealengine.com/en-US/blog/we-are-updating-unreal-engine-twinmotion-and-realitycapture-pricing-in-late-april) |

Sin precio público: 3D Estate, EnvisioXR, SmartPixel, Habiteo, PROJEVIZ (plantilla de Unreal Engine 5).

### 1.2 Proveedores en México y LatAm

Mercado Libre, Inmuebles24 y Fiverr bloquearon la lectura directa; esas cifras vienen del extracto del buscador y van marcadas.

**Precios de referencia por servicio en México**

| Servicio | Precio MXN | USD [Est.] | Fuente |
|---|---|---|---|
| Render estático (por imagen) | $4,800 promedio nacional (CDMX $5,370; Edomex $4,600); rango en la misma página $150–$4,500 | $267 | [Terceros: Habitissimo](https://www.habitissimo.com.mx/presupuesto/renders-3d), [CDMX](https://www.habitissimo.com.mx/presupuesto/renders-3d/ciudad-de-mexico) |
| Render 360 | $10,000 | $556 | [Terceros: Habitissimo](https://www.habitissimo.com.mx/presupuesto/renders-3d) |
| Render para preventa (estudio Inmerxia) | Básico desde $1,500; interior amueblado desde $3,500; hiperrealista desde $7,000; recorrido virtual desde $15,000; **paquete preventa $25,000–$40,000** | $83–$2,222 | [Terceros: Inmerxia, 12-may-2026](https://inmerxia.com.mx/inmobiliario/render-inmobiliario-para-preventa/) |
| Render residencial de un espacio (Studio ATF, CDMX) | Desde $2,800 | $156 | [Terceros: Studio ATF](https://www.studioatf.com/) |
| Render en Mercado Libre | $999–$1,599 por imagen; plano + modelo 3D + render para 91–120 m² en $13,800 | $56–$767 | [Terceros: Mercado Libre, extracto, fecha NV](https://listado.mercadolibre.com.mx/renders-arquitectonicos) |
| Recorrido virtual de una casa | $2,000–$185,000; 360 estándar $6,600; a medida $10,000; tour VR $25,000 | $111–$10,278 | [Terceros: Habitissimo](https://www.habitissimo.com.mx/presupuesto/hacer-recorrido-virtual) |
| Tour 360 por propiedad | Básico (menos de 200 m²) $850–$2,700; estándar $3,500–$4,900; premium desde $6,300. Entrada: CDMX $1,300, Guadalajara $1,120, Monterrey $700 | $47–$350 | [Terceros: Cronoshare, 2-ene-2026](https://www.cronoshare.com.mx/cuanto-cuesta/tour-virtual-360) |
| Fotógrafo inmobiliario en Mazatlán | Promedio $1,598 (rango $1,280–$1,870) | $89 | [Terceros: Cronoshare](https://www.cronoshare.com.mx/servicios/fotografo-inmobiliario/sinaloa/mazatlan) |
| Tour Matterport (Recorridos Virtuales México, CDMX) | **$5,200 con IVA** hasta 180 m²; incluye captura, publicación en 48 h y 1 año de hospedaje | $289 | [Terceros: proveedor](https://www.recorridosvirtuales.com/matterport3d/) |
| Animación 2D/3D (genérica) | $600–$1,500 por segundo, o sea unos $36,000–$90,000 por minuto [Est.] | $2,000–$5,000/min | [Terceros: Cronoshare](https://www.cronoshare.com.mx/cuanto-cuesta/servicio-animacion-2d-3d) |
| "Maqueta render 3D" (vista en planta amueblada) | $1,500–$10,000 (hasta $15,000) | $83–$833 | [Terceros: Habitissimo](https://www.habitissimo.com.mx/presupuesto/renders-3d) |
| **Maqueta digital SaaS (Volumento)** | **Desde $4,000 al mes por proyecto** (plan QuickStart; precio final según módulos) | $222/mes | [Oficial](https://volumento.com/maqueta-digital) |

Expansión (3-sep-2024) cita el mismo rango de $2,000 a $185,000 para el recorrido virtual de una casa ([Expansión](https://expansion.mx/tecnologia/2024/09/03/recorridos-virtuales-en-inmuebles-hacen-que-venda-mi-departamento)). No encontré una tarifa mexicana publicada de "plano 3D amueblado" para inmobiliarias [NV].

**Competidores directos en México: "maqueta digital" o "sala de ventas virtual" para desarrolladores**

| Empresa | Dónde | Qué ofrece | Precio | Fuente |
|---|---|---|---|---|
| **ArchVerse** | **Mazatlán** | Maqueta virtual en Unreal Engine 5 vía navegador. 9 módulos: recorrido 3D, burbujas 360, entorno urbano, topografía, buscador de unidades con inventario y precio en vivo, simulador financiero, asoleamiento y amenidades. Entrega en 3 a 5 semanas. Pide planos, renders, lista de unidades y marca | No publica. Sin clientes con nombre; sus indicadores de resultados están vacíos | [Oficial](https://www.archverse.studio/) |
| Volumento | México (lada de Monterrey) [Est.] | Maqueta digital, inventario en tiempo real, cotizador, recorrido en primera persona, **cambio de acabados en tiempo real**, enlace con CRM | Desde $4,000/mes por proyecto | [Oficial](https://volumento.com/maqueta-digital) |
| Polygon | México | Maqueta "dollhouse", tour 360, AR/VR, mapa de disponibilidad, configurador de espacios, CRM, kiosco. Dice 13 años en preventa | No publica | [Oficial](https://polygon.mx/) |
| Navi3D / Showroom Virtual | México | Maqueta interactiva a la medida, VR/AR, Matterport, Unreal | No publica | [Oficial](https://navi3d.mx/), [Showroom Virtual](https://showroom-virtual.com/) |
| hauzd | Probablemente Panamá [Est.] | Showroom 3D en navegador con precios y disponibilidad. Caso en México: The Landmark (Tijuana). Dice tener más de 200 desarrolladores | No publica | [Oficial](https://hauzd.com/es) |
| Urbania 3D | Rosario, Argentina | Showroom con 360, plantas amuebladas, cambio de acabados, CRM, calculadora y links para brokers; 58 proyectos en 5 mercados según prensa | No publica | [Oficial](https://urbania3d.app/en), [prensa](https://www.innovaciondigital360.com/software/urbania-plataforma-venta-en-pozo/) |

Otros estudios con oferta de preventa (sin precios): EVA 3D en Mérida ([sitio](https://eva3d.com/)), Interprika/3DVOX en León ([Tec de Monterrey](https://conectastg.tec.mx/es/pdf-generator/97296)), Pixel Folks y otros en Monterrey (ranking hecho por un competidor, [Maverick Frame, 2-ago-2026](https://www.maverickframe.com/blog/best-3d-rendering-companies-mexico/)). Scannen se presenta como el primer Matterport Service Partner de Nuevo León, pero la página tiene unos 9 años ([Scannen](https://scannen.mx/matterport-service-partner-en-nuevo-leon/)).

**En Sinaloa:** fuera de ArchVerse (Mazatlán) no encontré estudios de render o tours con sede verificable en **Los Mochis, Culiacán, Hermosillo u Obregón** [NV]. Hay una cuenta de Instagram "Matterport Sinaloa" con unos 242 seguidores, sin evidencia de ser socio oficial ([Instagram](https://www.instagram.com/matterportsin/)). Puede ser un hueco real o un límite del buscador; conviene revisar Google Maps e Instagram a mano.

**Proptech generalistas que no hacen esto:** Habi es iBuyer y dueña de Propiedades.com desde 2022 ([Descubre](https://www.descubre.vc/propiedades)); Spot2 es de inmuebles comerciales ([Bloomberg Línea, 8-may-2024](https://www.bloomberglinea.com/2024/05/08/valor-capital-y-monashees-lideran-la-ronda-en-spot2-el-quinto-andar-del-mercado-comercial/)); La Haus hizo recorridos 360 y visitas guiadas en 2021–2022 ([Forbes](https://forbes.co/2021/03/05/emprendedores/las30deforbes-la-haus/)).

### 1.3 Lectura del panorama [Est.]

- **Escala de precios en México:** tour o render suelto $1,000–$6,000; Matterport de una casa ~$5,200; paquete de renders de preventa $25,000–$40,000; maqueta digital SaaS desde $4,000/mes por proyecto; maqueta en Unreal hecha a la medida, probablemente de $100,000 en adelante (el único precio público de LatAm es VTOPIA, US$10,000–$15,000).
- **El hueco:** entre el render estático (barato, no interactivo) y la maqueta en Unreal (cara, 3 a 5 semanas) no hay un producto **por prototipo de casa**, que salga de los DWG del despacho, que use los acabados reales, que funcione en el celular por WhatsApp y que deje al comprador probar sus muebles con medidas reales. Los competidores mexicanos se enfocan en **torres y conjuntos** (inventario de unidades, amenidades), no en la casa de fraccionamiento.
- **Los SaaS internacionales** (Matterport, CubiCasa, RoomSketcher) necesitan la casa construida o que alguien la dibuje; están en inglés y cobran en dólares.

---

## 2. Cómo se vende hoy la vivienda en preventa en México

### 2.1 Qué muestran las desarrolladoras y los asesores

Las páginas se leyeron sin JavaScript, así que puede faltar contenido dinámico.

- **Ficha comercial con plano a color y precio.** Es el material del juego Chardonnay que está en el repo: plantas amuebladas en 2D, lista de espacios y precio por variante (sección 3). No trae 3D ni recorrido.
- **Desarrolladoras nacionales:**
  - **Sadasi** publica fichas por modelo con plantas baja y alta, botón de "Tour Virtual" y "Cita Virtual" por Zoom o WhatsApp. Ejemplo: modelo Duranta Plus de 141 m² a $3.66 millones ([Sadasi](https://sadasi.com/desarrollos-sadasi/desarrollos-en-el-estado-de-mexico/tecamac/paseos-del-bosque-2-residencial/casas-modelo-duranta-plus)).
  - **Ruba** (opera en Hermosillo y Obregón, no en Sinaloa) no muestra tours ni planos en su portada; su blog sobre recorridos virtuales es genérico ([Ruba](https://ruba.mx/), [blog, 30-abr-2024](https://ruba.mx/explorando-sin-salir-de-casa-las-ventajas-de-los-recorridos-virtuales-en-el-hogar)).
  - **Javer** (Nuevo León, Jalisco, Querétaro y otros; no está en Sinaloa ni Sonora; Vinte la compró en dic-2024) tampoco muestra tours en su portada ([Javer](https://www.javer.com.mx/), [Vinte](https://vinte.com/)). Pero **lo digital ya pesa mucho**: 55% de las unidades del 4T2020 se vendieron por canales digitales (el titular dice 50%) ([El CEO, 6-feb-2021](https://elceo.com/bienes-raices/ventas-por-internet-represento-el-50-de-la-colocacion-de-javer/)), y alrededor de 71% de lo escriturado en el 1T2024 según su reporte en BMV ([BMV, extracto del buscador](https://www.bmv.com.mx/en/issuers/profile/JAVER-30053)) [NV en el PDF].
- **Mazatlán (torres):**
  - Lizantos y GIA tienen sitios solo en español, sin tour, planos ni renders visibles, y sin versión en inglés ([Lizantos](https://www.lizantos.com/), [GIA](https://giadesarrollos.mx/)).
  - Adora Mazatlán tiene pestañas de "Planta arquitectónica" y "Vista 3D", pero la vista 3D parece un render estático; desde $1.99 millones ([Adora](https://adoramazatlan.com/)).
- **Culiacán:** 32 constructoras y 60 fraccionamientos en 2024, entre ellas Homex, Housesin, Fincamex, Lafher, Consorcio Hogar y Stanza ([Tus Buenas Noticias, 13-feb-2024](https://tusbuenasnoticias.com/economia/32-fraccionamientos-casas-nuevas-en-culiacan/)). No verifiqué si alguna ofrece tours.
- **Los Mochis:** no hay un listado de desarrolladoras. Aparecen anuncios de prototipos de 80–88 m² con crédito Infonavit o Fovissste ([Pincali](https://www.pincali.com/en/home/prototipo-roble-plus)), Residencial Mediterráneo desde $1 millón ([Constructora LM](https://www.constructoralm.mx/fraccionamientos)) y lotes en preventa de Las Perlas a $6,500 por m² ([Luz Noticias, 14-nov-2024](https://www.luznoticias.mx/2024-11-14/sinaloa/anuncian-la-construccion-de-las-perlas-residencial-una-exclusiva-zona-para-venta-de-lotes-en-los-mochis/224810)).
- **Casa muestra:** es la herramienta tradicional del fraccionamiento, pero inmoviliza una vivienda terminada y amueblada. No encontré una fuente con su costo [NV].

**Tours y planos en los portales (casi no hay):**
- En Mercado Libre Inmuebles, el filtro "Con tour virtual" mostraba **1 anuncio de 664** en Mazatlán ([Mercado Libre, extracto del buscador, fecha NV](https://inmuebles.mercadolibre.com.mx/sinaloa/mazatlan/)).
- En Inmuebles24 hay unos 4,709 departamentos en venta con "Recorrido 360" ([Inmuebles24](https://www.inmuebles24.com/departamentos-en-venta-recorrido-360.html)) y unas 29,858 propiedades con planos ([Inmuebles24](https://www.inmuebles24.com/inmuebles-planos.html)), de unas 235,586 en venta ([Inmuebles24](https://www.inmuebles24.com/inmuebles-en-venta.html)). Eso da del orden de **2% con tour y 8% con plano** [Est.; bases no comparables y sin fecha].

**Cuánto pagan hoy los asesores por publicar (ancla para el precio):**

| Herramienta | Precio MXN al mes | Fuente |
|---|---|---|
| EasyBroker (CRM más usado), IVA incluido | $490 (10 propiedades), $990 (25), $1,490 (50); sitio web +$500. No menciona tours | [Oficial](https://www.easybroker.com/mx/planes) |
| Mercado Libre Inmuebles, fuera de CDMX (vigente desde 5-ene-2026) | $865–$2,813 por 15–100 publicaciones; destacados $1,176–$9,569; "Showroom" de una propiedad $1,299 | [Oficial, vía extracto](https://www.mercadolibre.com.mx/ayuda/Costos-para-inmobiliarias_1146) |
| Inmuebles24, más IVA | Simple $2,203 (5 avisos); Destacado $2,745 (1 aviso); Superdestacado $3,784 (1) o $7,128 (5) | [Oficial, vía extracto, sin fecha](https://www.inmuebles24.com/publica-tu-propiedad/profesional.html) |
| Propiedades.com | Gratis | [Oficial](https://propiedades.com/publicar) |

Un asesor en Sinaloa gasta típicamente de $500 a $7,000 al mes en CRM y portales [Est.].

### 2.2 El mercado en Sinaloa

**Precios de vivienda**
- **Sinaloa:** precio promedio de $1,726,750 y mediana de $1,254,600 o menos, +8.43% anual (índice SHF, 2T2026; solo compras con crédito). Nacional: $1,960,032. Culiacán +8.0%, Mazatlán +8.6% ([IIEG con datos SHF, 13-ago-2026](https://iieg.gob.mx/ns/wp-content/uploads/2026/08/reporte_indice_precios_vivienda_mexico_2doT_2026.pdf)). Los Mochis no está en la muestra.
- **Los Mochis:** AMPI dice que Ahome es 10–15% más caro que otras ciudades de Sinaloa, con alzas de hasta 30% ([Luz Noticias, 14-abr-2026](https://www.luznoticias.mx/2026-04-14/sinaloa/viviendas-y-terrenos-en-los-mochis-suben-hasta-un-30-es-la-ciudad-mas-cara-de-sinaloa/285512)). Anuncios de 2026: casas nuevas en privadas desde $3.6 millones, Las Villas de $6.8 a $15 millones ([Mitula](https://casas.mitula.mx/casas/casas-mochis-ahome)). El prototipo Chardonnay (sección 3) cuesta de $4.74 a $6.97 millones.
- **Mazatlán, preventa de departamentos:** desde unos $2.0 millones; $2.7 millones por 53 m² en Torre La Marea II; $4.1–$4.8 millones por 70–85 m² frente al malecón ([Trovit](https://casas.trovit.com.mx/departamento-preventa-mazatlan), [Inmuebles24](https://www.inmuebles24.com/propiedades/clasificado/veclapin-departamentos-en-venta-en-torre-la-marea-ii-149574438.html), [Vivanuncios](https://www.vivanuncios.com.mx/a-venta-departamento/zona-dorada/departamentos-en-preventa/146345372)). Eso da $50,000–$75,000 por m² [Est.].
- **Comisión del asesor:** 3–5% del precio ([tesis UAQ](https://ri-ng.uaq.mx/bitstream/123456789/13186/1/IGMAN-327093.pdf); [vLex, citando a Inmuebles24](https://vlex.com.mx/vid/honorarios-inmobiliarios-descubre-calculan-950261486)); 3–8%, alrededor de 5% en CDMX y Guadalajara ([Mercado Libre](https://www.mercadolibre.com.mx/blog/re-cuanto-cobra-una-inmobiliaria-por-vender-una-casa-en-mexico)). Sobre el promedio estatal, 3–5% son $52,000–$86,000 [Est.].

**Tamaño del mercado**
- **Asesores:** unos 3,000 en Sinaloa, de los que solo 220 estaban en el padrón de la nueva Ley Inmobiliaria del estado en junio de 2025 ([Luz Noticias, 7-jun-2025](https://www.luznoticias.mx/2025-06-07/sinaloa/evita-fraudes-en-sinaloa-solo-hay-220-inmobiliarios-formales/247597)); otra nota estima 5,000 y multas de hasta $113,000 sin licencia ([Luz Noticias, 30-may-2025](https://www.luznoticias.mx/2025-05-30/sinaloa/para-evitar-fraudes-elevan-multas-a-113-mil-pesos-a-asesores-inmobiliarios-sin-licencia-/246535)). No encontré el número de socios de AMPI por sección [NV].
- **Vivienda nueva registrada (RUV):** 138,926 a nivel nacional para 2025, a octubre ([Expansión Obras, 6-oct-2025](https://obras.expansion.mx/inmobiliario/2025/10/06/mexico-construye-una-cada-4-casas-que-hacia-10-anos)). No encontré la cifra oficial de Sinaloa; se puede descargar del SNIIV ([SNIIV](https://sniiv.sedatu.gob.mx/Reporte/Datos_abiertos)) [NV].
- **Vivienda para el Bienestar en Sinaloa:** 56,000 viviendas en total (37,000 Infonavit, 15,000 Conavi, 4,000 Fovissste) según el gobernador, mar-2026 ([Tus Buenas Noticias](https://www.tusbuenasnoticias.com/amp/noticias/sinaloa/2026/03/25/58299-como-son-las-casas-del-programa-vivienda-para-el-bienestar-entregadas-en-sinaloa)). En Ahome, 3,500 en Nuevo Horizonte y unas 2,000 más proyectadas para 2026, de 60 m² a $550,000–$600,000 ([Luz Noticias, 27-ago-2025](https://www.luznoticias.mx/2025-08-27/sinaloa/viviendas-del-bienestar-proyectan-otras-2-mil-viviendas-para-los-mochis-en-el-2026/257252)). Es un programa público de bajo precio: **no es cliente** para este servicio [Est.].
- **Mazatlán:** unos 220 proyectos en proceso y más de 6,400 departamentos en construcción, alrededor de 50% vendidos (dic-2025) ([Soy Sinaloa](https://soysinaloa.com/index.php/2025/12/03/fraudes-inmobiliarios-mazatlan-2025/)); 58 torres en construcción en mar-2026 ([El Sol de Mazatlán, vía extracto](https://oem.com.mx/elsoldemazatlan/local/mazatlan-acelera-su-vivienda-vertical-hay-58-torres-en-proceso-de-construccion-28766292)).

**Culiacán: la crisis de seguridad frenó las visitas**
- Venta de vivienda nueva -70% según Canadevi Sinaloa: "Si no hay visitas, no hay ventas". 4 de cada 10 prospectos se mudan; los inversionistas se van a Los Mochis, Guasave y Guamúchil ([Infobae, 24-jul-2025](https://www.infobae.com/mexico/2025/07/24/paralisis-inmobiliaria-en-culiacan-violencia-del-cartel-de-sinaloa-desploma-ventas-de-vivienda-y-ahuyenta-inversiones/)).
- La caída pasó de -80% en 2025 a -60% en enero de 2026, "sin recuperación real" ([Azteca Sinaloa, 3-feb-2026](https://www.aztecasinaloa.com/noticias/panorama-complicado-para-la-venta-vivienda-nueva-en-sinaloa-en-2026-video/)). Solo 10 solicitudes de fraccionamientos nuevos de enero a agosto de 2025, contra 2–3 al mes antes ([Milenio](https://www.milenio.com/policia/culiacan-en-crisis-inmobiliaria-tras-guerra-entre-cartel-de-sinaloa)).
- Una inmobiliaria bajó de 24 a 11–15 ventas al mes; los bancos restringieron hipotecas y créditos puente ([Ríodoce, 12-nov-2025](https://riodoce.mx/2025/11/12/violencia-frena-el-mercado-inmobiliario-en-culiacan/)).
- **No encontré ninguna fuente que diga que los compradores prefieren visitas remotas;** lo documentado es que dejaron de visitar. Eso favorece el recorrido a distancia, pero también significa desarrolladoras con menos presupuesto [Est.].
- **Los Mochis** recibe familias de Culiacán y Mazatlán que llegan a **rentar**, no a comprar ([Luz Noticias, 29-may-2026](https://www.luznoticias.mx/2026-05-29/sinaloa/aumento-en-rentas-por-familias-de-culiacan-y-mazatlan-en-los-mochis/291140)).

**Mazatlán: el comprador remoto es sobre todo mexicano de otra ciudad**
- Alrededor de 80% de los compradores de 2018–2022 fueron mexicanos (sobre todo de Culiacán, Torreón y Durango) y 20% extranjeros, según AMPI Mazatlán ([Cobertura 360, 25-ene-2023](https://cobertura360.mx/2023/01/25/sonora/los-canadienses-y-estadounidenses-que-viven-en-mazatlan-huyen-por-el-crecimiento-anarquico-del-puerto/)). No hay dato de 2025–2026 sobre extranjeros en preventa [NV].
- Hubo fraudes en preventa (Tower Life, Torre Triana, unas 70 familias) ([Soy Sinaloa](https://soysinaloa.com/index.php/2025/12/03/fraudes-inmobiliarios-mazatlan-2025/)). El comprador remoto pide **verificación**, no solo visualización: mostrar licencia y avance de obra junto al 3D le da credibilidad [Est.].

### 2.3 ¿Los tours 3D y los planos aumentan prospectos o ventas?

**Lo primero: casi toda la evidencia es de casas usadas en EE. UU.** Ahí el tour compite contra buenas fotos. En preventa no hay casa que fotografiar, así que el 3D sustituye a la casa, no a las fotos. Eso puede hacer que el efecto en preventa sea mayor, pero **no encontré ningún estudio que lo mida** [Est.].

**Datos independientes (académicos o de asociaciones)**

- **Harvard Business School e Ivey (Troncoso y Zhang):** 75,178 ventas en Los Ángeles vía Redfin, mar-2019 a mar-2021; 22% con tour 3D. Sin controlar la calidad de fotos y texto, el tour se asocia con +1.1% de precio. Con esos controles, el efecto **no es significativo**. La reducción de días en el mercado fue sobre todo temporal (pandemia). El tour sirve más en zonas de inmobiliarias pequeñas y colonias menos buscadas, y ayuda al comprador a descartar casas antes de visitarlas ([HBS Working Knowledge, 5-dic-2023](https://www.library.hbs.edu/working-knowledge/are-virtual-tours-still-worth-it-in-real-estate-evidence-from-75000-home-sales)).
- **Anderson, Freybote y Manis, *Journal of Real Estate Finance and Economics* (2024):** 34,359 ventas de casas unifamiliares en EE. UU. El tour virtual afecta el precio de casas **habitadas** (directamente y a través del tiempo en el mercado), con signo distinto según el segmento de precio. **No tiene efecto** en casas desocupadas ([Springer](https://www.springerprofessional.de/en/the-impact-of-virtual-marketing-strategies-on-the-price-tom-rela/23227228)).
- **NAR, Profile of Home Staging 2025** (encuesta a agentes, feb-2025): 83% de los agentes de compradores dicen que amueblar la casa ayuda al comprador a imaginarla como su hogar. Lo que más importa amueblar: sala (37%), recámara principal (34%) y cocina (23%). Calificaron como "muy importante": fotos 73%, staging físico 57%, video 48%, tours virtuales 43% ([NAR, 6-may-2025](https://www.nar.realtor/press-releases/nar-report-reveals-home-staging-boosts-sale-prices-and-reduces-time-on-market)). Es opinión de agentes, no medición de ventas.
- **NAR, Generational Trends 2025** (vía resumen de terceros): 57% de los compradores que buscan en internet califican el plano como "muy útil", contra 41% el tour virtual y 83% las fotos ([Webtonic](https://www.webtonic.io/blog/real-estate-native-advertising-statistics)) [NV en el PDF original; otro resumen del mismo año da 38% para tours y 81% para fotos]. En 2022, el plano también le ganaba al tour: 55% contra 43% ([F8 Real Estate](https://f8re.com/post/the-surprising-importance-of-floor-plans-in-the-home-search-process)).
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
- Hay datos copiados de otros proyectos: la hoja AL dice "Casa Palmito, prototipo 157 m²"; la hoja ARQ trae un texto de "Prototipo Rhapis" con las superficies del Chardonnay; y el bloque del membrete conserva el nombre de otro proyecto. Hay que revisar cada hoja contra la ficha comercial.
- Los nombres de capa son de este despacho. Otro despacho usará otros. Por eso conviene un flujo **semiautomático con revisión humana** y no prometer conversión automática [Est.].

**Aspecto legal:** todas las hojas dicen que la información es propiedad exclusiva del despacho y que copiarla sin autorización escrita viola la Ley Federal del Derecho de Autor. La ley protege la obra arquitectónica (art. 13, fr. VIII) y reserva al titular la reproducción en cualquier medio (art. 27) ([LFDA art. 13](https://mley.mx/LFDA/articulo/13/), [art. 27](https://mley.mx/LFDA/articulo/27/)). **El contrato con la desarrolladora debe incluir permiso por escrito para convertir y publicar los planos** (de la desarrolladora y, si el despacho conserva los derechos, del despacho). Además, el membrete trae nombres y cédulas de los responsables: **hay que quitarlo** de lo que se publique.

---

## 4. Modelos de negocio y precios sugeridos (MXN)

**Todo esta sección es estimación propia [Est.]**, armada con las anclas de las secciones 1 y 2. Precios antes de IVA. Hay que validarlos con 3 a 5 clientes reales antes de publicarlos.

**Anclas que más pesan**
- Paquete de renders de preventa: $25,000–$40,000 ([Inmerxia](https://inmerxia.com.mx/inmobiliario/render-inmobiliario-para-preventa/)). Render suelto: ~$4,800 ([Habitissimo](https://www.habitissimo.com.mx/presupuesto/renders-3d)).
- Maqueta digital SaaS: desde $4,000/mes por proyecto ([Volumento](https://volumento.com/maqueta-digital)).
- Tour de una casa: $850–$4,900 en 360 ([Cronoshare](https://www.cronoshare.com.mx/cuanto-cuesta/tour-virtual-360)); Matterport ~$5,200 ([Recorridos Virtuales](https://www.recorridosvirtuales.com/matterport3d/)).
- Plano 3D por encargo en el extranjero: $630–$1,260 por casa (BoxBrownie, CubiCasa, Bella Virtual).
- Lo que paga un asesor al mes por CRM y portales: $490–$2,800 (EasyBroker, Mercado Libre, Inmuebles24).
- Precio de la casa: Chardonnay $4.74–$6.97 millones; promedio estatal $1.73 millones. Comisión del asesor: 3–5%.

### (a) Por prototipo, para la desarrolladora (se reusa en todas las casas del mismo modelo)

| Concepto | Precio sugerido | Por qué |
|---|---|---|
| Prototipo residencial (casas de más de $2.5 millones): plano 2D interactivo con medidas + 3D recorrible en el celular + acabados reales de las hojas AC + amueblado de muestra | **$12,000–$20,000 pago único** | Menos que un paquete de renders de preventa y parecido a 3 o 4 renders sueltos, pero interactivo. Es 0.25–0.4% del precio de **una** Chardonnay y se usa en todo el modelo |
| Variante del mismo prototipo (+cochera, +recámara, fachada alterna) | $3,000–$6,000 cada una | Las variantes del Chardonnay difieren hasta $2.2 millones: ayudar a vender una sola ampliación paga el servicio muchas veces |
| Prototipo de interés medio (casas de $1–$2.5 millones) | $6,000–$10,000 | Más volumen y menos margen; mismo trabajo técnico |
| Hospedaje y cambios por desarrollo (link, marca, estadísticas, actualizar precios) | $1,500–$3,000 al mes, o 6–12 meses incluidos en el pago inicial | Por debajo de Volumento ($4,000/mes), que además trae inventario y cotizador |
| Paquete fraccionamiento: 3–4 prototipos + página del desarrollo + mapa simple de lotes | $45,000–$80,000 + $2,500–$5,000 al mes | Ejemplo: 120 casas de $4.7 millones = $564 millones de ventas. $60,000 + 18 meses × $3,000 = $114,000, o sea 0.02% de las ventas y menos de la mitad de la comisión de **una** casa (5% de $4.7 millones = $237,000) |
| Casa a la medida o sin prototipo, cobrada por m² | $25–$60 por m² de construcción (172 m² = $4,300–$10,300) | Entre el Matterport de EE. UU. (~$19–$37/m²) y el staging de un Matterport de roOomy (~$81/m²) |

**Qué no vender aquí:** Vivienda para el Bienestar (casas de $550,000–$600,000 de un programa público) ni torres grandes de Mazatlán, donde ya compiten ArchVerse, Volumento y Polygon con inventario de unidades y amenidades.

### (b) Por anuncio, para el asesor

| Concepto | Precio sugerido | Por qué |
|---|---|---|
| **Casa de catálogo:** el prototipo ya está modelado (por ejemplo, un asesor revende una Chardonnay) | $490–$990 por anuncio, 6 meses de link con su marca | Cuesta casi nada producirlo. Es como un mes de EasyBroker |
| Casa nueva a dibujar desde PDF, plano o croquis con medidas | $1,500–$3,000 | Dentro del rango de un tour 360 ($850–$4,900) y por debajo de un Matterport ($5,200); es 2–6% de la comisión sobre una casa de $1.73 millones |
| Extra: amueblado y acabados alternos ("así se vería remodelada") | $500–$1,000 | Staging con IA cuesta $10–$540 por foto, pero aquí es un 3D medible |

**Idea clave:** cada prototipo que se modela para una desarrolladora alimenta un **catálogo de casas de Los Mochis**. Cuando esas casas se revenden, el asesor solo paga el anuncio. Es la ventaja que un Matterport o un render suelto no tienen.

### (c) Suscripción mensual para inmobiliarias

| Plan | Precio sugerido al mes | Incluye |
|---|---|---|
| Asesor | $390–$590 | 3 anuncios activos, catálogo completo de prototipos, link con su marca y botón de WhatsApp |
| Agencia | $1,290–$2,490 | 10–25 anuncios activos, usuarios ilimitados, marca de la agencia, 1 casa nueva dibujada al mes (las demás a $1,000–$1,500) |

Anclas: EasyBroker $490–$1,490 con IVA; Inmuebles24 $2,203 por 5 avisos; Kuula $360–$864; RoomSketcher $216–$432; Matterport ~$4,410 por 50 espacios. **El mercado es chico:** 220 asesores con licencia en todo Sinaloa a mediados de 2025. Con 30 agencias a $1,500 serían unos $45,000 al mes. La suscripción complementa; no sostiene el negocio por sí sola.

### (d) "¿Caben mis muebles?" para el comprador

- **Recomendado: gratis para el comprador, lo paga la desarrolladora o el asesor.** El comprador guarda su acomodo dejando su WhatsApp, y ese dato es un **prospecto calificado** para quien paga. Las herramientas para el consumidor ya son gratis o baratas: IKEA Kreativ gratis, Planner 5D Premium $1,100 al año desde México, Homestyler desde ~$122 al mes.
- **Opción de pago para el comprador después de apartar:** "Planea tu mudanza" a $149–$299 pago único por casa, o incluido por la desarrolladora en el paquete de entrega a $300–$800 por vivienda.
- **Comisión de mueblerías** por los muebles que el comprador coloca en el 3D: es una hipótesis; no investigué si alguna mueblería de Sinaloa paga afiliación [NV].
- Para que la prueba de muebles sea creíble, las medidas deben salir del DWG (cuartos, vanos, alturas) y los muebles deben traer medidas reales. La crítica principal a los demos con IA es que inventan proporciones (ver [post-x-y-tecnica.md](post-x-y-tecnica.md)).

---

## 5. Lo que no se pudo verificar

- **Precios oficiales** de CubiCasa, magicplan, Giraffe360, Cedreo, Getfloorplan, PropVR y de los planes Plus y Pro de Floorplanner (las páginas los cargan con JavaScript o piden cuenta). Tampoco el precio base de Matterport Professional ni si siguen a la venta sus planes Starter y Business.
- **Precios de los competidores mexicanos** de maqueta digital (ArchVerse, Polygon, Navi3D, hauzd); solo Volumento publica un "desde".
- **Proveedores de 3D o tours con sede en Los Mochis, Culiacán, Hermosillo u Obregón:** no aparecieron en el buscador. Hay que revisarlo a mano en Google Maps e Instagram.
- **Desarrolladoras activas en Los Mochis** y cuántos prototipos manejan: no hay un listado público. Tampoco el costo de una casa muestra.
- **Cifra oficial de RUV para Sinaloa 2024–2025** (se puede bajar del SNIIV) y el número de socios de AMPI en Los Mochis, Culiacán y Mazatlán.
- **Cualquier estudio mexicano** que mida si los tours o planos aumentan prospectos o ventas. No encontré ninguno, ni de portales.
- **Evidencia de preventa:** los estudios serios son de reventa en EE. UU.; ninguno mide el efecto del 3D en casas que aún no existen.
- **Participación actual de extranjeros** en la preventa de Mazatlán (el último dato es de 2023).
- **Si los compradores de Culiacán prefieren visitas remotas:** lo documentado es que dejaron de visitar, no que pidan recorridos virtuales.
- **Juego de planos:** solo revisé un juego real (Chardonnay), sin hojas IE ni IH. Otros despachos usarán otras capas y siglas.
- **El post viral:** X bloquea la consulta directa; los datos vienen de APIs espejo y del índice del buscador (detalle en [post-x-y-tecnica.md](post-x-y-tecnica.md)).

---

## 6. Recomendación

1. **Empezar con desarrolladoras de casas residenciales en Los Mochis, vendiendo por prototipo.** Es donde el hueco es más claro: los competidores mexicanos hacen torres en Unreal y nadie en Los Mochis apareció ofreciendo esto. Precio de arranque: **$15,000 por prototipo + $2,000 al mes de hospedaje**, con 6 meses incluidos. Variantes a $4,000.
2. **Hacer el primer piloto con el juego Chardonnay que ya está en el repo, pero con permiso por escrito** de la desarrolladora y del despacho antes de mostrarlo a nadie más (el plano lo prohíbe y la LFDA lo respalda). Quitar el membrete con nombres y cédulas. Ofrecer el piloto gratis o con descuento a cambio de datos de uso y un testimonio.
3. **Diferenciarse en lo que nadie más junta:** medidas reales del DWG; acabados reales de las hojas AC; variantes con su precio (+cochera, +recámara); funciona en el celular y se comparte por WhatsApp; en español (y en inglés para Mazatlán más adelante); el comprador prueba **sus** muebles.
4. **Flujo semiautomático, no "sube tu DWG y listo".** Leer `A-MUROS`, `A-PUERTAS`, `A-VENTANAS` y los polígonos de cuartos de ARQ, completar con CA, cortes y AC, y siempre revisar a mano contra la ficha comercial. Cuidar la licencia del lector de DWG (ver [post-x-y-tecnica.md](post-x-y-tecnica.md)).
5. **Asesores en segundo lugar, sobre el catálogo.** Cuando haya 10–20 prototipos modelados, vender el anuncio de "casa de catálogo" a $490–$990 y la suscripción de agencia a $1,290–$2,490 al mes.
6. **"¿Caben mis muebles?" gratis para el comprador**, como gancho que captura su WhatsApp para la desarrolladora o el asesor. Cobrar al comprador solo después de apartar, si acaso.
7. **No prometer "vendes X% más".** La evidencia independiente no lo respalda. Prometer menos visitas en balde y prospectos mejor calificados, y medirlo desde el día uno: vistas, tiempo en el 3D, acomodos guardados y clics a WhatsApp.
8. **Riesgos a vigilar:** Culiacán sigue con ventas -60% y menos presupuesto; ArchVerse ya está en Mazatlán; el mercado de asesores con licencia es chico (220 en el estado); y cada despacho dibuja distinto.
