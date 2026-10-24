"""Adapta el diseñador floorplan-3d (MIT, wuyi / @akokoi1) a Planner 3D.

Toma tools/designer/upstream/index.html (copia sin cambios del original, ver COMMIT)
y escribe src/designer/disenador.html con estos cambios:
- Los datos de la casa (muros, ventanas, puertas, cuartos, cotas, muebles) vienen de
  window.__CASA__ (lo inyecta la ruta /disenador/[casa]); cada planta es un plano.
- Selector de planta (baja / alta) en el encabezado.
- Español (es-MX) como idioma por defecto; se conserva inglés y chino.
- Pisos con precio estimado en pesos mexicanos; pisos de exterior (concreto, pasto, deck).
- Altura de muros por planta, ventanas con repisa y cabezal propios, escalera en 3D.

Cada reemplazo exige encontrar el texto original exacto: si el autor cambia el
archivo, el script falla en lugar de producir algo roto.

Uso: python3 tools/designer/adapt.py
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "tools/designer/upstream/index.html"
OUT = ROOT / "src/designer/disenador.html"

s = SRC.read_text(encoding="utf-8")


def sub(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit(f"Se esperaban {count} coincidencias y hay {n}:\n{old[:160]}")
    s = s.replace(old, new)


def span(start_marker, end_marker, new):
    """Reemplaza desde start_marker (incluido) hasta end_marker (excluido)."""
    global s
    a = s.index(start_marker)
    b = s.index(end_marker, a)
    s = s[:a] + new + s[b:]


# ---------------------------------------------------------------------------
# Atribución y documento

sub(
    "<!doctype html>\n",
    """<!doctype html>
<!--
  Diseñador de casas de Planner 3D.
  Basado en "Floor Plan Interior Designer" (floorplan-3d) de wuyi (@akokoi1):
  https://github.com/wy51ai/floorplan-3d · Licencia MIT · Copyright (c) 2026 wuyi.
  Adaptado por Planner 3D: casas importadas de AutoCAD, varias plantas, español y
  precios en pesos. Generado por tools/designer/adapt.py; no editar a mano.
-->
""",
)
sub('<html lang="zh-CN">', '<html lang="es-MX">')
sub("<title>户型装修设计</title>", "<title>Diseñador de casas</title>")

# ---------------------------------------------------------------------------
# Idioma: español por defecto

sub("const LANG_KEY = 'huxing-lang';", "const LANG_KEY = 'planner3d-lang';")
sub("const LANGS = ['zh', 'zht', 'en'];", "const LANGS = ['es', 'en', 'zh', 'zht'];")
sub(
    "return LANGS.includes(l) ? l : 'zh'; } catch(e) { return 'zh'; }",
    "return LANGS.includes(l) ? l : 'es'; } catch(e) { return 'es'; }",
)
sub(
    "const tr = (zh, en) => LANG === 'en' ? en : LANG === 'zht' ? s2t(zh) : zh;",
    "const tr = (zh, en, es) => LANG === 'es' ? (es ?? ES[en] ?? en) : LANG === 'en' ? en : LANG === 'zht' ? s2t(zh) : zh;",
)
sub(
    "const nm = s => LANG === 'en' ? (NAMES_EN[s] ?? s) : LANG === 'zht' ? s2t(s) : s;",
    "const nm = s => LANG === 'es' ? (NAMES_ES[s] ?? s) : LANG === 'en' ? (NAMES_EN[s] ?? s) : LANG === 'zht' ? s2t(s) : s;",
)
sub(
    "document.documentElement.lang = {zh:'zh-CN', zht:'zh-TW', en:'en'}[LANG];",
    "document.documentElement.lang = {es:'es-MX', zh:'zh-CN', zht:'zh-TW', en:'en'}[LANG];",
)
sub(
    """      <button class="btn chip" data-lang="zh" title="简体中文">简</button>
      <button class="btn chip" data-lang="zht" title="繁體中文">繁</button>
      <button class="btn chip" data-lang="en" title="English">EN</button>""",
    """      <button class="btn chip" data-lang="es" title="Español">ES</button>
      <button class="btn chip" data-lang="en" title="English">EN</button>""",
)

ES = json.loads((ROOT / "tools/designer/es.json").read_text(encoding="utf-8"))
NAMES_ES = json.loads((ROOT / "tools/designer/nombres-es.json").read_text(encoding="utf-8"))
NAMES_EN_EXTRA = json.loads((ROOT / "tools/designer/nombres-en.json").read_text(encoding="utf-8"))
sub(
    "const nm = s => LANG === 'es'",
    "// Español: textos de la interfaz (por su versión en inglés) y nombres del catálogo.\n"
    f"const ES = {json.dumps(ES, ensure_ascii=False)};\n"
    f"const NAMES_ES = {json.dumps(NAMES_ES, ensure_ascii=False)};\n"
    f"Object.assign(NAMES_EN, {json.dumps(NAMES_EN_EXTRA, ensure_ascii=False)});\n"
    "const nm = s => LANG === 'es'",
)

# Textos con variables: se agrega la versión en español como tercer argumento.
TEMPLATES = json.loads((ROOT / "tools/designer/plantillas-es.json").read_text(encoding="utf-8"))
for en, es in TEMPLATES:
    sub(f"`{en}`)", f"`{en}`, `{es}`)")

# ---------------------------------------------------------------------------
# Encabezado: título de la casa y selector de planta

sub(
    '<div class="brand"><b data-en="3BR 2LR 2BA · Interior Design">三室两厅两卫 · 装修设计</b><span id="subtitle">原始户型 1:60 · 尺寸单位 mm</span></div>',
    '<div class="brand"><b id="casaTitle"></b><span id="subtitle"></span></div>\n'
    '    <div class="grp" id="levelSeg" role="group" aria-label="Planta"></div>',
)

# En el celular la barra del original ocupa media pantalla. Las herramientas van en una tira
# deslizable (.hscroll); en pantallas grandes la tira no existe para el acomodo (display:contents)
# y todo queda igual que el original.
span(
    '    <div class="grp" id="paneBtns">',
    '    <div class="brand">',
    '',
)
sub(
    '    <div class="grp only2d" id="tools">',
    """    <div class="hscroll">
    <div class="grp" id="paneBtns">
      <button class="btn chip" id="tgLib" data-en="◧ Library">◧ 家具库</button>
      <button class="btn chip" id="tgPanel" data-en="Properties ◨">属性 ◨</button>
    </div>
    <div class="grp only2d" id="tools">""",
)
sub(
    """        <button class="btn danger" id="reset" data-en="Reset to default">重置为默认方案</button>
      </div></details>""",
    """        <button class="btn danger" id="reset" data-en="Reset to default">重置为默认方案</button>
      </div></details>
    </div>""",
)
sub(
    ".narrow-only{display:none!important}",
    """.hscroll{display:contents}
#paneBtns{order:-1}
.lv-short{display:none}
@media (max-width:600px){
  header{gap:6px 8px;padding:6px 10px}
  .brand{width:100%;margin:0}
  .brand b{font-size:14px}
  .lv-long{display:none}.lv-short{display:inline}
  #levelSeg .btn{min-width:56px}
  .hscroll{display:flex;align-items:center;gap:8px;width:calc(100% + 20px);margin:0 -10px;padding:2px 10px 4px;
    overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none;-webkit-overflow-scrolling:touch}
  .hscroll::-webkit-scrollbar{display:none}
  .hscroll>*{flex-shrink:0}
  .hscroll .spacer{display:none}
  .menu-pop{position:fixed;right:10px;z-index:40}
  /* La tira se desvanece en la orilla donde hay más botones, para que se note que se desliza */
  .hscroll{scroll-snap-type:x proximity;scroll-padding-left:10px;
    -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 18px,#000 calc(100% - 36px),transparent);
    mask-image:linear-gradient(90deg,transparent 0,#000 18px,#000 calc(100% - 36px),transparent)}
  .hscroll.at-start{-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 36px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 36px),transparent)}
  .hscroll.at-end{-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 18px);mask-image:linear-gradient(90deg,transparent 0,#000 18px)}
  .hscroll.at-start.at-end{-webkit-mask-image:none;mask-image:none}
  .hscroll>*{scroll-snap-align:start}
  /* Indicaciones del 3D en dos renglones en lugar de cortarse */
  #hint3d{white-space:normal;width:max-content;max-width:calc(100% - 24px);text-align:center;line-height:1.35;top:8px;padding:5px 12px}
  /* Barra del mueble seleccionado: nombre arriba y botones abajo, todo dentro de la pantalla */
  #fab{flex-wrap:wrap;justify-content:center;width:max-content;max-width:calc(100vw - 20px);row-gap:2px}
  #fab .name{flex-basis:100%;max-width:none;text-align:center;padding:2px 8px 0}
  #fab .sep{display:none}
  #fab .btn{padding:8px 10px}
  /* Nombres de cuartos en 3D más compactos para que no se encimen */
  .rlabel{font-size:11px;padding:1px 7px;border-radius:10px}
  .rlabel small{display:none}
}
.narrow-only{display:none!important}""",
)

# El primer encuadre puede ocurrir antes de que el plano tenga tamaño; lo hace el ResizeObserver.
sub(
    "function fitView(){\n  const W = svg.clientWidth, H = svg.clientHeight;\n",
    "function fitView(){\n  const W = svg.clientWidth, H = svg.clientHeight;\n  if (!W || !H) return;\n",
)

# ---------------------------------------------------------------------------
# Datos de la casa

span(
    "/* ============================================================\n *  户型数据",
    "const MATS = {",
    """/* ============================================================
 *  Casa: datos importados de AutoCAD (tools/cad-import → /disenador/[casa]).
 *  Unidades mm; origen = esquina del lote (fondo izquierdo); y hacia la calle.
 * ============================================================ */
const CASA = window.__CASA__;
const PLANTA = (() => {
  const id = new URLSearchParams(location.search).get('planta');
  return CASA.levels.find(l => l.id === id) || CASA.levels[0];
})();
// Muros: [x0,y0,x1,y1,tipo]  b=de carga (negro)  e=exterior o barda  n=no estructural (se puede quitar)  low=muro bajo
const WALLS = PLANTA.walls;
// Ventanas: [x0,y0,x1,y1, repisa m, cabezal m]
const WINS = PLANTA.wins;
// Puertas abatibles: hueco, bisagra, sentido cerrado, sentido abierto, ancho de hoja
const DOORS = PLANTA.doors;
// Canceles corredizos
const SLIDES = PLANTA.slides;
const R = (x0,y0,x1,y1) => [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
// Cuartos: outdoor = exterior (sin techo); void = doble altura (sin piso); counted:false = no suma área
const ROOMS = PLANTA.rooms;
const DIMS = PLANTA.dims, ENTRY = PLANTA.entry, STAIRS = PLANTA.stairs || [], STAIR_LINES = PLANTA.stairLines || [];
// Plantas vecinas (para subir y bajar la escalera en el recorrido) y dobles alturas (sin piso: no se pisan)
const LEVEL_AT = CASA.levels.indexOf(PLANTA), BELOW = CASA.levels[LEVEL_AT - 1] || null, ABOVE = CASA.levels[LEVEL_AT + 1] || null;
const VOIDS = ROOMS.filter(r => r.void).map(r => r.poly);
""",
)

span(
    "const MATS = {",
    "// 家具库",
    """// Pisos: precio estimado instalado en MXN por m² (Los Mochis, 2026). Ajustar con el proveedor.
const MATS = {
  wood:    {name:'橡木地板', price:480, sw:'#d8b88a'},
  walnut:  {name:'胡桃木地板', price:950, sw:'#9b7250'},
  tile800: {name:'800 地砖', price:620, sw:'#ebe6dc'},
  tile600: {name:'600 地砖', price:450, sw:'#dfe3e1'},
  marble:  {name:'大理石', price:1800, sw:'#f1eee8'},
  antislip:{name:'300 防滑砖', price:320, sw:'#d3d8d4'},
  terrazzo:{name:'水磨石', price:900, sw:'#e6dfd3'},
  carpet:  {name:'满铺地毯', price:380, sw:'#c9c3d3'},
  concrete:{name:'Concreto estampado', price:450, sw:'#cfcbc4'},
  grass:   {name:'Pasto en rollo', price:120, sw:'#a9c39b'},
  deck:    {name:'Deck de madera', price:1100, sw:'#b98d63'},
  void:    {name:'Doble altura', price:0, sw:'#e6e1d8'},
};
""",
)

span(
    "function defaultFurniture(){ return [",
    "function defaultState(){",
    """// Amueblado inicial de la planta: [tipo, nombre, cx, cy, ancho, fondo, rotación, color]
function defaultFurniture(){
  return (PLANTA.furniture || []).map(([t, n, cx, cy, w, d, rot, color]) => F(t, n, cx, cy, w, d, rot || 0, color));
}

""",
)
sub("const STORE = 'huxing-design-v1';", "const STORE = 'planner3d-casa-' + CASA.id + '-' + PLANTA.id + '-v1';")
sub("const BOUNDS = {x:-1850, y:-1750, w:15600, h:14100};", "const BOUNDS = CASA.bounds;")
sub("const PANES = 'huxing-panes';", "const PANES = 'planner3d-paneles';")

# Pisos nuevos: deck, concreto, pasto y doble altura
sub(
    "plank('wood','#dcc09a','#bf9d70') + plank('walnut','#a57c56','#80593a') +",
    "plank('wood','#dcc09a','#bf9d70') + plank('walnut','#a57c56','#80593a') + plank('deck','#c49a6c','#9c7448') +\n"
    "    tile('concrete',1000,'#d8d4cd','#c3beb5') +",
)
sub(
    '    <pattern id="grid" patternUnits="userSpaceOnUse" width="1000" height="1000">',
    """    <pattern id="m-grass" patternUnits="userSpaceOnUse" width="240" height="240">
      <rect width="240" height="240" fill="#b7cfa4"/><path d="M30 60l10-30M90 150l8-28M170 90l10-30M200 200l8-26M60 210l10-28" stroke="#93b07c" stroke-width="10"/></pattern>
    <pattern id="m-void" patternUnits="userSpaceOnUse" width="300" height="300">
      <rect width="300" height="300" fill="#ece8e1"/><path d="M0 300L300 0" stroke="#c9c2b6" stroke-width="12"/></pattern>
    <pattern id="grid" patternUnits="userSpaceOnUse" width="1000" height="1000">""",
)
# La doble altura no es un piso que se pueda elegir.
sub(
    "const mats = Object.entries(MATS).map(",
    "const mats = Object.entries(MATS).filter(([k]) => k !== 'void').map(",
)

# Escalera en 2D (contornos de escalones del CAD) debajo de los muebles
sub(
    "  DOORS.forEach(d => s += sill(d.rect)); SLIDES.forEach(d => s += sill(d.rect));\n  $('#gRooms').innerHTML = s;",
    """  DOORS.forEach(d => s += sill(d.rect)); SLIDES.forEach(d => s += sill(d.rect));
  const SL = 'stroke="#8a7f70" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none"';
  STAIRS.forEach(st => st.steps.forEach(([x0,y0,x1,y1]) => s += `<rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="#efe9de" ${SL}/>`));
  STAIR_LINES.forEach(p => { let d = `M${p[0]*1000} ${p[1]*1000}`; for (let i = 2; i < p.length; i += 2) d += `L${p[i]*1000} ${p[i+1]*1000}`; s += `<path d="${d}" fill="none" ${SL}/>`; });
  $('#gRooms').innerHTML = s;""",
)

# Cotas y flecha de entrada desde los datos
sub(
    """  g.innerHTML =
    chain(true,-750,0,[1580,240,2760,240,1540,240,3670]) + chain(true,-1250,0,[10270]) +
    chain(true,11350,0,[2180,240,2160,240,5450,240,1340]) + chain(true,11850,0,[11850]) +
    chain(false,-800,0,[3370,1580,240,2770,240,2360]) + chain(false,-1300,0,[10560]) +
    chain(false,12750,0,[3370,240,2760,240,3950]) + chain(false,13250,0,[10560]);""",
    "  g.innerHTML = DIMS.map(c => chain(c.h, c.at, c.start, c.segs)).join('');",
)
sub(
    """  s += `<path d="M3350 8755H4350M4150 8600L4400 8755L4150 8910" fill="none" stroke="#b5653a" stroke-width="2" vector-effect="non-scaling-stroke"/>
        <text x="3380" y="8600" font-size="200" fill="#b5653a">${tr('入户','Entry')}</text>`;""",
    """  if (ENTRY) s += `<path d="${ENTRY.d}" fill="none" stroke="#b5653a" stroke-width="2" vector-effect="non-scaling-stroke"/>
        <text x="${ENTRY.label[0]}" y="${ENTRY.label[1]}" font-size="200" fill="#b5653a">${tr('入户','Entry')}</text>`;""",
)

# Precios en pesos
s = s.replace("¥${", "$${")

# Título de la casa y selector de planta (al final del script clásico)
sub(
    "fitView(); renderAll();\n</script>",
    """fitView(); renderAll();

/* ======================= Casa: título y plantas ======================= */
(function setupCasa(){
  $('#casaTitle').textContent = CASA.title;
  // Abrir en 3D (?vista=3d: al cambiar de planta desde el 3D y al subir o bajar la escalera, que además trae
  // ?recorrido=subir|bajar y entra directo al recorrido) y arrancar la visita guiada (?visita=1). El enlace del
  // cliente sin vista=3d lo atiende host.js con su portada. El motor 3D carga después de este script.
  const Q = new URLSearchParams(location.search), clientLink = !!HOST && !HOST.editable;
  if (Q.get('vista') === '3d' || (Q.has('visita') && !clientLink)){
    let tries = 0;
    const go = () => window.View3D ? setView('3d').then(() => { if (Q.has('visita') && !Q.has('recorrido')) window.View3D.tour?.(); })
      : ++tries < 150 ? setTimeout(go, 100) : document.documentElement.classList.remove('arriving');
    go();
    setTimeout(() => document.documentElement.classList.remove('arriving', 'arrived'), 20000);   // por si el 3D no carga
  }
  const seg = $('#levelSeg');
  // Una sola planta (todos los salones): sin selector, pero sin salir de la función; antes el return de aquí dejaba sin
  // colocar el menú Archivo en el celular (se abría fuera de la pantalla) y sin el desvanecido correcto de la tira.
  if (CASA.levels.length < 2) seg.remove(); else {
  const short = n => { const t = n.replace(/^planta\\s+/i, ''); return t.charAt(0).toUpperCase() + t.slice(1); };
  seg.innerHTML = CASA.levels.map(l => `<button class="btn ${l.id === PLANTA.id ? 'on' : ''}" data-level="${l.id}">`
    + `<span class="lv-long">${esc(l.name)}</span><span class="lv-short">${esc(short(l.name))}</span></button>`).join('');
  seg.addEventListener('click', e => {
    const b = e.target.closest('[data-level]');
    if (!b || b.dataset.level === PLANTA.id) return;
    const u = new URL(location.href); u.searchParams.set('planta', b.dataset.level);
    if (viewMode === '3d') u.searchParams.set('vista', '3d'); else u.searchParams.delete('vista');
    location.href = u.toString();
  });
  }
  // En el celular el menú Archivo sale de la tira deslizable: se coloca debajo de la barra
  $('details.menu').addEventListener('toggle', e => {
    const pop = e.target.querySelector('.menu-pop');
    pop.style.top = matchMedia('(max-width:600px)').matches ? $('header').getBoundingClientRect().bottom + 6 + 'px' : '';
  });
  // Marca si la tira está al inicio o al final (el desvanecido solo va donde hay más botones)
  const strip = $('.hscroll');
  const edges = () => {
    strip.classList.toggle('at-start', strip.scrollLeft < 4);
    strip.classList.toggle('at-end', strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 4);
  };
  strip.addEventListener('scroll', edges, {passive:true});
  addEventListener('resize', edges);
  new MutationObserver(edges).observe(document.body, {attributes:true, attributeFilter:['class']});   // 2D ↔ 3D cambia los botones
  edges();
})();
</script>""",
)

# ---------------------------------------------------------------------------
# 3D

sub(
    "const OX = 6000, OY = 5300, H = 2.8, FOV = 45;",
    "const OX = CASA.bounds.x + CASA.bounds.w / 2, OY = CASA.bounds.y + CASA.bounds.h / 2, H = PLANTA.height || 2.8, FOV = 45;\n"
    "const S3 = Math.max(CASA.bounds.w, CASA.bounds.h) / 15600;   // escala de las cámaras según el tamaño del plano",
)
sub("const opt = {cut:2.8,", "const opt = {cut:H,")
sub(
    "let inited = false, active = false,",
    "document.querySelector('[data-cut=\"2.8\"]')?.setAttribute('data-cut', String(H));\nlet inited = false, active = false,",
)
sub(
    "const isoWhole = () => pose(new THREE.Vector3(0, 0, 0), new THREE.Vector3(5.5, 15.5, 10));",
    "const isoWhole = () => pose(new THREE.Vector3(0, 0, 0), new THREE.Vector3(5.5*S3, 19*S3, 8*S3));   // más alta: la casa es larga",
)
sub(
    "const topWhole = () => pose(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 19, 1e-4));",
    "const topWhole = () => pose(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 19*S3, 1e-4));",
)
sub(
    "  ROOMS.forEach(r => {\n    const m = floorMat(state.rooms[r.id].mat), bay = r.counted === false;",
    "  ROOMS.forEach(r => {\n    if (r.void) return;   // doble altura: sin piso\n    const m = floorMat(state.rooms[r.id].mat), bay = r.bay === true;",
)
sub(
    "    const ceil = new THREE.Mesh(cg, mat('#fbfaf7', {roughness:1})); ceil.position.y = H; ceil.visible = top >= H; archUp.add(ceil);\n    if (r.at){",
    "    const ceil = new THREE.Mesh(cg, mat('#fbfaf7', {roughness:1})); ceil.position.y = H; ceil.visible = top >= H && !r.outdoor; archUp.add(ceil);\n    if (r.at && !r.outdoor){",
)
sub(
    "  [...DOORS.map(d => [d.rect, 2.1]), ...SLIDES.map(s => [s.rect, s.v ? 2.4 : 2.1]), [[10270,800,10510,2600], 2.4], [[10270,4260,10510,5740], 2.4]]",
    "  [...DOORS.map(d => [d.rect, 2.1]), ...SLIDES.map(s => [s.rect, 2.2])]",
)
sub(
    "    const sill = i === 0 ? 1.4 : i >= 6 ? .45 : .9, head = 2.4;",
    "    const sill = r[4] ?? .9, head = r[5] ?? 2.4;",
)
sub(
    "  SLIDES.forEach(({rect:[x0, y0, x1, y1], v}) => {\n    const L = M(v ? y1-y0 : x1-x0)",
    """  // Escalera: cada escalón es una caja. Los de abajo llegan al piso; desde ~1.5 m de alto la caja flota con
  // un fondo inclinado (una losa de 45 cm), así debajo del tramo alto se puede pasar (en Chardonnay el medio
  // baño se entra por ahí). Los escalones con menos de 1.9 m libres debajo estorban al caminar (colliders).
  const stepMat = mat('#d9cfbf', {roughness:.7});
  STAIRS.forEach(st => st.steps.forEach((r, i) => {
    const [yb, yt] = stepBox(st, i);
    wallBox(r, yb, Math.min(yt, top), stepMat);
    if (yb < 1.9) colliders.push([wx(r[0]), wz(r[1]), wx(r[2]), wz(r[3])]);
  }));
  // Planta con doble altura sobre la escalera de abajo: se ven los escalones subiendo por el hueco, los pisos de
  // abajo que quedan bajo el hueco y los muros de abajo (lisos, sin ventanas), para que el hueco no quede en el aire
  if (BELOW && VOIDS.length){
    const Hb = BELOW.height || 2.8, under = poly => VOIDS.some(v => poly.some(p => inPoly(p, v)) || v.some(p => inPoly(p, poly)));
    (BELOW.stairs || []).forEach(st => st.steps.forEach(([x0, y0, x1, y1], i) => {
      const [yb, yt] = stepBox(st, i);
      archUp.add(box(M(x1-x0), yt-yb, M(y1-y0), stepMat, wx((x0+x1)/2), yb - Hb, wz((y0+y1)/2)));
    }));
    BELOW.rooms.filter(r => !r.void && !r.outdoor && under(r.poly)).forEach(r => {
      const geo = new THREE.ShapeGeometry(shapeOf(r.poly)); geo.rotateX(-Math.PI/2);
      const fl = new THREE.Mesh(geo, floorMat(r.mat)); fl.position.y = -Hb; fl.receiveShadow = true; archFloor.add(fl);
    });
    BELOW.walls.forEach(w => archUp.add(box(M(w[2]-w[0]), w[4] === 'low' ? 1 : Hb, M(w[3]-w[1]), wallMat, wx((w[0]+w[2])/2), -Hb, wz((w[1]+w[3])/2))));
  }
  SLIDES.forEach(({rect:[x0, y0, x1, y1], v}) => {
    const L = M(v ? y1-y0 : x1-x0)""",
)
# Base y altura de cada escalón (m): macizo hasta ~1.5 m; más arriba flota como losa de 45 cm y se pasa por debajo
sub(
    "const edgeMat = new THREE.LineBasicMaterial({color:0x6f675b}),",
    "function stepBox(st, i){ const h = (i + 1)*(st.rise || .18), yb = h - .45; return [yb < 1.5 ? 0 : yb, h]; }\n"
    "const edgeMat = new THREE.LineBasicMaterial({color:0x6f675b}),",
)

# Texturas 3D de los pisos de exterior (sin esto salen como porcelanato blanco)
sub(
    "  terrazzo:{sx:.5, sy:.5, base:'#e6dfd3', rough:.4}, carpet:{sx:.3, sy:.3, base:'#c6bfd2', rough:1},\n};",
    "  terrazzo:{sx:.5, sy:.5, base:'#e6dfd3', rough:.4}, carpet:{sx:.3, sy:.3, base:'#c6bfd2', rough:1},\n"
    "  deck:{sx:1.8, sy:.3, base:'#b98d63', rough:.7}, concrete:{sx:1, sy:1, base:'#cfcbc4', grout:'#b8b2a8', rough:.9},\n"
    "  grass:{sx:1, sy:1, base:'#94b276', rough:1},\n};",
)
sub(
    "  const wood = kind === 'wood' || kind === 'walnut';",
    "  const wood = kind === 'wood' || kind === 'walnut' || kind === 'deck';",
)
sub(
    "  } else if (kind === 'terrazzo'){",
    """  } else if (kind === 'grass'){
    for (let k = 0; k < 2600; k++){ g.strokeStyle = rgbK(s.base, .72 + R()*.5); g.lineWidth = 1 + R()*1.5;
      const x = R()*W, y = R()*Hh; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R()-.5)*6, y - 5 - R()*9); g.stroke(); }
  } else if (kind === 'terrazzo'){""",
)

# La doble altura no lleva piso: fuera del presupuesto
sub(
    "  ROOMS.forEach(r => { const m = state.rooms[r.id].mat; byMat[m] = (byMat[m]||0) + area(r.poly); });",
    "  ROOMS.forEach(r => { if (r.void) return; const m = state.rooms[r.id].mat; byMat[m] = (byMat[m]||0) + area(r.poly); });",
)

# Recorrido: empieza afuera de la puerta principal de la planta (o donde diga la casa)
sub(
    "    camera.position.set(wx(4200), 1.6, wz(8755)); camera.lookAt(wx(7000), 1.5, wz(8755));   // 入户门外",
    "    const W0 = PLANTA.walk || {from:[OX, OY], to:[OX, OY - 3000]};   // afuera de la puerta principal\n"
    "    if (!keep){ camera.position.set(wx(W0.from[0]), 1.6, wz(W0.from[1])); camera.lookAt(wx(W0.to[0]), 1.5, wz(W0.to[1])); }",
)
# Sombras para toda la casa (el original cubre un departamento de ~15 m)
sub(
    "Object.assign(sun.shadow.camera, {left:-11, right:11, top:11, bottom:-11, near:1, far:60});",
    "Object.assign(sun.shadow.camera, {left:-11*S3, right:11*S3, top:11*S3, bottom:-11*S3, near:1, far:60*S3});",
)
sub(
    "sun.position.set(Math.cos(az)*18, Math.sin(el)*20 + 3, -Math.sin(az)*10 + 8);",
    "sun.position.set(Math.cos(az)*18, Math.sin(el)*20 + 3, -Math.sin(az)*10 + 8).multiplyScalar(S3);",
)

# Altura de cada planta en los textos de área de muros
s = s.replace("perim(r.poly)*2.8", "perim(r.poly)*PLANTA.height")

# ---------------------------------------------------------------------------
# Extensiones: salones (catálogo y modelos de eventos) y guardado en el servidor
#
# window.__EXT__ (src/designer/eventos/eventos.js) solo se carga en salones: trae el
# catálogo de eventos, sus dibujos 2D y 3D, el resumen de invitados y lugares, y los
# campos extra del panel (sillas). window.__HOST__ (src/designer/host.js) existe cuando
# el diseño vive en la base de datos: carga y guarda cada planta, y pinta las
# distribuciones A/B/C y el botón de compartir.

sub(
    "const CASA = window.__CASA__;",
    "const CASA = window.__CASA__;\n"
    "const EXT = CASA.kind === 'salon' ? window.__EXT__ || null : null;   // catálogo y modelos de eventos\n"
    "const HOST = window.__HOST__ || null;                                 // diseño guardado en el servidor",
)
sub("const LIB = [", "const LIB = EXT ? EXT.lib : [")
sub(
    "const typeColor = t => {",
    "if (EXT) Object.assign(NAMES_EN, EXT.namesEn);\nconst typeColor = t => {",
)
sub(
    "  return (PLANTA.furniture || []).map(([t, n, cx, cy, w, d, rot, color]) => F(t, n, cx, cy, w, d, rot || 0, color));",
    "  return (PLANTA.furniture || []).map(([t, n, cx, cy, w, d, rot, color, extra]) => Object.assign(F(t, n, cx, cy, w, d, rot || 0, color), extra));",
)
sub(
    "function load(){\n",
    "function load(){\n"
    "  if (HOST){ const s = HOST.loadState(PLANTA.id); return s && Array.isArray(s.furniture) ? fixState(s) : null; }\n",
)
sub(
    "function save(){ try {",
    "function save(){ if (HOST) return HOST.save(PLANTA.id, state); try {",
)
sub(
    "const DASH = 'stroke-dasharray=\"4 3\"';",
    "const DASH = 'stroke-dasharray=\"4 3\"';\nconst SVGK = {rc, ec, ln, pa, shade, DASH, ST};   // ayudantes de dibujo para EXT.svg",
)
sub(
    "function furnSVG(t,w,d,c){\n",
    "function furnSVG(t,w,d,c,f){\n  if (EXT?.svg[t]) return EXT.svg[t](w, d, c, f, SVGK);\n",
)
sub("${furnSVG(f.type,f.w,f.d,f.color)}", "${furnSVG(f.type,f.w,f.d,f.color,f)}")
sub("${furnSVG(t,w,d,col)}", "${furnSVG(t,w,d,col,it[5])}")
sub("${furnSVG(it[0],it[2],it[3],it[4])}", "${furnSVG(it[0],it[2],it[3],it[4],it[5])}")
sub(
    "const NOLABEL = ['plant','floorlamp','sidetable','barstool','beanbag'];",
    "const NOLABEL = ['plant','floorlamp','sidetable','barstool','beanbag'];\nif (EXT) NOLABEL.push(...EXT.nolabel);",
)
sub(
    "  return `\n  <section><h3>${tr('房间面积','Room Areas')}",
    "  return `${EXT?.overview?.(state) ?? ''}\n  <section><h3>${tr('房间面积','Room Areas')}",
)
sub(
    "  <section><h3>${tr('地面材料估算','Flooring Estimate')}",
    "  <section ${EXT ? 'hidden' : ''}><h3>${tr('地面材料估算','Flooring Estimate')}",
)
sub(
    "  $('#clearFurn').onclick = clearLayout;\n}",
    "  $('#clearFurn').onclick = clearLayout;\n  EXT?.bindOverview?.();\n}",
)
sub(
    '<input type="color" id="fC" value="${f.color}"></label>\n    </div>',
    '<input type="color" id="fC" value="${f.color}"></label>${EXT?.panel?.(f) ?? \'\'}\n    </div>',
)
sub(
    "  $('#fC').onchange = e => upd(g => g.color = e.target.value);\n",
    "  $('#fC').onchange = e => upd(g => g.color = e.target.value);\n  EXT?.bindPanel?.(f, upd);\n",
)
sub(
    "  pushOut(f);\n  ui.sel = {kind:'furn', id:f.id};",
    "  EXT?.onAdd?.(f, it, state);\n  pushOut(f);\n  ui.sel = {kind:'furn', id:f.id};",
)
sub(
    "  const f = getF(ui.sel.id), n = {...f, id:uid(), cx:f.cx+200, cy:f.cy+200};\n",
    "  const f = getF(ui.sel.id), n = {...f, id:uid(), cx:f.cx+200, cy:f.cy+200};\n  EXT?.onAdd?.(n, null, state);\n",
)
sub(
    '<div class="grp" id="levelSeg" role="group" aria-label="Planta"></div>',
    '<div class="grp" id="levelSeg" role="group" aria-label="Planta"></div>\n'
    '    <div class="grp" id="hostBar" hidden></div>',
)
sub(
    ".narrow-only{display:none!important}",
    "body.salon [data-tool=\"demolish\"],body.salon [data-layer=\"bearing\"],#hostBar[hidden]{display:none!important}\n"
    ".narrow-only{display:none!important}",
)
sub(
    "(function setupCasa(){\n  $('#casaTitle').textContent = CASA.title;\n",
    "(function setupCasa(){\n  $('#casaTitle').textContent = CASA.title;\n"
    "  document.body.classList.toggle('salon', CASA.kind === 'salon');\n"
    "  // El anfitrión (diseño guardado) cambia de distribución sin recargar la página\n"
    "  HOST?.mount?.({\n"
    "    get state(){ return state; },\n"
    "    replace(s){ state = s && Array.isArray(s.furniture) ? fixState(s) : defaultState(); ui.sel = null;\n"
    "      undoStack.length = redoStack.length = 0; renderAll(); },\n"
    "    rerender: renderAll, toast, tr, esc, PLANTA, CASA, viewMode: () => viewMode,\n"
    "  });\n",
)
# 3D
sub(
    "import {CSS2DRenderer, CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';",
    "import {CSS2DRenderer, CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';\n"
    "import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';",
)
sub(
    "function buildFurniture(f){\n"
    "  const g = new THREE.Group(), w = M(f.w), d = M(f.d), c = f.color || '#ddd', bz = -d/2, R = rng(Math.round(f.w*7 + f.d*13 + f.cx + f.cy));\n"
    "  switch (f.type){",
    "// Ayudantes de modelado para EXT.build3d (muebles de eventos)\n"
    "let KIT3D = null;\n"
    "const kit3d = R => ({...(KIT3D ||= {THREE, M, H, mat, fabric, woodM, metal, chrome, hwMat, glowMat, darker, lighter, box, rbox, cyl,\n"
    "  lathe, rod, tube, blob, ring, rrect, shell, mesh, sh, rot, legs, vase, plate, mergeGeometries}), R});\n"
    "function buildFurniture(f){\n"
    "  const g = new THREE.Group(), w = M(f.w), d = M(f.d), c = f.color || '#ddd', bz = -d/2, R = rng(Math.round(f.w*7 + f.d*13 + f.cx + f.cy));\n"
    "  const ext = EXT?.build3d[f.type];\n"
    "  if (ext) ext(g, f, kit3d(R));\n"
    "  else switch (f.type){",
)

# Cambiar de planta: el anfitrión guarda lo pendiente antes de recargar
sub(
    "    location.href = u.toString();\n  });",
    "    if (HOST?.navigate) HOST.navigate(u.toString()); else location.href = u.toString();\n  });",
)

# Al entrar al 3D la cámara sale del plano; el tope de distancia crece con el tamaño del lugar
sub(
    "  const d = THREE.MathUtils.clamp(P.p.y, 5, 30), dir",
    "  const d = THREE.MathUtils.clamp(P.p.y, 5, 30*S3), dir",
)

# La pestaña del navegador lleva el nombre de la casa o del evento
sub("  document.title = tr('户型装修设计', 'Floor Plan Designer');", "  document.title = CASA.title;")

# Vista completa: la distancia se calcula para que quepan todos los muros (con su altura)
# en la pantalla, horizontal o vertical (teléfono). Al abrir el 3D desde un plano que ya
# muestra casi toda la planta, se entra con esa vista completa.
sub(
    "const isoWhole = () => pose(new THREE.Vector3(0, 0, 0), new THREE.Vector3(5.5*S3, 19*S3, 8*S3));   // más alta: la casa es larga\n"
    "const topWhole = () => pose(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 19*S3, 1e-4));",
    """const WALL_BOX = (() => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  WALLS.forEach(w => { x0 = Math.min(x0, w[0]); y0 = Math.min(y0, w[1]); x1 = Math.max(x1, w[2]); y1 = Math.max(y1, w[3]); });
  return {x0, y0, x1, y1};
})();
function fitPose(dir, margin = .86){
  const b = WALL_BOX, t = new THREE.Vector3(wx((b.x0 + b.x1)/2), 0, wz((b.y0 + b.y1)/2)), pts = [];
  for (const x of [b.x0, b.x1]) for (const y of [b.y0, b.y1]) for (const h of [0, H]) pts.push(new THREE.Vector3(wx(x), h, wz(y)));
  const cam = camera.clone(), d = dir.clone().normalize(), v = new THREE.Vector3();
  cam.aspect = SW()/SH(); cam.updateProjectionMatrix();
  const fits = dist => {
    cam.position.copy(t).addScaledVector(d, dist); cam.lookAt(t); cam.updateMatrixWorld();
    return pts.every(p => { v.copy(p).project(cam); return Math.abs(v.x) <= margin && Math.abs(v.y) <= margin && v.z < 1; });
  };
  let lo = 2, hi = 400;
  for (let i = 0; i < 24; i++){ const mid = (lo + hi)/2; if (fits(mid)) hi = mid; else lo = mid; }
  return Object.assign(pose(t, t.clone().addScaledVector(d, hi)), {dist: hi});
}
const ISO_DIR = new THREE.Vector3(5.5, 19, 8), UP_Y = new THREE.Vector3(0, 1, 0);
// En pantalla vertical (teléfono) se prueba girar la cámara hacia el lado largo del plano
// y se queda con el giro que muestra la planta más grande.
const isoWhole = () => SW() >= SH() ? fitPose(ISO_DIR)
  : [0, -12, -22, 12, 22].map(g => fitPose(ISO_DIR.clone().applyAxisAngle(UP_Y, g*Math.PI/180)))
      .reduce((best, p) => p.dist < best.dist*.92 ? p : best);
const topWhole = () => fitPose(new THREE.Vector3(0, 1, 1e-4));
// ¿El plano 2D muestra casi toda la planta? Entonces el 3D abre con la planta completa.
const shownWhole = () => SW()/view.s >= (WALL_BOX.x1 - WALL_BOX.x0)*.75 && SH()/view.s >= (WALL_BOX.y1 - WALL_BOX.y0)*.75;""",
)
sub(
    "  const A = planPose(), B = isoFrom(A);",
    "  const A = planPose(), B = shownWhole() ? isoWhole() : isoFrom(A);",
)

# El alejamiento máximo de la cámara crece con el lugar (un salón de 44 m no cabe a 45 m)
sub("orbit.maxDistance = 45;", "orbit.maxDistance = Math.max(45, 45*S3);")

# Salones: panel de la lista de invitados, invitados debajo de cada mesa y ocupación en el plano
sub(
    "  const p = $('#panel');\n  if (ui.sel?.kind === 'furn'){",
    "  const p = $('#panel');\n"
    "  if (ui.sel?.kind === 'ext' && EXT){ p.innerHTML = EXT.extPanel(ui.sel); EXT.bindExtPanel(ui.sel); if (p.innerHTML) return; ui.sel = null; }\n"
    "  if (ui.sel?.kind === 'furn'){",
)
sub(
    "  <section class=\"muted\" style=\"font-size:12px\">${tr('拖动家具移动",
    "  ${EXT?.panelAfter?.(f) ?? ''}\n  <section class=\"muted\" style=\"font-size:12px\">${tr('拖动家具移动",
)
sub(
    "opacity=\".8\" pointer-events=\"none\">${esc(nm(f.name))}</text>",
    "opacity=\".8\" pointer-events=\"none\">${esc(EXT?.label?.(f) ?? nm(f.name))}</text>",
)

# Al seleccionar, la extensión agrega lo suyo (un proveedor resalta sus piezas y su puerta de carga)
sub("      const {hh} = aabb(f);\n", "      s += EXT?.selExtra?.(f, k) ?? '';\n      const {hh} = aabb(f);\n")

# Botones deshabilitados del panel (p. ej. exportes con la lista vacía)
sub(".narrow-only{display:none!important}", "#panel .btn:disabled{opacity:.4;pointer-events:none}\n"
    "#panel .actions .btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}\n.narrow-only{display:none!important}")

# Foto del 3D como imagen (vista previa del enlace del cliente)
sub(
    "window.View3D = {enter, exit, relang, sync:() => sync(), shot, groundAt,",
    "window.View3D = {enter, exit, relang, sync:() => sync(), shot, groundAt,\n"
    "  snap: () => { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/jpeg', .9); },",
)

# "Ver desde esta mesa": abre el recorrido sentado en ese lugar (sitAt, sección Recorrido); tour() = visita guiada
sub(
    "  snap: () => { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/jpeg', .9); },",
    "  snap: () => { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/jpeg', .9); },\n"
    "  viewFrom: (x, y, tx, ty) => sitAt([x, y], [tx, ty]),\n"
    "  tour: () => startTour(),",
)

# ---------------------------------------------------------------------------
# Recorrido: la vista sigue al dedo, velocidad x1/x2/x3, de pie o sentado, sensibilidad al mirar,
# «Ir a…» (entrada, cuartos, pista y mesas), doble toque en el piso para ir ahí y mapa con
# «toca a dónde quieres ir». En el original, arrastrar a la derecha giraba la vista a la izquierda
# (como si se jalara el paisaje), al revés que el mouse con el puntero capturado.

sub(
    "#walkExit{position:absolute;right:16px;bottom:28px;z-index:3;display:none}",
    """#walkExit{position:absolute;right:16px;bottom:28px;z-index:3;display:none}
/* ---------- Recorrido: velocidad, altura, ir a…, mapa ---------- */
#walkHud{position:absolute;inset:0;z-index:4;pointer-events:none;touch-action:manipulation}
#walkHud[hidden],#walkHud [hidden]{display:none!important}
#walkHud>*{pointer-events:auto}
.wh-top{position:absolute;left:12px;top:12px;display:flex;gap:6px}
.wh-pill{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:4px;height:36px;padding:0 14px;border:0;
  border-radius:18px;background:rgba(255,253,249,.94);color:var(--ink);box-shadow:0 2px 10px rgba(0,0,0,.18);font:inherit;font-size:13px;
  font-weight:600;cursor:pointer;white-space:nowrap}
.wh-pill select{position:absolute;inset:0;width:100%;height:100%;opacity:0;font-size:16px;cursor:pointer}
#whCfg{width:36px;padding:0;font-size:17px}
#whPop{position:absolute;left:12px;top:56px;display:grid;gap:5px;padding:10px 12px;border-radius:12px;background:rgba(255,253,249,.97);
  box-shadow:0 8px 26px rgba(40,30,20,.22);font-size:12px;color:var(--muted)}
