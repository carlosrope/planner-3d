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
  // Al cambiar de planta desde el 3D se vuelve a abrir en 3D (el motor carga después de este script)
  if (new URLSearchParams(location.search).get('vista') === '3d'){
    let tries = 0; const go = () => window.View3D ? setView('3d') : ++tries < 150 && setTimeout(go, 100); go();
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
    """  // Escalera: escalones macizos hasta la siguiente planta
  const stepMat = mat('#d9cfbf', {roughness:.7});
  STAIRS.forEach(st => st.steps.forEach((r, i) => wallBox(r, 0, Math.min((i + 1) * (st.rise || .18), top), stepMat)));
  SLIDES.forEach(({rect:[x0, y0, x1, y1], v}) => {
    const L = M(v ? y1-y0 : x1-x0)""",
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
    "    camera.position.set(wx(W0.from[0]), 1.6, wz(W0.from[1])); camera.lookAt(wx(W0.to[0]), 1.5, wz(W0.to[1]));",
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

# Botones deshabilitados del panel (p. ej. exportes con la lista vacía)
sub(".narrow-only{display:none!important}", "#panel .btn:disabled{opacity:.4;pointer-events:none}\n"
    "#panel .actions .btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}\n.narrow-only{display:none!important}")

# Foto del 3D como imagen (vista previa del enlace del cliente)
sub(
    "window.View3D = {enter, exit, relang, sync:() => sync(), shot, groundAt,",
    "window.View3D = {enter, exit, relang, sync:() => sync(), shot, groundAt,\n"
    "  snap: () => { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/jpeg', .9); },",
)

# "Ver desde esta mesa": la cámara a la altura de una persona sentada, mirando un punto del plano
sub(
    "  snap: () => { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/jpeg', .9); },",
    "  snap: () => { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/jpeg', .9); },\n"
    "  viewFrom: (x, y, tx, ty) => { if (!active) return; if (opt.mode === 'walk') setMode('orbit');\n"
    "    flyTo(pose(new THREE.Vector3(wx(tx), 1.1, wz(ty)), new THREE.Vector3(wx(x), 1.4, wz(y))), 1400); },",
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
@media (pointer:coarse){
  .wh-side{bottom:84px}
  #view3d.walking #hint3d{bottom:176px}
}""",
)
sub(
    '      <button class="btn primary" id="walkExit" data-en="Exit walk">退出漫游</button>',
    '      <button class="btn primary" id="walkExit" data-en="Exit walk">退出漫游</button>\n'
    '      <div id="whFade"></div>\n'
    '      <div id="walkHud" hidden></div>',
)

# La vista sigue al dedo (y al mouse sin capturar): arrastrar a la derecha mira a la derecha
sub(
    "  eul.y += dx * .005; eul.x = THREE.MathUtils.clamp(eul.x + dy * .005, -1.35, 1.35);",
    "  const k = .005 * walk.look;   // la vista sigue al dedo, igual que el mouse con el puntero capturado\n"
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
# En el celular la ayuda es la del control desde antes de empezar (el original ponía la del teclado)
sub(
    "opt.mode === 'orbit' ? HINT_ORBIT() : touchWalk ? HINT_TOUCHWALK() : HINT_WALK(); }",
    "opt.mode === 'orbit' ? HINT_ORBIT() : touchWalk || COARSE ? HINT_TOUCHWALK() : HINT_WALK(); }",
)
sub(
    "  $('#walkOverlay').style.display = 'none'; $('#joy').style.display = 'block'; $('#walkExit').style.display = 'block';\n"
    "  syncHint3d();\n}",
    "  $('#walkOverlay').style.display = 'none'; $('#joy').style.display = 'block'; $('#walkExit').style.display = 'block';\n"
    "  syncHint3d(); flashHint();\n}",
)
sub(
    "walkCtl.addEventListener('lock', () => { $('#walkOverlay').style.display = 'none'; $('#cross').style.display = 'block'; });",
    "walkCtl.addEventListener('lock', () => { $('#walkOverlay').style.display = 'none'; $('#cross').style.display = 'block'; flashHint(); });",
)
sub(
    "    $('#walkOverlay').style.display = 'flex';\n    syncHint3d();\n  } else {\n    walkCtl.unlock(); stopTouchWalk(); orbit.enabled = true;",
    "    $('#walkOverlay').style.display = 'flex';\n    walkHud(true); syncHint3d();\n  } else {\n    walkHud(false); walkCtl.unlock(); stopTouchWalk(); orbit.enabled = true;",
)
# (el original ponía la función en lugar del texto al salir del 3D desde el recorrido)
sub(
    "  if (opt.mode === 'walk'){ walkCtl.unlock(); stopTouchWalk(); $('#hint3d').textContent = HINT_ORBIT;",
    "  if (opt.mode === 'walk'){ walkHud(false); walkCtl.unlock(); stopTouchWalk(); $('#hint3d').textContent = HINT_ORBIT();",
)
# En el recorrido las aristas de muros y puertas son líneas, y three.js da por tocada cualquier línea
# a menos de 1 m del rayo: junto a una pared todos los toques "chocaban" con ellas.
sub(
    "const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();",
    "const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();\nray.params.Line.threshold = .01;   // las aristas del recorrido no tapan los toques",
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
  if (glide){ stepGlide(); walkMapTick(); return; }
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
    map: s.map !== false, sit: false, sitAuto: false};
})();
function saveWalk(){ try { localStorage.setItem(WALK_KEY, JSON.stringify({speed:walk.speed, look:walk.look, map:walk.map})); } catch(e){} }
const eyeH = () => walk.sit ? 1.2 : 1.6;                       // altura de los ojos de pie / sentado (m)
const planXY = v => [v.x*1000 + OX, v.z*1000 + OY];           // posición 3D → plano (mm)
const FLAT = ['rug', 'dancefloor', 'staff'];                   // se puede pisar
const ROUND = ['rtable', 'roundtable', 'cocktail', 'cake', 'plant', 'platform360', 'candelabra', 'flowerstand', 'staff'];
let glide = null, lastTap = null, spots = [], mapKey = '', bigOpen = false;

function setSpeed(v){ walk.speed = v; saveWalk(); syncWalkHud(); }
function setSit(v, auto = false){ walk.sit = v; walk.sitAuto = v && auto; syncWalkHud(); }
// Las indicaciones del recorrido se ven unos segundos y se quitan para no tapar la vista
function flashHint(){
  const h = $('#hint3d'); h.classList.remove('gone'); clearTimeout(flashHint.t);
  flashHint.t = setTimeout(() => { if (opt.mode === 'walk') h.classList.add('gone'); }, 6000);
}
function walkHud(on){
  glide = null; lastTap = null; bigMap(false); clearTimeout(flashHint.t);
  $('#whFade').classList.remove('on'); $('#hint3d').classList.toggle('gone', on);
  $('#walkHud').hidden = !on; $('#view3d').classList.toggle('walking', on); walkFov(on);
  if ($('#whPop')) $('#whPop').hidden = true;
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
function inFurn(x, y){
  return opt.furn && state.furniture.some(f => {
    if (FLAT.includes(f.type)) return false;
    const a = (f.rot || 0)*Math.PI/180, dx = x - f.cx, dy = y - f.cy;
    return Math.abs(dx*Math.cos(a) + dy*Math.sin(a)) < f.w/2 + 250 && Math.abs(-dx*Math.sin(a) + dy*Math.cos(a)) < f.d/2 + 250;
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
  $('#whPop').hidden = true;
  const now = performance.now(), prev = lastTap;
  lastTap = {t:now, x:e.clientX, y:e.clientY};
  if (prev && now - prev.t < 350 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 40){ lastTap = null; goScreen(e.clientX, e.clientY); }
}
function goScreen(x, y){
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
  ROOMS.filter(r => !r.void).forEach(r => spots.push({group:tr('房间', 'Rooms', 'Cuartos'), label:nm(state.rooms[r.id].name), room:r}));
  const groups = [...new Set(spots.map(s => s.group || ''))];
  $('#whGo').innerHTML = `<option value="">${esc(tr('前往…', 'Go to…', 'Ir a…'))}</option>` + groups.map(g => {
    const o = spots.map((s, i) => (s.group || '') === g ? `<option value="${i}">${esc(s.label)}</option>` : '').join('');
    return g ? `<optgroup label="${esc(g)}">${o}</optgroup>` : o;
  }).join('');
}
function goSpot(s){
  if (s.room) return goRoom(s.room);
  if (s.sit) return walkTo(s.p, s.to, true, true);          // el lugar exacto, como «Ver desde esta mesa»
  walkTo(nearFree(...s.p) || s.p, s.to, false);
}
// Un cuarto: se entra por el lado más cercano a donde estás, mirando al centro (como en una visita)
function goRoom(r){
  const xs = r.poly.map(p => p[0]), ys = r.poly.map(p => p[1]), inside = (x, y) => inPoly([x, y], r.poly);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let c = [(x0 + x1)/2, (y0 + y1)/2];
  if (!inside(...c)) c = r.at && inside(...r.at) ? r.at : nearFree(c[0], c[1], inside) || c;
  const [hx, hy] = planXY(camera.position), step = Math.max(300, Math.min(x1 - x0, y1 - y0)/12), cand = [];
  for (let x = x0 + step/2; x < x1; x += step) for (let y = y0 + step/2; y < y1; y += step)
    if (inside(x, y) && freeAt(x, y)) cand.push([x, y, Math.hypot(x - hx, y - hy)]);
  cand.sort((a, b) => a[2] - b[2]);
  const p = cand.find(([x, y]) => Math.hypot(x - c[0], y - c[1]) > 900 && clearPath([x, y], c));
  if (p) walkTo(p, c, false);
  else walkTo(nearFree(c[0], c[1], inside) || c, null, false);
}

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
  if (opt.furn) state.furniture.forEach(f => {
    const [x, y] = P(f.cx, f.cy), w = f.w*m.k, d = f.d*m.k;
    g.save(); g.translate(x, y); g.rotate((f.rot || 0)*Math.PI/180); g.beginPath();
    if (ROUND.includes(f.type)) g.arc(0, 0, Math.min(w, d)/2, 0, 2*Math.PI); else g.rect(-w/2, -d/2, w, d);
    g.fillStyle = FLAT.includes(f.type) ? '#e2d6c2' : ['rtable', 'itable', 'headtable'].includes(f.type) ? '#c8a988' : '#d2c8ba'; g.fill();
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
  const m = bigFit(), r = cv.getBoundingClientRect(), x = (e.clientX - r.left)/m.k + m.x0, y = (e.clientY - r.top)/m.k + m.y0;
  bigMap(false);
  const t = spots.find(s => s.table && Math.hypot(x - s.table.cx, y - s.table.cy) < s.table.r);
  if (t) return goSpot(t);
  const p = nearFree(x, y);
  if (p) walkTo(p, null);
}

function syncWalkHud(){
  const on = (sel, f) => document.querySelectorAll(sel).forEach(b => b.classList.toggle('on', f(b.dataset)));
  on('#whSpeed button', d => +d.sp === walk.speed);
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
      <button class="wh-pill" id="whCfg" aria-label="${esc(tr('设置', 'Settings', 'Ajustes'))}">⚙&#xFE0E;</button>
    </div>
    <div id="whPop" hidden>
      <span>${esc(tr('转向灵敏度', 'Look speed', 'Al mirar'))}</span>
      <div class="wh-seg" id="whLook">${seg([['look', .6, tr('慢', 'Slow', 'Suave')], ['look', 1, tr('中', 'Normal', 'Normal')], ['look', 1.6, tr('快', 'Fast', 'Rápido')]])}</div>
      <span>${esc(tr('小地图', 'Map', 'Mapa'))}</span>
      <div class="wh-seg" id="whMapOn">${seg([['map', 1, tr('显示', 'Show', 'Ver')], ['map', 0, tr('隐藏', 'Hide', 'Ocultar')]])}</div>
    </div>
    <canvas id="whMap" role="button" aria-label="${esc(tr('地图：点击选择去哪里', 'Map: tap to choose where to go', 'Mapa: tócalo para elegir a dónde ir'))}"></canvas>
    <div class="wh-side">
      <div class="wh-seg" id="whEye">${seg([['eye', 'stand', tr('站立', 'Standing', 'De pie')], ['eye', 'sit', tr('坐下', 'Seated', 'Sentado')]])}</div>
      <div class="wh-seg" id="whSpeed" role="group" aria-label="${esc(tr('速度', 'Speed', 'Velocidad'))}">${seg([['sp', 1, 'x1'], ['sp', 2, 'x2'], ['sp', 3, 'x3']])}</div>
    </div>
    <div id="whBig" hidden>
      <p>${esc(EXT ? tr('点击要去的位置 · 点餐桌坐下', 'Tap where you want to go · tap a table to sit there', 'Toca a dónde quieres ir · toca una mesa para sentarte')
        : tr('点击要去的位置', 'Tap where you want to go', 'Toca a dónde quieres ir'))}</p>
      <canvas></canvas>
      <button class="btn" id="whClose">${esc(tr('关闭', 'Close', 'Cerrar'))}</button>
    </div>`;
  bigMap(false);
  if (opt.mode === 'walk'){ buildWalkGo(); syncWalkHud(); walkMapTick(true); }
}
function bindWalkHud(){
  const hud = $('#walkHud');
  hud.addEventListener('click', e => {
    const b = e.target.closest('button,canvas'), d = b?.dataset || {};
    if (!b){ if (e.target.id === 'whBig') bigMap(false); return; }
    if (d.sp) setSpeed(+d.sp);
    else if (d.eye) setSit(d.eye === 'sit');
    else if (d.look){ walk.look = +d.look; saveWalk(); syncWalkHud(); }
    else if (d.map){ walk.map = d.map === '1'; saveWalk(); syncWalkHud(); walkMapTick(true); }
    else if (b.id === 'whCfg') $('#whPop').hidden = !$('#whPop').hidden;
    else if (b.id === 'whMap') bigMap(true);
    else if (b.id === 'whClose') bigMap(false);
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
}""",
)
sub(
    "  if (opt.mode === 'walk' && e.code === 'KeyE'){ const h = pick(); if (h?.door && h.dist < 2.5) h.door.open = !h.door.open; }\n});",
    "  if (opt.mode === 'walk' && e.code === 'KeyE'){ const h = pick(); if (h?.door && h.dist < 2.5) h.door.open = !h.door.open; }\n"
    "  if (opt.mode === 'walk' && /^Digit[123]$/.test(e.code)) setSpeed(+e.code[5]);\n"
    "  if (opt.mode === 'walk' && e.code === 'KeyC') setSit(!walk.sit);\n"
    "  if (bigOpen && e.code === 'Escape') bigMap(false);\n});",
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
    "    camera.aspect = SW()/SH(); camera.updateProjectionMatrix();\n  }).observe(stage);",
    "    camera.aspect = SW()/SH(); walkFov();\n  }).observe(stage);",
)

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(s, encoding="utf-8")
print(f"Escrito {OUT.relative_to(ROOT)} ({len(s) // 1024} KB)")
