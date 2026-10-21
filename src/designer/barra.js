// Barra del diseñador más sencilla (revisión del 21 de octubre de 2026): lo que se usa poco se guarda en dos menús,
// «Capas» (en el plano 2D: cotas, cuartos, muebles, cuadrícula, muros de carga e imán a muros) y «Ver» (en el 3D:
// isométrica o superior, muros completos o cortados, muebles, nombres, noche y la hora del sol); el zoom pasa a
// botones flotantes en la esquina del plano, como en un mapa, y la escala 1:60 / 1:100 sale de la barra. Exportar e
// importar el JSON del plano tampoco sale (no le sirve a quien planea su evento). Los botones se mueven, no se
// copian: siguen funcionando igual. Lo carga src/lib/designer/page.ts (no en la portada incrustada).
(function () {
  const ready = fn => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn());
  ready(() => {
    const header = document.querySelector('header');
    const stage = document.getElementById('stage');
    if (!header || !stage) return;

    const css = document.createElement('style');
    css.textContent = `
    .vmenu{position:relative}
    .vmenu>summary{list-style:none;display:inline-flex;align-items:center;gap:6px;cursor:pointer;border:1px solid var(--line);background:#fff;border-radius:8px;padding:6px 10px 6px 12px}
    .vmenu>summary::-webkit-details-marker{display:none}
    .vmenu>summary svg{width:16px;height:16px;flex:none;transition:transform .2s}
    .vmenu[open]>summary{border-color:#b5653a;color:#b5653a}
    .vmenu[open]>summary svg.caret{transform:rotate(180deg)}
    .vpop{position:fixed;z-index:1200;display:grid;gap:10px;min-width:230px;padding:12px;border-radius:14px;
      background:#fffdf9;border:1px solid #ece5da;box-shadow:0 14px 36px rgba(28,25,23,.2)}
    .vpop[hidden]{display:none!important}
    .vpop h4{margin:0;font:700 11px/1 'DM Sans',system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#b5653a}
    .vpop .grp{display:flex!important;flex-wrap:wrap;gap:6px;margin:0;border:0;padding:0;background:none;box-shadow:none}
    .vpop .range{display:flex;align-items:center;gap:8px}
    .vpop .range input{flex:1;width:auto!important}
    #zoomFloat{position:absolute;right:14px;bottom:14px;z-index:5;display:flex;flex-direction:column;gap:2px;padding:4px;border-radius:12px;
      background:rgba(255,253,249,.96);border:1px solid #ece5da;box-shadow:0 6px 18px rgba(28,25,23,.14)}
    #zoomFloat .btn{display:flex!important;align-items:center;justify-content:center;width:38px;height:38px;min-width:0;padding:0;border:0;border-radius:9px;
      background:none;font-size:20px;line-height:1}
    #zoomFloat .btn:hover{background:#f3ece2}
    #zoomFloat svg{width:18px;height:18px}
    @media (min-width:1101px){header .vmenu.capas{order:9} header .vmenu.ver{order:10}}
    @media (max-width:600px){.vpop{left:10px!important;right:10px;min-width:0}
      .hscroll:has(.vmenu[open]){-webkit-mask-image:none!important;mask-image:none!important}}`;
    document.head.appendChild(css);

    const caret = '<svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9.5 12 14.5 17 9.5"/></svg>';
    const ICON = {
      capas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
      ver: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    };

    /** Menú desplegable con secciones [título, nodo]; `only` = only2d u only3d. */
    function menu(cls, only, label, sections) {
      const d = document.createElement('details');
      d.className = `vmenu ${cls} ${only}`;
      d.innerHTML = `<summary class="btn">${ICON[cls]}<span>${label}</span>${caret}</summary><div class="vpop" role="group" aria-label="${label}"></div>`;
      const pop = d.querySelector('.vpop');
      sections.forEach(([title, node]) => {
        if (!node) return;
        if (title) pop.insertAdjacentHTML('beforeend', `<h4>${title}</h4>`);
        pop.appendChild(node);
      });
      // La lista vive en <body> (dentro de la barra la taparían los paneles) y se coloca bajo el botón al abrir
      pop.hidden = true;
      document.body.appendChild(pop);
      d._pop = pop;
      d.addEventListener('toggle', () => {
        pop.hidden = !d.open;
        if (!d.open) return;
        document.querySelectorAll('.vmenu[open]').forEach(o => { if (o !== d) o.open = false; });
        // Fija bajo el botón (la barra y los paneles recortarían una lista absoluta)
        const r = d.querySelector('summary').getBoundingClientRect();
        pop.style.top = `${r.bottom + 8}px`;
        if (!matchMedia('(max-width:600px)').matches) pop.style.left = `${Math.max(10, Math.min(r.left, innerWidth - 250))}px`;
      });
      return d;
    }

    // «Capas» (plano 2D)
    const layers = document.getElementById('layers');
    if (layers) {
      const m = menu('capas', 'only2d', 'Capas', [['Qué se ve en el plano', layers]]);
      (header.querySelector('.hscroll') || header).appendChild(m);
    }

    // «Ver» (vista 3D)
    const cam = document.getElementById('vIso')?.closest('.grp');
    const cut = document.querySelector('[data-cut]')?.closest('.grp');
    const show = document.getElementById('toggles3d');
    const sun = document.getElementById('sun')?.closest('.grp');
    if (cam || cut || show || sun) {
      const m = menu('ver', 'only3d', 'Ver', [['Cámara', cam], ['Muros', cut], ['Mostrar', show], ['Hora del sol', sun]]);
      (header.querySelector('.hscroll') || header).appendChild(m);
    }

    // Cerrar al tocar fuera o con Esc
    document.addEventListener('pointerdown', e => {
      document.querySelectorAll('.vmenu[open]').forEach(d => { if (!d.contains(e.target) && !d._pop?.contains(e.target)) d.open = false; });
    }, true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.vmenu[open]').forEach(d => { d.open = false; }); });

    // Zoom flotante en la esquina del plano (− / + / ajustar); la escala 1:60 y 1:100 sale de la barra
    const zg = document.getElementById('zoomGrp');
    const zin = document.getElementById('zoomIn'), zout = document.getElementById('zoomOut'), fit = document.getElementById('fit');
    if (zg && zin && zout && fit) {
      const f = document.createElement('div');
      f.id = 'zoomFloat';
      f.className = 'only2d';
      f.setAttribute('role', 'group');
      f.setAttribute('aria-label', 'Zoom');
      [zin, zout, fit].forEach(b => { delete b.dataset.en; b.removeAttribute('data-en'); b.classList.remove('zx'); f.appendChild(b); });
      zin.setAttribute('aria-label', 'Acercar'); zin.title = 'Acercar';
      zout.setAttribute('aria-label', 'Alejar'); zout.title = 'Alejar';
      fit.setAttribute('aria-label', 'Ver todo el plano'); fit.title = 'Ver todo el plano (F)';
      fit.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>';
      stage.appendChild(f);
      zg.hidden = true;
      zg.style.display = 'none';
    }

    // Archivo: sin exportar ni importar el JSON del plano
    ['exportJson', 'importJson'].forEach(id => { const b = document.getElementById(id); if (b) { b.hidden = true; b.style.display = 'none'; } });
  });
})();