.wh-seg{display:inline-flex;gap:2px;padding:3px;border-radius:10px;background:rgba(255,253,249,.94);box-shadow:0 2px 10px rgba(0,0,0,.18)}
#whPop .wh-seg{background:#f2ece2;box-shadow:none}
.wh-seg button{min-width:40px;height:32px;padding:0 10px;border:0;border-radius:7px;background:transparent;color:var(--ink);font:inherit;
  font-size:13px;font-weight:600;cursor:pointer}
.wh-seg button.on{background:var(--accent);color:#fff}
.wh-side{position:absolute;right:16px;bottom:16px;display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.wh-row{display:flex;align-items:center;gap:6px}
.wh-fold{width:36px;padding:0}
#whCycle{min-width:54px;font-size:14px}
.wh-side:not(.compact) #whCycle,.wh-side.compact #whEye,.wh-side.compact #whSpeed{display:none}
#whMap{position:absolute;right:12px;top:12px;display:block;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.22);cursor:pointer}
#whBig{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;
  padding:12px;background:rgba(30,28,25,.72)}
#whBig canvas{display:block;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.35);cursor:crosshair}
#whBig p{margin:0;color:#fff;font-size:13px;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,.5)}
#whBig .btn{background:#fff}
#view3d.mapopen #joy,#view3d.mapopen #walkExit{visibility:hidden}
#whFade{position:absolute;inset:0;z-index:2;background:#1e1c19;opacity:0;pointer-events:none;transition:opacity .22s}
#whFade.on{opacity:1}
#view3d.walking #hint3d{top:auto;bottom:110px;white-space:normal;width:max-content;max-width:calc(100% - 32px);text-align:center;line-height:1.35}
#hint3d.gone{opacity:0}
#view3d.touchwalk .wh-side,#view3d.touring .wh-side{bottom:84px}
#view3d.walking.touchwalk #hint3d{bottom:176px}
/* Visita guiada: tarjeta con el lugar, pausa, siguiente y terminar */
#walkOverlay .btn{margin-top:14px}
#whTourBtn svg,.wt-btn svg,#woTour svg,.wh-fold svg{width:18px;height:18px;fill:currentColor;flex:none}
#woTour{display:inline-flex;align-items:center;gap:8px}
#whTour{position:absolute;left:12px;right:12px;bottom:16px;max-width:480px;margin:0 auto;display:flex;align-items:center;gap:6px;padding:8px 8px 8px 14px;
  border-radius:14px;background:rgba(255,253,249,.96);box-shadow:0 6px 22px rgba(0,0,0,.22);transition:bottom .25s}
#view3d.touchwalk:not(.touring) #whTour{bottom:172px}
.wt-txt{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.3}
.wt-txt b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wt-txt small{color:var(--muted);font-size:11px}
.wt-btn{flex:none;display:grid;place-items:center;width:40px;height:40px;border:0;border-radius:10px;background:#f2ece2;color:var(--ink);
  font:inherit;font-size:16px;cursor:pointer}
#wtPlay{background:var(--accent);color:#fff}
#view3d.touring #joy,#view3d.touring #walkExit,#view3d.touring #whEye,#view3d.tourcard #hint3d{visibility:hidden}
/* Escalera: al llegar al pie (o al desembarco) aparece el botón para cambiar de planta */
#whStair{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);height:40px;padding:0 16px 0 12px;background:var(--accent);color:#fff;font-size:14px}
#whStair svg{width:20px;height:20px;fill:currentColor}
#view3d.touchwalk #whStair{bottom:172px}
#view3d.tourcard:not(.touchwalk) #whStair{bottom:80px}
#view3d.touchwalk.tourcard #whStair{bottom:236px}
#view3d.recording #whStair{display:none!important}
/* Video de la visita: en pantalla se ve el video tal cual (vertical), con la tarjeta de la visita abajo */
#whRecBtn svg,#recAsk .btn svg{width:18px;height:18px;flex:none}
#recAsk{position:absolute;inset:0;z-index:3;display:grid;place-items:center;padding:16px;background:rgba(30,28,25,.55)}
#recAsk .card{display:grid;gap:10px;max-width:340px;padding:18px;border-radius:14px;background:var(--panel);box-shadow:0 12px 40px rgba(0,0,0,.3)}
#recAsk h3{margin:0;font-size:16px}#recAsk p{margin:0;font-size:13px;color:var(--muted);line-height:1.4}
#recAsk .wh-seg{justify-self:start;box-shadow:none;background:#f2ece2}
#recAsk .row{display:flex;gap:8px}#recAsk .row .btn{flex:1;min-height:40px;display:inline-flex;align-items:center;justify-content:center;gap:6px;
  border:1px solid var(--line);background:#fff}
#recAsk .btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
#recView{position:absolute;z-index:1;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.45);background:#000}
#view3d.recording{background:#1e1c19}
#view3d.recording .wh-top,#view3d.recording #whMap,#view3d.recording #whPop,#view3d.recording #hint3d,#view3d.recording #joy,
#view3d.recording #walkExit{display:none!important}
#recBadge{position:absolute;padding:5px 10px;border-radius:14px;background:rgba(217,58,43,.92);
  color:#fff;font-size:12px;font-weight:700;letter-spacing:.02em;white-space:nowrap}
#recDone{position:fixed;inset:0;z-index:300;display:grid;place-items:center;padding:16px;background:rgba(30,28,25,.6)}
#recDone .card{display:grid;gap:10px;width:min(360px,100%);max-height:calc(100dvh - 32px);padding:16px;border-radius:14px;background:var(--panel)}
#recDone h3{margin:0;font-size:16px}#recDone p{margin:0}
#recDone video{width:100%;max-height:55dvh;border-radius:10px;background:#000;object-fit:contain}
#recDone .row{display:flex;gap:8px}#recDone .row .btn{flex:1;min-height:42px;display:inline-flex;align-items:center;justify-content:center;
  border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink);text-decoration:none;font:inherit}
#recDone .btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
@media (pointer:coarse){
  .wh-side{bottom:84px}
  #view3d.walking #hint3d{bottom:176px}
}""",
)
sub(
    '        <p id="wo3"></p></div></div>',
    '        <p id="wo3"></p>\n        <button class="btn primary" id="woTour"></button></div></div>',
)
sub(
    '      <button class="btn primary" id="walkExit" data-en="Exit walk">退出漫游</button>',
    '      <button class="btn primary" id="walkExit" data-en="Exit walk">退出漫游</button>\n'
    '      <div id="whFade"></div>\n'
    '      <div id="walkHud" hidden></div>',
)

# Al llegar por la escalera (?recorrido=) la página arranca a oscuras y se aclara ya en el recorrido (arriveByStairs)
sub(
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">',
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n'
    "<script>if (/[?&]recorrido=/.test(location.search)) document.documentElement.classList.add('arriving');</script>\n"
    '<style>html.arriving::before{content:"";position:fixed;inset:0;z-index:500;background:#1e1c19;transition:opacity .5s}html.arrived::before{opacity:0}</style>',
)
# Llegó por la escalera: sin la animación de entrada desde el plano, directo al recorrido
sub(
    "  opt.mode = 'orbit'; orbit.enabled = false; showLabels(false);\n  const A = planPose(), B = shownWhole() ? isoWhole() : isoFrom(A);",
    "  opt.mode = 'orbit'; orbit.enabled = false; showLabels(false);\n  if (arriveByStairs()) return;\n  const A = planPose(), B = shownWhole() ? isoWhole() : isoFrom(A);",
)

# La vista sigue al dedo (y al mouse sin capturar): arrastrar a la derecha mira a la derecha
sub(
    "  eul.y += dx * .005; eul.x = THREE.MathUtils.clamp(eul.x + dy * .005, -1.35, 1.35);",
    "  if (tour && !tour.paused && tour.phase !== 'end'){   // arrastrar de verdad pausa la visita; el temblor de un toque, no\n"
    "    tourDrag += Math.hypot(dx, dy); if (tourDrag < 14) return; tourPause();\n  }\n  const k = .005 * walk.look;   // la vista sigue al dedo, igual que el mouse con el puntero capturado\n"
    "  eul.y -= dx * k; eul.x = THREE.MathUtils.clamp(eul.x - dy * k, -1.35, 1.35);",
)
sub(
    "const HINT_TOUCHWALK = () => tr('左下摇杆移动 · 拖动画面转向 · 点门开关', 'Joystick moves · drag to look · tap doors to open');\n"
    "const HINT_WALK = () => tr('WASD 移动 · 鼠标转向 · Shift 快走 · E 开关门 · Esc 暂停', 'WASD moves · mouse looks · Shift runs · E opens doors · Esc pauses');",
    "const HINT_TOUCHWALK = () => tr('左下摇杆移动 · 拖动画面转向 · 双击地面走过去', 'Joystick moves · drag to look · double-tap the floor to go there',\n"
    "  'El control te mueve · arrastra para mirar · toca dos veces el piso para ir ahí');\n"
    "const HINT_WALK = () => tr('WASD 移动 · 鼠标转向 · 1 2 3 速度 · C 坐下 · 双击走过去 · Esc 暂停', 'WASD moves · mouse looks · 1 2 3 speed · C sits · double-click to go · Esc pauses',\n"
    "  'WASD para moverte · el mouse mira · 1 2 3 velocidad · C para sentarte · doble clic para ir · Esc pausa');",
)
sub("function setMode(m){\n", "function setMode(m, keep){   // keep: el recorrido empieza donde está la cámara\n")
# En el celular la ayuda es la del control desde antes de empezar (el original ponía la del teclado)
sub(
    "opt.mode === 'orbit' ? HINT_ORBIT() : touchWalk ? HINT_TOUCHWALK() : HINT_WALK(); }",
    "opt.mode === 'orbit' ? HINT_ORBIT() : touchWalk || COARSE ? HINT_TOUCHWALK() : HINT_WALK(); }",
)
sub(
    "  $('#walkOverlay').style.display = 'none'; $('#joy').style.display = 'block'; $('#walkExit').style.display = 'block';\n"
    "  syncHint3d();\n}",
    "  $('#walkOverlay').style.display = 'none'; $('#joy').style.display = 'block'; $('#walkExit').style.display = 'block';\n"
    "  syncHint3d(); flashHint(); $('#view3d').classList.add('touchwalk');\n}",
)
sub(
    "  $('#joy').style.display = 'none'; $('#walkExit').style.display = 'none';\n}",
    "  $('#joy').style.display = 'none'; $('#walkExit').style.display = 'none'; $('#view3d').classList.remove('touchwalk');\n}",
)
sub(
    "walkCtl.addEventListener('lock', () => { $('#walkOverlay').style.display = 'none'; $('#cross').style.display = 'block'; });",
    "walkCtl.addEventListener('lock', () => { $('#walkOverlay').style.display = 'none'; $('#cross').style.display = 'block'; flashHint(); });",
)
sub(
    "    $('#walkOverlay').style.display = 'flex';\n    syncHint3d();\n  } else {\n    walkCtl.unlock(); stopTouchWalk(); orbit.enabled = true;",
    "    $('#walkOverlay').style.display = 'flex';\n    walkHud(true); syncHint3d();\n  } else {\n    walkHud(false); freeMouse(); stopTouchWalk(); orbit.enabled = true;",
)
# (el original ponía la función en lugar del texto al salir del 3D desde el recorrido)
sub(
    "  if (opt.mode === 'walk'){ walkCtl.unlock(); stopTouchWalk(); $('#hint3d').textContent = HINT_ORBIT;",
    "  if (opt.mode === 'walk'){ walkHud(false); freeMouse(); stopTouchWalk(); $('#hint3d').textContent = HINT_ORBIT();",
)
# En el recorrido las aristas de muros y puertas son líneas, y three.js da por tocada cualquier línea
# a menos de 1 m del rayo: junto a una pared todos los toques "chocaban" con ellas.
sub(
    "const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();",
    "const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();\nray.params.Line.threshold = .01;   // las aristas del recorrido no tapan los toques",
)
# La doble altura no tiene piso: no se camina por ahí (los escalones que estorban ya están en colliders)
sub(
    "function blocked(x, z, r = .22){\n  for (const [x0, z0, x1, z1] of colliders) if (x > x0 - r && x < x1 + r && z > z0 - r && z < z1 + r) return true;",
    "function blocked(x, z, r = .22){\n  for (const [x0, z0, x1, z1] of colliders) if (x > x0 - r && x < x1 + r && z > z0 - r && z < z1 + r) return true;\n"
    "  if (VOIDS.length && inVoid(x*1000 + OX, z*1000 + OY, r*1000)) return true;",
)
# Toque en el recorrido: puertas como antes; dos toques en el piso llevan ahí
sub(
    "      if (tap){ const h = pick(e); if (h?.door && h.dist < 3.5) h.door.open = !h.door.open; }   // 漫游时点门开关",
    "      if (tap){ const h = pick(e); if (h?.door && h.dist < 3.5) h.door.open = !h.door.open; else walkTap(e); }   // 漫游时点门开关",
)
sub(
    """function stepWalk(dt){
  if (!walkCtl.isLocked && !touchWalk) return;
  const sp = (keys.ShiftLeft || keys.ShiftRight ? 2.6 : 1.4) * dt, fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x), mv = new THREE.Vector3();
  if (keys.KeyW || keys.ArrowUp) mv.add(fwd); if (keys.KeyS || keys.ArrowDown) mv.sub(fwd);
  if (keys.KeyD || keys.ArrowRight) mv.add(right); if (keys.KeyA || keys.ArrowLeft) mv.sub(right);
  if (touchWalk){ mv.addScaledVector(fwd, -joy.y).addScaledVector(right, joy.x); }
  const mag = Math.min(1, mv.length());        // 摇杆推得越远走得越快
  if (mag < .05) return;
  mv.normalize().multiplyScalar(sp * mag);
  const p = camera.position;
  if (!blocked(p.x + mv.x, p.z)) p.x += mv.x;
  if (!blocked(p.x, p.z + mv.z)) p.z += mv.z;
}""",
    r"""function stepWalk(dt){
  stairTick();
  if (glide){ stepGlide(); walkMapTick(); return; }
  if (tour && !tour.paused && tour.phase !== 'end' && stepTour(dt)){ walkMapTick(); return; }
  const p = camera.position;
  p.y += (eyeH() - p.y) * Math.min(1, dt*6);                // sentarse o pararse sin brinco
  if (!walkCtl.isLocked && !touchWalk){ walkMapTick(); return; }
  const sp = (keys.ShiftLeft || keys.ShiftRight ? 2.6 : 1.4) * walk.speed * dt, fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x), mv = new THREE.Vector3();
  if (keys.KeyW || keys.ArrowUp) mv.add(fwd); if (keys.KeyS || keys.ArrowDown) mv.sub(fwd);
  if (keys.KeyD || keys.ArrowRight) mv.add(right); if (keys.KeyA || keys.ArrowLeft) mv.sub(right);
  if (touchWalk){ mv.addScaledVector(fwd, -joy.y).addScaledVector(right, joy.x); }
  const mag = Math.min(1, mv.length());        // 摇杆推得越远走得越快
  if (mag >= .05){
    if (walk.sit && walk.sitAuto) setSit(false);             // al caminar se levanta de la mesa
    mv.normalize().multiplyScalar(sp * mag);
    if (!blocked(p.x + mv.x, p.z)) p.x += mv.x;
    if (!blocked(p.x, p.z + mv.z)) p.z += mv.z;
  }
  walkMapTick();
}

/* ---------- Recorrido: velocidad, altura de la vista, sensibilidad, ir a…, doble toque y mapa ---------- */
const WALK_KEY = 'planner3d-recorrido';
const walk = (() => {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(WALK_KEY)) || {}; } catch(e){}
  return {speed: [1, 2, 3].includes(s.speed) ? s.speed : 1, look: [.6, 1, 1.6].includes(s.look) ? s.look : 1,
    map: s.map !== false, compact: s.compact === true, sit: false, sitAuto: false};
})();
function saveWalk(){ try { localStorage.setItem(WALK_KEY, JSON.stringify({speed:walk.speed, look:walk.look, map:walk.map, compact:walk.compact})); } catch(e){} }
const eyeH = () => walk.sit ? 1.2 : 1.6;                       // altura de los ojos de pie / sentado (m)
const planXY = v => [v.x*1000 + OX, v.z*1000 + OY];           // posición 3D → plano (mm)
const FLAT = ['rug', 'dancefloor', 'staff', 'vendor'];         // se puede pisar (los proveedores no se ven en 3D)
const ROUND = ['rtable', 'roundtable', 'cocktail', 'cake', 'plant', 'platform360', 'candelabra', 'flowerstand', 'staff'];
const TABLES = ['rtable', 'itable', 'headtable'];             // mesas de invitados (con sillas)
let glide = null, lastTap = null, spots = [], mapKey = '', bigOpen = false;

