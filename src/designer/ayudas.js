// Ayudas al pasar el cursor (solo computadora): sobre Cotas, Cuartos, Muebles, Cuadrícula, Muros de carga e Imán a
// muros aparece junto al botón una tarjeta con una animación corta y una frase de qué hace. En celular no se carga
// (no hay "pasar el cursor"); ahí se podría abrir con un toque largo más adelante.
(function () {
  if (!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
  const C = { wall: '#3d3a34', room: '#f6f1ea', accent: '#b5653a', soft: '#e7ded3', table: '#fff', gold: '#c9a24a' };
  const room = `<rect x="20" y="16" width="180" height="88" fill="${C.room}" stroke="${C.wall}" stroke-width="4"/><line x1="110" y1="16" x2="110" y2="104" stroke="${C.wall}" stroke-width="3"/>`;
  const mesa = (x, y, k = '') => `<g class="${k}"><circle cx="${x}" cy="${y}" r="9" fill="${C.table}" stroke="${C.gold}" stroke-width="2"/></g>`;
  const AYUDAS = {
    dims: {
      t: 'Cotas',
      p: 'Muestra u oculta las medidas de los muros.',
      svg: `${room}<g class="a-fade"><line x1="20" y1="8" x2="200" y2="8" stroke="${C.accent}" stroke-width="1.5"/><line x1="20" y1="4" x2="20" y2="12" stroke="${C.accent}" stroke-width="1.5"/><line x1="200" y1="4" x2="200" y2="12" stroke="${C.accent}" stroke-width="1.5"/>
        <rect x="88" y="1" width="44" height="12" rx="3" fill="#fff"/><text x="110" y="10.5" font-size="9" text-anchor="middle" fill="${C.accent}" font-weight="700">18.0 m</text></g>`,
    },
    labels: {
      t: 'Cuartos',
      p: 'Muestra u oculta el nombre y el área de cada cuarto.',
      svg: `${room}<g class="a-fade"><text x="65" y="58" font-size="11" text-anchor="middle" fill="${C.wall}" font-weight="700">Salón</text><text x="65" y="71" font-size="8" text-anchor="middle" fill="#78716c">923 m²</text>
        <text x="155" y="58" font-size="11" text-anchor="middle" fill="${C.wall}" font-weight="700">Cocina</text><text x="155" y="71" font-size="8" text-anchor="middle" fill="#78716c">73 m²</text></g>`,
    },
    furn: {
      t: 'Muebles',
      p: 'Muestra u oculta todos los muebles para ver el plano limpio.',
      svg: `${room}<g class="a-fade">${mesa(45, 42)}${mesa(75, 42)}${mesa(45, 78)}${mesa(75, 78)}<rect x="130" y="40" width="50" height="12" rx="3" fill="${C.table}" stroke="${C.gold}" stroke-width="2"/></g>`,
    },
    grid: {
      t: 'Cuadrícula',
      p: 'Pone una cuadrícula de 1 m para medir y alinear a ojo.',
      svg: `${room}<g class="a-fade" stroke="${C.accent}" stroke-opacity=".35" stroke-width="1">${[40, 60, 80, 100, 120, 140, 160, 180].map(x => `<line x1="${x}" y1="18" x2="${x}" y2="102"/>`).join('')}${[36, 56, 76, 96].map(y => `<line x1="22" y1="${y}" x2="198" y2="${y}"/>`).join('')}</g>`,
    },
    bearing: {
      t: 'Muros de carga',
      p: 'Resalta en negro los muros que sostienen la construcción y no se pueden quitar.',
      svg: `${room.replace('stroke-width="4"', 'stroke-width="4" class="a-pulse"')}`,
    },
    wallSnap: {
      t: 'Imán a muros',
      p: 'Al arrastrar un mueble cerca de un muro, se pega solo y queda derecho.',
      svg: `${room}<rect class="a-slide" x="60" y="70" width="44" height="14" rx="3" fill="${C.table}" stroke="${C.gold}" stroke-width="2"/>`,
    },
  };
  const css = document.createElement('style');
  css.textContent = `
  .pl-ayuda{position:fixed;z-index:2147480000;width:236px;background:#fff;border-radius:14px;box-shadow:0 14px 36px rgba(28,25,23,.22);padding:10px 12px 12px;
    font:13px/1.4 'DM Sans',system-ui,sans-serif;color:#1c1917;pointer-events:none;opacity:0;transform:translateY(4px);transition:opacity .15s,transform .15s}
  .pl-ayuda.on{opacity:1;transform:none}
  .pl-ayuda b{display:block;font:700 14px 'Sora','DM Sans',sans-serif;margin-bottom:6px}
  .pl-ayuda svg{display:block;width:100%;height:auto;background:#faf7f2;border-radius:10px}
  .pl-ayuda p{margin:8px 0 0;color:#57534e}
  .pl-ayuda .a-fade{animation:aFade 2.4s ease-in-out infinite}
  .pl-ayuda .a-pulse{animation:aPulse 2.4s ease-in-out infinite}
  .pl-ayuda .a-slide{animation:aSlide 2.4s cubic-bezier(.3,.7,.3,1) infinite}
  @keyframes aFade{0%,15%{opacity:0}35%,80%{opacity:1}100%{opacity:0}}
  @keyframes aPulse{0%,20%{stroke:#3d3a34;stroke-width:4}45%,80%{stroke:#000;stroke-width:7}100%{stroke:#3d3a34;stroke-width:4}}
  @keyframes aSlide{0%,15%{transform:translate(0,0) rotate(-12deg)}55%,85%{transform:translate(-38px,14px) rotate(0)}100%{transform:translate(0,0) rotate(-12deg)}}
  .pl-ayuda .a-slide{transform-box:fill-box;transform-origin:center}`;
  document.head.appendChild(css);

  let tip = null, timer = null;
  const hide = () => { clearTimeout(timer); if (tip) { tip.remove(); tip = null; } };
  function show(btn, a) {
    hide();
    tip = document.createElement('div');
    tip.className = 'pl-ayuda';
    tip.setAttribute('role', 'tooltip');
    tip.innerHTML = `<b>${a.t}</b><svg viewBox="0 0 220 112" aria-hidden="true">${a.svg}</svg><p>${a.p}</p>`;
    document.body.appendChild(tip);
    const r = btn.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    let left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
    let top = r.bottom + 8;
    if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 8);
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    requestAnimationFrame(() => tip && tip.classList.add('on'));
  }
  function bind() {
    document.querySelectorAll('#layers [data-layer]').forEach(btn => {
      const a = AYUDAS[btn.dataset.layer];
      if (!a || btn.dataset.ayuda) return;
      btn.dataset.ayuda = '1';
      // La ayuda reemplaza el globito del navegador (title), que tapaba la tarjeta.
      btn.removeAttribute('title');
      btn.addEventListener('mouseenter', () => { clearTimeout(timer); timer = setTimeout(() => show(btn, a), 350); });
      btn.addEventListener('mouseleave', hide);
      btn.addEventListener('click', hide);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
  addEventListener('scroll', hide, true);
})();
