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

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(s, encoding="utf-8")
print(f"Escrito {OUT.relative_to(ROOT)} ({len(s) // 1024} KB)")