function setSpeed(v){ walk.speed = v; saveWalk(); syncWalkHud(); }
// Soltar el mouse capturado. En el iPhone no existe la captura (document.exitPointerLock) y unlock() truena:
// eso dejaba sin arrancar la visita guiada y a medias «Salir del recorrido».
function freeMouse(){ if (walkCtl.isLocked && document.exitPointerLock) walkCtl.unlock(); }
function setSit(v, auto = false){ walk.sit = v; walk.sitAuto = v && auto; syncWalkHud(); }
// Las indicaciones del recorrido se ven unos segundos y se quitan para no tapar la vista
function flashHint(){
  const h = $('#hint3d'); h.classList.remove('gone'); clearTimeout(flashHint.t);
  flashHint.t = setTimeout(() => { if (opt.mode === 'walk') h.classList.add('gone'); }, 6000);
}
function walkHud(on){
  tourEnd(); recAsk(false); glide = null; lastTap = null; bigMap(false); clearTimeout(flashHint.t);
  $('#whFade').classList.remove('on'); $('#hint3d').classList.toggle('gone', on);
  $('#walkHud').hidden = !on; $('#view3d').classList.toggle('walking', on); walkFov(on);
  if ($('#whPop')) $('#whPop').hidden = true;
  nearLink = null; if ($('#whStair')) $('#whStair').hidden = true;
  if (on){ setSit(false); buildWalkGo(); walkMapTick(true); }
  $('#tip').textContent = on ? (COARSE ? HINT_TOUCHWALK() : HINT_WALK()) : TIPS()['3d'];
}

// En el recorrido, con el celular vertical la vista se abre (con 45° de alto se ve apenas 27° a lo ancho,
// como por un tubo): se busca ~60° a lo ancho sin pasar de 75° de alto. En pantallas anchas queda igual.
function walkFov(on = opt.mode === 'walk'){
  const need = 2*Math.atan(Math.tan(Math.PI/6)/camera.aspect)*180/Math.PI;
  camera.fov = on ? THREE.MathUtils.clamp(need, FOV, 75) : FOV;
  camera.updateProjectionMatrix();
}

function inPoly([x, y], poly){
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi)*(y - yi)/(yj - yi) + xi) c = !c;
  }
  return c;
}
// ¿(x, y) cae en un mueble? m = holgura (mm); mt = holgura de las mesas con sus sillas
function inFurn(x, y, m = 250, mt = m){
  return opt.furn && state.furniture.some(f => {
    if (FLAT.includes(f.type)) return false;
    const k = TABLES.includes(f.type) ? mt : m, dx = x - f.cx, dy = y - f.cy;
    if (ROUND.includes(f.type)) return Math.hypot(dx, dy) < Math.min(f.w, f.d)/2 + k;
    const a = (f.rot || 0)*Math.PI/180;
    return Math.abs(dx*Math.cos(a) + dy*Math.sin(a)) < f.w/2 + k && Math.abs(-dx*Math.sin(a) + dy*Math.cos(a)) < f.d/2 + k;
  });
}
const freeAt = (x, y) => !blocked(wx(x), wz(y), .3) && !inFurn(x, y);
// ¿Se llega en línea recta sin atravesar muros? (puntos del plano en mm)
function clearPath(a, b){
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 150);
  for (let i = 1; i < n; i++) if (blocked(wx(a[0] + (b[0] - a[0])*i/n), wz(a[1] + (b[1] - a[1])*i/n), .05)) return false;
  return true;
}
// El lugar libre más cercano a (x, y), lejos de muros y muebles, que además cumpla ok(); null si no hay
function nearFree(x, y, ok = () => true){
  if (freeAt(x, y) && ok(x, y)) return [x, y];
  for (let r = 250; r <= 3000; r += 250)
    for (let k = 0; k < 16; k++){
      const px = x + Math.cos(k*Math.PI/8)*r, py = y + Math.sin(k*Math.PI/8)*r;
      if (freeAt(px, py) && ok(px, py)) return [px, py];
    }
  return null;
}
// Ir a un punto del plano (mm) mirando hacia `to`: cerca y a la vista se desliza; lejos o tras un muro, fundido
function walkTo(p, to, sit = walk.sit, auto = false){
  if (opt.mode !== 'walk') return;
  setSit(sit, auto);
  const a = camera.position.clone(), b = new THREE.Vector3(wx(p[0]), eyeH(), wz(p[1])), q0 = camera.quaternion.clone(), q1 = q0.clone();
  if (to) q1.setFromRotationMatrix(new THREE.Matrix4().lookAt(b, new THREE.Vector3(wx(to[0]), sit ? 1 : 1.45, wz(to[1])), camera.up));
  const d = Math.hypot(b.x - a.x, b.z - a.z), near = d < 12 && clearPath(planXY(a), p);
  glide = {t0:performance.now(), dur: near ? Math.min(1100, 320 + d*90) : 520, a, b, q0, q1, fade: !near};
  if (!near) $('#whFade').classList.add('on');
}
function stepGlide(){
  const g = glide, t = clamp01((performance.now() - g.t0)/g.dur);
  if (!g.fade){ const e = ease(t); camera.position.lerpVectors(g.a, g.b, e); camera.quaternion.slerpQuaternions(g.q0, g.q1, e); }
  else if (t >= .45 && !g.done){ g.done = true; camera.position.copy(g.b); camera.quaternion.copy(g.q1); $('#whFade').classList.remove('on'); }
  if (t >= 1) glide = null;
}
// Doble toque (o doble clic con el mouse capturado): en el piso, ir ahí sin atravesar muros;
// en una mesa, sentarse en ella; en otro mueble, ir junto a él
function walkTap(e){
  tourDrag = 0;
  $('#whPop').hidden = true;
  const now = performance.now(), prev = lastTap;
  lastTap = {t:now, x:e.clientX, y:e.clientY};
  if (prev && now - prev.t < 350 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 40){ lastTap = null; goScreen(e.clientX, e.clientY); }
}
function goScreen(x, y){
  tourPause();
  const h = pick({clientX:x, clientY:y}), here = planXY(camera.position), seen = (px, py) => clearPath(here, [px, py]);
  const t = h?.fid && spots.find(s => s.table?.id === h.fid);
  if (t) return goSpot(t);                                   // dos toques en una mesa: sentarse ahí
  const f = h?.fid && getF(h.fid), g = !f && groundAt(x, y);
  let p = null;
  if (f){   // otro mueble: junto a él, del lado que da hacia ti, mirándolo
    const dx = here[0] - f.cx, dy = here[1] - f.cy, L = Math.hypot(dx, dy) || 1, R = Math.max(f.w, f.d)/2 + 400;
    p = nearFree(f.cx + dx/L*R, f.cy + dy/L*R, seen);
  } else if (g) p = nearFree(g.x, g.y, seen);
  if (p) walkTo(p, f ? [f.cx, f.cy] : null);
}

// «Ir a…»: entrada, lugares y mesas del evento, cuartos
function buildWalkGo(){
  const W0 = PLANTA.walk || {from:[OX, OY], to:[OX, OY - 3000]};
  spots = [{label: PLANTA.entry ? tr('入口', 'Entrance', 'Entrada') : tr('起点', 'Start', 'Inicio'), p:W0.from, to:W0.to}];
  (EXT?.walkSpots?.(state) || []).forEach(s => spots.push({group:s.group, label:s.label, p:[s.x, s.y], to:[s.tx, s.ty], sit:s.sit, table:s.r ? s : null}));
  ROOMS.filter(r => !r.void && !stairRoom(r)).forEach(r => spots.push({group:tr('房间', 'Rooms', 'Cuartos'), label:nm(state.rooms[r.id].name), room:r}));
  STAIR_LINKS.forEach(l => spots.push({group:tr('房间', 'Rooms', 'Cuartos'), label:tr('楼梯', 'Stairs', 'Escalera'), p:l.at, to:l.step2}));
  const groups = [...new Set(spots.map(s => s.group || ''))];
  $('#whGo').innerHTML = `<option value="">${esc(tr('前往…', 'Go to…', 'Ir a…'))}</option>` + groups.map(g => {
    const o = spots.map((s, i) => (s.group || '') === g ? `<option value="${i}">${esc(s.label)}</option>` : '').join('');
    return g ? `<optgroup label="${esc(g)}">${o}</optgroup>` : o;
  }).join('');
}
function goSpot(s){
  tourPause();
  if (s.room) return goRoom(s.room);
  if (s.sit) return walkTo(s.p, s.to, true, true);          // el lugar exacto, como «Ver desde esta mesa»
  walkTo(nearFree(...s.p) || s.p, s.to, false);
}
// Un cuarto: se entra por el lado más cercano a `from` (mm), mirando al centro (como en una visita)
function roomSpot(r, [hx, hy]){
  const xs = r.poly.map(p => p[0]), ys = r.poly.map(p => p[1]), inside = (x, y) => inPoly([x, y], r.poly);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let c = [(x0 + x1)/2, (y0 + y1)/2];
  if (!inside(...c)) c = r.at && inside(...r.at) ? r.at : nearFree(c[0], c[1], inside) || c;
  const step = Math.max(300, Math.min(x1 - x0, y1 - y0)/12), cand = [];
  for (let x = x0 + step/2; x < x1; x += step) for (let y = y0 + step/2; y < y1; y += step)
    if (inside(x, y) && freeAt(x, y)) cand.push([x, y, Math.hypot(x - hx, y - hy)]);
  cand.sort((a, b) => a[2] - b[2]);
  // Mejor fuera del arco de las puertas: abiertas taparían la vista
  const swing = ([x, y]) => DOORS.some(d => Math.hypot(x - d.h[0], y - d.h[1]) < (d.len || 900) + 350);
  const pick = list => list.find(([x, y]) => Math.hypot(x - c[0], y - c[1]) > 900 && clearPath([x, y], c));
  const p = pick(cand.filter(q => !swing(q))) || pick(cand);
  return p ? {p: p.slice(0, 2), to: c} : {p: nearFree(c[0], c[1], inside) || c, to: null};
}
function goRoom(r){ const s = roomSpot(r, planXY(camera.position)); walkTo(s.p, s.to, false); }

// Mapa: chico en la esquina; al tocarlo se abre grande para elegir a dónde ir (o una mesa para sentarse)
const SMALL_MAP = () => COARSE ? [96, 128] : [150, 190];
function mapFit(cw, ch){
  const b = WALL_BOX, pad = 1200, bw = b.x1 - b.x0 + 2*pad, bh = b.y1 - b.y0 + 2*pad, k = Math.min(cw/bw, ch/bh);
  return {k, w: Math.round(bw*k), h: Math.round(bh*k), x0: b.x0 - pad, y0: b.y0 - pad};
}
function bigFit(){ const v = $('#view3d'); return mapFit(v.clientWidth - 32, v.clientHeight - 130); }
function drawMap(cv, m, big){
  const dpr = devicePixelRatio || 1, P = (x, y) => [(x - m.x0)*m.k, (y - m.y0)*m.k], g = cv.getContext('2d');
  if (cv.width !== Math.round(m.w*dpr) || cv.height !== Math.round(m.h*dpr)){
    cv.width = Math.round(m.w*dpr); cv.height = Math.round(m.h*dpr); cv.style.width = m.w + 'px'; cv.style.height = m.h + 'px';
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = 'rgba(255,253,249,.95)'; g.fillRect(0, 0, m.w, m.h);
  ROOMS.forEach(r => {
    if (r.void) return;
    g.beginPath(); r.poly.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](...P(x, y))); g.closePath();
    g.fillStyle = r.outdoor ? '#e3e9d8' : '#efe7da'; g.fill();
  });
  g.fillStyle = '#e6dfd0'; g.strokeStyle = '#cdc3b2'; g.lineWidth = .6;
  MAP_STAIRS.forEach(([x0, y0, x1, y1]) => { const [ax, ay] = P(x0, y0), [bx, by] = P(x1, y1); g.fillRect(ax, ay, bx - ax, by - ay); g.strokeRect(ax, ay, bx - ax, by - ay); });
  if (opt.furn) state.furniture.forEach(f => {
    if (f.type === 'vendor') return;
    const [x, y] = P(f.cx, f.cy), w = f.w*m.k, d = f.d*m.k;
    g.save(); g.translate(x, y); g.rotate((f.rot || 0)*Math.PI/180); g.beginPath();
    if (ROUND.includes(f.type)) g.arc(0, 0, Math.min(w, d)/2, 0, 2*Math.PI); else g.rect(-w/2, -d/2, w, d);
    g.fillStyle = FLAT.includes(f.type) ? '#e2d6c2' : TABLES.includes(f.type) ? '#c8a988' : '#d2c8ba'; g.fill();
    g.restore();
  });
  g.fillStyle = '#4a443d';
  WALLS.forEach((w, i) => {
    if (state.demolished.includes('w' + i)) return;
    const [ax, ay] = P(w[0], w[1]), [bx, by] = P(w[2], w[3]);
    g.fillRect(ax, ay, Math.max(1.2, bx - ax), Math.max(1.2, by - ay));
  });
  if (big){   // números de mesa y nombres de cuartos para elegir
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#5c554c';
    g.font = '500 10px -apple-system,Helvetica,sans-serif';
    ROOMS.forEach(r => {
      if (r.void || !r.at) return;
      const xs = r.poly.map(p => p[0]), room = (Math.max(...xs) - Math.min(...xs))*m.k - 6, name = nm(state.rooms[r.id].name);
      const [x, y] = P(...r.at), words = name.split(' '), half = Math.ceil(words.length/2);
      if (g.measureText(name).width <= room || words.length < 2) g.fillText(name, x, y);
      else { g.fillText(words.slice(0, half).join(' '), x, y - 6); g.fillText(words.slice(half).join(' '), x, y + 6); }
    });
    g.fillStyle = '#2b2824'; g.font = '600 11px -apple-system,Helvetica,sans-serif';
    spots.forEach(s => { if (s.table) g.fillText(/\d+$/.exec(s.label)?.[0] ?? '★', ...P(s.table.cx, s.table.cy)); });
  }
  // Tú: punto con el cono de la vista
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const [x, y] = P(...planXY(camera.position)), a = Math.atan2(dir.z, dir.x), R = big ? 46 : 24;
  const px = Math.min(Math.max(x, 6), m.w - 6), py = Math.min(Math.max(y, 6), m.h - 6);
  g.fillStyle = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#b5653a';
  g.globalAlpha = .3; g.beginPath(); g.moveTo(px, py); g.arc(px, py, R, a - .55, a + .55); g.closePath(); g.fill();
  g.globalAlpha = 1; g.beginPath(); g.arc(px, py, big ? 7 : 5, 0, 2*Math.PI); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
}
function walkMapTick(force){
  if (!walk.map && !bigOpen) return;
  const c = camera.position, dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const key = [c.x, c.z, Math.atan2(dir.z, dir.x)].map(v => v.toFixed(2)).join();
  if (!force && key === mapKey) return;
  mapKey = key;
  if (walk.map) drawMap($('#whMap'), mapFit(...SMALL_MAP()), false);
  if (bigOpen) drawMap($('#whBig canvas'), bigFit(), true);
}
function bigMap(on){
  bigOpen = on; if ($('#whBig')) $('#whBig').hidden = !on;
  $('#view3d').classList.toggle('mapopen', on);
  if (on){ $('#whPop').hidden = true; walkMapTick(true); }
}
function mapGo(cv, e){
  tourPause();
  const m = bigFit(), r = cv.getBoundingClientRect(), x = (e.clientX - r.left)/m.k + m.x0, y = (e.clientY - r.top)/m.k + m.y0;
  bigMap(false);
  const t = spots.find(s => s.table && Math.hypot(x - s.table.cx, y - s.table.cy) < s.table.r);
  if (t) return goSpot(t);
  const p = nearFree(x, y);
  if (p) walkTo(p, null);
}

function syncWalkHud(){
  const on = (sel, f) => document.querySelectorAll(sel).forEach(b => b.classList.toggle('on', f(b.dataset)));
  on('#whSpeed button, #recAsk [data-sp]', d => +d.sp === walk.speed);
  const side = $('#whSide');
  if (side){   // con las opciones ocultas queda un solo botón que cambia la velocidad con cada toque
    side.classList.toggle('compact', walk.compact);
    $('#whFold').innerHTML = walk.compact ? ICON.up : ICON.down;
    $('#whFold').setAttribute('aria-label', walk.compact ? tr('显示选项', 'Show options', 'Mostrar opciones') : tr('隐藏选项', 'Hide options', 'Ocultar opciones'));
    $('#whCycle').textContent = 'x' + walk.speed;
    $('#whCycle').setAttribute('aria-label', tr('速度', `Speed x${walk.speed}: tap to change`, `Velocidad x${walk.speed}: toca para cambiarla`));
  }
  on('#whEye button', d => (d.eye === 'sit') === walk.sit);
  on('#whLook button', d => +d.look === walk.look);
  on('#whMapOn button', d => (d.map === '1') === walk.map);
  if ($('#whMap')) $('#whMap').hidden = !walk.map;
  if (walkCtl) walkCtl.pointerSpeed = walk.look;
}
function renderWalkHud(){
  const seg = items => items.map(([k, v, l]) => `<button data-${k}="${v}">${esc(l)}</button>`).join('');
  $('#walkHud').innerHTML = `
    <div class="wh-top">
      <label class="wh-pill">${esc(tr('前往…', 'Go to…', 'Ir a…'))} ▾<select id="whGo" aria-label="${esc(tr('前往', 'Go to', 'Ir a'))}"></select></label>
      <button class="wh-pill" id="whTourBtn" aria-label="${esc(tr('导览', 'Guided tour', 'Visita guiada'))}">${ICON.play}</button>
      ${recAllowed() ? `<button class="wh-pill" id="whRecBtn" aria-label="${esc(tr('录制视频', 'Record a video', 'Grabar video'))}">${ICON.rec}</button>` : ''}
      <button class="wh-pill" id="whCfg" aria-label="${esc(tr('设置', 'Settings', 'Ajustes'))}">⚙&#xFE0E;</button>
    </div>
    <div id="whPop" hidden>
      <span>${esc(tr('转向灵敏度', 'Look speed', 'Al mirar'))}</span>
      <div class="wh-seg" id="whLook">${seg([['look', .6, tr('慢', 'Slow', 'Suave')], ['look', 1, tr('中', 'Normal', 'Normal')], ['look', 1.6, tr('快', 'Fast', 'Rápido')]])}</div>
      <span>${esc(tr('小地图', 'Map', 'Mapa'))}</span>
      <div class="wh-seg" id="whMapOn">${seg([['map', 1, tr('显示', 'Show', 'Ver')], ['map', 0, tr('隐藏', 'Hide', 'Ocultar')]])}</div>
    </div>
    <canvas id="whMap" role="button" aria-label="${esc(tr('地图：点击选择去哪里', 'Map: tap to choose where to go', 'Mapa: tócalo para elegir a dónde ir'))}"></canvas>
    <div class="wh-side" id="whSide">
      <div class="wh-seg" id="whEye">${seg([['eye', 'stand', tr('站立', 'Standing', 'De pie')], ['eye', 'sit', tr('坐下', 'Seated', 'Sentado')]])}</div>
      <div class="wh-row">
        <button class="wh-pill wh-fold" id="whFold"></button>
        <div class="wh-seg" id="whSpeed" role="group" aria-label="${esc(tr('速度', 'Speed', 'Velocidad'))}">${seg([['sp', 1, 'x1'], ['sp', 2, 'x2'], ['sp', 3, 'x3']])}</div>
        <button class="wh-pill" id="whCycle"></button>
      </div>
    </div>
    <button class="wh-pill" id="whStair" hidden></button>
    <div id="whTour" hidden>
      <div class="wt-txt"><b id="wtName"></b><small id="wtStep"></small></div>
      <button class="wt-btn" id="wtPlay"></button>
      <button class="wt-btn" id="wtNext" aria-label="${esc(tr('下一个', 'Next', 'Siguiente'))}">${ICON.next}</button>
      <button class="wt-btn" id="wtStop" aria-label="${esc(tr('结束', 'End tour', 'Terminar la visita'))}">✕</button>
    </div>
    <div id="recBadge" hidden></div>
    <div id="recAsk" hidden><div class="card">
      <h3>${esc(tr('录制导览视频', 'Record the tour as a video', 'Grabar video de la visita'))}</h3>
      <p>${esc(tr('竖屏视频，适合 WhatsApp 和 Instagram', 'A vertical video for WhatsApp and Instagram, with the name of each stop and your brand. Keep this screen open while it records.',
        'Video vertical para WhatsApp e Instagram, con el nombre de cada parada y tu marca. Deja esta pantalla abierta mientras se graba.'))}</p>
      ${CASA.levels.length > 1 ? `<p>${esc(tr('每层楼分别录制', 'It records the floor you are on; record the other floor from there.',
        'Se graba la planta en la que estás; la otra planta se graba desde ahí.'))}</p>` : ''}
      <span class="muted">${esc(tr('速度', 'Speed (faster = shorter video)', 'Velocidad (más rápido = video más corto)'))}</span>
      <div class="wh-seg">${seg([['sp', 1, 'x1'], ['sp', 2, 'x2'], ['sp', 3, 'x3']])}</div>
      <div class="row"><button class="btn primary" data-rec="go">${ICON.rec} ${esc(tr('录制', 'Record', 'Grabar'))}</button>
        <button class="btn" data-rec="no">${esc(tr('取消', 'Cancel', 'Cancelar'))}</button></div>
    </div></div>
    <div id="whBig" hidden>
      <p>${esc(EXT ? tr('点击要去的位置 · 点餐桌坐下', 'Tap where you want to go · tap a table to sit there', 'Toca a dónde quieres ir · toca una mesa para sentarte')
        : tr('点击要去的位置', 'Tap where you want to go', 'Toca a dónde quieres ir'))}</p>
      <canvas></canvas>
      <button class="btn" id="whClose">${esc(tr('关闭', 'Close', 'Cerrar'))}</button>
    </div>`;
  $('#woTour').innerHTML = `${ICON.play} ${esc(tr('导览', 'Guided tour', 'Visita guiada'))}`;
  bigMap(false); tourCard(); nearLink = null;
  if (opt.mode === 'walk'){ buildWalkGo(); syncWalkHud(); walkMapTick(true); }
}
function bindWalkHud(){
  const hud = $('#walkHud');
  hud.addEventListener('click', e => {
    const b = e.target.closest('button,canvas'), d = b?.dataset || {};
    if (!b){ if (e.target.id === 'whBig') bigMap(false); return; }
    if (d.sp) setSpeed(+d.sp);
    else if (b.id === 'whCycle') setSpeed(walk.speed % 3 + 1);          // x1 → x2 → x3 → x1
    else if (b.id === 'whFold'){ walk.compact = !walk.compact; saveWalk(); syncWalkHud(); }
    else if (d.eye) setSit(d.eye === 'sit');
    else if (d.look){ walk.look = +d.look; saveWalk(); syncWalkHud(); }
    else if (d.map){ walk.map = d.map === '1'; saveWalk(); syncWalkHud(); walkMapTick(true); }
    else if (b.id === 'whCfg') $('#whPop').hidden = !$('#whPop').hidden;
    else if (b.id === 'whMap') bigMap(true);
    else if (b.id === 'whClose') bigMap(false);
    else if (b.id === 'whTourBtn') startTour();
    else if (b.id === 'whRecBtn') recAsk(true);
    else if (d.rec) d.rec === 'go' ? startRecording() : recAsk(false);
    else if (b.id === 'whStair'){ if (nearLink) climb(nearLink); }
    else if (b.id === 'wtPlay') tour?.phase === 'end' ? tourAgain() : tour?.paused ? tourResume() : tourPause();
    else if (b.id === 'wtNext') tourNext();
    else if (b.id === 'wtStop') tourEnd();
    else if (b.parentElement?.id === 'whBig') mapGo(b, e);
  });
  hud.addEventListener('change', e => {
    if (e.target.id !== 'whGo' || e.target.value === '') return;
    const s = spots[+e.target.value]; e.target.value = ''; e.target.blur();
    if (s) goSpot(s);
  });
  document.addEventListener('dblclick', () => {   // con el mouse capturado: ir a donde apunta la mira
    if (!active || opt.mode !== 'walk' || !walkCtl.isLocked) return;
    const r = renderer.domElement.getBoundingClientRect(); goScreen(r.left + r.width/2, r.top + r.height/2);
  });
  $('#woTour').onclick = e => { e.stopPropagation(); startTour(); };
}

// «Ver desde esta mesa»: la cámara baja volando hasta el lugar y queda en el recorrido, sentada, para mirar alrededor
async function sitAt(p, to){
  if (!active || anim) return;
  if (opt.mode === 'walk'){ tourEnd(); if (!touchWalk){ freeMouse(); startTouchWalk(); } return walkTo(p, to, true, true); }
  fly = null; orbit.enabled = false; showLabels(false);
  const A = curPose(), B = pose(new THREE.Vector3(wx(to[0]), 1, wz(to[1])), new THREE.Vector3(wx(p[0]), 1.2, wz(p[1])));
  await animate(1400, t => camTween(A, B, ease(t)));
  setMode('walk', true); setSit(true, true); startTouchWalk();
}

/* ---------- Visita guiada: camina sola por lo principal, se detiene y mira; pausa, siguiente y terminar ---------- */
const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14l9-7zM16 5h2.5v14H16z"/></svg>',
  again: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V1.5L7 6l5 4.5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9h12l-6 7z"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15h12l-6-7z"/></svg>',
  rec: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="#d93a2b"/></svg>',
  stairs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 22h20V2h-4v4h-4v4h-4v4h-4v4H2z"/></svg>',
};
const SHOW = ['bar', 'dessert', 'cake', 'booth', 'platform360'];   // en salones: lo que más se luce
let tour = null, grids = {}, tourDrag = 0;

// Las paradas, en orden. Salón: entrada, el salón, barra / dulces / pastel, una mesa de atrás, una junto a la
// pista, la mesa principal y la pista. Casa (con su área), como en una visita inmobiliaria: acceso, sala,
// comedor y cocina; luego recámaras; luego baños y servicio; al final terraza y jardín. Dentro de cada grupo,
// del más cercano al más lejano. Los pasillos no son parada: se cruzan caminando.
const ROOM_KIND = [/acceso|recibidor|vest[ií]bulo|sala|estancia|comedor|cocina|family|tv|estudio/i,
  /ba[ñn]o|lavad|servicio|bodega|cl[oó]set|vestidor|m[aá]quinas/i, /pasillo|circulaci[oó]n/i];
function tourStops(from){   // from: sigue desde aquí (llegó por la escalera) en vez de empezar en la entrada
  const W0 = PLANTA.walk || {from:[OX, OY], to:[OX, OY - 3000]}, stops = [];
  const add = (name, p, to, sit = false) => stops.push({name, p, to, sit}), last = () => stops[stops.length - 1].p;
  const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]), mid = r => roomSpot(r, last());
  const ctr = r => { const xs = r.poly.map(q => q[0]), ys = r.poly.map(q => q[1]); return [(Math.min(...xs) + Math.max(...xs))/2, (Math.min(...ys) + Math.max(...ys))/2]; };
  const rooms = ROOMS.filter(r => !r.void && area(r.poly) >= 1.5 && !stairRoom(r));
  if (from) add(PLANTA.name, from, null); else add(PLANTA.entry ? tr('入口', 'Entrance', 'Entrada') : tr('起点', 'Start', 'Inicio'), W0.from, W0.to);
  if (EXT?.walkSpots){
    const main = rooms.slice().sort((a, b) => area(b.poly) - area(a.poly))[0];
    if (main){ const s = mid(main); add(nm(state.rooms[main.id].name), s.p, s.to); }
    const c = [(WALL_BOX.x0 + WALL_BOX.x1)/2, (WALL_BOX.y0 + WALL_BOX.y1)/2], left = state.furniture.filter(f => SHOW.includes(f.type));
    for (let n = 0; n < 3 && left.length; n++){
      left.sort((a, b) => d2([a.cx, a.cy], last()) - d2([b.cx, b.cy], last()));
      const f = left.shift(), L = d2([f.cx, f.cy], c) || 1, R = Math.max(f.w, f.d)/2 + 1500;
      const p = nearFree(f.cx + (c[0] - f.cx)/L*R, f.cy + (c[1] - f.cy)/L*R);
      if (p) add(nm(f.name), p, [f.cx, f.cy]);
    }
    const spots = EXT.walkSpots(state), dance = spots.find(s => !s.r), tables = spots.filter(s => s.r);
    const ref = dance ? [dance.x, dance.y] : c, far = s => d2([s.cx, s.cy], ref), head = s => getF(s.id)?.type === 'headtable';
    const plain = tables.filter(s => !head(s)).sort((a, b) => far(b) - far(a));
    const seat = (s, extra) => add(extra ? `${s.label} · ${extra}` : s.label, [s.x, s.y], [s.tx, s.ty], true);
    if (plain.length > 1) seat(plain[0], tr('后排', 'from the back', 'desde atrás'));
    if (plain.length) seat(plain[plain.length - 1], tr('舞池旁', 'by the dance floor', 'junto a la pista'));
    tables.filter(head).forEach(s => seat(s));
    if (dance) add(dance.label, [dance.x, dance.y], [dance.tx, dance.ty]);
  } else {
    const outside = rooms.filter(r => r.outdoor && ['grass', 'deck'].includes(state.rooms[r.id].mat) && !inPoly(W0.from, r.poly)
      && d2(roomSpot(r, W0.from).p, W0.from) > 3000);
    const kind = r => { const n = state.rooms[r.id].name; return ROOM_KIND[0].test(n) ? 0 : ROOM_KIND[1].test(n) ? 2 : 1; };
    const indoor = rooms.filter(r => !r.outdoor && !ROOM_KIND[2].test(state.rooms[r.id].name));
    for (const group of [0, 1, 2].map(k => indoor.filter(r => kind(r) === k)).concat([outside])){
      const left = group.slice();
      while (left.length){
        left.sort((a, b) => d2(ctr(a), last()) - d2(ctr(b), last()));
        const r = left.shift(), s = mid(r);
        add(`${nm(state.rooms[r.id].name)} · ${area(r.poly).toFixed(1)} m²`, s.p, s.to);
      }
    }
    // Casa de dos plantas: la última parada es el pie de la escalera y desde ahí la visita sigue arriba
    const up = STAIR_LINKS.find(l => l.dir === 'subir');
    if (up) stops.push({name: tr('楼梯', 'Stairs', 'Escalera'), p: up.at, to: up.step2, sit: false, climb: up});
  }
  return stops;
}

