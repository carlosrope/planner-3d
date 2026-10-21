// Aviso de la demostración pública (/disenador/[lugar], sin cuenta): el plano es de ejemplo y
// La administración arma el del negocio. Datos: window.__DEMO__ = { kind: "salon" | "casa", whatsapp: "52…" }.
// Con `venue` (src/lib/designer/page.ts → VenueNotice) es el 3D público de un lugar real del catálogo
// (/lugares/[slug]/3d): nada se guarda, y los botones llevan a planear ahí o al WhatsApp del lugar.
// Se cierra por pestaña (sessionStorage) y vuelve al abrir otra planta en una pestaña nueva.
(function () {
  const D = window.__DEMO__;
  if (!D) return;
  const V = D.venue || null;

  // «← Volver», a la vista arriba a la izquierda junto al nombre (en computadora y en el celular): regresa a la página
  // de Plantea de donde vino; si entró directo, a la ficha del lugar o a la portada.
  (function mountBack() {
    const title = document.getElementById('casaTitle');
    if (!title) return void document.addEventListener('DOMContentLoaded', mountBack, { once: true });
    if (document.getElementById('demoBack')) return;
    const st = document.createElement('style');
    st.textContent = `.guiaTitulo{display:flex;align-items:center;gap:8px;min-width:0}
      #demoBack{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;height:34px;padding:0 12px 0 9px;border-radius:999px;
        border:1px solid #d6d3d1;background:#fff;color:#1c1917;font:600 14px/1 'DM Sans',system-ui,sans-serif;text-decoration:none;
        box-shadow:0 1px 2px rgba(0,0,0,.06)}
      #demoBack:hover{border-color:#b5653a;color:#b5653a}
      #demoBack:focus-visible{outline:3px solid #f3c9ad;outline-offset:2px}`;
    document.head.appendChild(st);
    let row = title.parentElement;
    if (!row.classList.contains('guiaTitulo')) {
      row = document.createElement('div');
      row.className = 'guiaTitulo';
      title.replaceWith(row);
      row.append(title);
    }
    const a = document.createElement('a');
    a.id = 'demoBack';
    a.href = (V && V.backHref) || '/';
    a.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>Volver';
    a.addEventListener('click', e => {
      // Si llegó desde otra página de Plantea, regresa ahí (con su lugar en la página); si no, sigue el enlace.
      let same = false;
      try { same = !!document.referrer && new URL(document.referrer).origin === location.origin && new URL(document.referrer).pathname !== location.pathname; } catch { /* sin referencia */ }
      if (same && history.length > 1) { e.preventDefault(); history.back(); }
    });
    row.prepend(a);
  })();

  const KEY = V ? 'planner3d-aviso-lugar-' + V.name : 'planner3d-aviso-demo';
  try { if (sessionStorage.getItem(KEY) === '1') return; } catch { /* sin almacenamiento */ }
  const salon = D.kind === 'salon';
  const escape = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let texto, botones;
  if (V && V.reviewHref) {
    texto = salon
      ? 'Así quedó tu salón en 3D. Mueve mesas para probarlo; nada se guarda. Vuelve al enlace de revisión para confirmarlo.'
      : 'Así quedó tu modelo en 3D. Prueba lo que quieras; nada se guarda. Vuelve al enlace de revisión para confirmarlo.';
    botones = `<a class="entrar" href="${escape(V.reviewHref)}">Volver a revisar</a>`;
  } else if (V) {
    texto = salon
      ? `${V.name} en 3D. Mueve las mesas para probar ideas; nada se guarda.`
      : `${V.name} en 3D. Cambia muebles y pisos para probar; nada se guarda.`;
    const msg = encodeURIComponent(`Hola, vi ${V.name} en 3D en Plantea y quiero informes.`);
    botones =
      `<a class="wa" href="${escape(V.planHref)}">${salon ? 'Planear mi evento aquí' : 'Planear con este modelo'}</a>` +
      (V.whatsapp ? `<a class="entrar" href="https://wa.me/${escape(V.whatsapp)}?text=${msg}" target="_blank" rel="noopener">WhatsApp</a>` : '');
  } else {
    texto = salon
      ? 'Este es un salón de ejemplo. ¿Quieres el tuyo en 3D para tus eventos?'
      : 'Esta es una casa de ejemplo. ¿Quieres tus modelos en 3D para venderlos?';
    const mensaje = encodeURIComponent(
      salon ? 'Hola, vi el salón de ejemplo en Plantea y quiero el mío en 3D.'
            : 'Hola, vi la casa de ejemplo en Plantea y quiero mis modelos en 3D.',
    );
    botones =
      `<a class="wa" href="https://wa.me/${escape(D.whatsapp)}?text=${mensaje}" target="_blank" rel="noopener">Escríbenos</a>` +
      `<a class="entrar" href="/entrar">Entrar</a>`;
  }

  const css = document.createElement('style');
  css.textContent = `
  #demoAviso{position:fixed;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:140;
    display:flex;align-items:center;gap:10px;max-width:min(560px,calc(100vw - 24px));padding:10px 12px 10px 14px;
    background:rgba(28,24,20,.94);color:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.28);
    font:14px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
  #demoAviso p{margin:0;flex:1;min-width:0}
  #demoAviso .acciones{display:flex;gap:6px;flex-shrink:0}
  #demoAviso a{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:0 12px;border-radius:10px;
    text-decoration:none;font-weight:600;font-size:13px;white-space:nowrap}
  #demoAviso a.wa{background:#25d366;color:#fff}
  #demoAviso a.entrar{background:rgba(255,255,255,.12);color:#fff}
  #demoAviso button{flex-shrink:0;width:32px;height:32px;border:0;border-radius:50%;background:transparent;color:#fff;
    font-size:20px;line-height:1;cursor:pointer;opacity:.75}
  #demoAviso button:active{opacity:1}
  @media (max-width:520px){#demoAviso{flex-wrap:wrap;padding:12px}#demoAviso p{flex-basis:100%}#demoAviso .acciones{flex:1}#demoAviso a{flex:1}}`;
  document.head.appendChild(css);

  const el = document.createElement('div');
  el.id = 'demoAviso';
  el.setAttribute('role', 'note');
  el.innerHTML =
    `<p>${escape(texto)}</p>` +
    `<span class="acciones">${botones}</span>` +
    `<button type="button" aria-label="Cerrar aviso">×</button>`;
  el.querySelector('button').addEventListener('click', () => {
    try { sessionStorage.setItem(KEY, '1'); } catch { /* sin almacenamiento */ }
    el.remove();
  });
  const mount = () => document.body.appendChild(el);
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
