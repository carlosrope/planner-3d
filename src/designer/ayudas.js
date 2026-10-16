// Ayudas de cada botón del diseñador: una tarjeta con el nombre, una animación corta del plano y una frase de
// qué hace. En computadora aparece al dejar el cursor medio segundo encima; en celular, con un toque largo
// (el toque normal sigue igual). Se busca por delegación, así que sirve también para los botones que host.js
// vuelve a pintar (distribuciones, Compartir, comentarios, guardado). host.js usa window.plAyuda para la
// flecha de volver y para el texto del guardado, que cambia según el estado.
(function () {
  const C = { wall: '#3d3a34', room: '#f6f1ea', accent: '#b5653a', soft: '#e7ded3', table: '#fff', gold: '#c9a24a', ink: '#1c1917', muted: '#78716c' };
  const room = `<rect x="20" y="16" width="180" height="88" fill="${C.room}" stroke="${C.wall}" stroke-width="4"/><line x1="110" y1="16" x2="110" y2="104" stroke="${C.wall}" stroke-width="3"/>`;
  const mesa = (x, y, k = '') => `<g class="${k}"><circle cx="${x}" cy="${y}" r="9" fill="${C.table}" stroke="${C.gold}" stroke-width="2"/></g>`;
  const mesas = `${mesa(45, 42)}${mesa(75, 42)}${mesa(45, 78)}${mesa(75, 78)}<rect x="130" y="40" width="50" height="12" rx="3" fill="${C.table}" stroke="${C.gold}" stroke-width="2"/>`;
  const plano = `${room}${mesas}`;
  const cursor = (x, y) => `<path d="M${x} ${y}l0 16 4.5-4 3 7 3-1.4-3-6.6 6-.4z" fill="${C.ink}" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>`;
  const txt = (x, y, s, size = 9, color = C.accent, w = 700) => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" fill="${color}" font-weight="${w}">${s}</text>`;
  const chip = (x, y, w, s, on) => `<rect x="${x}" y="${y}" width="${w}" height="18" rx="5" fill="${on ? C.ink : '#fff'}" stroke="${on ? C.ink : C.soft}"/>${txt(x + w / 2, y + 12.5, s, 9, on ? '#fff' : C.ink)}`;
  // Plano visto en 3D (isométrico simple): piso, muros con altura y mesas.
  const piso = `<polygon points="110,36 196,72 110,108 24,72" fill="${C.room}" stroke="${C.wall}" stroke-width="2"/>`;
  const muros = `<polygon points="24,72 110,36 110,8 24,44" fill="${C.soft}" stroke="${C.wall}" stroke-width="1.5"/><polygon points="110,36 196,72 196,44 110,8" fill="#ddd2c4" stroke="${C.wall}" stroke-width="1.5"/>`;
  const mesas3d = `<ellipse cx="90" cy="74" rx="9" ry="5" fill="#fff" stroke="${C.gold}" stroke-width="2"/><ellipse cx="125" cy="74" rx="9" ry="5" fill="#fff" stroke="${C.gold}" stroke-width="2"/><ellipse cx="108" cy="88" rx="9" ry="5" fill="#fff" stroke="${C.gold}" stroke-width="2"/>`;
  const iso = `${piso}${muros}${mesas3d}`;
  const flecha = (d, k = '') => `<g class="${k}"><circle cx="178" cy="88" r="15" fill="#fff" stroke="${C.soft}"/><g transform="translate(166 76)" fill="none" stroke="${C.accent}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</g></g>`;
  const UNDO = '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>', REDO = '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>';
  const panel = (x, lines) => `<rect x="${x}" y="16" width="56" height="88" rx="4" fill="#fff" stroke="${C.soft}" stroke-width="1.5"/>${lines}`;

  const AYUDAS = {
    // Capas del plano
    dims: { t: 'Cotas', p: 'Muestra u oculta las medidas de los muros.',
      svg: `${room}<g class="a-fade"><line x1="20" y1="8" x2="200" y2="8" stroke="${C.accent}" stroke-width="1.5"/><line x1="20" y1="4" x2="20" y2="12" stroke="${C.accent}" stroke-width="1.5"/><line x1="200" y1="4" x2="200" y2="12" stroke="${C.accent}" stroke-width="1.5"/>
        <rect x="88" y="1" width="44" height="12" rx="3" fill="#fff"/>${txt(110, 10.5, '18.0 m')}</g>` },
    labels: { t: 'Cuartos', p: 'Muestra u oculta el nombre y el área de cada cuarto.',
      svg: `${room}<g class="a-fade">${txt(65, 58, 'Salón', 11, C.wall)}${txt(65, 71, '923 m²', 8, C.muted, 400)}${txt(155, 58, 'Cocina', 11, C.wall)}${txt(155, 71, '73 m²', 8, C.muted, 400)}</g>` },
    furn: { t: 'Muebles', p: 'Muestra u oculta todos los muebles para ver el plano limpio.', svg: `${room}<g class="a-fade">${mesas}</g>` },
    grid: { t: 'Cuadrícula', p: 'Pone una cuadrícula de 1 m para medir y alinear a ojo.',
      svg: `${room}<g class="a-fade" stroke="${C.accent}" stroke-opacity=".35" stroke-width="1">${[40, 60, 80, 100, 120, 140, 160, 180].map(x => `<line x1="${x}" y1="18" x2="${x}" y2="102"/>`).join('')}${[36, 56, 76, 96].map(y => `<line x1="22" y1="${y}" x2="198" y2="${y}"/>`).join('')}</g>` },
    bearing: { t: 'Muros de carga', p: 'Resalta en negro los muros que sostienen la construcción y no se pueden quitar.',
      svg: `${room.replace('stroke-width="4"', 'stroke-width="4" class="a-pulse"')}` },
    wallSnap: { t: 'Imán a muros', p: 'Al arrastrar un mueble cerca de un muro, se pega solo y queda derecho.',
      svg: `${room}<rect class="a-slide" x="60" y="70" width="44" height="14" rx="3" fill="${C.table}" stroke="${C.gold}" stroke-width="2"/>` },

    // Paneles y Vaciar
    lib: { t: 'Catálogo', p: 'Abre a la izquierda las mesas, sillas y demás piezas para arrastrarlas al plano.',
      svg: `${plano}<g class="a-inL">${panel(20, [30, 52, 74].map(y => `<rect x="28" y="${y}" width="16" height="14" rx="3" fill="${C.soft}"/><rect x="50" y="${y + 4}" width="18" height="5" rx="2" fill="${C.soft}"/>`).join(''))}</g>` },
    panel: { t: 'Propiedades', p: 'Abre a la derecha los datos de lo que seleccionas: medidas, giro, color y más.',
      svg: `${plano}<g class="a-inR">${panel(144, [28, 46, 64, 82].map(y => `<rect x="152" y="${y}" width="16" height="5" rx="2" fill="${C.muted}" opacity=".6"/><rect x="152" y="${y + 7}" width="40" height="7" rx="2" fill="${C.soft}"/>`).join(''))}</g>` },
    clear: { t: 'Vaciar muebles', p: 'Quita todos los muebles del plano. Si fue un error, Deshacer los regresa.',
      svg: `${room}<g class="a-out">${mesas}</g><g class="a-in2"><rect x="70" y="84" width="80" height="16" rx="8" fill="${C.ink}"/>${txt(110, 95, 'Deshacer ↶', 9, '#fff')}</g>` },

    // Vista y herramientas
    v2d: { t: 'Plano 2D', p: 'Ve el lugar desde arriba, como un plano, para acomodar todo con medidas.', svg: `<g class="a-flat">${plano}</g>` },
    v3d: { t: 'Vista 3D', p: 'Ve el montaje en tres dimensiones, como si estuvieras en el lugar.', svg: `<g class="a-fade">${iso}</g>` },
    select: { t: 'Seleccionar (V)', p: 'Toca o arrastra una pieza para moverla, girarla o ver sus propiedades.',
      svg: `${room}${mesa(45, 42)}${mesa(45, 78)}<g class="a-drag">${mesa(75, 60)}${cursor(78, 62)}</g>` },
    measure: { t: 'Medir (M)', p: 'Haz clic en dos puntos para saber la distancia entre ellos.',
      svg: `${plano}<circle cx="45" cy="96" r="3" fill="${C.accent}"/><line class="a-draw" x1="45" y1="96" x2="175" y2="96" stroke="${C.accent}" stroke-width="2" pathLength="1"/>
        <circle class="a-in2" cx="175" cy="96" r="3" fill="${C.accent}"/><g class="a-in2"><rect x="88" y="82" width="44" height="12" rx="3" fill="#fff"/>${txt(110, 91.5, '13.0 m')}</g>` },
    demolish: { t: 'Quitar muros (X)', p: 'Quita los muros grises que no son de carga para ver cómo queda el espacio.',
      svg: `<rect x="20" y="16" width="180" height="88" fill="${C.room}" stroke="${C.wall}" stroke-width="4"/><line class="a-out" x1="110" y1="16" x2="110" y2="104" stroke="#a8a29e" stroke-width="3"/>` },
    zoomOut: { t: 'Alejar', p: 'Ve más del plano a la vez.', svg: `<g class="a-zOut">${plano}</g>` },
    zoomIn: { t: 'Acercar', p: 'Ve de cerca una parte del plano.', svg: `<g class="a-zIn">${plano}</g>` },
    zoomMore: { t: 'Zoom', p: 'Muestra los botones para acercar, alejar y encuadrar.', svg: `<g class="a-zIn">${plano}</g>` },
    fit: { t: 'Encuadrar (F)', p: 'Centra el plano completo en la pantalla.', svg: `<g class="a-fit">${plano}</g>` },
    s60: { t: 'Escala 1:60', p: 'Muestra el plano a la escala del plano original.', svg: `<g class="a-zIn">${plano}</g><g class="a-in2"><rect x="168" y="90" width="40" height="16" rx="4" fill="${C.ink}"/>${txt(188, 101, '1:60', 9, '#fff')}</g>` },
    s100: { t: 'Escala 1:100', p: 'Muestra el plano a escala 1:100, más chico, para verlo completo.', svg: `<g class="a-zOut">${plano}</g><g class="a-in2"><rect x="168" y="90" width="40" height="16" rx="4" fill="${C.ink}"/>${txt(188, 101, '1:100', 9, '#fff')}</g>` },
    undo: { t: 'Deshacer (Ctrl+Z)', p: 'Regresa el último cambio.', svg: `${room}${mesa(45, 42)}${mesa(45, 78)}<g class="a-back">${mesa(75, 60)}</g>${flecha(UNDO)}` },
    redo: { t: 'Rehacer (Ctrl+Shift+Z)', p: 'Vuelve a aplicar el cambio que deshiciste.', svg: `${room}${mesa(45, 42)}${mesa(45, 78)}<g class="a-drag">${mesa(75, 60)}</g>${flecha(REDO)}` },
    fullscreen: { t: 'Pantalla completa (Shift+F)', p: 'Usa toda la pantalla para el plano. Esc para salir.',
      svg: `<g class="a-grow">${plano}</g>` },
    file: { t: 'Archivo', p: 'Exporta una imagen del plano, guarda o abre un diseño, o vuelve al diseño inicial.',
      svg: `${plano}<g class="a-in2"><rect x="110" y="20" width="96" height="78" rx="6" fill="#fff" stroke="${C.soft}" stroke-width="1.5"/>${['Exportar imagen', 'Exportar diseño', 'Importar diseño', 'Diseño inicial'].map((s, i) => txt(158, 38 + i * 17, s, 9, i === 3 ? '#b3372a' : C.ink, 400)).join('')}</g>` },
    exportPng: { t: 'Exportar imagen', p: 'Descarga una imagen del plano para mandarla o imprimirla.', svg: `${plano}<g class="a-in2"><circle cx="186" cy="92" r="14" fill="${C.accent}"/><path d="M186 84v12m-5-5 5 5 5-5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></g>` },
    exportJson: { t: 'Exportar diseño', p: 'Descarga un archivo con el diseño para guardarlo o abrirlo después.', svg: `${plano}<g class="a-in2"><circle cx="186" cy="92" r="14" fill="${C.accent}"/><path d="M186 84v12m-5-5 5 5 5-5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></g>` },
    importJson: { t: 'Importar diseño', p: 'Abre un archivo de diseño que exportaste antes.', svg: `${room}<g class="a-fade">${mesas}</g><g class="a-in2"><circle cx="186" cy="92" r="14" fill="${C.accent}"/><path d="M186 98V86m-5 5 5-5 5 5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></g>` },
    reset: { t: 'Volver al diseño inicial', p: 'Regresa el plano a como estaba al principio. Se puede deshacer.', svg: `${room}<g class="a-back">${mesas}</g>` },
    guide: { t: 'Guía', p: 'Te muestra paso a paso para qué sirve cada parte del diseñador.',
      svg: `${plano}<rect class="a-ring" x="126" y="34" width="58" height="24" rx="8" fill="none" stroke="${C.accent}" stroke-width="3"/>` },

    // Vista 3D
    orbit: { t: 'Girar', p: 'Arrastra para dar vuelta alrededor del lugar; la rueda acerca o aleja.', svg: `<g class="a-spin">${iso}</g>` },
    walk: { t: 'Recorrido', p: 'Camina por dentro del lugar a la altura de una persona.',
      svg: `${iso}<circle class="a-walk" cx="60" cy="72" r="5" fill="${C.accent}" stroke="#fff" stroke-width="1.5"/>` },
    vIso: { t: 'Isométrica', p: 'Ve el lugar en diagonal, con los muros y el piso a la vez.', svg: `<g class="a-fade">${iso}</g>` },
    vTop: { t: 'Superior', p: 'Ve el 3D desde arriba, como un plano.', svg: `<g class="a-flat">${plano}</g>` },
    wallsFull: { t: 'Muros completos', p: 'Muestra los muros a su altura real.',
      svg: `${iso}` },
    wallsCut: { t: 'Muros cortados', p: 'Baja los muros a media altura para ver mejor por dentro.',
      svg: `${piso}<g class="a-cut">${muros}</g>${mesas3d}` },
    night: { t: 'Noche', p: 'Ve el lugar de noche, con las luces encendidas.', svg: `<rect class="a-night" width="220" height="112" fill="#faf7f2"/>${iso}` },
    sun: { t: 'Sol', p: 'Mueve la hora del día para ver por dónde entra el sol y las sombras.',
      svg: `${iso}<circle class="a-sun" cx="24" cy="14" r="7" fill="#f2b84b"/>` },

    // Barra del evento (host.js)
    back: { t: 'Volver', p: 'Regresa a la lista de tus eventos. Lo que hiciste ya quedó guardado.',
      svg: `${plano}<g class="a-nudge"><circle cx="40" cy="30" r="14" fill="#fffdf8" stroke="#d8cbbd"/><path d="M47 30H33m6 6-6-6 6-6" stroke="${C.accent}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>` },
    dist: { t: 'Distribuciones', p: 'Cada letra es una versión del montaje del mismo evento. La ★ es la que recomiendas al cliente.',
      svg: `${room}<g class="a-swapA">${mesas}</g><g class="a-swapB">${mesa(65, 60)}${mesa(95, 60)}${mesa(155, 60)}<rect x="130" y="30" width="50" height="12" rx="3" fill="${C.table}" stroke="${C.gold}" stroke-width="2"/></g>
        <g class="a-swapA">${chip(140, 88, 26, 'A ★', true)}${chip(170, 88, 22, 'B', false)}</g><g class="a-swapB">${chip(140, 88, 26, 'A ★', false)}${chip(170, 88, 22, 'B', true)}</g>` },
    newDist: { t: 'Nueva distribución', p: 'Copia la distribución actual en una nueva letra para probar otra idea sin perder la anterior.',
      svg: `<g transform="translate(0 8) scale(.5)">${plano}</g><g class="a-copy" transform="translate(110 8) scale(.5)">${plano}</g>${txt(55, 80, 'A', 11, C.ink)}<g class="a-in2">${txt(165, 80, 'B', 11, C.accent)}</g>` },
    details: { t: 'Ficha', p: 'Los datos de la casa: recámaras, baños, metros y precio.',
      svg: `${plano}<g class="a-in2"><rect x="120" y="20" width="86" height="78" rx="6" fill="#fff" stroke="${C.soft}" stroke-width="1.5"/>${[36, 52, 68, 84].map(y => `<rect x="130" y="${y}" width="${y === 36 ? 50 : 66}" height="7" rx="2" fill="${y === 36 ? C.accent : C.soft}"/>`).join('')}</g>` },
    share: { t: 'Compartir', p: 'Crea un enlace de solo vista para que tu cliente vea el montaje y te deje comentarios.',
      svg: `<g transform="translate(6 12) scale(.5)">${plano}</g><rect x="150" y="10" width="52" height="92" rx="9" fill="#fff" stroke="${C.wall}" stroke-width="2"/><g class="a-fly"><rect x="84" y="46" width="44" height="16" rx="8" fill="${C.accent}"/>${txt(106, 57, 'enlace', 8, '#fff')}</g><g class="a-in2" transform="translate(154 30) scale(.24)">${plano}</g>` },
    comments: { t: 'Comentarios del cliente', p: 'Lo que tu cliente te escribió desde el enlace, junto a la mesa o pieza de la que habla.',
      svg: `${plano}<g class="a-pop"><path d="M80 14h70a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H96l-10 8v-8h-6a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6z" fill="#fff" stroke="${C.accent}" stroke-width="1.5"/>${txt(115, 31, 'Acerca esta mesa', 8, C.ink, 400)}</g>` },
    status: { t: 'Guardado automático', p: 'Tus cambios se guardan solos.',
      svg: `${room}${mesa(45, 42)}${mesa(45, 78)}<g class="a-drag">${mesa(75, 60)}</g><g class="a-in2"><rect x="156" y="84" width="44" height="18" rx="9" fill="#fff" stroke="${C.soft}"/>${txt(178, 97, '✓', 11, '#15803d')}</g>` },
    comment: { t: 'Comentar', p: 'Escríbele al organizador sobre el montaje; si tocas antes una mesa, el comentario queda junto a ella.',
      svg: `${plano}<g class="a-pop"><path d="M80 14h70a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H96l-10 8v-8h-6a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6z" fill="#fff" stroke="${C.accent}" stroke-width="1.5"/>${txt(115, 31, 'Acerca esta mesa', 8, C.ink, 400)}</g>` },
    furnHouse: { t: 'Amueblada / Sin muebles', p: 'Ve la casa con muebles o vacía.', svg: `${room}<g class="a-fade">${mesas}</g>` },
    whatsapp: { t: 'WhatsApp', p: 'Abre WhatsApp con un mensaje listo para el negocio.',
      svg: `${plano}<g class="a-pop"><circle cx="186" cy="88" r="16" fill="#25d366"/><path d="M179 95l1.6-4.6a8 8 0 1 1 3 3z" fill="#fff"/></g>` },
  };

  // Botón → ayuda. El primero que coincide gana.
  const MAPA = [
    ['#layers [data-layer]', el => el.dataset.layer],
    ['#toggles3d [data-t="furn"]', 'furn'], ['#toggles3d [data-t="labels"]', 'labels'], ['#toggles3d [data-t="night"]', 'night'],
    ['#tgLib', 'lib'], ['#tgPanel', 'panel'], ['#clearAll', 'clear'],
    ['[data-view="2d"]', 'v2d'], ['[data-view="3d"]', 'v3d'],
    ['[data-tool="select"]', 'select'], ['[data-tool="measure"]', 'measure'], ['[data-tool="demolish"]', 'demolish'],
    ['#zoomOut', 'zoomOut'], ['#zoomIn', 'zoomIn'], ['#zoomMore', 'zoomMore'], ['#fit', 'fit'], ['#s60', 's60'], ['#s100', 's100'],
    ['#undo', 'undo'], ['#redo', 'redo'], ['#fullscreen', 'fullscreen'],
    ['details.menu > summary', 'file'], ['#exportPng', 'exportPng'], ['#exportJson', 'exportJson'], ['#importJson', 'importJson'], ['#reset', 'reset'],
    ['#guiaBtn', 'guide'],
    ['[data-mode="orbit"]', 'orbit'], ['[data-mode="walk"]', 'walk'], ['#vIso', 'vIso'], ['#vTop', 'vTop'],
    ['[data-cut="2.8"]', 'wallsFull'], ['[data-cut="1.2"]', 'wallsCut'], ['label.range:has(#sun)', 'sun'],
    ['#hostBack', 'back'], ['#hostBar [data-dist]', 'dist'], ['#hostBar [data-a="new"]', 'newDist'], ['#hostBar [data-a="details"]', 'details'],
    ['#hostBar [data-a="share"]', 'share'], ['#hostBar [data-a="comments"]', 'comments'], ['#hostStatus', 'status'],
    ['#hostBar [data-a="comment"]', 'comment'], ['#hostBar [data-a="furn"]', 'furnHouse'], ['#hostBar a[href^="https://wa.me/"]', 'whatsapp'],
  ];
  const extra = {}; // ayudas que cambia host.js (texto del guardado, nombre de la página de volver)

  const css = document.createElement('style');
  css.textContent = `
  .pl-ayuda{position:fixed;z-index:2147480000;width:236px;background:#fff;border-radius:14px;box-shadow:0 14px 36px rgba(28,25,23,.22);padding:10px 12px 12px;
    font:13px/1.4 'DM Sans',system-ui,sans-serif;color:#1c1917;pointer-events:none;opacity:0;transform:translateY(4px);transition:opacity .15s,transform .15s}
  .pl-ayuda.on{opacity:1;transform:none}
  .pl-ayuda b{display:block;font:700 14px 'Sora','DM Sans',sans-serif;margin-bottom:6px}
  .pl-ayuda svg{display:block;width:100%;height:auto;background:#faf7f2;border-radius:10px}
  .pl-ayuda p{margin:8px 0 0;color:#57534e}
  .pl-ayuda svg *{transform-box:fill-box}
  .pl-ayuda .a-fade{animation:aFade 2.4s ease-in-out infinite}
  .pl-ayuda .a-out{animation:aOut 2.4s ease-in-out infinite}
  .pl-ayuda .a-in2{animation:aIn2 2.4s ease-in-out infinite}
  .pl-ayuda .a-pulse{animation:aPulse 2.4s ease-in-out infinite}
  .pl-ayuda .a-slide{animation:aSlide 2.4s cubic-bezier(.3,.7,.3,1) infinite;transform-origin:center}
  .pl-ayuda .a-drag{animation:aDrag 2.4s cubic-bezier(.3,.7,.3,1) infinite}
  .pl-ayuda .a-back{animation:aBack 2.4s cubic-bezier(.3,.7,.3,1) infinite}
  .pl-ayuda .a-draw{stroke-dasharray:1;animation:aDraw 2.4s ease-in-out infinite}
  .pl-ayuda .a-inL{animation:aInL 2.4s cubic-bezier(.3,.7,.3,1) infinite}
  .pl-ayuda .a-inR{animation:aInR 2.4s cubic-bezier(.3,.7,.3,1) infinite}
  .pl-ayuda .a-zIn{transform-origin:center;transform-box:view-box;animation:aZIn 2.4s ease-in-out infinite}
  .pl-ayuda .a-zOut{transform-origin:center;transform-box:view-box;animation:aZOut 2.4s ease-in-out infinite}
  .pl-ayuda .a-fit{transform-origin:center;transform-box:view-box;animation:aFit 2.4s ease-in-out infinite}
  .pl-ayuda .a-grow{transform-origin:center;transform-box:view-box;animation:aGrow 2.4s ease-in-out infinite}
  .pl-ayuda .a-flat{transform-origin:center;transform-box:view-box;animation:aFlat 2.4s ease-in-out infinite}
  .pl-ayuda .a-spin{transform-origin:110px 60px;transform-box:view-box;animation:aSpin 3s ease-in-out infinite}
  .pl-ayuda .a-walk{animation:aWalk 3s ease-in-out infinite}
  .pl-ayuda .a-cut{transform-origin:bottom;animation:aCut 2.4s ease-in-out infinite}
  .pl-ayuda .a-night{animation:aNight 2.4s ease-in-out infinite}
  .pl-ayuda .a-sun{animation:aSun 3s ease-in-out infinite}
  .pl-ayuda .a-ring{animation:aRing 1.4s ease-in-out infinite}
  .pl-ayuda .a-nudge{animation:aNudge 1.6s ease-in-out infinite}
  .pl-ayuda .a-swapA{animation:aSwapA 3s step-end infinite}
  .pl-ayuda .a-swapB{animation:aSwapB 3s step-end infinite}
  .pl-ayuda .a-copy{animation:aCopy 2.4s cubic-bezier(.3,.7,.3,1) infinite}
  .pl-ayuda .a-fly{animation:aFly 2.4s cubic-bezier(.3,.7,.3,1) infinite}
  .pl-ayuda .a-pop{transform-origin:center;animation:aPop 2.4s cubic-bezier(.3,.7,.3,1) infinite}
  @keyframes aFade{0%,15%{opacity:0}35%,80%{opacity:1}100%{opacity:0}}
  @keyframes aOut{0%,20%{opacity:1}40%,80%{opacity:0}100%{opacity:1}}
  @keyframes aIn2{0%,40%{opacity:0}55%,85%{opacity:1}100%{opacity:0}}
  @keyframes aPulse{0%,20%{stroke:#3d3a34;stroke-width:4}45%,80%{stroke:#000;stroke-width:7}100%{stroke:#3d3a34;stroke-width:4}}
  @keyframes aSlide{0%,15%{transform:translate(0,0) rotate(-12deg)}55%,85%{transform:translate(-38px,14px) rotate(0)}100%{transform:translate(0,0) rotate(-12deg)}}
  @keyframes aDrag{0%,15%{transform:translate(0,0)}55%,85%{transform:translate(70px,0)}100%{transform:translate(0,0)}}
  @keyframes aBack{0%,15%{transform:translate(70px,0)}55%,85%{transform:translate(0,0)}100%{transform:translate(70px,0)}}
  @keyframes aDraw{0%,15%{stroke-dashoffset:1}50%,85%{stroke-dashoffset:0}100%{stroke-dashoffset:1}}
  @keyframes aInL{0%,15%{transform:translateX(-80px);opacity:0}45%,85%{transform:none;opacity:1}100%{transform:translateX(-80px);opacity:0}}
  @keyframes aInR{0%,15%{transform:translateX(80px);opacity:0}45%,85%{transform:none;opacity:1}100%{transform:translateX(80px);opacity:0}}
  @keyframes aZIn{0%,15%{transform:none}50%,85%{transform:scale(1.45)}100%{transform:none}}
  @keyframes aZOut{0%,15%{transform:none}50%,85%{transform:scale(.62)}100%{transform:none}}
  @keyframes aFit{0%,15%{transform:translate(-50px,22px) scale(.55)}50%,85%{transform:none}100%{transform:translate(-50px,22px) scale(.55)}}
  @keyframes aGrow{0%,15%{transform:scale(.6)}50%,85%{transform:scale(1.08)}100%{transform:scale(.6)}}
  @keyframes aFlat{0%,15%{transform:skewX(-28deg) scaleY(.55)}50%,85%{transform:none}100%{transform:skewX(-28deg) scaleY(.55)}}
  @keyframes aSpin{0%,10%{transform:rotate(0)}50%,60%{transform:rotate(18deg)}100%{transform:rotate(0)}}
  @keyframes aWalk{0%{transform:translate(0,0)}30%{transform:translate(50px,-16px)}60%{transform:translate(100px,4px)}100%{transform:translate(0,0)}}
  @keyframes aCut{0%,15%{transform:none}50%,85%{transform:scaleY(.4)}100%{transform:none}}
  @keyframes aNight{0%,15%{fill:#faf7f2}50%,85%{fill:#1f2a44}100%{fill:#faf7f2}}
  @keyframes aSun{0%{transform:translate(0,30px)}50%{transform:translate(86px,0)}100%{transform:translate(172px,30px)}}
  @keyframes aRing{50%{stroke-width:6;opacity:.6}}
  @keyframes aNudge{0%,100%{transform:none}50%{transform:translateX(-8px)}}
  @keyframes aSwapA{0%{opacity:1}50%{opacity:0}}
  @keyframes aSwapB{0%{opacity:0}50%{opacity:1}}
  @keyframes aCopy{0%,15%{transform:translate(0,8px) scale(.5);opacity:0}55%,85%{transform:translate(110px,8px) scale(.5);opacity:1}100%{transform:translate(110px,8px) scale(.5);opacity:0}}
  @keyframes aFly{0%,15%{transform:translateX(-30px);opacity:0}45%{opacity:1}60%,85%{transform:translateX(60px);opacity:0}100%{opacity:0}}
  @keyframes aPop{0%,20%{transform:scale(.4);opacity:0}40%,85%{transform:none;opacity:1}100%{transform:scale(.4);opacity:0}}
  @media (prefers-reduced-motion:reduce){.pl-ayuda svg *{animation:none!important}}
  @media (pointer:coarse){header .btn,header summary,#hostBack{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}}`;
  document.head.appendChild(css);

  const ayudaDe = el => {
    if (extra[el.id]) return { ...AYUDAS[extra[el.id].key], ...extra[el.id].o };
    for (const [sel, k] of MAPA) if (el.matches(sel)) return AYUDAS[typeof k === 'function' ? k(el) : k];
    return null;
  };
  const objetivo = node => {
    for (let n = node; n && n !== document.body && n.nodeType === 1; n = n.parentElement) {
      if (n.closest('.pl-ayuda')) return null;
      if (ayudaDe(n)) return n;
    }
    return null;
  };

  let tip = null, timer = null, actual = null;
  const textoDe = a => typeof a.p === 'function' ? a.p() : a.p;
  const hide = () => { clearTimeout(timer); actual = null; if (tip) { tip.remove(); tip = null; } };
  function show(btn) {
    const a = ayudaDe(btn);
    hide();
    if (!a || !btn.isConnected) return;
    // La ayuda reemplaza el globito del navegador (title), que tapaba la tarjeta; el nombre queda para lectores de pantalla.
    if (btn.title) { if (!btn.getAttribute('aria-label') && !btn.textContent.trim()) btn.setAttribute('aria-label', btn.title); btn.removeAttribute('title'); }
    actual = btn;
    tip = document.createElement('div');
    tip.className = 'pl-ayuda';
    tip.setAttribute('role', 'tooltip');
    tip.innerHTML = `<b>${a.t}</b><svg viewBox="0 0 220 112" aria-hidden="true">${a.svg}</svg><p></p>`;
    tip.querySelector('p').textContent = textoDe(a);
    document.body.appendChild(tip);
    const r = btn.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
    let top = r.bottom + 8;
    if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 8);
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    requestAnimationFrame(() => tip && tip.classList.add('on'));
  }

  // Computadora: cursor encima medio segundo.
  const hover = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);
  document.addEventListener('mouseover', e => {
    const btn = objetivo(e.target);
    if (btn === actual && tip) return;
    clearTimeout(timer);
    if (!btn) { if (tip && actual && !actual.contains(e.target)) hide(); return; }
    if (tip) hide();
    timer = setTimeout(() => show(btn), 500);
  });
  document.addEventListener('mouseout', e => { if (!e.relatedTarget || !objetivo(e.relatedTarget)) { clearTimeout(timer); if (tip) hide(); } });
  document.addEventListener('mousedown', hide, true);

  // Celular: toque largo. Se cancela si el dedo se mueve (para deslizar la barra) y el toque que lo abrió no cuenta como clic.
  let lp = null;
  document.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    const btn = objetivo(e.target);
    if (!btn) return;
    lp = { btn, x: e.clientX, y: e.clientY, shown: false, t: setTimeout(() => { lp.shown = true; show(btn); }, 500) };
  }, true);
  document.addEventListener('pointermove', e => { if (lp && !lp.shown && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 10) { clearTimeout(lp.t); lp = null; } }, true);
  const soltar = () => { if (!lp) return; clearTimeout(lp.t); if (lp.shown) setTimeout(hide, 1200); else lp = null; };
  document.addEventListener('pointerup', soltar, true);
  document.addEventListener('pointercancel', soltar, true);
  document.addEventListener('click', e => { if (lp?.shown && lp.btn.contains(e.target)) { e.preventDefault(); e.stopPropagation(); } lp = null; }, true);
  document.addEventListener('contextmenu', e => { if (lp && objetivo(e.target)) e.preventDefault(); }, true);
  addEventListener('scroll', hide, true);

  window.plAyuda = {
    hover,
    // Cambia la ayuda de un botón con id (p puede ser una función, se lee al mostrar).
    bind(el, key, o = {}) { extra[el.id] = { key, o }; },
    // Vuelve a escribir la frase si la tarjeta de ese botón está abierta (el guardado cambia de estado).
    refresh(el) { if (tip && actual === el) { const a = ayudaDe(el); if (a) tip.querySelector('p').textContent = textoDe(a); } },
  };
})();