// Caminos a pie (mm): A* en una rejilla de 25 cm que esquiva muros, escalones y muebles (las mesas un poco
// reducidas para pasar entre sillas). Si no hay camino con muebles se busca solo con muros.
function makeGrid(furn){
  const G = 250, B = WALL_BOX, pad = 4000, x0 = B.x0 - pad, y0 = B.y0 - pad;
  const nx = Math.ceil((B.x1 - B.x0 + 2*pad)/G) + 1, ny = Math.ceil((B.y1 - B.y0 + 2*pad)/G) + 1, memo = new Int8Array(nx*ny);
  const at = (x, y) => { const i = Math.round((x - x0)/G), j = Math.round((y - y0)/G); return i < 0 || j < 0 || i >= nx || j >= ny ? -1 : j*nx + i; };
  const pt = k => [x0 + (k % nx)*G, y0 + Math.floor(k/nx)*G];
  const wall = (x, z) => colliders.some(([a, b, c, d]) => x > a - .18 && x < c + .18 && z > b - .18 && z < d + .18);   // cabe por puertas de 75 cm
  const free = k => {
    if (k < 0) return false;
    if (!memo[k]){ const [x, y] = pt(k); memo[k] = wall(wx(x), wz(y)) || inVoid(x, y, 180) || (furn && inFurn(x, y, 120, -150)) ? 2 : 1; }
    return memo[k] === 1;
  };
  return {G, nx, ny, at, pt, free};
}
function astar(g, s, e){
  const {nx, ny} = g, N = nx*ny, cost = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const ok = k => k === s || k === e || g.free(k), ex = e % nx, ey = Math.floor(e/nx), heap = [];
  const h = k => { const dx = Math.abs(k % nx - ex), dy = Math.abs(Math.floor(k/nx) - ey); return Math.max(dx, dy) + .414*Math.min(dx, dy); };
  const push = (f, k) => { heap.push([f, k]); for (let i = heap.length - 1; i;){ const j = (i - 1) >> 1; if (heap[j][0] <= heap[i][0]) break; [heap[i], heap[j]] = [heap[j], heap[i]]; i = j; } };
  const pop = () => {
    const top = heap[0], end = heap.pop();
    if (heap.length){ heap[0] = end; for (let i = 0;;){ const l = 2*i + 1, r = l + 1; let m = i;
      if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
      if (m === i) break; [heap[i], heap[m]] = [heap[m], heap[i]]; i = m; } }
    return top;
  };
  cost[s] = 0; push(h(s), s);
  for (let n = 0; heap.length && n < 400000; n++){
    const k = pop()[1];
    if (done[k]) continue;
    if (k === e){ const out = []; for (let c = e; c !== -1; c = prev[c]) out.push(c); return out.reverse(); }
    done[k] = 1;
    const x = k % nx, y = (k - x)/nx;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++){
      const X = x + dx, Y = y + dy, q = Y*nx + X;
      if ((!dx && !dy) || X < 0 || Y < 0 || X >= nx || Y >= ny || done[q] || !ok(q)) continue;
      if (dx && dy && (!ok(y*nx + X) || !ok(Y*nx + x))) continue;   // sin cortar esquinas
      const c = cost[k] + (dx && dy ? 1.414 : 1);
      if (c < cost[q]){ cost[q] = c; prev[q] = k; push(c + h(q), q); }
    }
  }
  return null;
}
function findPath(a, b){
  for (const furn of [true, false]){
    const g = grids[furn] ||= makeGrid(furn), s = g.at(...a), e = g.at(...b);
    if (s < 0 || e < 0) return null;
    const cells = astar(g, s, e);
    if (!cells) continue;
    // Se jala la cuerda: de cada punto, el más lejano que se ve en línea recta
    const pts = cells.map(k => g.pt(k)), clear = (p, q) => {
      const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1])/(g.G/2));
      for (let i = 1; i < n; i++){ const k = g.at(p[0] + (q[0] - p[0])*i/n, p[1] + (q[1] - p[1])*i/n); if (k !== s && k !== e && !g.free(k)) return false; }
      return true;
    };
    pts[0] = a; pts[pts.length - 1] = b;
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1;){ let j = pts.length - 1; while (j > i + 1 && !clear(pts[i], pts[j])) j--; out.push(pts[j]); i = j; }
    return out;
  }
  return null;
}

function startTour(o = {}){   // o.here: sigue desde este punto (mm); o.cont: vino subiendo de la planta de abajo
  if (!active || anim) return;
  if (opt.mode !== 'walk') setMode('walk');
  if (!touchWalk){ freeMouse(); startTouchWalk(); }
  bigMap(false);
  doors.forEach(d => d.open = true);                       // en la visita las puertas están abiertas
  grids = {};
  tour = {stops: tourStops(o.here), i: 0, phase: 'go', paused: false, cont: !!o.cont};
  tourCard();
}
function tourPause(){ tourDrag = 0; if (tour && !tour.paused && tour.phase !== 'end' && tour.phase !== 'climb'){ tour.paused = true; tourCard(); if (rec?.mr.state === 'recording') rec.mr.pause(); } }
function tourResume(){
  if (!tour) return;
  tour.paused = false;
  if (rec?.mr.state === 'paused') rec.mr.resume();
  if (tour.phase === 'hold') tour.i++;                     // ya estaba en esa parada: sigue a la siguiente
  if (tour.i >= tour.stops.length) return tourFinish();
  tour.phase = 'go'; tourCard();
}
function tourNext(){
  if (!tour || tour.phase === 'end' || tour.phase === 'climb') return;
  tour.i++; tour.paused = false;
  if (rec?.mr.state === 'paused') rec.mr.resume();
  if (tour.i >= tour.stops.length) return tourFinish();
  const s = tour.stops[tour.i];
  walkTo(s.p, s.to, s.sit, s.sit);
  Object.assign(tour, {phase: 'hold', held: 0, q1: null}); tourCard();
}
function tourFinish(){ Object.assign(tour, {phase: 'end', paused: false}); tourCard(); }
function tourEnd(){ tour = null; tourCard(); recStop(); }
function tourCard(){
  const c = $('#whTour'), v = $('#view3d');
  v.classList.toggle('tourcard', !!tour); v.classList.toggle('touring', !!tour && !tour.paused && tour.phase !== 'end');
  if (!c) return;
  c.hidden = !tour;
  if (!tour) return;
  const end = tour.phase === 'end', up = tour.phase === 'climb', s = tour.stops[Math.min(tour.i, tour.stops.length - 1)];
  $('#wtName').textContent = end ? tr('参观结束', 'End of the tour', 'Fin de la visita') : up ? tr('上楼中…', 'Going up…', 'Subiendo…') : s.name;
  $('#wtStep').textContent = end ? tr('可以自己逛逛', 'Walk around on your own or watch it again', 'Recorre por tu cuenta o vuélvela a ver')
    : up ? s.climb.level.name : `${tour.i + 1} ${tr('/', 'of', 'de')} ${tour.stops.length}`;
  $('#wtPlay').innerHTML = end ? ICON.again : tour.paused ? ICON.play : ICON.pause;
  $('#wtPlay').setAttribute('aria-label', end ? tr('重新播放', 'Watch again', 'Volver a ver')
    : tour.paused ? tr('继续', 'Resume', 'Seguir') : tr('暂停', 'Pause', 'Pausa'));
  $('#wtNext').hidden = end || up;
}
// Un cuadro de la visita: ir caminando, voltear a ver, quedarse mirando un momento. false = el usuario tomó el control
function stepTour(dt){
  const T = tour, s = T.stops[T.i], cam = camera, p = cam.position, now = performance.now();
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some(k => keys[k]) || Math.hypot(joy.x, joy.y) > .05){
    tourPause(); return false;
  }
  p.y += (eyeH() - p.y) * Math.min(1, dt*6);
  if (T.phase === 'go'){
    tourCard();
    const here = planXY(p);
    if (Math.hypot(s.p[0] - here[0], s.p[1] - here[1]) < 400){ tourTurn(); return true; }
    const path = T.i ? findPath(here, s.p) : null;          // a la entrada (lejos) se llega con fundido
    if (!path){ walkTo(s.p, s.to, s.sit, s.sit); Object.assign(T, {phase: 'hold', held: 0, q1: null}); return true; }
    setSit(false);
    const P = path.map(([x, y]) => new THREE.Vector2(wx(x), wz(y))), L = [0];
    for (let k = 1; k < P.length; k++) L.push(L[k - 1] + P[k].distanceTo(P[k - 1]));
    Object.assign(T, {phase: 'walk', P, L, d: 0});
    return true;
  }
  if (T.phase === 'walk'){
    const total = T.L[T.L.length - 1], at = d => {
      let k = 1; while (k < T.L.length - 1 && T.L[k] < d) k++;
      return T.P[k - 1].clone().lerp(T.P[k], clamp01((d - T.L[k - 1])/((T.L[k] - T.L[k - 1]) || 1)));
    };
    T.d = Math.min(total, T.d + 1.7*walk.speed*dt);
    const q = at(T.d), ahead = at(Math.min(total, T.d + 1.6));
    p.x = q.x; p.z = q.y;
    if (ahead.distanceTo(q) > .05){   // mira hacia donde va, girando suave
      eul.setFromQuaternion(cam.quaternion);
      let dy = Math.atan2(q.x - ahead.x, q.y - ahead.y) - eul.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      eul.y += dy*Math.min(1, dt*3); eul.x += (-.06 - eul.x)*Math.min(1, dt*3); eul.z = 0;
      cam.quaternion.setFromEuler(eul);
    }
    if (T.d >= total) tourTurn();
    return true;
  }
  if (T.phase === 'turn'){
    const t = clamp01((now - T.t0)/900);
    cam.quaternion.slerpQuaternions(T.q0, T.q1, ease(t));
    if (t >= 1) Object.assign(T, {phase: 'hold', held: 0});
    return true;
  }
  if (T.phase === 'hold'){   // se queda mirando y voltea un poco a cada lado
    if (!T.q1) T.q1 = cam.quaternion.clone();
    const H = 3.6/Math.sqrt(walk.speed);
    T.held += dt;
    cam.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(UP_Y, Math.sin(Math.min(1, T.held/H)*Math.PI*2)*.16).multiply(T.q1));
    if (T.held >= H){
      if (s.climb && !rec){ climb(s.climb, true); return true; }   // sigue en la planta alta (el video se graba por planta)
      T.i++; if (T.i >= T.stops.length) tourFinish(); else { T.phase = 'go'; tourCard(); }
    }
    return true;
  }
  return T.phase === 'climb';   // subiendo: la cámara la lleva el glide y luego cambia la página
}
function tourTurn(){
  const T = tour, s = T.stops[T.i];
  setSit(s.sit, s.sit);
  const eye = new THREE.Vector3(camera.position.x, eyeH(), camera.position.z);
  T.q0 = camera.quaternion.clone();
  T.q1 = s.to ? new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye,
    new THREE.Vector3(wx(s.to[0]), s.sit ? 1 : 1.45, wz(s.to[1])), camera.up)) : T.q0.clone();
  Object.assign(T, {phase: 'turn', t0: performance.now()});
}

/* ---------- Escalera: subir y bajar de planta desde el recorrido ---------- */
// Cada planta es una página (?planta=): al subir o bajar se abre la otra con ?vista=3d&recorrido=subir|bajar y entra
// directo al recorrido, en el desembarco (arriba) o al pie (abajo). Las escaleras de esta planta suben a la siguiente
// (ABOVE); las de la planta de abajo (BELOW) desembocan aquí. Con ?visita=1 la visita guiada sigue en la otra planta.
const stairRoom = r => STAIRS.some(st => st.steps.some(([x0, y0, x1, y1]) => inPoly([(x0 + x1)/2, (y0 + y1)/2], r.poly)));
const inVoid = (x, y, m = 0) => VOIDS.some(v => [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m]].some(([dx, dy]) => inPoly([x + dx, y + dy], v)));
const MAP_STAIRS = [...STAIRS, ...(VOIDS.length && BELOW ? BELOW.stairs || [] : [])].flatMap(st => st.steps);
// Pie (antes del primer escalón) y desembarco (después del último) de una escalera, con su dirección de subida
function stairEnds(st){
  const S = st.steps, n = S.length, c = r => [(r[0] + r[2])/2, (r[1] + r[3])/2], depth = r => Math.min(r[2] - r[0], r[3] - r[1]);
  const dir = (a, b) => { const d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(d[0], d[1]) || 1; return [d[0]/L, d[1]/L]; };
  const up = n > 1 ? dir(c(S[0]), c(S[1])) : [0, -1], out = n > 1 ? dir(c(S[n - 2]), c(S[n - 1])) : up;
  const k0 = depth(S[0])/2 + 650, k1 = depth(S[n - 1])/2 + 650;
  return {foot: [c(S[0])[0] - up[0]*k0, c(S[0])[1] - up[1]*k0], up, second: c(S[Math.min(1, n - 1)]),
    top: [c(S[n - 1])[0] + out[0]*k1, c(S[n - 1])[1] + out[1]*k1], out, prev: c(S[Math.max(0, n - 2)])};
}
// Enlaces de esta planta: dónde aparece el botón (at), a qué planta va, hacia dónde queda la espalda a la escalera
// (away), el escalón al que se sube o baja al salir (step2) y el sentido (lift). Si el inicio del recorrido de la
// planta está junto al desembarco, ese es el punto (el plano dice dónde se llega).
const STAIR_LINKS = (() => {
  const W = PLANTA.walk, L = [], near = p => W && Math.hypot(W.from[0] - p[0], W.from[1] - p[1]) < 2500 ? W.from : p;
  if (ABOVE) STAIRS.forEach(st => { const e = stairEnds(st); L.push({dir: 'subir', level: ABOVE, at: near(e.foot), away: [-e.up[0], -e.up[1]], step2: e.second, lift: 1, rise: st.rise || .18}); });
  if (BELOW) (BELOW.stairs || []).forEach(st => { const e = stairEnds(st); L.push({dir: 'bajar', level: BELOW, at: near(e.top), away: e.out, step2: e.prev, lift: -1, rise: st.rise || .18}); });
  return L;
})();
const linkLabel = l => {
  const n = l.level.name, es = /^planta\b/i.test(n) ? 'la ' + n.toLowerCase() : n;
  return l.dir === 'subir' ? tr(`上楼：${n}`, `Up to ${n}`, `Subir a ${es}`) : tr(`下楼：${n}`, `Down to ${n}`, `Bajar a ${es}`);
};
// Hacia dónde mirar al llegar a p (mm) dando la espalda a la escalera (away): a donde mira el inicio del recorrido
// de la planta si estamos ahí o se ve desde aquí; si no, la dirección más despejada
function lookFrom(p, away){
  const W = PLANTA.walk, dot = (a, b) => a[0]*b[0] + a[1]*b[1], unit = v => { const L = Math.hypot(v[0], v[1]) || 1; return [v[0]/L, v[1]/L]; };
  if (W && dot(unit([W.to[0] - p[0], W.to[1] - p[1]]), away) > -.3 && (Math.hypot(W.from[0] - p[0], W.from[1] - p[1]) < 2500 || clearPath(p, W.to))) return W.to;
  let best = away, bestN = -1;
  for (let k = 0; k < 16; k++){
    const a = k*Math.PI/8, d = [Math.cos(a), Math.sin(a)];
    if (dot(d, away) < -.3) continue;   // no de frente a la escalera
    let n = 0; while (n < 24 && !blocked(wx(p[0] + d[0]*(n + 1)*250), wz(p[1] + d[1]*(n + 1)*250), .05)) n++;
    if (n + dot(d, away)*.5 > bestN){ bestN = n + dot(d, away)*.5; best = d; }
  }
  return [p[0] + best[0]*3000, p[1] + best[1]*3000];
}
let nearLink = null, climbing = null;
// Cerca del pie o del desembarco aparece el botón para cambiar de planta (no durante la visita ni el video)
function stairTick(){
  const b = $('#whStair'); if (!b) return;
  const busy = climbing || glide || rec || (tour && !tour.paused && tour.phase !== 'end'), here = planXY(camera.position);
  const l = busy ? null : STAIR_LINKS.find(k => Math.hypot(here[0] - k.at[0], here[1] - k.at[1]) < 2000) || null;
  if (l === nearLink) return;
  nearLink = l; b.hidden = !l;
  if (l){ b.innerHTML = `${ICON.stairs} ${esc(linkLabel(l))}`; $('#hint3d').classList.add('gone'); }
}
const lookQ = (from, to) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(from, to, camera.up));
const navigate = url => { if (HOST?.navigate) HOST.navigate(url); else location.href = url; };
// Sube (o baja) los primeros escalones mientras se oscurece y abre la otra planta ya en el recorrido.
// fromTour: la visita guiada sigue en la otra planta (?visita=1)
function climb(l, fromTour = false){
  if (climbing || opt.mode !== 'walk') return;
  climbing = l; recStop(); bigMap(false); $('#whPop').hidden = true;
  if (fromTour && tour){ tour.phase = 'climb'; tourCard(); } else tourEnd();
  const a = camera.position.clone(), b = new THREE.Vector3(wx(l.step2[0]), eyeH() + l.lift*l.rise*2, wz(l.step2[1]));
  glide = {t0: performance.now(), dur: 1000, a, b, q0: camera.quaternion.clone(), q1: lookQ(a, new THREE.Vector3(b.x, b.y + l.lift*.4, b.z)), fade: false};
  stairTick();
  const u = new URL(location.href);
  u.searchParams.set('planta', l.level.id); u.searchParams.set('vista', '3d'); u.searchParams.set('recorrido', l.dir);
  if (fromTour) u.searchParams.set('visita', '1'); else u.searchParams.delete('visita');
  setTimeout(() => $('#whFade').classList.add('on'), 380);
  setTimeout(() => navigate(u.toString()), 760);
  setTimeout(() => { if (climbing === l){ climbing = null; $('#whFade').classList.remove('on'); } }, 6000);   // no se pudo cambiar de página
}
// Llegó por la escalera (?recorrido=subir|bajar): sin la animación de entrada, directo al recorrido subiendo el
// último escalón (o bajando el primero) mientras se aclara. Con ?visita=1 la visita guiada sigue desde aquí.
function arriveByStairs(){
  const Q = new URLSearchParams(location.search), dir = Q.get('recorrido');
  const l = dir && STAIR_LINKS.find(k => k.dir === (dir === 'subir' ? 'bajar' : 'subir'));
  if (!l) return false;
  grow = furnGrow = 1; applyGrow(); startLoop(); renderer.render(scene, camera); stage.classList.add('is3d');
  setMode('walk', true); startTouchWalk();
  const to = lookFrom(l.at, l.away), a = new THREE.Vector3(wx(l.step2[0]), eyeH() + l.lift*l.rise*2, wz(l.step2[1])), b = new THREE.Vector3(wx(l.at[0]), eyeH(), wz(l.at[1]));
  camera.position.copy(a); camera.quaternion.copy(lookQ(a, new THREE.Vector3(b.x, b.y - l.lift*.25, b.z)));
  glide = {t0: performance.now(), dur: 1200, a, b, q0: camera.quaternion.clone(), q1: lookQ(b, new THREE.Vector3(wx(to[0]), 1.45, wz(to[1]))), fade: false};
  setTimeout(() => document.documentElement.classList.add('arrived'), 40);   // un instante después, para que la transición corra
  setTimeout(() => document.documentElement.classList.remove('arriving', 'arrived'), 900);
  Q.delete('recorrido'); const cont = Q.has('visita'); Q.delete('visita');   // recargar no vuelve a «llegar»
  history.replaceState(null, '', location.pathname + (Q.size ? '?' + Q : ''));
  if (cont) startTour({here: l.at, cont: l.dir === 'bajar'});
  return true;
}
// «Volver a ver» cuando la visita vino subiendo de la planta de abajo: vuelve a empezar desde la entrada
function tourAgain(){
  const first = CASA.levels[0];
  if (!tour?.cont || first.id === PLANTA.id) return startTour();
  const u = new URL(location.href);
  u.searchParams.set('planta', first.id); u.searchParams.set('vista', '3d'); u.searchParams.set('visita', '1'); u.searchParams.delete('recorrido');
  $('#whFade').classList.add('on');
  setTimeout(() => navigate(u.toString()), 300);
}

/* ---------- Video de la visita guiada: la visita grabada en vertical (9:16) con el nombre de cada parada y la marca ---------- */
// Cada cuadro del 3D (dibujado a 720×1280) se copia a un lienzo con los letreros, y ese lienzo se graba con
// MediaRecorder (MP4 en iPhone y Chrome; WebM si no hay MP4). Mientras se graba, en pantalla se ve el video tal cual.
const REC_W = 720, REC_H = 1280, REC_FONT = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, sans-serif';
let rec = null;
const recType = () => ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']
  .find(t => window.MediaRecorder?.isTypeSupported?.(t)) || '';
const canRecord = () => !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream && recType());
const recAllowed = () => (!HOST || HOST.editable) && canRecord();   // la planner (o la demostración), no el enlace del cliente

