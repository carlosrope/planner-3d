// Guía en pantalla del diseñador: ventana al centro con 4 pasos (Siguiente / Saltar) que se abre
// una vez por proyecto (en la demo y el 3D público, una vez por dispositivo; localStorage) y se vuelve a
// abrir con el botón "?" junto al título. Datos: window.__GUIA__ = { kind: "salon" | "casa",
// mode: "demo" | "lugar" | "edit", eventId?, eventKind?: "boda" | "xv" | "graduacion" | "corporativo" | "otro" }.
// La carga src/lib/designer/page.ts → designerResponse (no en el enlace de solo vista del cliente).
// Cada paso resalta el botón del que habla (Propiedades, Catálogo, Vista 3D, Compartir).
(function () {
  const G = window.__GUIA__;
  if (!G) return;
  const KEY = 'plantea-guia-' + (G.eventId ? 'evento-' + G.eventId : (G.kind === 'salon' ? 'salon' : 'casa') + '-v1');
  // Un solo ejemplo, el que le toca al proyecto: una mesa con nombre según el tipo de evento.
  const MESA = { boda: 'Familia de la novia', xv: 'Amigas de la quinceañera', graduacion: 'Generación 2026', corporativo: 'Recursos Humanos', otro: 'Familia' };
  const mesa = MESA[G.eventKind] || MESA.boda;
  const QUIEN = { boda: 'a tu familia y a tus invitados', xv: 'a tu familia', graduacion: 'a tu generación', corporativo: 'a tu equipo', otro: 'a tu familia' };
  const quien = QUIEN[G.eventKind] || QUIEN.boda;
  const touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  const dedo = touch ? 'con el dedo' : 'con el mouse';
  const toca = touch ? 'Toca' : 'Da clic en';
  const guarda = G.mode === 'edit'
    ? `Con <b>Compartir</b> mandas el enlace ${quien}; los cambios se guardan solos.`
    : 'Aquí nada se guarda: para guardar tu plano y compartirlo, entra o crea tu cuenta.';

  const pasos = G.kind === 'salon'
    ? [
        { t: 'Elige tu montaje', at: '#tgPanel',
          p: `${toca} <b>Propiedades</b>, escribe cuántos invitados tendrás y elige una <b>plantilla de montaje</b>: Plantea acomoda las mesas por ti.` },
        { t: `Mueve las mesas ${dedo}`, at: '#tgLib',
          p: `Arrastra cualquier mesa para cambiarla de lugar. En <b>Catálogo</b> hay más mesas, pista, escenario, barra y mesa de dulces: ${touch ? 'tócalos' : 'dales clic'} o arrástralos al plano.` },
        { t: 'Acomoda a tus invitados', at: '#tgPanel',
          p: `En <b>Propiedades → Lista de invitados</b> agrega a tus invitados y asígnalos a cada mesa. ${touch ? 'Toca' : 'Selecciona'} una mesa para ponerle nombre, por ejemplo "${mesa}".` },
        { t: 'Míralo en 3D y compártelo', at: G.mode === 'edit' ? '#hostBar [data-a="share"]' : '#viewSeg',
          p: `${toca} <b>Vista 3D</b> para recorrer el salón como si ya estuvieras ahí. ${guarda}` },
      ]
    : [
        { t: 'Así es la casa', at: '#viewSeg',
          p: touch ? 'Pellizca para acercar y arrastra con un dedo para moverte por el plano.' : 'Usa la rueda del mouse para acercar y arrastra el fondo para moverte por el plano.' },
        { t: 'Amuéblala a tu gusto', at: '#tgLib',
          p: `En <b>Catálogo</b> están los muebles: ${touch ? 'tócalos' : 'dales clic'} o arrástralos al plano, y muévelos ${dedo}.` },
        { t: 'Recórrela en 3D', at: '#viewSeg',
          p: `${toca} <b>Vista 3D</b> para verla por dentro o haz la visita guiada, cuarto por cuarto.` },
        { t: 'Compártela', at: G.mode === 'edit' ? '#hostBar [data-a="share"]' : '#viewSeg',
          p: G.mode === 'edit' ? 'Con <b>Compartir</b> mandas el enlace con tu marca a tu cliente.' : guarda },
      ];

  const css = document.createElement('style');
  css.textContent = `
  #guia{position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;padding:16px;
    background:rgba(20,16,12,.45);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
  #guia .caja{width:min(400px,100%);background:#fffdf8;color:#2a211a;border-radius:18px;padding:20px 20px 16px;
    box-shadow:0 18px 50px rgba(0,0,0,.3);outline:none}
  #guia .paso{margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#a4552d}
  #guia h2{margin:0 0 8px;font-size:20px;line-height:1.25}
  #guia p{margin:0;color:#4a3f36}
  #guia .puntos{display:flex;gap:6px;margin:16px 0}
  #guia .puntos i{width:8px;height:8px;border-radius:50%;background:#e4d9cc}
  #guia .puntos i.on{background:#b5603a;width:22px;border-radius:4px}
  #guia .acciones{display:flex;gap:8px;justify-content:flex-end}
  #guia button{min-height:44px;padding:0 16px;border:0;border-radius:12px;font:600 15px system-ui,-apple-system,sans-serif;cursor:pointer}
  #guia .saltar{background:transparent;color:#6b5d50;margin-right:auto}
  #guia .atras{background:#f1e9df;color:#2a211a}
  #guia .siguiente{background:#b5603a;color:#fff}
  #guia button:focus-visible{outline:3px solid #e8a37e;outline-offset:2px}
  #guia.conAro{background:transparent}
  #guiaAro{position:fixed;z-index:299;pointer-events:none;border-radius:12px;
    box-shadow:0 0 0 3px #fffdf8,0 0 0 6px #b5603a,0 0 0 9999px rgba(20,16,12,.45);transition:all .25s ease}
  #guiaAro::after{content:"";position:absolute;inset:-6px;border-radius:16px;animation:guiaLatido 1.4s ease-in-out infinite}
  @keyframes guiaLatido{50%{box-shadow:0 0 0 6px rgba(181,96,58,.35)}}
  @media (prefers-reduced-motion:reduce){#guiaAro,#guiaAro::after{transition:none;animation:none}}
  .guiaTitulo{display:flex;align-items:center;gap:8px;min-width:0}
  #guiaBtn{width:28px;height:28px;border:1px solid #d8cbbd;border-radius:50%;background:#fffdf8;color:#a4552d;
    font:700 14px system-ui,sans-serif;cursor:pointer;vertical-align:middle;flex-shrink:0}`;
  document.head.appendChild(css);

  let el = null, i = 0, foco = null;

  // El aro se pinta encima del fondo oscuro, sobre el botón del que habla el paso; su sombra
  // oscurece lo demás. Si el botón no está visible (otro modo o pantalla), solo queda el fondo.
  function resaltar(sel) {
    foco = sel ? document.querySelector(sel) : null;
    if (foco && !foco.offsetParent) foco = null;
    if (foco) {
      const tira = foco.closest('.hscroll');
      if (tira) tira.scrollLeft = foco.offsetLeft - (tira.clientWidth - foco.offsetWidth) / 2;
    }
    colocar();
  }
  function colocar() {
    let aro = document.getElementById('guiaAro');
    if (!foco || !el) { if (aro) aro.remove(); if (el) el.classList.remove('conAro'); return; }
    if (!aro) { aro = document.createElement('div'); aro.id = 'guiaAro'; document.body.appendChild(aro); }
    const r = foco.getBoundingClientRect();
    Object.assign(aro.style, { left: r.left - 4 + 'px', top: r.top - 4 + 'px', width: r.width + 8 + 'px', height: r.height + 8 + 'px' });
    el.classList.add('conAro');
  }
  addEventListener('resize', () => { if (el) colocar(); });

  function pintar() {
    const s = pasos[i];
    const ultimo = i === pasos.length - 1;
    el.querySelector('.caja').innerHTML =
      `<p class="paso">Guía rápida · ${i + 1} de ${pasos.length}</p>` +
      `<h2 id="guiaTitulo">${s.t}</h2><p>${s.p}</p>` +
      `<div class="puntos" aria-hidden="true">${pasos.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>` +
      `<div class="acciones">` +
      (ultimo ? '' : '<button type="button" class="saltar" data-g="saltar">Saltar</button>') +
      (i > 0 ? '<button type="button" class="atras" data-g="atras">Atrás</button>' : '') +
      `<button type="button" class="siguiente" data-g="siguiente">${ultimo ? 'Empezar' : 'Siguiente'}</button></div>`;
    resaltar(s.at);
    el.querySelector('.siguiente').focus();
  }

  function cerrar() {
    try { localStorage.setItem(KEY, '1'); } catch { /* sin almacenamiento */ }
    foco = null;
    if (el) el.remove();
    el = null;
    colocar();
    document.removeEventListener('keydown', teclas, true);
  }

  // Mientras la guía está abierta, las teclas no llegan a los atajos del diseñador (T, [, ], Supr…).
  function teclas(e) {
    if (!el) return;
    e.stopPropagation();
    // Enter, espacio y Tab siguen activando y recorriendo los botones de la ventana.
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Tab') return;
    e.preventDefault();
    if (e.key === 'Escape') cerrar();
    else if (e.key === 'ArrowRight' && i < pasos.length - 1) { i++; pintar(); }
    else if (e.key === 'ArrowLeft' && i > 0) { i--; pintar(); }
  }

  function abrir() {
    if (el) return;
    i = 0;
    el = document.createElement('div');
    el.id = 'guia';
    el.innerHTML = '<div class="caja" role="dialog" aria-modal="true" aria-labelledby="guiaTitulo" tabindex="-1"></div>';
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-g]');
      if (!b) return;
      const a = b.dataset.g;
      if (a === 'saltar') cerrar();
      else if (a === 'atras') { i--; pintar(); }
      else if (i === pasos.length - 1) cerrar();
      else { i++; pintar(); }
    });
    document.addEventListener('keydown', teclas, true);
    document.body.appendChild(el);
    pintar();
  }

  function montar() {
    const titulo = document.getElementById('casaTitle');
    if (titulo && !document.getElementById('guiaBtn')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.id = 'guiaBtn';
      b.textContent = '?';
      b.title = 'Ver la guía';
      b.setAttribute('aria-label', 'Ver la guía');
      b.addEventListener('click', abrir);
      // El título y el botón van en un mismo renglón (.brand es una columna).
      const fila = document.createElement('div');
      fila.className = 'guiaTitulo';
      titulo.replaceWith(fila);
      fila.append(titulo, b);
    }
    let visto = false;
    try { visto = localStorage.getItem(KEY) === '1'; } catch { /* sin almacenamiento: se muestra */ }
    // Un respiro para que el diseñador pinte el plano y los botones antes de resaltarlos.
    if (!visto) setTimeout(abrir, 600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
