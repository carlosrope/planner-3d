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
  if (CASA.levels.length < 2) { seg.remove(); return; }
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

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(s, encoding="utf-8")
print(f"Escrito {OUT.relative_to(ROOT)} ({len(s) // 1024} KB)")