function recAsk(on){
  const a = $('#recAsk'); if (!a) return;
  a.hidden = !on;
  if (on){ $('#whPop').hidden = true; bigMap(false); syncWalkHud(); }
}
function startRecording(){
  recAsk(false);
  if (!canRecord()) return toast(tr('此浏览器无法录制视频', 'This browser cannot record video', 'Este navegador no puede grabar video'));
  startTour();
  if (!tour) return;
  const cv = document.createElement('canvas'); cv.id = 'recView'; cv.width = REC_W; cv.height = REC_H;
  $('#view3d').appendChild(cv);
  const type = recType(), chunks = [], mr = new MediaRecorder(cv.captureStream(30), {mimeType: type, videoBitsPerSecond: 3_500_000});
  const r = rec = {cv, g: cv.getContext('2d'), type, mr, t0: performance.now(), last: performance.now(), outro: 0,
    ratio: renderer.getPixelRatio(), cap: '', capA: 0, logo: null, secs: -1};
  if (HOST?.brand?.logo){ const im = new Image(); im.onload = () => { r.logo = im; }; im.src = HOST.brand.logo; }
  mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  mr.onstop = () => recResult(new Blob(chunks, {type: type.split(';')[0]}), type);
  $('#view3d').classList.add('recording'); $('#recBadge').hidden = false;
  renderer.domElement.style.visibility = 'hidden';   // en pantalla se ve el lienzo del video
  renderer.setPixelRatio(1); recLayout();
  mr.start(1000);
}
// El 3D se dibuja a 720×1280 y el lienzo del video se acomoda en la vista, dejando lugar a la tarjeta de la visita
function recLayout(){
  renderer.setSize(REC_W, REC_H, false); camera.aspect = REC_W/REC_H; walkFov(true);
  const v = $('#view3d'), avail = v.clientHeight - 96, h = Math.min(avail - 16, (v.clientWidth - 24)*16/9), w = h*9/16;
  const left = (v.clientWidth - w)/2, top = Math.max(8, (avail - h)/2);
  Object.assign(rec.cv.style, {width: w + 'px', height: h + 'px', left: left + 'px', top: top + 'px'});
  Object.assign($('#recBadge').style, {top: top + 10 + 'px', right: v.clientWidth - left - w + 10 + 'px'});   // esquina del video, sin tapar la marca
}
function recStop(){
  const r = rec; if (!r) return;
  rec = null;
  if (r.mr.state !== 'inactive') r.mr.stop();
  r.cv.remove(); $('#view3d').classList.remove('recording'); $('#recBadge').hidden = true;
  renderer.domElement.style.visibility = '';
  renderer.setPixelRatio(r.ratio); renderer.setSize(SW(), SH()); camera.aspect = SW()/SH(); walkFov();
}
function wrapText(g, text, maxW){
  const out = []; let line = '';
  for (const w of String(text).split(' ')){ const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line){ out.push(line); line = w; } else line = t; }
  if (line) out.push(line);
  return out;
}
function centerText(g, lines, y, size, weight, alpha){
  g.globalAlpha = alpha; g.font = `${weight} ${size}px ${REC_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
  lines.forEach((l, i) => g.fillText(l, REC_W/2, y + i*size*1.18));
  g.globalAlpha = 1;
  return y + lines.length*size*1.18;
}
// Un cuadro del video: el 3D, la marca arriba, el nombre de la parada abajo, la portada al inicio y el cierre al final
function recFrame(now){
  const r = rec, g = r.g, W = REC_W, H = REC_H, dt = Math.min(.1, (now - r.last)/1000), brand = HOST?.brand?.name || '';
  r.last = now;
  g.drawImage(renderer.domElement, 0, 0, W, H);
  g.textAlign = 'left'; g.textBaseline = 'middle';
  let grd = g.createLinearGradient(0, 0, 0, 190); grd.addColorStop(0, 'rgba(0,0,0,.5)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, W, 190);
  let x = 40;
  if (brand){
    if (r.logo){ g.save(); g.beginPath(); g.roundRect(40, 40, 68, 68, 14); g.clip(); g.fillStyle = '#fff'; g.fillRect(40, 40, 68, 68);
      const k = Math.min(60/r.logo.width, 60/r.logo.height); g.drawImage(r.logo, 74 - r.logo.width*k/2, 74 - r.logo.height*k/2, r.logo.width*k, r.logo.height*k); g.restore(); }
    else { g.fillStyle = HOST.brand.color || '#b5653a'; g.beginPath(); g.roundRect(40, 40, 68, 68, 14); g.fill();
      g.fillStyle = '#fff'; g.font = `700 36px ${REC_FONT}`; g.textAlign = 'center'; g.fillText(brand.trim().charAt(0).toUpperCase(), 74, 76); g.textAlign = 'left'; }
    x = 126;
  }
  g.fillStyle = '#fff'; g.font = `700 30px ${REC_FONT}`; g.fillText((brand || CASA.title).slice(0, 34), x, 74);
  // nombre de la parada al llegar (aparece y se va suave)
  const here = tour && ['turn', 'hold'].includes(tour.phase) ? tour.stops[tour.i]?.name || '' : '';
  if (here) r.cap = here;
  r.capA += ((here ? 1 : 0) - r.capA)*Math.min(1, dt*5);
  if (r.cap && r.capA > .02 && now - r.t0 > 2600){
    grd = g.createLinearGradient(0, H - 330, 0, H); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, `rgba(0,0,0,${.62*r.capA})`);
    g.fillStyle = grd; g.fillRect(0, H - 330, W, 330);
    g.font = `700 54px ${REC_FONT}`;
    const lines = wrapText(g, r.cap, W - 100).slice(0, 2);
    centerText(g, lines, H - 150 - (lines.length - 1)*64, 54, 700, r.capA);
    centerText(g, [CASA.title.slice(0, 40)], H - 82, 28, 400, .85*r.capA);
  }
  // portada: los primeros segundos
  const t = (now - r.t0)/1000;
  if (t < 3){
    const a = 1 - clamp01((t - 2.2)/.8);
    g.fillStyle = `rgba(20,18,16,${.5*a})`; g.fillRect(0, 0, W, H);
    g.font = `700 66px ${REC_FONT}`;
    let y = centerText(g, wrapText(g, CASA.title, W - 120).slice(0, 3), H*.4, 66, 700, a);
    y = centerText(g, [tr('3D 导览', 'Guided 3D tour', 'Visita guiada en 3D')], y + 30, 34, 400, a);
    if (brand) centerText(g, [tr(`设计：${brand}`, `Design by ${brand}`, `Diseño de ${brand}`)], y + 10, 30, 600, a);
  }
  // cierre: al terminar la visita, unos segundos con el título y el contacto; luego se entrega el video
  if (!r.outro && tour?.phase === 'end') r.outro = now;
  if (r.outro){
    const a = clamp01((now - r.outro)/600), wa = HOST?.brand?.whatsapp;
    g.fillStyle = `rgba(20,18,16,${.65*a})`; g.fillRect(0, 0, W, H);
    g.font = `700 60px ${REC_FONT}`;
    let y = centerText(g, wrapText(g, CASA.title, W - 120).slice(0, 3), H*.4, 60, 700, a);
    if (brand) y = centerText(g, [tr(`设计：${brand}`, `Design by ${brand}`, `Diseño de ${brand}`)], y + 30, 34, 600, a);
    if (wa) centerText(g, [`WhatsApp ${wa.replace(/^52(\d{10})$/, '$1').replace(/(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3')}`], y + 16, 30, 400, a);
    if (now - r.outro > 2800) recStop();
  }
  const secs = Math.floor(t);
  if (secs !== r.secs){ r.secs = secs; $('#recBadge').textContent = `● ${Math.floor(secs/60)}:${String(secs % 60).padStart(2, '0')}`; }
}
// El video listo: verlo, compartirlo (WhatsApp, Instagram, guardar en Fotos) o descargarlo
function recResult(blob, type){
  const ext = type.includes('mp4') ? 'mp4' : 'webm', name = `${CASA.title} - visita guiada.${ext}`.replace(/[\\/:*?"<>|]/g, '');
  const url = URL.createObjectURL(blob), file = new File([blob], name, {type: blob.type});
  let share = false;
  try { share = !!navigator.canShare?.({files: [file]}); } catch(e){}
  const el = document.createElement('div');
  el.id = 'recDone';
  el.innerHTML = `<div class="card"><h3>${esc(tr('视频已就绪', 'Your video is ready', 'Tu video está listo'))}</h3>
    <video src="${url}" controls playsinline muted></video>
    <p class="muted">${(blob.size/1048576).toFixed(1)} MB · ${ext.toUpperCase()}</p>
    <div class="row">${share ? `<button class="btn primary" data-r="share">${esc(tr('分享', 'Share', 'Compartir'))}</button>` : ''}
      <a class="btn" href="${url}" download="${esc(name)}">${esc(tr('下载', 'Download', 'Descargar'))}</a></div>
    <div class="row"><button class="btn" data-r="close">${esc(tr('关闭', 'Close', 'Cerrar'))}</button></div></div>`;
  document.body.appendChild(el);
  el.onclick = e => {
    const a = e.target.closest('[data-r]')?.dataset.r;
    if (a === 'share') navigator.share({files: [file], title: CASA.title}).catch(() => {});
    if (a === 'close' || e.target === el){ URL.revokeObjectURL(url); el.remove(); }
  };
}""",
)
sub(
    "  if (opt.mode === 'walk' && e.code === 'KeyE'){ const h = pick(); if (h?.door && h.dist < 2.5) h.door.open = !h.door.open; }\n});",
    "  if (opt.mode === 'walk' && e.code === 'KeyE'){ const h = pick(); if (h?.door && h.dist < 2.5) h.door.open = !h.door.open; }\n"
    "  if (opt.mode === 'walk' && /^Digit[123]$/.test(e.code)) setSpeed(+e.code[5]);\n"
    "  if (opt.mode === 'walk' && e.code === 'KeyC') setSit(!walk.sit);\n"
    "  if (bigOpen && e.code === 'Escape') bigMap(false);\n"
    "  if (tour && e.code === 'Space'){ e.preventDefault(); tour.phase === 'end' ? tourAgain() : tour.paused ? tourResume() : tourPause(); }\n});",
)
sub(
    """    : [tr('点击开始，从入户门进入', 'Click to start at the front door'),
       tr('<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> 移动 · 鼠标转向 · <kbd>Shift</kbd> 快走', '<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> move · mouse looks · <kbd>Shift</kbd> runs'),
       tr('<kbd>E</kbd> 开关正前方的门 · <kbd>Esc</kbd> 暂停', '<kbd>E</kbd> opens the door ahead · <kbd>Esc</kbd> pauses')];
  t.forEach((h, i) => $('#wo' + (i + 1)).innerHTML = h);
  syncHint3d();""",
    """    : [tr('点击开始，从入户门进入', 'Click to start at the front door'),
       tr('<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> 移动 · 鼠标转向 · <kbd>Shift</kbd> 快走', '<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> move · mouse looks · <kbd>Shift</kbd> runs'),
       tr('<kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> 速度 · <kbd>C</kbd> 坐下 · 双击走过去 · <kbd>E</kbd> 开关门 · <kbd>Esc</kbd> 暂停',
          '<kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> speed · <kbd>C</kbd> sits · double-click to go there · <kbd>E</kbd> doors · <kbd>Esc</kbd> pauses',
          '<kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> velocidad · <kbd>C</kbd> sentarte · doble clic para ir · <kbd>E</kbd> puertas · <kbd>Esc</kbd> pausa')];
  t.forEach((h, i) => $('#wo' + (i + 1)).innerHTML = h);
  renderWalkHud();
  syncHint3d();""",
)
sub(
    "       tr('点门开关 · 点「退出漫游」回到鸟瞰', 'Tap doors to open · \"Exit walk\" returns to orbit')]",
    "       tr('双击地面走过去 · 点门开关', 'Double-tap the floor to go there · tap doors to open',\n"
    "          'Toca dos veces el piso para ir ahí · toca las puertas para abrirlas')]",
)
sub("  bindJoystick();\n", "  bindJoystick(); bindWalkHud();\n")
sub(
    "  $('#walkOverlay').onclick = () => COARSE ? startTouchWalk() : walkCtl.lock();",
    "  $('#walkOverlay').onclick = () => COARSE || !document.body.requestPointerLock ? startTouchWalk() : walkCtl.lock();",
)
sub(
    "    renderer.setSize(SW(), SH()); labelRenderer.setSize(SW(), SH());\n    camera.aspect = SW()/SH(); camera.updateProjectionMatrix();\n  }).observe(stage);",
    "    if (rec) return recLayout();   // grabando: el 3D sigue a 720×1280\n"
    "    renderer.setSize(SW(), SH()); labelRenderer.setSize(SW(), SH());\n    camera.aspect = SW()/SH(); walkFov();\n  }).observe(stage);",
)
sub("  renderer.render(scene, camera);\n  labelRenderer.render(scene, camera);\n}", "  renderer.render(scene, camera);\n  if (rec) recFrame(now);\n  labelRenderer.render(scene, camera);\n}")


# ---------------------------------------------------------------------------
# Indicaciones claras (13 de octubre): la píldora del 3D se ve unos segundos con un icono por gesto y
# se oculta sola; la barra del mueble seleccionado agrupa sus botones con icono y texto.

GESTO = {   # iconos de gesto (trazo del color del texto)
    "dedo": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V5a2 2 0 1 1 4 0v6"/><path d="M13 10a2 2 0 1 1 4 0v2a2 2 0 1 1 4 0v3a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L5 14a1.8 1.8 0 0 1 3-2l1 1.5"/></svg>',
    "pellizco": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V5.5a2 2 0 1 1 4 0V12"/><path d="M12 12V7.5a2 2 0 1 1 4 0V13"/><path d="M8 13a2 2 0 0 0-3.4 2L7 19a5 5 0 0 0 4.5 3h1.5a5 5 0 0 0 5-5v-4"/><path d="M3 3l3 3M3 6V3h3M21 3l-3 3m3-3v3h-3"/></svg>',
    "arrastre": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12V5a2 2 0 1 1 4 0v7"/><path d="M14 11a2 2 0 1 1 4 0v4a6 6 0 0 1-6 6h-1a5 5 0 0 1-4.2-2.3L4 15a1.8 1.8 0 0 1 2.9-2l1.5 1.7"/><path d="M3 8h4M5 6l2 2-2 2"/><path d="M21 8h-1"/></svg>',
    "mouse": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 3v6M9 9h6"/></svg>',
    "rueda": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="18" rx="5"/><rect x="11" y="6" width="2" height="4" rx="1" fill="currentColor"/><path d="M3 9l-1 3 1 3M21 9l1 3-1 3"/></svg>',
}
ACCION = {   # iconos de la barra del mueble seleccionado
    "rotL": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a8 8 0 1 1 2.3 7.7"/><path d="M4 4v6h6"/></svg>',
    "rotR": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10a8 8 0 1 0-2.3 7.7"/><path d="M20 4v6h-6"/></svg>',
    "dup": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
    "prop": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.5"/><circle cx="9" cy="17" r="2.5"/></svg>',
    "del": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    "ok": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
}

# La píldora del 3D: un icono por gesto y texto corto; se oculta a los 6 s y vuelve con el botón de la guía.
sub(
    "const HINT_ORBIT = () => COARSE ? tr('单指旋转 · 双指缩放 / 平移 · 点选家具后可拖动摆放 · 点门开关', '1 finger orbits · 2 fingers zoom / pan · select furniture to drag it · tap doors to open')\n"
    "  : tr('左键旋转 · 右键平移 · 滚轮缩放 · 选中家具后拖动可摆放 · 点击门开关', 'Left-drag orbits · right-drag pans · scroll zooms · select furniture to drag it · click doors to open');",
    "const GESTO = " + json.dumps(GESTO) + ";\n"
    "const chip = (icon, text) => `<span class=\"hc\">${GESTO[icon]}<span>${text}</span></span>`;\n"
    "const HINT_ORBIT = () => COARSE\n"
    "  ? chip('dedo', tr('单指旋转', '1 finger turns', '1 dedo gira')) + chip('pellizco', tr('双指缩放 / 平移', '2 fingers zoom or pan', '2 dedos acercan o mueven')) + chip('arrastre', tr('拖动家具摆放', 'drag furniture to place it', 'arrastra una mesa para moverla'))\n"
    "  : chip('mouse', tr('左键旋转', 'drag to turn', 'arrastra para girar')) + chip('rueda', tr('滚轮缩放', 'scroll to zoom', 'rueda para acercar')) + chip('arrastre', tr('拖动家具摆放', 'drag furniture to place it', 'arrastra una mesa para moverla'));",
)
sub(
    "function syncHint3d(){ $('#hint3d').textContent = opt.mode === 'orbit' ? HINT_ORBIT() : touchWalk || COARSE ? HINT_TOUCHWALK() : HINT_WALK(); }",
    "function syncHint3d(){ $('#hint3d').innerHTML = opt.mode === 'orbit' ? HINT_ORBIT() : esc(touchWalk || COARSE ? HINT_TOUCHWALK() : HINT_WALK()); }",
)
sub(
    "  if (opt.mode === 'walk'){ walkHud(false); freeMouse(); stopTouchWalk(); $('#hint3d').textContent = HINT_ORBIT();",
    "  if (opt.mode === 'walk'){ walkHud(false); freeMouse(); stopTouchWalk(); $('#hint3d').innerHTML = HINT_ORBIT();",
)
# Se oculta sola en cualquier modo (antes solo en el recorrido) y aparece al entrar al 3D
sub(
    "  flashHint.t = setTimeout(() => { if (opt.mode === 'walk') h.classList.add('gone'); }, 6000);",
    "  flashHint.t = setTimeout(() => h.classList.add('gone'), 6000);",
)
sub(
    "  if (m === '3d'){ if (ui.tool !== 'select') setTool('select'); ui.mA = null; document.body.classList.add('m3d'); await window.View3D.enter(); }",
    "  if (m === '3d'){ if (ui.tool !== 'select') setTool('select'); ui.mA = null; document.body.classList.add('m3d'); await window.View3D.enter(); window.View3D.flashHint?.(); }",
)
sub("window.View3D = {", "window.View3D = {\n  flashHint,")
sub(
    "#hint3d{position:absolute;left:50%;top:12px;transform:translateX(-50%);background:rgba(43,40,36,.82);color:#fff;border-radius:20px;\n"
    "  padding:5px 14px;font-size:12px;z-index:2;pointer-events:none;white-space:nowrap;transition:opacity .4s}",
    "#hint3d{position:absolute;left:50%;top:12px;transform:translateX(-50%);background:rgba(43,40,36,.88);color:#fff;border-radius:20px;\n"
    "  padding:8px 16px;font-size:13px;z-index:2;pointer-events:none;white-space:nowrap;transition:opacity .4s;display:flex;align-items:center;gap:16px}\n"
    "#hint3d .hc{display:inline-flex;align-items:center;gap:7px;white-space:nowrap}\n"
    "#hint3d .hc svg{width:24px;height:24px;flex-shrink:0}",
)
sub(
    "  #hint3d{white-space:normal;width:max-content;max-width:calc(100% - 24px);text-align:center;line-height:1.35;top:8px;padding:5px 12px}",
    "  #hint3d{flex-direction:column;align-items:flex-start;gap:6px;width:max-content;max-width:calc(100% - 24px);top:8px;padding:10px 14px}",
)

# Barra del mueble seleccionado: nombre y «Listo» arriba; abajo, botones con icono y texto en grupos
# (girar · duplicar y propiedades · eliminar).
sub(
    """  fab.innerHTML = f
    ? `<span class="name">${esc(nm(f.name))}</span><button class="btn" data-a="rotL">↺</button><button class="btn" data-a="rotR">↻ ${tr('旋转','Rotate')}</button>
       <button class="btn" data-a="dup">${tr('复制','Duplicate')}</button><button class="btn danger" data-a="del">${tr('删除','Delete')}</button><span class="sep"></span>
       <button class="btn narrow-only" data-a="prop">${tr('属性','Properties')}</button><button class="btn" data-a="done">${tr('完成','Done')}</button>`
    : `<span class="name">${esc(nm(state.rooms[r.id].name))}</span><button class="btn narrow-only" data-a="prop">${tr('地面 / 属性','Floor / Properties')}</button><button class="btn" data-a="done">${tr('完成','Done')}</button>`;""",
    """  const ACCION = """ + json.dumps(ACCION) + """;
  const ib = (a, label, cls = '') => `<button class="ib ${cls}" data-a="${a}">${ACCION[a]}<span>${label}</span></button>`;
  const head = name => `<div class="fabHead"><span class="name">${esc(name)}</span><button class="btn primary" data-a="done">${ACCION.ok} ${tr('完成','Done')}</button></div>`;
  fab.innerHTML = f
    ? `${head(nm(f.name))}<div class="fabRow">${ib('rotL', tr('左转', 'Turn left', 'Girar izq.'))}${ib('rotR', tr('右转', 'Turn right', 'Girar der.'))}<span class="sep"></span>
       ${ib('dup', tr('复制','Duplicate'))}${ib('prop', tr('属性','Properties'), 'narrow-only')}<span class="sep"></span>${ib('del', tr('删除','Delete'), 'danger')}</div>`
    : `${head(nm(state.rooms[r.id].name))}<div class="fabRow">${ib('prop', tr('地面 / 属性','Floor / Properties'), 'narrow-only')}</div>`;""",
)
sub(
    "#fab{position:absolute;left:50%;bottom:16px;transform:translate(-50%,12px);display:flex;align-items:center;gap:4px;padding:5px;",
    "#fab{position:absolute;left:50%;bottom:16px;transform:translate(-50%,12px);display:flex;flex-direction:column;align-items:stretch;gap:4px;padding:10px 12px;",
)
sub(
    "#fab .name{padding:0 8px 0 6px;font-weight:600;max-width:9em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n"
    "#fab .btn{border:1px solid transparent}\n"
    "#fab .sep{width:1px;align-self:stretch;margin:4px 2px;background:var(--line)}",
    "#fab .fabHead{display:flex;align-items:center;justify-content:space-between;gap:12px}\n"
    "#fab .name{font-weight:700;font-size:15px;max-width:14em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n"
    "#fab .fabHead .btn{display:inline-flex;align-items:center;gap:4px;min-height:36px;padding:0 12px;border-radius:10px;font-weight:600}\n"
    "#fab .fabHead .btn svg{width:18px;height:18px}\n"
    "#fab .fabRow{display:flex;align-items:stretch;justify-content:center;gap:2px}\n"
    "#fab .ib{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-width:64px;padding:8px 6px;border:0;border-radius:12px;\n"
    "  background:transparent;color:var(--ink);font:500 12px/1 inherit;cursor:pointer;white-space:nowrap}\n"
    "#fab .ib svg{width:26px;height:26px}\n"
    "#fab .ib:hover{background:var(--bg)}#fab .ib:active{background:var(--line)}\n"
    "#fab .ib.danger{color:#b3372a}\n"
    "#fab .ib.narrow-only{display:none}\n"
    "#fab .sep{width:1px;align-self:stretch;margin:6px 4px;background:var(--line)}",
)
sub(
    "  #fab{flex-wrap:wrap;justify-content:center;width:max-content;max-width:calc(100vw - 20px);row-gap:2px}\n"
    "  #fab .name{flex-basis:100%;max-width:none;text-align:center;padding:2px 8px 0}\n"
    "  #fab .sep{display:none}\n"
    "  #fab .btn{padding:8px 10px}",
    "  #fab{width:max-content;max-width:calc(100vw - 16px);bottom:10px}\n"
    "  #fab .fabRow{gap:0}\n"
    "  #fab .ib{min-width:58px;padding:8px 4px;font-size:11px}\n"
    "  #fab .ib.narrow-only{display:flex!important}\n"
    "  #fab .sep{margin:6px 1px}",
)
sub("  .btn.narrow-only,#fab .btn.narrow-only{display:inline-block!important}", "  .btn.narrow-only{display:inline-block!important}")



# ---------------------------------------------------------------------------
# Recorrido más claro (13 de octubre): la ventana de instrucciones tiene una X, en el celular solo sale la
# primera vez (después el recorrido arranca directo); la píldora del recorrido lleva iconos; y los cajones
# de Catálogo y Propiedades tienen un botón para volver a la vista.

GESTO.update({
    "control": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>',
    "mirar": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    "dostoques": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13V6a2 2 0 1 1 4 0v7"/><path d="M14 12a2 2 0 1 1 4 0v3a6 6 0 0 1-6 6h-1a5 5 0 0 1-4.2-2.3L4 15.5a1.8 1.8 0 0 1 2.9-2l1.5 1.7"/><path d="M8 4.5a4.5 4.5 0 0 1 8 0"/><path d="M6 2.5a7 7 0 0 1 12 0"/></svg>',
    "teclado": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h2M11 10h2M16 10h2M6 14h12"/></svg>',
    "tecla": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="3"/><path d="M9 9h6M9 15h6M9 9v6"/></svg>',
})
sub(
    "const GESTO = " + json.dumps({k: v for k, v in GESTO.items() if k in ("dedo", "pellizco", "arrastre", "mouse", "rueda")}) + ";",
    "const GESTO = " + json.dumps(GESTO) + ";",
)
# Píldora del recorrido: versión con iconos para la píldora; el texto plano sigue en el pie
sub(
    "function syncHint3d(){ $('#hint3d').innerHTML = opt.mode === 'orbit' ? HINT_ORBIT() : esc(touchWalk || COARSE ? HINT_TOUCHWALK() : HINT_WALK()); }",
    "const HINT_TOUCHWALK_HTML = () => chip('control', tr('摇杆移动', 'joystick moves you', 'El control te mueve')) + chip('mirar', tr('拖动转向', 'drag to look', 'Arrastra para mirar')) + chip('dostoques', tr('双击地面走过去', 'double-tap the floor to go there', '2 toques en el piso: ir ahí'));\n"
    "const HINT_WALK_HTML = () => chip('teclado', tr('WASD 移动', 'WASD to move', 'W A S D para moverte')) + chip('mouse', tr('鼠标转向', 'mouse looks', 'Mueve el mouse para mirar')) + chip('dostoques', tr('双击走过去', 'double-click to go there', 'Doble clic: ir ahí')) + chip('tecla', tr('Esc 暂停', 'Esc pauses', 'Esc: pausa'));\n"
    "function syncHint3d(){ $('#hint3d').innerHTML = opt.mode === 'orbit' ? HINT_ORBIT() : touchWalk || COARSE ? HINT_TOUCHWALK_HTML() : HINT_WALK_HTML(); }",
)
# Ventana del recorrido: X para cerrar (vuelve a la vista 3D) y, en el celular, solo la primera vez
sub(
    '      <div id="walkOverlay"><div><h3 data-en="Walk mode">漫游模式</h3>',
    '      <div id="walkOverlay"><div><button type="button" id="woClose" aria-label="Cerrar">×</button><h3 data-en="Walk mode">漫游模式</h3>',
)
sub(
    "#walkOverlay>div{background:var(--panel);border-radius:14px;padding:22px 28px;text-align:center;max-width:360px}",
    "#walkOverlay>div{position:relative;background:var(--panel);border-radius:14px;padding:22px 28px;text-align:center;max-width:360px;cursor:default}\n"
    "#woClose{position:absolute;top:6px;right:6px;width:36px;height:36px;border:0;border-radius:50%;background:transparent;color:var(--ink);font-size:24px;line-height:1;cursor:pointer}\n"
    "#woClose:hover{background:var(--bg)}",
)
sub(
    "  $('#walkOverlay').onclick = () => COARSE || !document.body.requestPointerLock ? startTouchWalk() : walkCtl.lock();",
    "  $('#walkOverlay').onclick = () => COARSE || !document.body.requestPointerLock ? startTouchWalk() : walkCtl.lock();\n"
    "  // La X cierra la ventana y regresa a la vista 3D normal.\n"
    "  $('#woClose').onclick = e => { e.stopPropagation(); setMode('orbit'); };\n"
    "  // En el celular las instrucciones solo salen la primera vez; después el recorrido arranca directo.\n"
    "  $('#walkOverlay').addEventListener('click', () => { try { localStorage.setItem('plantea-recorrido-v1', '1'); } catch(e) {} }, true);",
)
sub(
    "    $('#walkOverlay').style.display = 'flex';\n    walkHud(true); syncHint3d();\n  } else {",
    "    let visto = false; try { visto = localStorage.getItem('plantea-recorrido-v1') === '1'; } catch(e) {}\n"
    "    $('#walkOverlay').style.display = 'flex';\n    walkHud(true); syncHint3d();\n"
    "    if (visto && (COARSE || !document.body.requestPointerLock)) startTouchWalk();\n  } else {",
)
# Cajones del celular: botón para volver a la vista
sub(
    '  <aside class="lib">\n',
    '  <aside class="lib">\n    <button type="button" class="btn drawerBack narrow-only" data-back>← Volver a la vista</button>\n',
)
sub(
    '  <aside class="right"><div id="panel"></div></aside>',
    '  <aside class="right"><button type="button" class="btn drawerBack narrow-only" data-back>← Volver a la vista</button><div id="panel"></div></aside>',
)
sub(
    "  aside.open{transform:none;box-shadow:0 0 30px rgba(40,30,20,.18)}",
    "  aside.open{transform:none;box-shadow:0 0 30px rgba(40,30,20,.18)}\n"
    "  .drawerBack{display:flex!important;position:sticky;top:0;z-index:2;width:100%;min-height:44px;align-items:center;justify-content:flex-start;gap:6px;\n"
    "    padding:0 14px;border-radius:0;border-bottom:1px solid var(--line);background:var(--panel);font-weight:600}",
)
sub(
    "$('#tgLib').onclick = () => drawer('lib');",
    "$('#tgLib').onclick = () => drawer('lib');\ndocument.querySelectorAll('aside [data-back]').forEach(b => b.onclick = () => drawer(null));",
)

# Confirmaciones con la ventana de Plantea (src/designer/dialogo.js) en lugar de confirm() del navegador.
sub("function clearLayout(){", "async function clearLayout(){")
sub("  if (!confirm(tr(`确定清空全部 ${n} 件家具 / 家电吗？", "  if (!(await window.plConfirm(tr(`确定清空全部 ${n} 件家具 / 家电吗？")
sub("Los muros, pisos y medidas se conservan. Puedes deshacerlo.`))) return;", "Los muros, pisos y medidas se conservan. Puedes deshacerlo.`)))) return;")
sub("$('#reset').onclick = () => { if (confirm(tr('恢复为默认设计方案？（可撤销）', 'Reset to the default design? (undoable)'))){",
    "$('#reset').onclick = async () => { if (await window.plConfirm(tr('恢复为默认设计方案？（可撤销）', 'Reset to the default design? (undoable)'))){")

# Computadora: encabezado de cada panel con su nombre y una X roja para cerrarlo (además del botón de arriba).
sub(
    '  <aside class="lib">\n    <button type="button" class="btn drawerBack narrow-only" data-back>← Volver a la vista</button>\n',
    '  <aside class="lib">\n    <button type="button" class="btn drawerBack narrow-only" data-back>← Volver a la vista</button>\n'
    '    <div class="paneHead wide-only"><b>Catálogo</b><button type="button" class="paneClose" data-close="lib" title="Cerrar catálogo" aria-label="Cerrar catálogo">×</button></div>\n',
)
sub(
    '<aside class="right"><button type="button" class="btn drawerBack narrow-only" data-back>← Volver a la vista</button>',
    '<aside class="right"><button type="button" class="btn drawerBack narrow-only" data-back>← Volver a la vista</button>'
    '<div class="paneHead wide-only"><b>Propiedades</b><button type="button" class="paneClose" data-close="panel" title="Cerrar propiedades" aria-label="Cerrar propiedades">×</button></div>',
)
# Computadora: el zoom (−, +, encuadrar, 1:60, 1:100) se pliega en un botón; la rueda del mouse ya acerca y aleja.
sub(
    '<div class="grp only2d">\n      <button class="btn" id="zoomOut"',
    '<div class="grp only2d" id="zoomGrp">\n      <button class="btn" id="zoomMore" title="Opciones de zoom" aria-expanded="false">Zoom ▸</button>\n      <button class="btn zx" id="zoomOut"',
)
sub('<button class="btn" id="zoomIn"', '<button class="btn zx" id="zoomIn"')
sub('<button class="btn" id="fit"', '<button class="btn zx" id="fit"')
sub('<button class="btn" id="s60"', '<button class="btn zx" id="s60"')
sub('<button class="btn" id="s100"', '<button class="btn zx" id="s100"')
sub(
    ".hscroll{display:contents}",
    ".wide-only{display:none}\n"
    "#zoomGrp:not(.open)>.zx{display:none}\n"
    "@media (min-width:1101px){\n"
    "  .paneHead.wide-only{display:flex;position:sticky;top:0;z-index:3;align-items:center;justify-content:space-between;gap:8px;\n"
    "    padding:8px 10px 8px 14px;background:var(--panel);border-bottom:1px solid var(--line)}\n"
    "  .paneHead b{font-size:13px;font-weight:700;color:var(--ink,#1c1917)}\n"
    "  .paneClose{width:20px;height:20px;flex:none;border-radius:50%;border:0;background:#d23c32;color:#fff;font-size:14px;line-height:1;\n"
    "    cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,.2)}\n"
    "  .paneClose:hover{background:#b3372a}\n  .paneClose:focus-visible{outline:3px solid #f3c9ad;outline-offset:2px}\n"
    "}\n.hscroll{display:contents}",
)
sub(
    "$('#fit').onclick = fitView;",
    "$('#fit').onclick = fitView;\n"
    "$('#zoomMore').onclick = () => { const g = $('#zoomGrp'), on = g.classList.toggle('open'); $('#zoomMore').textContent = on ? 'Zoom ◂' : 'Zoom ▸'; $('#zoomMore').setAttribute('aria-expanded', on); };\n"
    "document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => drawer(b.dataset.close, false));",
)
# Orden de las secciones de Propiedades elegido por cada persona (src/designer/panelorden.js).
sub("  p.innerHTML = overviewPanel(); bindOverview();", "  p.innerHTML = overviewPanel(); bindOverview(); window.plOrdenPanel?.(p);")
sub("function renderAll(){", "window.plRepintarPanel = () => renderPanel();\nfunction renderAll(){")

# Barra de arriba: deshacer y rehacer como iconos; Vaciar como bote de basura junto a Catálogo y Propiedades.
sub(
    '      <button class="btn" id="undo" title="撤销 (Ctrl+Z)" data-en-title="Undo (Ctrl+Z)" data-en="Undo">撤销</button>\n'
    '      <button class="btn" id="redo" title="重做 (Ctrl+Shift+Z)" data-en-title="Redo (Ctrl+Shift+Z)" data-en="Redo">重做</button>\n'
    '      <button class="btn danger" id="clearAll" title="清空所有家具家电（可撤销）" data-en-title="Remove all furniture and appliances (undoable)" data-en="Clear">清空布置</button>\n',
    '      <button class="btn ico" id="undo" title="撤销 (Ctrl+Z)" data-en-title="Undo (Ctrl+Z)" aria-label="Deshacer"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg></button>\n'
    '      <button class="btn ico" id="redo" title="重做 (Ctrl+Shift+Z)" data-en-title="Redo (Ctrl+Shift+Z)" aria-label="Rehacer"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg></button>\n',
)
sub(
    '      <button class="btn chip" id="tgPanel" data-en="Properties ◨">属性 ◨</button>\n',
    '      <button class="btn chip" id="tgPanel" data-en="Properties ◨">属性 ◨</button>\n'
    '      <button class="btn ico danger" id="clearAll" title="清空所有家具家电（可撤销）" data-en-title="Remove all furniture and appliances (undoable)" aria-label="Vaciar muebles"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg></button>\n',
)
# Seleccionar y Medir como iconos SVG (flecha de cursor y regla), del mismo tamaño que Deshacer y Rehacer.
sub(
    '      <button class="btn on" data-tool="select" title="选择 / 移动 (V)" data-en-title="Select / Move (V)" data-en="Select">选择</button>\n'
    '      <button class="btn" data-tool="measure" title="测量 (M)" data-en-title="Measure (M)" data-en="Measure">测量</button>\n',
    '      <button class="btn ico on" data-tool="select" title="选择 / 移动 (V)" data-en-title="Select / Move (V)" aria-label="Seleccionar"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3l14 7-6 2-2 6z"/><path d="m13 12 6 6"/></svg></button>\n'
    '      <button class="btn ico" data-tool="measure" title="测量 (M)" data-en-title="Measure (M)" aria-label="Medir"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7v10M21 7v10M3 12h18"/><path d="M8 12v-2.5M12 12v-3.5M16 12v-2.5"/></svg></button>\n',
)
# Sin selector de idioma en la barra: el idioma lo elige el negocio en Mi negocio (window.__LANG__).
sub(
    '    <div class="grp" id="langSel" role="group" aria-label="Language / 语言">\n'
    '      <button class="btn chip" data-lang="es" title="Español">ES</button>\n'
    '      <button class="btn chip" data-lang="en" title="English">EN</button>\n'
    '    </div>\n',
    '',
)
sub("$('#langSel').onclick = e => { const l = e.target.closest('[data-lang]')?.dataset.lang; if (l && l !== LANG) setLang(l); };", "")
sub("let LANG = (() => { try { const l = localStorage.getItem(LANG_KEY); return LANGS.includes(l) ? l : 'es'; } catch(e) { return 'es'; } })();",
    "let LANG = (() => { if (LANGS.includes(window.__LANG__)) return window.__LANG__; try { const l = localStorage.getItem(LANG_KEY); return LANGS.includes(l) ? l : 'es'; } catch(e) { return 'es'; } })();")
# Orden definitivo de la barra en computadora (el que dejó la administración el 16 de octubre de 2026).
sub(
    ".wide-only{display:none}",
    ".wide-only{display:none}\n"
    ".btn.ico{display:inline-flex;align-items:center;justify-content:center;min-width:36px;padding:6px 8px}\n"
    "@media (min-width:1101px){\n"
    "  header>.brand{order:-10} header #hostBar{order:1} header #viewSeg{order:2} header #tools{order:3} header #paneBtns{order:4} header #zoomGrp{order:5} header #modes3d{order:6}\n"
    "  header .grp:has(#vIso){order:7} header .grp:has(#undo){order:8} header #layers{order:9} header .grp:has([data-cut]){order:10} header #toggles3d{order:11} header .grp:has(#sun){order:12}\n"
    "  header .spacer{order:13} #fullscreen{order:14} header details.menu{order:15}\n"
    "}",
)

# Celular: Deshacer y Rehacer salen de la tira deslizable y quedan a un lado de «Plano 2D · Vista 3D» (en computadora el
# orden de arriba los deja donde estaban); sin «Pantalla completa», que en el celular no sirve; y el menú Archivo se ve:
# el desvanecido de la tira (mask-image) ocultaba todo lo que salía de ella, también el menú abierto.
_i = s.index('    <div class="grp">\n      <button class="btn ico" id="undo"')
_j = s.index('    </div>\n', _i) + len('    </div>\n')
_undo = s[_i:_j].replace('<div class="grp">', '<div class="grp" id="undoGrp">', 1)
s = s[:_i] + s[_j:]
sub('    </div>\n    <div class="hscroll">\n', '    </div>\n' + _undo + '    <div class="hscroll">\n')
sub(
    ".lv-short{display:none}\n",
    ".lv-short{display:none}\n"
    "@media (pointer:coarse),(max-width:600px){#fullscreen{display:none!important}}\n"
    "@media (max-width:600px){.hscroll:has(details.menu[open]){-webkit-mask-image:none!important;mask-image:none!important}}\n",
)

# Celular, segunda ronda (17 de octubre): Seleccionar y Medir también salen de la tira, junto a Deshacer y Rehacer; en la
# tira, Zoom queda justo antes de Archivo; sin la barra de indicaciones de abajo (la guía ya lo explica) y Archivo abre
# una hoja abajo, fuera de la tira (en el iPhone el menú dentro de la tira deslizable no se veía al tocarlo).
_i = s.index('    <div class="grp only2d" id="tools">\n')
_j = s.index('    </div>\n', _i) + len('    </div>\n')
_tools = s[_i:_j]
s = s[:_i] + s[_j:]
sub('    <div class="hscroll">\n', _tools + '    <div class="hscroll">\n')
sub(
    ".lv-short{display:none}\n",
    ".lv-short{display:none}\n"
    "@media (max-width:600px){\n"
    "  .app{grid-template-rows:auto minmax(0,1fr) 0} footer{display:none}\n"
    "  .hscroll>#zoomGrp{order:2} .hscroll>details.menu{order:3}\n"
    "}\n"
    "@media (max-width:400px){.seg .btn,.seg .pill{width:80px} body.m3d .seg .pill{transform:translateX(82px)}}\n"
    "#fileSheet{position:fixed;inset:0;z-index:2000;background:rgba(30,25,20,.35);display:flex;align-items:flex-end;animation:fadeIn .15s ease}\n"
    "#fileSheet .sheet{width:100%;background:#fff;border-radius:16px 16px 0 0;padding:8px 10px calc(10px + env(safe-area-inset-bottom));\n"
    "  display:flex;flex-direction:column;gap:2px;box-shadow:0 -10px 30px rgba(40,30,20,.18)}\n"
    "#fileSheet .btn{min-height:52px;text-align:left;font-size:16px;padding:0 14px;border-radius:10px}\n"
    "#fileSheet .btn.cancel{text-align:center;margin-top:6px;background:#f3eee8}\n",
)
sub(
    "  // En el celular el menú Archivo sale de la tira deslizable: se coloca debajo de la barra\n",
    "  // Celular: Archivo abre una hoja abajo con las mismas opciones (cada una toca el botón original del menú).\n"
    "  const fileMenu = $('details.menu');\n"
    "  fileMenu.querySelector('summary').addEventListener('click', e => {\n"
    "    if (!matchMedia('(max-width:600px)').matches) return;\n"
    "    e.preventDefault();\n"
    "    fileMenu.open = false;\n"
    "    const back = document.createElement('div');\n"
    "    back.id = 'fileSheet';\n"
    "    back.innerHTML = '<div class=\"sheet\" role=\"menu\"></div>';\n"
    "    const sheet = back.firstChild;\n"
    "    sheet.setAttribute('aria-label', fileMenu.querySelector('summary').textContent.replace('▾', '').trim());\n"
    "    fileMenu.querySelectorAll('.menu-pop .btn').forEach(orig => {\n"
    "      if (orig.hidden) return;\n"
    "      const b = document.createElement('button');\n"
    "      b.type = 'button'; b.className = 'btn' + (orig.classList.contains('danger') ? ' danger' : ''); b.textContent = orig.textContent;\n"
    "      b.onclick = () => { back.remove(); orig.click(); };\n"
    "      sheet.appendChild(b);\n"
    "    });\n"
    "    const cancel = document.createElement('button');\n"
    "    cancel.type = 'button'; cancel.className = 'btn cancel'; cancel.textContent = LANG === 'en' ? 'Cancel' : 'Cancelar';\n"
    "    cancel.onclick = () => back.remove();\n"
    "    sheet.appendChild(cancel);\n"
    "    back.addEventListener('click', ev => { if (ev.target === back) back.remove(); });\n"
    "    document.body.appendChild(back);\n"
    "  });\n"
    "  // En el celular el menú Archivo sale de la tira deslizable: se coloca debajo de la barra\n",
)

# Nombre de los archivos que se descargan (imagen, diseño y foto del 3D): el nombre del evento o la casa, no «diseno-casa»
# (salía igual en los salones).
s = s.replace("tr('户型装修方案', 'floor-plan-design')", "plFileBase()")
sub(
    "const LANG_KEY = 'planner3d-lang';\n",
    "const LANG_KEY = 'planner3d-lang';\n"
    "function plFileBase(){ const t = (window.__CASA__?.title || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')\n"
    "  .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60); return t || 'plantea'; }\n",
)


# Topes iguales a los del servidor (src/lib/designer/schema.ts: nombres de 80 caracteres, medidas hasta 100 m): un nombre
# pegado muy largo hacía que el guardado se rechazara.
sub('<input id="rName" value="${esc(nm(st.name))}">', '<input id="rName" maxlength="80" value="${esc(nm(st.name))}">')
sub('<input id="fName" value="${esc(nm(f.name))}">', '<input id="fName" maxlength="80" value="${esc(nm(f.name))}">')
sub("state.rooms[id].name = e.target.value.trim() || state.rooms[id].name", "state.rooms[id].name = e.target.value.trim().slice(0, 80) || state.rooms[id].name")
sub("g.name = e.target.value.trim() || g.name", "g.name = e.target.value.trim().slice(0, 80) || g.name")
sub("num('#fW', (g,v) => g.w = Math.max(50, Math.round(v)));", "num('#fW', (g,v) => g.w = Math.min(100000, Math.max(50, Math.round(v))));")
sub("num('#fD', (g,v) => g.d = Math.max(50, Math.round(v)));", "num('#fD', (g,v) => g.d = Math.min(100000, Math.max(50, Math.round(v))));")

# ---------------------------------------------------------------------------
# Recorrido, arreglos del 21 de octubre de 2026 (revisión del usuario en la casa y los salones)

# 1. El control táctil (joystick) solo en pantallas táctiles: en la computadora el recorrido sin puntero capturado
#    (al ir con «Ir a…», la visita guiada o la escalera) se mueve con las flechas o W A S D y se mira arrastrando.
sub(
    "$('#walkOverlay').style.display = 'none'; $('#joy').style.display = 'block'; $('#walkExit').style.display = 'block';",
    "$('#walkOverlay').style.display = 'none'; $('#joy').style.display = COARSE ? 'block' : 'none'; $('#walkExit').style.display = 'block';",
)
sub(
    "function syncHint3d(){ $('#hint3d').innerHTML = opt.mode === 'orbit' ? HINT_ORBIT() : touchWalk || COARSE ? HINT_TOUCHWALK_HTML() : HINT_WALK_HTML(); }",
    "const HINT_DESKWALK_HTML = () => chip('teclado', tr('方向键或 WASD 移动', 'Arrow keys or W A S D to move', 'Flechas o W A S D para moverte')) +\n"
    "  chip('mouse', tr('拖动转向', 'drag to look', 'Arrastra para mirar')) + chip('dostoques', tr('双击地面走过去', 'double-click the floor to go there', 'Doble clic en el piso para ir ahí'));\n"
    "function syncHint3d(){ $('#hint3d').innerHTML = opt.mode === 'orbit' ? HINT_ORBIT() : COARSE ? HINT_TOUCHWALK_HTML() : touchWalk ? HINT_DESKWALK_HTML() : HINT_WALK_HTML(); }",
)

# 2. «Subir a la planta alta» / «Bajar» solo junto a la escalera y viéndola: antes salía a 2 m del punto de llegada de la
#    planta (que puede ser un cuarto vecino) y también a través de una pared.
sub(
    "L.push({dir: 'subir', level: ABOVE, at: near(e.foot), away: [-e.up[0], -e.up[1]], step2: e.second, lift: 1, rise: st.rise || .18});",
    "L.push({dir: 'subir', level: ABOVE, at: near(e.foot), near: e.foot, away: [-e.up[0], -e.up[1]], step2: e.second, lift: 1, rise: st.rise || .18});",
)
sub(
    "L.push({dir: 'bajar', level: BELOW, at: near(e.top), away: e.out, step2: e.prev, lift: -1, rise: st.rise || .18});",
    "L.push({dir: 'bajar', level: BELOW, at: near(e.top), near: e.top, away: e.out, step2: e.prev, lift: -1, rise: st.rise || .18});",
)
sub(
    "const l = busy ? null : STAIR_LINKS.find(k => Math.hypot(here[0] - k.at[0], here[1] - k.at[1]) < 2000) || null;",
    "const fw = new THREE.Vector3(); camera.getWorldDirection(fw);\n"
    "  // Cerca de la escalera, sin pared de por medio y mirando hacia ella (no de espaldas ni desde el cuarto de al lado)\n"
    "  const facing = k => { const dx = k.step2[0] - here[0], dy = k.step2[1] - here[1], L = Math.hypot(dx, dy) || 1, f = Math.hypot(fw.x, fw.z) || 1;\n"
    "    return (fw.x/f)*(dx/L) + (fw.z/f)*(dy/L) > .3; };\n"
    "  const l = busy ? null : STAIR_LINKS.find(k => Math.hypot(here[0] - k.near[0], here[1] - k.near[1]) < 1800 && clearPath(here, k.near) && facing(k)) || null;",
)

# 3. El botón que pliega «De pie / Sentado» y las velocidades: una flecha clara que siempre apunta a la derecha
#    (antes era un triangulito que apuntaba arriba o abajo y no se entendía).
sub(
    "  up: '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 15h12l-6-7z\"/></svg>',\n",
    "  up: '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 15h12l-6-7z\"/></svg>',\n"
    "  fold: '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M8.6 4.6 6.9 6.3 12.6 12l-5.7 5.7 1.7 1.7L16 12z\"/></svg>',\n",
)
sub("$('#whFold').innerHTML = walk.compact ? ICON.up : ICON.down;", "$('#whFold').innerHTML = ICON.fold;")
sub(".wh-fold{width:36px;padding:0}", ".wh-fold{width:36px;padding:0}\n.wh-fold svg{width:22px!important;height:22px!important}")

# 4. «Ir a…» con la lista de Plantea en lugar del menú del navegador (el <select> se queda oculto: la lógica no cambia).
sub(
    "<label class=\"wh-pill\">${esc(tr('前往…', 'Go to…', 'Ir a…'))} ▾<select id=\"whGo\" aria-label=\"${esc(tr('前往', 'Go to', 'Ir a'))}\"></select></label>",
    "<span class=\"wh-go\"><button class=\"wh-pill\" id=\"whGoBtn\" aria-haspopup=\"listbox\" aria-expanded=\"false\">${esc(tr('前往…', 'Go to…', 'Ir a…'))}"
    " <svg class=\"wh-caret\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M7 9.5 12 14.5 17 9.5\"/></svg></button>"
    "<select id=\"whGo\" hidden aria-hidden=\"true\" tabindex=\"-1\"></select><div id=\"whGoMenu\" role=\"listbox\" aria-label=\"${esc(tr('前往', 'Go to', 'Ir a'))}\" hidden></div></span>",
)
sub(
    ".wh-fold{width:36px;padding:0}\n",
    ".wh-fold{width:36px;padding:0}\n"
    ".wh-go{position:relative;display:inline-flex}\n"
    ".wh-caret{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;transition:transform .2s}\n"
    "#whGoBtn[aria-expanded=true] .wh-caret{transform:rotate(180deg)}\n"
    "#whGoMenu{position:absolute;left:0;top:42px;z-index:6;min-width:220px;max-width:min(320px,calc(100vw - 24px));max-height:min(60vh,420px);overflow:auto;"
    "padding:6px;border-radius:16px;background:#fffdf9;box-shadow:0 14px 36px rgba(28,25,23,.22);border:1px solid #ece5da;font:500 14px/1.3 'DM Sans',system-ui,sans-serif;color:#1c1917}\n"
    "#whGoMenu .g{padding:10px 10px 4px;font:700 11px/1 'DM Sans',system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#b5653a}\n"
    "#whGoMenu button{display:block;width:100%;text-align:left;padding:10px 12px;border:0;border-radius:10px;background:none;color:inherit;font:inherit;cursor:pointer}\n"
    "#whGoMenu button:hover,#whGoMenu button:focus-visible{background:#f3ece2;outline:none}\n",
)
sub(
    "    else if (b.id === 'whFold'){ walk.compact = !walk.compact; saveWalk(); syncWalkHud(); }\n",
    "    else if (b.id === 'whFold'){ walk.compact = !walk.compact; saveWalk(); syncWalkHud(); }\n"
    "    else if (b.id === 'whGoBtn') goMenu(!!$('#whGoMenu').hidden);\n"
    "    else if (b.parentElement?.id === 'whGoMenu'){ const sel = $('#whGo'); goMenu(false); sel.value = b.dataset.v; sel.dispatchEvent(new Event('change', {bubbles: true})); }\n",
)
sub(
    "function bindWalkHud(){\n",
    "// Lista de «Ir a…»: se arma con las opciones del <select> oculto (grupos y lugares) y se cierra al elegir, al tocar fuera o con Esc\n"
    "function goMenu(open){\n"
    "  const m = $('#whGoMenu'), b = $('#whGoBtn'), sel = $('#whGo'); if (!m || !b || !sel) return;\n"
    "  if (open){\n"
    "    m.innerHTML = [...sel.children].map(n => n.tagName === 'OPTGROUP'\n"
    "      ? `<div class=\"g\">${esc(n.label)}</div>` + [...n.children].map(o => `<button type=\"button\" role=\"option\" data-v=\"${esc(o.value)}\">${esc(o.textContent)}</button>`).join('')\n"
    "      : n.value === '' ? '' : `<button type=\"button\" role=\"option\" data-v=\"${esc(n.value)}\">${esc(n.textContent)}</button>`).join('');\n"
    "  }\n"
    "  m.hidden = !open; b.setAttribute('aria-expanded', String(open));\n"
    "  if (open) m.querySelector('button')?.focus({preventScroll: true});\n"
    "}\n"
    "document.addEventListener('pointerdown', e => { if (!e.target.closest?.('.wh-go')) goMenu(false); }, true);\n"
    "document.addEventListener('keydown', e => { if (e.key === 'Escape') goMenu(false); });\n"
    "// Con el mouse capturado (la mira al centro), un clic abre o cierra la puerta o la ventana a la que se apunta\n"
    "document.addEventListener('mousedown', e => { if (e.button !== 0 || opt.mode !== 'walk' || !walkCtl.isLocked) return;\n"
    "  const h = pick(), d = h?.door || h?.slide; if (d && h.dist < (h.slide ? 6 : 3.5)) d.open = !d.open; });\n"
    "function bindWalkHud(){\n",
)

# 5. Clic derecho prohibido en el recorrido (casas y salones): abría el menú del navegador, se perdía el «soltar» y la
#    vista se quedaba girando sola.
sub(
    "  cv.addEventListener('pointerdown', e => {\n    downAt = [e.clientX, e.clientY]; window.closeDrawers();\n",
    "  cv.addEventListener('contextmenu', e => { if (opt.mode === 'walk') e.preventDefault(); });\n"
    "  cv.addEventListener('pointerdown', e => {\n"
    "    if (opt.mode === 'walk' && e.pointerType === 'mouse' && e.button !== 0){ e.preventDefault(); e.stopImmediatePropagation(); return; }\n"
    "    downAt = [e.clientX, e.clientY]; window.closeDrawers();\n",
)
sub(
    "  if (opt.mode === 'walk' && e.code === 'KeyE'){ const h = pick(); if (h?.door && h.dist < 2.5) h.door.open = !h.door.open; }",
    "  if (opt.mode === 'walk' && e.code === 'KeyE'){ const h = pick(), d = h?.door || h?.slide; if (d && h.dist < (h.slide ? 6 : 2.5)) d.open = !d.open; }",
)

# 6. Ventanas y canceles corredizos que se abren y cierran con un toque, como las puertas: una hoja se corre detrás de
#    la otra. (Antes el vidrio era una sola pieza fija y los toques lo atravesaban.)
sub("const doors = [], keys = {};", "const doors = [], slides = [], keys = {};")
sub("clearGroup(archFloor); clearGroup(archUp); lampG.clear(); doors.length = 0; colliders = [];",
    "clearGroup(archFloor); clearGroup(archUp); lampG.clear(); doors.length = 0; slides.length = 0; colliders = [];")
sub(
    "    const pane = new THREE.Mesh(new THREE.BoxGeometry(hz ? L : .01, gh, hz ? .01 : L), glassMat); pane.position.set(cx, sill + gh/2, cz); archUp.add(pane);\n"
    "    const n = Math.max(1, Math.round(L/.9));\n"
    "    for (let k = 0; k <= n; k++){ const t = -L/2 + k*L/n, mu = new THREE.Mesh(new THREE.BoxGeometry(hz ? .04 : .06, gh, hz ? .06 : .04), frameMat);\n"
    "      mu.position.set(cx + (hz ? t : 0), sill + gh/2, cz + (hz ? 0 : t)); mu.castShadow = true; archUp.add(mu); }\n",
    "    // Dos hojas: la izquierda fija y la derecha corrediza (va por detrás y se corre sobre la otra)\n"
    "    const sw = L/2 + .02, slide = {open: false, cur: 0, to: -(L/2 - .04), groups: []};\n"
    "    [[-1, -.012], [1, .012]].forEach(([s, off]) => {\n"
    "      const g = new THREE.Group(); g.position.set(cx + (hz ? s*(L/2 - sw/2) : off), sill + gh/2, cz + (hz ? off : s*(L/2 - sw/2)));\n"
    "      const glass = new THREE.Mesh(new THREE.BoxGeometry(hz ? sw : .01, gh, hz ? .01 : sw), glassMat);\n"
    "      const edge = (along, size) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), frameMat); m.position.set(...along); m.castShadow = true; return m; };\n"
    "      g.add(glass, edge(hz ? [-sw/2, 0, 0] : [0, 0, -sw/2], [hz ? .04 : .05, gh, hz ? .05 : .04]), edge(hz ? [sw/2, 0, 0] : [0, 0, sw/2], [hz ? .04 : .05, gh, hz ? .05 : .04]));\n"
    "      g.traverse(o => { o.userData.slide = slide; });\n"
    "      archUp.add(g); if (s > 0){ slide.groups.push({g, axis: hz ? 'x' : 'z', base: hz ? g.position.x : g.position.z}); }\n"
    "    });\n"
    "    slides.push(slide);\n",
)
# Canceles: la hoja derecha se corre sobre la izquierda
sub(
    "  SLIDES.forEach(({rect:[x0, y0, x1, y1], v}) => {\n"
    "    const L = M(v ? y1-y0 : x1-x0), ph = Math.min(v ? 2.4 : 2.1, top), pl = L*.55;\n"
    "    [[-1, -.02], [1, .02]].forEach(([s, off]) => {\n",
    "  SLIDES.forEach(({rect:[x0, y0, x1, y1], v}) => {\n"
    "    const L = M(v ? y1-y0 : x1-x0), ph = Math.min(v ? 2.4 : 2.1, top), pl = L*.55;\n"
    "    const slide = {open: false, cur: 0, to: -(L - pl), groups: []}; slides.push(slide);\n"
    "    [[-1, -.02], [1, .02]].forEach(([s, off]) => {\n"
    "      const g = new THREE.Group(); archUp.add(g);\n",
)
sub(
    "      const p = new THREE.Mesh(new THREE.BoxGeometry(v ? .02 : pl, ph, v ? pl : .02), glassMat); p.position.set(x, ph/2, z); archUp.add(p);\n"
    "      [ph - .03, .03].forEach(y => { const fr = new THREE.Mesh(new THREE.BoxGeometry(v ? .04 : pl, .05, v ? pl : .04), frameMat); fr.position.set(x, y, z); archUp.add(fr); });\n"
    "      [-1, 1].forEach(e => { const fr = new THREE.Mesh(new THREE.BoxGeometry(.04, ph, .04), frameMat); fr.position.set(v ? x : x + e*pl/2, ph/2, v ? z + e*pl/2 : z); archUp.add(fr); });\n",
    "      const p = new THREE.Mesh(new THREE.BoxGeometry(v ? .02 : pl, ph, v ? pl : .02), glassMat); p.position.set(x, ph/2, z); g.add(p);\n"
    "      [ph - .03, .03].forEach(y => { const fr = new THREE.Mesh(new THREE.BoxGeometry(v ? .04 : pl, .05, v ? pl : .04), frameMat); fr.position.set(x, y, z); g.add(fr); });\n"
    "      [-1, 1].forEach(e => { const fr = new THREE.Mesh(new THREE.BoxGeometry(.04, ph, .04), frameMat); fr.position.set(v ? x : x + e*pl/2, ph/2, v ? z + e*pl/2 : z); g.add(fr); });\n"
    "      g.traverse(o => { o.userData.slide = slide; });\n"
    "      if (s > 0) slide.groups.push({g, axis: v ? 'z' : 'x', base: 0});\n",
)
sub(
    "    if (o.material === glassMat) continue;\n    if (o.userData.door) return {door:o.userData.door, dist:h.distance};\n",
    "    if (o.userData.slide) return {slide:o.userData.slide, dist:h.distance};\n"
    "    if (o.material === glassMat) continue;\n    if (o.userData.door) return {door:o.userData.door, dist:h.distance};\n",
)
sub(
    "      if (tap){ const h = pick(e); if (h?.door && h.dist < 3.5) h.door.open = !h.door.open; else walkTap(e); }",
    "      if (tap){ const h = pick(e), d = h?.door || h?.slide; if (d && h.dist < (h.slide ? 6 : 3.5)) d.open = !d.open; else walkTap(e); }",
)
sub(
    "    const h = pick(e);\n    if (h?.door) h.door.open = !h.door.open;\n",
    "    const h = pick(e);\n    if (h?.door || h?.slide){ const d = h.door || h.slide; d.open = !d.open; }\n",
)
sub(
    "  doors.forEach(d => { const tg = d.open ? d.a1 : d.a0; d.cur += (tg - d.cur) * Math.min(1, dt*6); d.pivot.rotation.y = d.cur; });\n",
    "  doors.forEach(d => { const tg = d.open ? d.a1 : d.a0; d.cur += (tg - d.cur) * Math.min(1, dt*6); d.pivot.rotation.y = d.cur; });\n"
    "  slides.forEach(sl => { const tg = sl.open ? sl.to : 0; sl.cur += (tg - sl.cur) * Math.min(1, dt*5); sl.groups.forEach(q => { q.g.position[q.axis] = q.base + sl.cur; }); });\n",
)

# Portada de plantea.com.mx (src/designer/embed.js): el 3D gira solo, despacio, hasta que la persona lo toca.
sub(
    "  tour: () => startTour(), flyToRoom:id => active && !anim && flyToRoom(id), walking:() => active && opt.mode === 'walk'};",
    "  tour: () => startTour(), flyToRoom:id => active && !anim && flyToRoom(id), walking:() => active && opt.mode === 'walk',\n"
    "  spin: on => { if (!orbit) return; orbit.autoRotate = !!on; orbit.autoRotateSpeed = .7;\n"
    "    if (on) orbit.addEventListener('start', () => { orbit.autoRotate = false; }, {once: true}); }};",
)
# En la portada solo se mira: se gira, se acerca y se recorre el plano, pero no se selecciona, mueve, gira ni borra
# nada, no se abren puertas y no responden las teclas. Para editar está el diseñador en grande (/disenador/salon-demo).
sub(
    "function select(sel){ ui.sel = sel; renderSel(); renderPanel(); }\n",
    "const viewOnly = () => document.documentElement.classList.contains('embed');   // portada (src/designer/embed.js)\n"
    "function select(sel){ if (viewOnly()) sel = null; ui.sel = sel; renderSel(); renderPanel(); }\n",
)
sub(
    "  const p = toMM(e), t = e.target;\n  if (ui.tool === 'measure'){\n",
    "  const p = toMM(e), t = e.target;\n"
    "  if (viewOnly()){ drag = {kind:'pan', sx:e.clientX, sy:e.clientY, x0:view.x0, y0:view.y0, room:null, moved:false}; svg.setPointerCapture(e.pointerId); return; }\n"
    "  if (ui.tool === 'measure'){\n",
)
sub(
    "document.addEventListener('keydown', e => {\n  if (e.target.matches('input,select,textarea')) return;\n",
    "document.addEventListener('keydown', e => {\n  if (viewOnly() || e.target.matches('input,select,textarea')) return;\n",
)
sub(
    "    if (anim || opt.mode !== 'orbit' || !tap) return;\n    const h = pick(e);\n",
    "    if (anim || opt.mode !== 'orbit' || !tap || viewOnly()) return;\n    const h = pick(e);\n",
)

# Pantalla completa: solo el ícono (el texto ocupaba media barra); el nombre queda en el título y para lectores de pantalla.
sub(
    "  b.textContent = '⛶ ' + (on ? tr('退出全屏', 'Exit fullscreen') : tr('全屏', 'Fullscreen'));\n",
    "  b.innerHTML = on\n"
    "    ? '<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5\"/></svg>'\n"
    "    : '<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5\"/></svg>';\n"
    "  b.setAttribute('aria-label', on ? tr('退出全屏', 'Exit fullscreen') : tr('全屏', 'Fullscreen'));\n",
)
sub(
    '<button class="btn" id="fullscreen" title="全屏 (Shift+F)" style="border:1px solid var(--line);background:#fff">⛶ 全屏</button>',
    '<button class="btn ico" id="fullscreen" title="全屏 (Shift+F)" aria-label="Pantalla completa" style="border:1px solid var(--line);background:#fff"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>',
)

# Entorno del 3D: el lugar ya no flota sobre un piso beige liso. Alrededor del terreno hay una calle del lado de la
# entrada, banquetas, vecinos (casas en las casas; locales y edificios en los salones), árboles, postes, unos coches y
# cielo. Es genérico (no es la calle real), estable para cada lugar y sin archivos: las texturas se dibujan en el
# navegador. No se selecciona ni estorba al caminar (pick y colliders no lo ven).
sub(
    "  ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({color:0xf2eee7, roughness:1}));\n"
    "  ground.rotation.x = -Math.PI/2; ground.position.y = -0.015; ground.receiveShadow = true;\n"
    "  scene.add(hemi, sun, sun.target, ground);\n",
    "  ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({color:0xf2eee7, roughness:1}));\n"
    "  ground.rotation.x = -Math.PI/2; ground.position.y = -0.03; ground.receiveShadow = true;\n"
    "  scene.add(hemi, sun, sun.target, ground, buildEnv());\n",
)
sub(
    "  scene.background = new THREE.Color(opt.night ? 0x1c2130 : 0xf7f4ee);\n"
    "  ground.material.color.set(opt.night ? 0x2a2e38 : 0xf2eee7);\n",
    "  envLight(opt.night);\n",
)
sub(
    "/* ======================= 日照 / 夜景 ======================= */\n",
    r"""/* ======================= Entorno: calle, banquetas, vecinos y árboles ======================= */
let envSky = null, envSkyNight = null;
const envLit = [], envLamps = [], envBlocks = [];
// Azar con semilla (el id del lugar): el mismo lugar siempre tiene los mismos vecinos
function envRand(seed){
  let a = 0; for (const ch of String(seed)) a = (a*31 + ch.charCodeAt(0)) | 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0)/4294967296; };
}
function canvasTex(w, h, draw){
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t;
}
const texRep = (t, x, y) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; };
function speckle(g, w, h, base, amp, n, rnd, size = 2){
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++){ const v = (rnd()*2 - 1)*amp; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(rnd()*w, rnd()*h, size, size); }
}
// Dos tramos de fachada (2 × 3.6 m de ancho, un piso de 3 m) con su ventana; la máscara enciende una de las dos de noche
function facadeTex(rnd){
  const bays = (c, glow) => { for (let i = 0; i < 2; i++){ const x = i*256 + 64, y = 46, w = 128, h = 98;
    if (glow){ if (i === 0) { c.fillStyle = '#ffe1ae'; c.fillRect(x + 6, y + 6, w - 12, h - 12); } continue; }
    c.fillStyle = '#dcdcd8'; c.fillRect(x, y, w, h); const gr = c.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#5d6b77'); gr.addColorStop(1, '#3a434c');
    c.fillStyle = gr; c.fillRect(x + 6, y + 6, w - 12, h - 12); c.fillStyle = '#dcdcd8'; c.fillRect(x + w/2 - 3, y + 6, 6, h - 12); c.fillRect(x - 6, y + h, w + 12, 7); } };
  return { map: canvasTex(512, 214, (c, w, h) => { speckle(c, w, h, '#f6f5f2', .05, 2600, rnd, 2); bays(c, false); }),
    glow: canvasTex(512, 214, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); bays(c, true); }) };
}
function buildEnv(){
  const rnd = envRand(CASA.id || 'plantea'), g = new THREE.Group(), casa = CASA.kind === 'casa';
  // Terreno: muros y cuartos (también patio, cochera y jardín) de la planta
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  WALLS.forEach(w => { grow(w[0], w[1]); grow(w[2], w[3]); }); ROOMS.forEach(r => r.poly.forEach(([x, y]) => grow(x, y)));
  // La calle va del lado de la flecha de la entrada (de afuera hacia adentro); sin flecha, abajo del plano
  const m = /M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*([VH])\s*(-?[\d.]+)/.exec(ENTRY?.d || '');
  let side = 'S', ex = (x0 + x1)/2, ey = y1;
  if (m){ const ax = +m[1], ay = +m[2], bx = m[3] === 'H' ? +m[4] : ax, by = m[3] === 'V' ? +m[4] : ay, ox = ax - bx, oy = ay - by;
    side = Math.abs(oy) >= Math.abs(ox) ? (oy > 0 ? 'S' : 'N') : (ox > 0 ? 'E' : 'W'); ex = ax; ey = ay; }
  const ew = side === 'E' || side === 'W', hu = M(ew ? y1 - y0 : x1 - x0)/2, hv = M(ew ? x1 - x0 : y1 - y0)/2;
  const th = {S: 0, N: Math.PI, E: Math.PI/2, W: -Math.PI/2}[side], cs = Math.cos(th), sn = Math.sin(th);
  g.position.set(wx((x0 + x1)/2), 0, wz((y0 + y1)/2)); g.rotation.y = th;
  const dx = wx(ex) - g.position.x, dz = wz(ey) - g.position.z, eu = cs*dx - sn*dz;   // la entrada, a lo largo de la calle
  const L = 140, WALK = 2.4, ROAD = 9, front = hv + (casa ? 0 : 4);                    // los salones tienen un frente para estacionar
  const plane = (w, d, mat, u, v, y) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); p.rotation.x = -Math.PI/2; p.position.set(u, y, v); p.receiveShadow = true; g.add(p); };
  const slab = (w, d, h, mat, u, v, y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(u, y + h/2, v); b.receiveShadow = true; g.add(b); };
  const tiles = (base, px) => canvasTex(256, 256, (c, w, h) => { speckle(c, w, h, base, .05, 2500, rnd, 2); c.strokeStyle = 'rgba(0,0,0,.11)'; c.lineWidth = 3;
    for (let i = 0; i <= w; i += px){ c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } });
  // Piso de afuera: pasto seco con manchas (antes, beige liso)
  const grass = canvasTex(256, 256, (c, w, h) => { speckle(c, w, h, '#a9ae88', .10, 5200, rnd, 3);
    for (let i = 0; i < 46; i++){ c.fillStyle = rnd() < .55 ? 'rgba(112,124,82,.20)' : 'rgba(200,188,150,.22)'; c.beginPath(); c.arc(rnd()*w, rnd()*h, 8 + rnd()*28, 0, 7); c.fill(); } });
  ground.material.map = texRep(grass, 90, 90); ground.material.needsUpdate = true;
  // Terreno del lugar (concreto), banquetas, calle con línea punteada y la banqueta de enfrente
  const paving = tiles('#d3cdc1', 128), walk = tiles('#dcd7cd', 128), asphalt = canvasTex(256, 256, (c, w, h) => speckle(c, w, h, '#585a5d', .07, 7000, rnd, 2));
  const lotW = 2*hu + 4, lotD = front + hv + 2;
  plane(lotW, lotD, new THREE.MeshStandardMaterial({map: texRep(paving, lotW/2.4, lotD/2.4), roughness: .95}), 0, (front - hv - 2)/2, -.01);
  const walkMat = new THREE.MeshStandardMaterial({map: texRep(walk, 2*L/2.4, 1), roughness: .9});
  slab(2*L, WALK, .14, walkMat, 0, front + WALK/2, -.03);
  plane(2*L, ROAD, new THREE.MeshStandardMaterial({map: texRep(asphalt, 2*L/6, ROAD/6), roughness: .95}), 0, front + WALK + ROAD/2, -.015);
  const dash = new THREE.MeshStandardMaterial({color: 0xece8dc, roughness: .7});
  for (let u = -L; u < L; u += 6) plane(3, .15, dash, u + 1.5, front + WALK + ROAD/2, -.01);
  slab(2*L, WALK, .14, walkMat, 0, front + WALK + ROAD + WALK/2, -.03);
  // Vecinos: a los lados del terreno, enfrente y atrás
  const COLORS = casa ? ['#efe6d6', '#e7d3b8', '#dde4e1', '#f1e8da', '#e8d8c2', '#d8e1e7', '#ead9cf']
    : ['#e8d8c4', '#d9a98a', '#efe5d3', '#c8d6d1', '#e4c991', '#d7cfc4', '#bfcad6', '#e9d3c7'];
  const fac = facadeTex(rnd), stucco = canvasTex(128, 128, (c, w, h) => speckle(c, w, h, '#f4f3f0', .06, 1800, rnd, 2));
  const roof = new THREE.MeshStandardMaterial({color: 0x9d978d, roughness: 1}), sides = {};
  const house = (u, v, w, d, h, back) => {
    const col = COLORS[Math.floor(rnd()*COLORS.length)], bays = Math.max(1, Math.round(w/3.6)/2), floors = Math.max(1, Math.round(h/3));
    const fm = new THREE.MeshStandardMaterial({color: col, map: texRep(fac.map, bays, floors), emissive: 0xffc27a, emissiveMap: texRep(fac.glow, bays, floors), emissiveIntensity: 0, roughness: .92});
    envLit.push(fm);
    const sm = sides[col] ||= new THREE.MeshStandardMaterial({color: col, map: stucco, roughness: .95});
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [sm, sm, roof, roof, fm, fm]);   // ventanas al frente y atrás
    b.position.set(u, h/2, v); if (back) b.rotation.y = Math.PI; b.castShadow = b.receiveShadow = true; g.add(b); envBlocks.push(b);
  };
  // Una fila de construcciones: edge = la orilla que da a la calle; dir = hacia dónde crecen (+1 hacia +v, -1 hacia -v)
  const row = (from, to, edge, dir, back) => {
    let u = from;
    while (u < to){
      const w = casa ? 2*hu*(.85 + rnd()*.3) : 7 + rnd()*9; if (u + w > to) break;
      const d = casa ? 12 + rnd()*4 : 12 + rnd()*8, h = casa ? (rnd() < .2 ? 3 : 5.8 + rnd()*.6) : 3.4 + rnd()*5.6;
      house(u + w/2, edge + dir*d/2, w, d, h, back); u += w + (casa ? .2 : 1.5 + rnd()*2.5);
    }
  };
  const gap = casa ? .4 : 3, setback = casa ? 3 : 1;
  row(-L, -(hu + gap), front - setback, -1, false); row(hu + gap, L, front - setback, -1, false);
  row(-L, L, front + 2*WALK + ROAD + (casa ? 3 : 1), 1, true);
  row(-L, L, -hv - (casa ? 1 : 5), -1, true);
  // Árboles en las banquetas (sin tapar la entrada) y en los patios
  const N = 90, trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.12, .17, 2.4, 6), new THREE.MeshStandardMaterial({color: 0x6d5844, roughness: 1}), N);
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.7, 1), new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .95, flatShading: true}), N);
  const o = new THREE.Object3D(), col = new THREE.Color(); let n = 0;
  const tree = (u, v, s) => { if (n >= N) return;
    o.position.set(u, 1.2*s, v); o.scale.setScalar(s); o.rotation.set(0, rnd()*6, 0); o.updateMatrix(); trunk.setMatrixAt(n, o.matrix);
    o.position.set(u, 3.5*s, v); o.scale.set(s*(.9 + rnd()*.3), s*(.8 + rnd()*.4), s*(.9 + rnd()*.3)); o.updateMatrix(); crown.setMatrixAt(n, o.matrix);
    crown.setColorAt(n, col.setHSL(.24 + rnd()*.07, .32 + rnd()*.16, .28 + rnd()*.12)); n++; };
  for (let u = -L + 4; u < L; u += 8 + rnd()*3){
    if (Math.abs(u - eu) > 5) tree(u, front + .6, .85 + rnd()*.4);
    if (rnd() < .7) tree(u + 3, front + 2*WALK + ROAD - .6, .85 + rnd()*.4);
  }
  for (let k = 0; k < 14; k++) tree((rnd() < .5 ? -1 : 1)*(hu + 6 + rnd()*40), -hv - 2 - rnd()*3, .8 + rnd()*.5);
  trunk.count = crown.count = n; trunk.castShadow = crown.castShadow = true; if (crown.instanceColor) crown.instanceColor.needsUpdate = true;
  g.add(trunk, crown);
  // Postes de luz (se encienden de noche) y unos coches estacionados
  const pole = new THREE.MeshStandardMaterial({color: 0x6b6e72, roughness: .6, metalness: .3}), head = new THREE.MeshStandardMaterial({color: 0xf3efe6, emissive: 0xffd9a0, emissiveIntensity: 0});
  envLamps.push(head);
  for (let u = -L + 10; u < L; u += 24){ if (Math.abs(u - eu) < 5) continue;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 6.5, 8), pole); p.position.set(u, 3.25, front + WALK - .35); p.castShadow = true; g.add(p);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(.9, .14, .3), head); hd.position.set(u, 6.45, front + WALK + .1); g.add(hd); }
  const CARS = [0xb5653a, 0x2f4858, 0xd9d4ca, 0x3d3a34, 0x8a9ba8, 0x6f2f2a, 0xe8e6e1];
  const glass = new THREE.MeshStandardMaterial({color: 0x2b3238, roughness: .2, metalness: .3}), tyre = new THREE.MeshStandardMaterial({color: 0x222222, roughness: .9});
  for (let k = 0; k < 7; k++){
    let u = -L*.5 + rnd()*L; if (Math.abs(u - eu) < 6) u += 14;
    const car = new THREE.Group(), far = rnd() < .5;
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.3, .72, 1.8), new THREE.MeshStandardMaterial({color: CARS[k % CARS.length], roughness: .45, metalness: .2})); body.position.y = .62;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, .58, 1.62), glass); cab.position.set(-.2, 1.27, 0);
    const wh = new THREE.Mesh(new THREE.BoxGeometry(3.4, .5, 1.7), tyre); wh.position.y = .25;
    car.add(body, cab, wh); car.traverse(q => { q.castShadow = true; });
    car.position.set(u, 0, front + WALK + (far ? ROAD - 1.4 : 1.4)); if (far) car.rotation.y = Math.PI; g.add(car);
  }
  // Cielo con horizonte (de día y de noche) y bruma a lo lejos, para que la orilla del piso no se vea
  const sky = (top, mid, low) => { const t = canvasTex(4, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, top); gr.addColorStop(.38, mid); gr.addColorStop(.5, low); gr.addColorStop(1, low); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    t.mapping = THREE.EquirectangularReflectionMapping; return t; };
  envSky = sky('#8db6d6', '#cadceb', '#eef1ee'); envSkyNight = sky('#0b1020', '#172036', '#232a3a');
  scene.fog = new THREE.Fog(0xeef1ee, Math.max(70, 40*S3), Math.max(230, 115*S3));
  return g;
}
// Si un vecino queda entre la cámara y el lugar (al bajar la cámara o girar), se esconde mientras estorba
const envRay = new THREE.Ray(), envHit = new THREE.Vector3();
function envOcclude(){
  if (!envBlocks.length) return;
  if (!envBlocks[0].userData.box){ scene.updateMatrixWorld(); envBlocks.forEach(b => { b.userData.box = new THREE.Box3().setFromObject(b); }); }
  const orbiting = opt.mode === 'orbit', t = orbit.target, dist = camera.position.distanceTo(t);
  envRay.origin.copy(camera.position); envRay.direction.copy(t).sub(camera.position).normalize();
  envBlocks.forEach(b => { const box = b.userData.box;
    b.visible = !orbiting || !(box.containsPoint(camera.position) || (envRay.intersectBox(box, envHit) && envHit.distanceTo(camera.position) < dist)); });
}
function envLight(night){
  scene.background = (night ? envSkyNight : envSky) || new THREE.Color(night ? 0x1c2130 : 0xf7f4ee);
  scene.fog?.color.set(night ? 0x232a3a : 0xeef1ee);
  ground.material.color.set(night ? 0x4a4f58 : 0xffffff);
  envLit.forEach(m => { m.emissiveIntensity = night ? .9 : 0; });
  envLamps.forEach(m => { m.emissiveIntensity = night ? 2.4 : 0; });
}

/* ======================= 日照 / 夜景 ======================= */
""",
)

sub(
    "  updateSel();\n  renderer.render(scene, camera);\n",
    "  updateSel();\n  envOcclude();\n  renderer.render(scene, camera);\n",
)

# Noche: el salón grande tenía una sola luz (alumbraba ~7 m) y afuera todo quedaba negro. Ahora los cuartos grandes
# llevan una cuadrícula de luces de techo (cada ~6 m), hay luz de luna azulada y charcos de luz bajo los postes. Las
# luces de los cuartos solo existen de noche (de día no se cuentan: el 3D no se hace más lento).
sub(
    """    if (r.at && !r.outdoor){
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .02, 32), new THREE.MeshStandardMaterial({color:'#fff', emissive:'#fff2d6', emissiveIntensity:.3}));
      lamp.position.set(wx(r.at[0]), H - .012, wz(r.at[1])); lamp.visible = top >= H; lampG.add(lamp);
      const pl = new THREE.PointLight(0xffd9a8, 0, 7, 1.6); pl.position.set(wx(r.at[0]), H - .25, wz(r.at[1])); lampG.add(pl);
    }
""",
    """    if (r.at && !r.outdoor) lampSpots(r).forEach(([x, y], i, all) => {
      const lamp = new THREE.Mesh(LAMP_GEO, lampMat());
      lamp.position.set(wx(x), H - .012, wz(y)); lamp.visible = top >= H; lampG.add(lamp);
      // En los cuartos grandes, una luz sí y otra no (con más alcance); en los chicos, la de siempre
      if (all.length > 1 && i % 2) return;
      const pl = all.length > 1 ? new THREE.PointLight(0xffd9a8, 0, 13, 1.25) : new THREE.PointLight(0xffd9a8, 0, 7, 1.6);
      pl.userData.big = all.length > 1; pl.position.set(wx(x), H - .25, wz(y)); pl.visible = false; lampG.add(pl);
    });
""",
)
sub(
    "function buildArch(){\n",
    """const LAMP_GEO = new THREE.CylinderGeometry(.22, .22, .02, 32);
let lampMatShared = null;
const lampMat = () => lampMatShared ||= new THREE.MeshStandardMaterial({color:'#fff', emissive:'#fff2d6', emissiveIntensity:.3});
// Dónde van las luces de techo de un cuarto: los chicos, una al centro; los grandes (salones), una cada ~6 m
function lampSpots(r){
  const q = r.poly; let a = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  q.forEach(([x, y], i) => { const [u, v] = q[(i + 1) % q.length]; a += x*v - u*y; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  if (Math.abs(a)/2e6 < 45) return [r.at];
  const inside = (px, py) => { let c = false; for (let i = 0, j = q.length - 1; i < q.length; j = i++){ const [xi, yi] = q[i], [xj, yj] = q[j];
    if ((yi > py) !== (yj > py) && px < (xj - xi)*(py - yi)/(yj - yi) + xi) c = !c; } return c; };
  const nx = Math.max(2, Math.round((x1 - x0)/6000)), ny = Math.max(2, Math.round((y1 - y0)/6000)), out = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++){ const x = x0 + (i + .5)*(x1 - x0)/nx, y = y0 + (j + .5)*(y1 - y0)/ny; if (inside(x, y)) out.push([x, y]); }
  return out.length ? out : [r.at];
}
function buildArch(){
""",
)
sub(
    "  sun.intensity = opt.night ? .05 : 1.4 + Math.sin(Math.PI*t)*1.6;\n  hemi.intensity = opt.night ? .12 : 1.1;\n",
    "  if (opt.night) sun.color.set(0xb4c6ea);   // luna\n"
    "  sun.intensity = opt.night ? .55 : 1.4 + Math.sin(Math.PI*t)*1.6;\n"
    "  hemi.intensity = opt.night ? .5 : 1.1;\n"
    "  hemi.color.set(opt.night ? 0x93a6cc : 0xfff8ee); hemi.groundColor.set(opt.night ? 0x3a342c : 0xb9a88f);\n",
)
sub(
    "  lampG.children.forEach(o => { if (o.isPointLight) o.intensity = opt.night ? 6 : 0; else o.material.emissiveIntensity = opt.night ? 2 : .3; });\n"
    "  renderer.toneMappingExposure = opt.night ? 1.25 : 1.05;\n",
    "  lampG.children.forEach(o => { if (o.isPointLight){ o.visible = opt.night; o.intensity = opt.night ? (o.userData.big ? 14 : 6) : 0; } else o.material.emissiveIntensity = opt.night ? 2 : .3; });\n"
    "  renderer.toneMappingExposure = opt.night ? 1.3 : 1.05;\n",
)
# Charcos de luz bajo los postes (solo de noche)
sub(
    "    const hd = new THREE.Mesh(new THREE.BoxGeometry(.9, .14, .3), head); hd.position.set(u, 6.45, front + WALK + .1); g.add(hd); }\n",
    "    const hd = new THREE.Mesh(new THREE.BoxGeometry(.9, .14, .3), head); hd.position.set(u, 6.45, front + WALK + .1); g.add(hd);\n"
    "    const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), poolMat); pool.rotation.x = -Math.PI/2; pool.position.set(u, .13, front + WALK + .6); pool.visible = false; g.add(pool); envPools.push(pool); }\n",
)
sub(
    "  envLamps.push(head);\n",
    "  envLamps.push(head);\n"
    "  const poolMat = new THREE.MeshBasicMaterial({map: canvasTex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);\n"
    "    gr.addColorStop(0, 'rgba(255,214,150,.55)'); gr.addColorStop(.5, 'rgba(255,200,130,.18)'); gr.addColorStop(1, 'rgba(255,200,130,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }),\n"
    "    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending});\n",
)
sub(
    "const envLit = [], envLamps = [], envBlocks = [];\n",
    "const envLit = [], envLamps = [], envBlocks = [], envPools = [];\n",
)
sub(
    "  envLamps.forEach(m => { m.emissiveIntensity = night ? 2.4 : 0; });\n",
    "  envLamps.forEach(m => { m.emissiveIntensity = night ? 2.4 : 0; });\n"
    "  envPools.forEach(p => { p.visible = night; });\n",
)
sub(
    "  ground.material.color.set(night ? 0x4a4f58 : 0xffffff);\n",
    "  ground.material.color.set(night ? 0x737b8a : 0xffffff);\n",
)

# Estacionamiento a la derecha del salón (visto desde la calle) y toldo con el letrero del salón en la entrada.
# Los vecinos de ese lado se recorren y en la banqueta no hay árboles frente a la entrada del estacionamiento.
sub(
    "  const gap = casa ? .4 : 3, setback = casa ? 3 : 1;\n",
    "  const gap = casa ? .4 : 3, setback = casa ? 3 : 1, PARK = casa ? 0 : 17, pu = hu + 1;   // estacionamiento: ancho y orilla\n",
)
sub(
    "  row(-L, -(hu + gap), front - setback, -1, false); row(hu + gap, L, front - setback, -1, false);\n",
    "  row(-L, -(hu + gap), front - setback, -1, false); row(hu + gap + (PARK ? PARK + 2 : 0), L, front - setback, -1, false);\n",
)
sub(
    "    if (Math.abs(u - eu) > 5) tree(u, front + .6, .85 + rnd()*.4);\n",
    "    if (Math.abs(u - eu) > 5 && !(PARK && u > pu + 4 && u < pu + PARK - 4)) tree(u, front + .6, .85 + rnd()*.4);\n",
)
sub(
    "  // Cielo con horizonte (de día y de noche) y bruma a lo lejos, para que la orilla del piso no se vea\n",
    r"""  const carAt = (u, v, rot, color) => { const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.3, .72, 1.8), new THREE.MeshStandardMaterial({color, roughness: .45, metalness: .2})); body.position.y = .62;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, .58, 1.62), glass); cab.position.set(-.2, 1.27, 0);
    const wh = new THREE.Mesh(new THREE.BoxGeometry(3.4, .5, 1.7), tyre); wh.position.y = .25;
    car.add(body, cab, wh); car.traverse(q => { q.castShadow = true; }); car.position.set(u, 0, v); car.rotation.y = rot; g.add(car); };
  // Estacionamiento a la derecha del salón: dos filas de cajones pintados con un pasillo al centro y unos coches
  if (PARK){
    const pd = front + hv, line = new THREE.MeshStandardMaterial({color: 0xf2efe6, roughness: .7});
    plane(PARK, pd, new THREE.MeshStandardMaterial({map: texRep(asphalt, PARK/6, pd/6), color: 0xdcdcdc, roughness: .95}), pu + PARK/2, (front - hv)/2, -.011);
    for (let v = -hv + 1; v + 2.6 < front - 4; v += 2.6) [[pu + .5, pu + 5.5, Math.PI], [pu + PARK - 5.5, pu + PARK - .5, 0]].forEach(([a, b, rot]) => {
      plane(b - a, .12, line, (a + b)/2, v, -.006);
      if (rnd() < .42) carAt((a + b)/2, v + 1.3, rot, CARS[Math.floor(rnd()*CARS.length)]);
    });
    [pu + .5, pu + PARK - .5].forEach(u => plane(.12, front - 4 + hv - 1, line, u, (front - 4 - hv + 1)/2, -.006));
    // Postes del estacionamiento, en la orilla de afuera, con su charco de luz de noche
    for (let v = -hv + 6; v < front - 6; v += 14){
      const p = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 6.5, 8), pole); p.position.set(pu + PARK + .3, 3.25, v); p.castShadow = true; g.add(p);
      const hd = new THREE.Mesh(new THREE.BoxGeometry(.9, .14, .3), head); hd.position.set(pu + PARK - .1, 6.45, v); hd.rotation.y = Math.PI/2; g.add(hd);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), poolMat); pool.rotation.x = -Math.PI/2; pool.position.set(pu + PARK - 4, .02, v); pool.visible = false; g.add(pool); envPools.push(pool);
    }
  }
  // Toldo en la entrada del salón, con su nombre en el frente (de noche se ilumina)
  if (!casa){
    const name = String(CASA.title || '').split('·')[0].trim(), tw = Math.min(7.5, Math.max(4, 2*hu*.3)), td = 2.4, y = 2.75;
    const dark = new THREE.MeshStandardMaterial({color: 0x2f2b27, roughness: .6});
    const roof = new THREE.Mesh(new THREE.BoxGeometry(tw, .14, td), dark); roof.position.set(eu, y + .07, hv + td/2); roof.castShadow = true; g.add(roof);
    [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, y, 10), pole); p.position.set(eu + s*(tw/2 - .2), y/2, hv + td - .15); p.castShadow = true; g.add(p); });
    if (name){
      const sign = canvasTex(1024, 128, (c, w, h) => { c.fillStyle = '#2f2b27'; c.fillRect(0, 0, w, h); c.fillStyle = '#f4efe6'; c.textAlign = 'center'; c.textBaseline = 'middle';
        let fs = 78; const font = () => { c.font = `600 ${fs}px system-ui, -apple-system, Segoe UI, sans-serif`; }; font();
        while (c.measureText(name).width > w - 90 && fs > 30){ fs -= 4; font(); } c.fillText(name, w/2, h/2 + 3); });
      const sm = new THREE.MeshStandardMaterial({map: sign, roughness: .6, emissive: 0xffffff, emissiveMap: sign, emissiveIntensity: 0});
      const f = new THREE.Mesh(new THREE.BoxGeometry(tw, tw/8, .08), [dark, dark, dark, dark, sm, dark]); f.position.set(eu, y + .14 + tw/16, hv + td - .04); f.castShadow = true; g.add(f); envLit.push(sm);
    }
  }
  // Cielo con horizonte (de día y de noche) y bruma a lo lejos, para que la orilla del piso no se vea
""",
)

# Árboles y coches mejor modelados (sin archivos: geometría de three.js). Árboles: de sombra (copa de varias masas) y
# palmeras (tronco alto y hojas que caen). Coches: sedán y pickup con carrocería, cabina de cristal, techo, postes,
# ruedas con rin y calaveras. Cada parte se dibuja junta para todas sus copias (instancias): 20 coches cuestan ~10
# dibujos y 90 árboles, 4.
sub(
    """  const N = 90, trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.12, .17, 2.4, 6), new THREE.MeshStandardMaterial({color: 0x6d5844, roughness: 1}), N);
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.7, 1), new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .95, flatShading: true}), N);
  const o = new THREE.Object3D(), col = new THREE.Color(); let n = 0;
  const tree = (u, v, s) => { if (n >= N) return;
    o.position.set(u, 1.2*s, v); o.scale.setScalar(s); o.rotation.set(0, rnd()*6, 0); o.updateMatrix(); trunk.setMatrixAt(n, o.matrix);
    o.position.set(u, 3.5*s, v); o.scale.set(s*(.9 + rnd()*.3), s*(.8 + rnd()*.4), s*(.9 + rnd()*.3)); o.updateMatrix(); crown.setMatrixAt(n, o.matrix);
    crown.setColorAt(n, col.setHSL(.24 + rnd()*.07, .32 + rnd()*.16, .28 + rnd()*.12)); n++; };
  for (let u = -L + 4; u < L; u += 8 + rnd()*3){
    if (Math.abs(u - eu) > 5 && !(PARK && u > pu + 4 && u < pu + PARK - 4)) tree(u, front + .6, .85 + rnd()*.4);
    if (rnd() < .7) tree(u + 3, front + 2*WALK + ROAD - .6, .85 + rnd()*.4);
  }
  for (let k = 0; k < 14; k++) tree((rnd() < .5 ? -1 : 1)*(hu + 6 + rnd()*40), -hv - 2 - rnd()*3, .8 + rnd()*.5);
  trunk.count = crown.count = n; trunk.castShadow = crown.castShadow = true; if (crown.instanceColor) crown.instanceColor.needsUpdate = true;
  g.add(trunk, crown);
""",
    """  const trees = [];   // [u, v, escala, palmera]
  const tree = (u, v, s, palm = false) => trees.push([u, v, s, palm]);
  for (let u = -L + 4; u < L; u += 8 + rnd()*3){
    if (Math.abs(u - eu) > 5 && !(PARK && u > pu + 4 && u < pu + PARK - 4)) tree(u, front + .6, .85 + rnd()*.4, !casa || rnd() < .3);
    if (rnd() < .7) tree(u + 3, front + 2*WALK + ROAD - .6, .85 + rnd()*.4, rnd() < .25);
  }
  for (let k = 0; k < 14; k++) tree((rnd() < .5 ? -1 : 1)*(hu + 6 + rnd()*40), -hv - 2 - rnd()*3, .8 + rnd()*.5, rnd() < .3);
  if (PARK) for (let v = -hv + 3; v < front - 4; v += 9) tree(pu + PARK + 1.2, v, .9 + rnd()*.25, true);
  buildTrees(g, trees, rnd);
""",
)
sub(
    """  const CARS = [0xb5653a, 0x2f4858, 0xd9d4ca, 0x3d3a34, 0x8a9ba8, 0x6f2f2a, 0xe8e6e1];
  const glass = new THREE.MeshStandardMaterial({color: 0x2b3238, roughness: .2, metalness: .3}), tyre = new THREE.MeshStandardMaterial({color: 0x222222, roughness: .9});
  for (let k = 0; k < 7; k++){
    let u = -L*.5 + rnd()*L; if (Math.abs(u - eu) < 6) u += 14;
    const car = new THREE.Group(), far = rnd() < .5;
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.3, .72, 1.8), new THREE.MeshStandardMaterial({color: CARS[k % CARS.length], roughness: .45, metalness: .2})); body.position.y = .62;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, .58, 1.62), glass); cab.position.set(-.2, 1.27, 0);
    const wh = new THREE.Mesh(new THREE.BoxGeometry(3.4, .5, 1.7), tyre); wh.position.y = .25;
    car.add(body, cab, wh); car.traverse(q => { q.castShadow = true; });
    car.position.set(u, 0, front + WALK + (far ? ROAD - 1.4 : 1.4)); if (far) car.rotation.y = Math.PI; g.add(car);
  }
  const carAt = (u, v, rot, color) => { const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.3, .72, 1.8), new THREE.MeshStandardMaterial({color, roughness: .45, metalness: .2})); body.position.y = .62;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, .58, 1.62), glass); cab.position.set(-.2, 1.27, 0);
    const wh = new THREE.Mesh(new THREE.BoxGeometry(3.4, .5, 1.7), tyre); wh.position.y = .25;
    car.add(body, cab, wh); car.traverse(q => { q.castShadow = true; }); car.position.set(u, 0, v); car.rotation.y = rot; g.add(car); };
""",
    """  const CARS = [0xb5653a, 0x2f4858, 0xd9d4ca, 0x3d3a34, 0x8a9ba8, 0x6f2f2a, 0xe8e6e1, 0x1f3a5f, 0xc9c6bf];
  const fleet = [];   // [u, v, giro, color, pickup]
  const carAt = (u, v, rot, color) => fleet.push([u, v, rot, color, rnd() < .3]);
  for (let k = 0; k < 7; k++){
    let u = -L*.5 + rnd()*L; if (Math.abs(u - eu) < 6) u += 14;
    const far = rnd() < .5; carAt(u, front + WALK + (far ? ROAD - 1.4 : 1.4), far ? Math.PI : 0, CARS[k % CARS.length]);
  }
""",
)
sub(
    "  // Toldo en la entrada del salón, con su nombre en el frente (de noche se ilumina)\n",
    "  buildCars(g, fleet);\n  // Toldo en la entrada del salón, con su nombre en el frente (de noche se ilumina)\n",
)
sub(
    "function buildEnv(){\n",
    r"""// Árboles: de sombra (tronco y copa de cinco masas) y palmeras (tronco alto y nueve hojas que caen)
function buildTrees(g, list, rnd){
  if (!list.length) return;
  const bark = new THREE.MeshStandardMaterial({color: 0x6d5844, roughness: 1}), leaf = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .95, flatShading: true});
  const blob = (r, x, y, z) => new THREE.IcosahedronGeometry(r, 1).translate(x, y, z);
  const canopy = mergeGeometries([blob(1.45, 0, 0, 0), blob(1.1, .95, -.25, .35), blob(1.15, -.85, -.15, -.4), blob(1, .2, .75, -.5), blob(.95, -.3, .55, .85)]);
  const shadeTrunk = new THREE.CylinderGeometry(.11, .2, 2.7, 7).translate(0, 1.35, 0);
  const fronds = mergeGeometries(Array.from({length: 9}, (_, i) => new THREE.BoxGeometry(2.5, .03, .4).translate(1.25, 0, 0)
    .rotateZ(-.45 - (i % 3)*.12).rotateY(i*Math.PI*2/9 + (i % 2)*.2)));
  const palmTrunk = new THREE.CylinderGeometry(.13, .2, 6.2, 7, 3).translate(0, 3.1, 0);
  const make = (geo, mat, rows, place) => { if (!rows.length) return;
    const m = new THREE.InstancedMesh(geo, mat, rows.length), o = new THREE.Object3D(), c = new THREE.Color();
    rows.forEach((t, i) => { place(o, t); o.updateMatrix(); m.setMatrixAt(i, o.matrix); if (mat === leaf) m.setColorAt(i, c.setHSL(.23 + rnd()*.08, .3 + rnd()*.18, .26 + rnd()*.12)); });
    m.castShadow = true; m.receiveShadow = true; g.add(m); };
  const shade = list.filter(t => !t[3]), palms = list.filter(t => t[3]);
  make(shadeTrunk, bark, shade, (o, [u, v, s]) => { o.position.set(u, 0, v); o.rotation.set(0, rnd()*6, 0); o.scale.setScalar(s); });
  make(canopy, leaf, shade, (o, [u, v, s]) => { o.position.set(u, 3.6*s, v); o.rotation.set(0, rnd()*6, 0); o.scale.set(s*(.9 + rnd()*.25), s*(.85 + rnd()*.3), s*(.9 + rnd()*.25)); });
  make(palmTrunk, bark, palms, (o, [u, v, s]) => { o.position.set(u, 0, v); o.rotation.set((rnd() - .5)*.08, 0, (rnd() - .5)*.08); o.scale.set(s, s*(.85 + rnd()*.35), s); });
  make(fronds, leaf, palms, (o, [u, v, s]) => { o.position.set(u, 6.2*s*(.95 + rnd()*.1), v); o.rotation.set(0, rnd()*6, 0); o.scale.setScalar(s*(.9 + rnd()*.2)); });
}
// Coches: sedán y pickup. Carrocería baja (silueta extruida), cabina de cristal, techo y postes, ruedas con rin y
// calaveras (blancas adelante, rojas atrás). Todas las copias de cada parte van en una sola instancia.
function buildCars(g, fleet){
  if (!fleet.length) return;
  const shape = pts => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => s[i ? 'lineTo' : 'moveTo'](x, y)); return s; };
  const ext = (pts, w) => new THREE.ExtrudeGeometry(shape(pts), {depth: w, bevelEnabled: false}).translate(0, 0, -w/2);
  const tint = (geo, hex) => { const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n*3);
    for (let i = 0; i < n; i++) c.toArray(a, i*3); geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo; };
  const MODELS = [
    {len: 4.4, w: 1.76, r: .33, ax: 1.35, belt: .86, lower: [[-2.2, .3], [-2.2, .78], [-1.6, .86], [1.25, .87], [2.15, .77], [2.2, .48], [2.12, .3]],
      cab: [[-1.56, .85], [-1.05, 1.24], [.55, 1.26], [1.2, .86]], roof: [-1.07, .57, 1.24], posts: [-1.3, -.25, .9]},
    {len: 5, w: 1.86, r: .38, ax: 1.55, belt: 1.05, lower: [[-2.5, .4], [-2.5, 1.0], [-.62, 1.0], [1.15, 1.06], [2.45, .98], [2.5, .55], [2.4, .4]],
      cab: [[-.6, 1.0], [-.57, 1.52], [.66, 1.54], [1.12, 1.06]], roof: [-.6, .68, 1.52], posts: [-.58, .05, .92]},
  ];
  const paint = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .35, metalness: .4, envMap: envTex, envMapIntensity: .7});
  const glassM = new THREE.MeshStandardMaterial({color: 0x24303a, roughness: .1, metalness: .6, envMap: envTex, envMapIntensity: .9});
  const tyreM = new THREE.MeshStandardMaterial({color: 0x1c1c1e, roughness: .9}), rimM = new THREE.MeshStandardMaterial({color: 0xb8bbbe, roughness: .3, metalness: .75});
  const lightM = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .3});
  MODELS.forEach((M, k) => {
    const rows = fleet.filter(f => !!f[4] === (k === 1)); if (!rows.length) return;
    const W = M.w;
    // La carrocería extruida no tiene índice: las cajas del techo y los postes se pasan igual para poder unirlas
    const posts = M.posts.map(x => new THREE.BoxGeometry(.1, M.roof[2] - M.belt, W - .12).translate(x, (M.roof[2] + M.belt)/2, 0).toNonIndexed());
    const body = mergeGeometries([ext(M.lower, W), new THREE.BoxGeometry(M.roof[1] - M.roof[0] + .04, .07, W - .18).translate((M.roof[0] + M.roof[1])/2, M.roof[2] + .035, 0).toNonIndexed(), ...posts]);
    const cab = ext(M.cab, W - .16);
    const wheel = (x, z) => new THREE.CylinderGeometry(M.r, M.r, .24, 16).rotateX(Math.PI/2).translate(x, M.r, z);
    const rim = (x, z) => new THREE.CylinderGeometry(M.r*.55, M.r*.55, .26, 12).rotateX(Math.PI/2).translate(x, M.r, z);
    const at = [[-M.ax, W/2 - .14], [-M.ax, -W/2 + .14], [M.ax, W/2 - .14], [M.ax, -W/2 + .14]];
    const tyres = mergeGeometries(at.map(([x, z]) => wheel(x, z))), rims = mergeGeometries(at.map(([x, z]) => rim(x, z)));
    const L2 = M.len/2, ly = M.belt - .16;
    const lights = mergeGeometries([[L2, W/2 - .28, 0xf4f1e8], [L2, -W/2 + .28, 0xf4f1e8], [-L2, W/2 - .25, 0xb3261e], [-L2, -W/2 + .25, 0xb3261e]]
      .map(([x, z, hex]) => tint(new THREE.BoxGeometry(.06, .12, .32).translate(x + Math.sign(x)*.01, ly, z), hex)));
    const parts = [[body, paint], [cab, glassM], [tyres, tyreM], [rims, rimM], [lights, lightM]];
    parts.forEach(([geo, mat]) => {
      const m = new THREE.InstancedMesh(geo, mat, rows.length), o = new THREE.Object3D(), c = new THREE.Color();
      rows.forEach(([u, v, rot, color], i) => { o.position.set(u, 0, v); o.rotation.set(0, rot, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); if (mat === paint) m.setColorAt(i, c.set(color)); });
      m.castShadow = mat !== lightM; m.receiveShadow = true; g.add(m);
    });
  });
}
function buildEnv(){
""",
)

# Carga más ligera: three.js minificado (≈40 % menos) y pedido desde el <head>; en celulares y tabletas el 3D se
# dibuja a 1.5× en lugar de 2×, las sombras son más chicas y la calle más corta (menos vecinos y árboles).
# three.js se sirve desde plantea.com.mx (public/vendor/three-0.160.0, copiado del paquete three@0.160.0 de npm, con
# su huella sha512 comprobada): si jsDelivr falla, el 3D no se cae, y la CSP ya no tiene que permitir otro sitio.
sub(
    '  "three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",\n',
    '  "three":"/vendor/three-0.160.0/build/three.module.min.js",\n',
)
sub(
    '  "three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"\n',
    '  "three/addons/":"/vendor/three-0.160.0/examples/jsm/"\n',
)
sub(
    "}}\n</script>\n</head>",
    '}}\n</script>\n<link rel="modulepreload" href="/vendor/three-0.160.0/build/three.module.min.js">\n</head>',
)
sub("renderer.setPixelRatio(Math.min(devicePixelRatio, 2));", "renderer.setPixelRatio(Math.min(devicePixelRatio, COARSE ? 1.5 : 2));")
sub("sun.shadow.mapSize.setScalar(COARSE ? 2048 : 4096);", "sun.shadow.mapSize.setScalar(COARSE ? 1024 : 4096);")
sub("  const L = 140, WALK = 2.4,", "  const L = COARSE ? 90 : 140, WALK = 2.4,")

# Fachada: las caras de muro que dan afuera (no caen dentro de un cuarto techado) llevan aplanado con textura y un
# zoclo abajo, en lugar del mismo hueso de adentro. El color sale de CASA.facade.color si el lugar lo trae.
sub(
    "  const o = new THREE.Mesh(new THREE.BoxGeometry(M(x1-x0), yt-yb, M(y1-y0)), m || [wallMat, wallMat, capMat, wallMat, wallMat, wallMat]);\n"
    "  o.position.set(wx((x0+x1)/2), (yb+yt)/2, wz((y0+y1)/2)); o.castShadow = o.receiveShadow = true; archUp.add(o);\n",
    "  const ext = m ? null : outsideFaces(x0, y0, x1, y1);\n"
    "  const o = new THREE.Mesh(new THREE.BoxGeometry(M(x1-x0), yt-yb, M(y1-y0)), m || [0, 1, 2, 3, 4, 5].map(i => i === 2 ? capMat : ext[i] ? facadeMat() : wallMat));\n"
    "  o.position.set(wx((x0+x1)/2), (yb+yt)/2, wz((y0+y1)/2)); o.castShadow = o.receiveShadow = true; archUp.add(o);\n"
    "  if (ext && yb <= .001){   // zoclo de la fachada\n"
    "    const W = M(x1-x0), D = M(y1-y0), ph = Math.min(.45, yt);\n"
    "    [[0, [.012, ph, D], W/2, 0], [1, [.012, ph, D], -W/2, 0], [4, [W, ph, .012], 0, D/2], [5, [W, ph, .012], 0, -D/2]].forEach(([i, size, ox, oz]) => {\n"
    "      if (!ext[i]) return; const p = new THREE.Mesh(new THREE.BoxGeometry(...size), plinthMat()); p.position.set(o.position.x + ox, ph/2, o.position.z + oz); p.receiveShadow = true; archUp.add(p); });\n"
    "  }\n",
)
sub(
    "function wallBox([x0, y0, x1, y1], yb, yt, m){\n",
    """let facadeM = null, plinthM = null;
const facadeMat = () => facadeM ||= new THREE.MeshStandardMaterial({color: CASA.facade?.color || (CASA.kind === 'casa' ? '#efe8dc' : '#e6e2db'),
  map: (() => { const t = canvasTex(256, 256, (g, w, h) => speckle(g, w, h, '#f7f6f3', .07, 4200, envRand(CASA.id + '-fachada'), 2)); t.repeat.set(1.5, 1.5); return t; })(), roughness: .95});
const plinthMat = () => plinthM ||= new THREE.MeshStandardMaterial({color: 0x8d877e, roughness: .9});
// Caras de un muro que dan afuera: el punto a 15 cm de la cara no cae dentro de ningún cuarto techado
function outsideFaces(x0, y0, x1, y1){
  const mx = (x0 + x1)/2, my = (y0 + y1)/2, d = 150, out = (x, y) => !ROOMS.some(r => !r.outdoor && !r.void && inPoly([x, y], r.poly));
  return {0: out(x1 + d, my), 1: out(x0 - d, my), 4: out(mx, y1 + d), 5: out(mx, y0 - d)};
}
function wallBox([x0, y0, x1, y1], yb, yt, m){
""",
)

# Techo: aparece suave cuando la cámara baja casi a nivel de la calle (desde arriba se ve adentro, como siempre) y
# se quita si la cámara entra al lugar.
sub(
    "  scene.fog = new THREE.Fog(0xeef1ee, Math.max(70, 40*S3), Math.max(230, 115*S3));\n  return g;\n",
    "  scene.fog = new THREE.Fog(0xeef1ee, Math.max(70, 40*S3), Math.max(230, 115*S3));\n  scene.add(buildRoof());\n  return g;\n",
)
sub(
    "function envOcclude(){\n  if (!envBlocks.length) return;\n",
    """let envRoof = null, roofMat = null, envRoofOn = false;
function buildRoof(){
  roofMat = new THREE.MeshStandardMaterial({color: 0xbcb6ac, roughness: .95, transparent: true, opacity: 0, depthWrite: false});
  const r = new THREE.Group();
  ROOMS.forEach(rm => { if (rm.outdoor || rm.void) return;
    const geo = new THREE.ExtrudeGeometry(shapeOf(rm.poly), {depth: .16, bevelEnabled: false}); geo.rotateX(-Math.PI/2);
    const m = new THREE.Mesh(geo, roofMat); m.position.y = H + .01; r.add(m); });
  r.visible = false; return envRoof = r;
}
function envRoofFade(){
  if (!envRoof) return;
  const t = orbit.target, d = Math.max(camera.position.distanceTo(t), .001), el = Math.asin(Math.max(-1, Math.min(1, (camera.position.y - t.y)/d)));
  const inside = ROOMS.some(r => !r.outdoor && !r.void && inPoly([camera.position.x*1000 + OX, camera.position.z*1000 + OY], r.poly));
  const want = opt.mode === 'orbit' && el < .32 && !inside ? 1 : 0;
  roofMat.opacity += (want - roofMat.opacity)*.12; envRoof.visible = roofMat.opacity > .02; roofMat.depthWrite = roofMat.opacity > .9;
  // Con el techo puesto, los nombres de los cuartos (que quedan adentro) se esconden; vuelven al quitarse
  const on = roofMat.opacity > .5;
  if (on !== envRoofOn){ envRoofOn = on; if (opt.mode === 'orbit' && !anim) showLabels(opt.labels && !on); }
}
function envOcclude(){
  envRoofFade();
  if (!envBlocks.length) return;
""",
)

# ---------------------------------------------------------------------------
# Fachada real de cada lugar (CASA.facade, src/lib/designer/facade.ts; la captura la administración mirando la foto
# de «por fuera»): color y acabado de los muros de afuera (aplanado liso o rugoso, piedra, ladrillo o concreto
# aparente, con la textura medida en metros para que no se estire), color del zoclo, lado de la calle, qué hay
# alrededor (ciudad, casas o campo), estacionamiento a la derecha, a la izquierda o ninguno, árboles y letrero.

sub(
    """const facadeMat = () => facadeM ||= new THREE.MeshStandardMaterial({color: CASA.facade?.color || (CASA.kind === 'casa' ? '#efe8dc' : '#e6e2db'),
  map: (() => { const t = canvasTex(256, 256, (g, w, h) => speckle(g, w, h, '#f7f6f3', .07, 4200, envRand(CASA.id + '-fachada'), 2)); t.repeat.set(1.5, 1.5); return t; })(), roughness: .95});
const plinthMat = () => plinthM ||= new THREE.MeshStandardMaterial({color: 0x8d877e, roughness: .9});
""",
    r"""const facadeMat = () => facadeM ||= new THREE.MeshStandardMaterial({color: CASA.facade?.color || (CASA.kind === 'casa' ? '#efe8dc' : '#e6e2db'),
  map: facadeTexture(CASA.facade?.material), roughness: CASA.facade?.material === 'concreto' ? .8 : .95});
const plinthMat = () => plinthM ||= new THREE.MeshStandardMaterial({color: CASA.facade?.plinth || 0x8d877e, roughness: .9});
// Textura de la fachada en gris (el color la tiñe) y su tamaño real en metros: [ancho, alto] de un mosaico
function facadeTexture(material){
  const rnd = envRand(CASA.id + '-fachada'), S = 512;
  const brick = (c, w, h) => { c.fillStyle = '#c9c7c3'; c.fillRect(0, 0, w, h); const rows = 13, bw = w/4, bh = h/rows;
    for (let r = 0; r < rows; r++) for (let k = -1; k < 5; k++){ const x = k*bw + (r % 2 ? bw/2 : 0), t = 228 + Math.floor(rnd()*26);
      c.fillStyle = `rgb(${t},${t - 4},${t - 8})`; c.fillRect(x + 3, r*bh + 3, bw - 6, bh - 6); } };
  const stone = (c, w, h) => { c.fillStyle = '#b9b6b0'; c.fillRect(0, 0, w, h); let y = 0;
    while (y < h){ const rh = 34 + rnd()*46; let x = -rnd()*60; while (x < w){ const rw = 50 + rnd()*90, t = 205 + Math.floor(rnd()*45);
      c.fillStyle = `rgb(${t},${t - 3},${t - 7})`; c.beginPath(); if (c.roundRect) c.roundRect(x + 4, y + 4, rw - 8, rh - 8, 10); else c.rect(x + 4, y + 4, rw - 8, rh - 8); c.fill(); x += rw; } y += rh; } };
  const concrete = (c, w, h) => { speckle(c, w, h, '#ebeae7', .05, 6000, rnd, 2); c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 3;
    c.strokeRect(1.5, 1.5, w - 3, h - 3); c.fillStyle = 'rgba(0,0,0,.28)';
    [[.25, .25], [.75, .25], [.25, .75], [.75, .75]].forEach(([a, b]) => { c.beginPath(); c.arc(a*w, b*h, 5, 0, 7); c.fill(); }); };
  const [draw, size] = {
    rugoso: [(c, w, h) => speckle(c, w, h, '#f4f3f0', .16, 9000, rnd, 3), [1.5, 1.5]],
    piedra: [stone, [2, 2]],
    ladrillo: [brick, [1, 1]],
    concreto: [concrete, [2.4, 1.2]],
  }[material] || [(c, w, h) => speckle(c, w, h, '#f7f6f3', .06, 4200, rnd, 2), [2, 2]];
  const t = canvasTex(S, S, draw); t.repeat.set(1/size[0], 1/size[1]); return t;
}
// UV en metros (y la altura real del pedazo de muro): el ladrillo o la piedra quedan del mismo tamaño en todos los muros
function worldUV(geo, w, h, d, yb){
  const uv = geo.attributes.uv;
  for (let f = 0; f < 6; f++){ const [su, sv, v0] = f < 2 ? [d, h, yb] : f < 4 ? [w, d, 0] : [w, h, yb];
    for (let i = f*4; i < f*4 + 4; i++) uv.setXY(i, uv.getX(i)*su, v0 + uv.getY(i)*sv); }
  uv.needsUpdate = true;
}
""",
)
sub(
    "  o.position.set(wx((x0+x1)/2), (yb+yt)/2, wz((y0+y1)/2)); o.castShadow = o.receiveShadow = true; archUp.add(o);\n  if (ext && yb <= .001){   // zoclo de la fachada\n",
    "  o.position.set(wx((x0+x1)/2), (yb+yt)/2, wz((y0+y1)/2)); o.castShadow = o.receiveShadow = true; archUp.add(o);\n"
    "  if (ext && [0, 1, 4, 5].some(i => ext[i])) worldUV(o.geometry, M(x1-x0), yt-yb, M(y1-y0), yb);\n"
    "  if (ext && yb <= .001){   // zoclo de la fachada\n",
)
# Lado de la calle, alrededor, estacionamiento, árboles y letrero
sub(
    "  const ew = side === 'E' || side === 'W', hu = M(ew ? y1 - y0 : x1 - x0)/2, hv = M(ew ? x1 - x0 : y1 - y0)/2;\n",
    "  const F = CASA.facade || {};\n"
    "  if (/^[NSEW]$/.test(F.street || '')) side = F.street;   // la administración corrige el lado de la calle\n"
    "  const ew = side === 'E' || side === 'W', hu = M(ew ? y1 - y0 : x1 - x0)/2, hv = M(ew ? x1 - x0 : y1 - y0)/2;\n"
    "  const homes = F.around ? F.around === 'casas' : casa, field = F.around === 'campo';   // vecinos: casas, locales o nada\n"
    "  const palmy = F.trees === 'palmeras' ? .85 : F.trees === 'arboles' ? .08 : null, isPalm = def => palmy == null ? def : rnd() < palmy;\n",
)
sub(
    "  const gap = casa ? .4 : 3, setback = casa ? 3 : 1, PARK = casa ? 0 : 17, pu = hu + 1;   // estacionamiento: ancho y orilla\n",
    "  const gap = casa ? .4 : 3, setback = casa ? 3 : 1, PARK = casa || F.parking === 'no' ? 0 : 17, pu = hu + 1, ps = F.parking === 'izquierda' ? -1 : 1;\n",
)
sub(
    "  row(-L, -(hu + gap), front - setback, -1, false); row(hu + gap + (PARK ? PARK + 2 : 0), L, front - setback, -1, false);\n"
    "  row(-L, L, front + 2*WALK + ROAD + (casa ? 3 : 1), 1, true);\n"
    "  row(-L, L, -hv - (casa ? 1 : 5), -1, true);\n",
    "  if (!field){\n"
    "    row(-L, -(hu + gap + (PARK && ps < 0 ? PARK + 2 : 0)), front - setback, -1, false); row(hu + gap + (PARK && ps > 0 ? PARK + 2 : 0), L, front - setback, -1, false);\n"
    "    row(-L, L, front + 2*WALK + ROAD + (homes ? 3 : 1), 1, true);\n"
    "    row(-L, L, -hv - (casa ? 1 : 5), -1, true);\n"
    "  }\n",
)
sub("  const COLORS = casa ? [", "  const COLORS = homes ? [")
sub("      const w = casa ? 2*hu*(.85 + rnd()*.3) : 7 + rnd()*9; if (u + w > to) break;\n",
    "      const w = homes ? (casa ? 2*hu : 9)*(.85 + rnd()*.3) : 7 + rnd()*9; if (u + w > to) break;\n")
sub("      const d = casa ? 12 + rnd()*4 : 12 + rnd()*8, h = casa ? (rnd() < .2 ? 3 : 5.8 + rnd()*.6) : 3.4 + rnd()*5.6;\n",
    "      const d = homes ? 12 + rnd()*4 : 12 + rnd()*8, h = homes ? (rnd() < .2 ? 3 : 5.8 + rnd()*.6) : 3.4 + rnd()*5.6;\n")
sub("      house(u + w/2, edge + dir*d/2, w, d, h, back); u += w + (casa ? .2 : 1.5 + rnd()*2.5);\n",
    "      house(u + w/2, edge + dir*d/2, w, d, h, back); u += w + (homes ? .2 : 1.5 + rnd()*2.5);\n")
sub(
    "    if (Math.abs(u - eu) > 5 && !(PARK && u > pu + 4 && u < pu + PARK - 4)) tree(u, front + .6, .85 + rnd()*.4, !casa || rnd() < .3);\n"
    "    if (rnd() < .7) tree(u + 3, front + 2*WALK + ROAD - .6, .85 + rnd()*.4, rnd() < .25);\n",
    "    if (Math.abs(u - eu) > 5 && !(PARK && ps*u > pu + 4 && ps*u < pu + PARK - 4)) tree(u, front + .6, .85 + rnd()*.4, isPalm(!casa || rnd() < .3));\n"
    "    if (rnd() < .7) tree(u + 3, front + 2*WALK + ROAD - .6, .85 + rnd()*.4, isPalm(rnd() < .25));\n",
)
sub(
    "  for (let k = 0; k < 14; k++) tree((rnd() < .5 ? -1 : 1)*(hu + 6 + rnd()*40), -hv - 2 - rnd()*3, .8 + rnd()*.5, rnd() < .3);\n"
    "  if (PARK) for (let v = -hv + 3; v < front - 4; v += 9) tree(pu + PARK + 1.2, v, .9 + rnd()*.25, true);\n",
    "  for (let k = 0; k < 14; k++) tree((rnd() < .5 ? -1 : 1)*(hu + 6 + rnd()*40), -hv - 2 - rnd()*3, .8 + rnd()*.5, isPalm(rnd() < .3));\n"
    "  if (PARK) for (let v = -hv + 3; v < front - 4; v += 9) tree(ps*(pu + PARK + 1.2), v, .9 + rnd()*.25, isPalm(true));\n"
    "  // En campo abierto no hay vecinos: más árboles alrededor (lejos del terreno y del estacionamiento)\n"
    "  if (field) for (let k = 0; k < 46; k++){ const s = rnd() < .5 ? -1 : 1, u = s*(hu + (PARK && s === ps ? PARK + 4 : 4) + rnd()*55), v = -hv - 25 + rnd()*(2*hv + 25 + front);\n"
    "    if (v < front) tree(u, v, .8 + rnd()*.6, isPalm(rnd() < .35)); }\n",
)
sub(
    """  if (PARK){
    const pd = front + hv, line = new THREE.MeshStandardMaterial({color: 0xf2efe6, roughness: .7});
    plane(PARK, pd, new THREE.MeshStandardMaterial({map: texRep(asphalt, PARK/6, pd/6), color: 0xdcdcdc, roughness: .95}), pu + PARK/2, (front - hv)/2, -.011);
    for (let v = -hv + 1; v + 2.6 < front - 4; v += 2.6) [[pu + .5, pu + 5.5, Math.PI], [pu + PARK - 5.5, pu + PARK - .5, 0]].forEach(([a, b, rot]) => {
      plane(b - a, .12, line, (a + b)/2, v, -.006);
      if (rnd() < .42) carAt((a + b)/2, v + 1.3, rot, CARS[Math.floor(rnd()*CARS.length)]);
    });
    [pu + .5, pu + PARK - .5].forEach(u => plane(.12, front - 4 + hv - 1, line, u, (front - 4 - hv + 1)/2, -.006));
""",
    """  if (PARK){
    // at(x): x metros desde la orilla del salón, hacia la derecha (ps = 1) o hacia la izquierda (ps = -1)
    const pd = front + hv, line = new THREE.MeshStandardMaterial({color: 0xf2efe6, roughness: .7}), at = x => ps*(pu + x);
    plane(PARK, pd, new THREE.MeshStandardMaterial({map: texRep(asphalt, PARK/6, pd/6), color: 0xdcdcdc, roughness: .95}), at(PARK/2), (front - hv)/2, -.011);
    for (let v = -hv + 1; v + 2.6 < front - 4; v += 2.6) [[.5, 5.5, Math.PI], [PARK - 5.5, PARK - .5, 0]].forEach(([a, b, rot]) => {
      plane(b - a, .12, line, at((a + b)/2), v, -.006);
      if (rnd() < .42) carAt(at((a + b)/2), v + 1.3, ps > 0 ? rot : Math.PI - rot, CARS[Math.floor(rnd()*CARS.length)]);
    });
    [.5, PARK - .5].forEach(x => plane(.12, front - 4 + hv - 1, line, at(x), (front - 4 - hv + 1)/2, -.006));
""",
)
sub(
    "      const p = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 6.5, 8), pole); p.position.set(pu + PARK + .3, 3.25, v); p.castShadow = true; g.add(p);\n"
    "      const hd = new THREE.Mesh(new THREE.BoxGeometry(.9, .14, .3), head); hd.position.set(pu + PARK - .1, 6.45, v); hd.rotation.y = Math.PI/2; g.add(hd);\n"
    "      const pool = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), poolMat); pool.rotation.x = -Math.PI/2; pool.position.set(pu + PARK - 4, .02, v); pool.visible = false; g.add(pool); envPools.push(pool);\n",
    "      const p = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 6.5, 8), pole); p.position.set(at(PARK + .3), 3.25, v); p.castShadow = true; g.add(p);\n"
    "      const hd = new THREE.Mesh(new THREE.BoxGeometry(.9, .14, .3), head); hd.position.set(at(PARK - .1), 6.45, v); hd.rotation.y = Math.PI/2; g.add(hd);\n"
    "      const pool = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), poolMat); pool.rotation.x = -Math.PI/2; pool.position.set(at(PARK - 4), .02, v); pool.visible = false; g.add(pool); envPools.push(pool);\n",
)
sub(
    "    const name = String(CASA.title || '').split('·')[0].trim(), tw = Math.min(7.5, Math.max(4, 2*hu*.3)), td = 2.4, y = 2.75;\n",
    "    const name = F.sign === '-' ? '' : (F.sign || String(CASA.title || '').split('·')[0].trim()), tw = Math.min(7.5, Math.max(4, 2*hu*.3)), td = 2.4, y = 2.75;\n",
)

# Sin WebGL (aceleración por hardware apagada, navegador sin tarjeta gráfica o con WebGL bloqueado) no hay 3D. Antes
# three.js tronaba al crear el renderer, setView se quedaba a medias (página «ocupada» y marcada en 3D) y el error
# llegaba a Sentry («Error creating WebGL context», 24 oct 2026, del 3D de la portada en un Chrome de Linux). Ahora
# init() avisa con un error marcado, setView se queda en el plano 2D y lo dice (en la portada incrustada se queda la
# foto, sin aviso); cualquier otra falla al entrar al 3D deja la página usable y sigue llegando a Sentry.
sub(
    "  renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});\n",
    "  try { renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true}); }\n"
    "  catch { inited = false; const err = new Error('WebGL no disponible'); err.sinWebGL = true; throw err; }\n",
)
sub(
    "  if (m === '3d'){ if (ui.tool !== 'select') setTool('select'); ui.mA = null; document.body.classList.add('m3d'); await window.View3D.enter(); window.View3D.flashHint?.(); }\n",
    "  if (m === '3d'){\n"
    "    if (ui.tool !== 'select') setTool('select'); ui.mA = null; document.body.classList.add('m3d');\n"
    "    try { await window.View3D.enter(); window.View3D.flashHint?.(); }\n"
    "    catch (e) {\n"
    "      viewMode = '2d'; document.body.classList.remove('m3d'); applyView();\n"
    "      switching = false; document.body.classList.remove('busy');\n"
    "      if (!e?.sinWebGL) throw e;\n"
    "      if (!document.documentElement.classList.contains('embed')) {\n"
    "        const msg = tr('此浏览器无法显示 3D（WebGL 已关闭或不可用），可继续使用 2D 平面图。', 'This browser cannot show 3D (WebGL is off or unavailable). You can keep using the 2D plan.',\n"
    "          'Este navegador no puede mostrar el 3D (WebGL está apagado o no disponible). Puedes seguir en el plano 2D.');\n"
    "        window.plAlert ? window.plAlert(msg) : alert(msg);\n"
    "      }\n"
    "      return;\n"
    "    }\n"
    "  }\n",
)

# Lo que se pide al 3D justo después de setView('3d') (recorrido guiado y «ver desde esta mesa») solo corre si el 3D sí
# se abrió, igual que flyToRoom: sin WebGL, setView se queda en 2D y estas llamadas tronaban.
sub("  viewFrom: (x, y, tx, ty) => sitAt([x, y], [tx, ty]),\n", "  viewFrom: (x, y, tx, ty) => active && sitAt([x, y], [tx, ty]),\n")
sub("  tour: () => startTour(),", "  tour: () => active && startTour(),")

# Parpadeo al girar el 3D (z-fighting, 24 oct 2026, visto por el usuario en la portada): el plano cercano de la cámara
# estaba fijo en 5 cm, y desde lejos (la portada mira desde ~77 m) el 3D no distinguía superficies a menos de ~7 mm.
# La calle y sus rayas, el estacionamiento y sus cajones y el piso del terreno están a 1–5 mm uno del otro: al girar,
# se tapaban a ratos y las rayas salían cortadas, con los cortes en otro lugar en cada cuadro. Ahora (1) fuera del
# recorrido el plano cercano crece con la distancia a lo que se mira (1.5 %, entre 5 cm y 1 m; en el recorrido sigue
# en 5 cm), lo que da ~0.3 mm de precisión a 77 m, y (2) las rayas y el asfalto del estacionamiento se dibujan siempre
# encima del piso que tienen abajo (polygonOffset), sin depender de la distancia.
sub(
    "function camTween(A, B, e){\n",
    "function fitNear(){\n"
    "  const want = opt.mode === 'walk' ? .05 : THREE.MathUtils.clamp(camera.position.distanceTo(orbit.target)*.015, .05, 1);\n"
    "  if (Math.abs(want - camera.near) > want*.05){ camera.near = want; camera.updateProjectionMatrix(); }\n"
    "}\n"
    "function camTween(A, B, e){\n",
)
sub("  envOcclude();\n  renderer.render(scene, camera);\n", "  envOcclude(); fitNear();\n  renderer.render(scene, camera);\n")
ENCIMA = "polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2"
sub(
    "  const dash = new THREE.MeshStandardMaterial({color: 0xece8dc, roughness: .7});\n",
    f"  const dash = new THREE.MeshStandardMaterial({{color: 0xece8dc, roughness: .7, {ENCIMA}}});\n",
)
sub(
    "line = new THREE.MeshStandardMaterial({color: 0xf2efe6, roughness: .7})",
    f"line = new THREE.MeshStandardMaterial({{color: 0xf2efe6, roughness: .7, {ENCIMA}}})",
)
sub(
    "new THREE.MeshStandardMaterial({map: texRep(asphalt, PARK/6, pd/6), color: 0xdcdcdc, roughness: .95})",
    "new THREE.MeshStandardMaterial({map: texRep(asphalt, PARK/6, pd/6), color: 0xdcdcdc, roughness: .95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1})",
)

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(s, encoding="utf-8")
print(f"Escrito {OUT.relative_to(ROOT)} ({len(s) // 1024} KB)")
