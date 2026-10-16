// Interfaz del diseñador definida por la administración (window.__UI__, src/lib/ui-config.ts): tamaño de la barra de
// arriba y de los paneles, orden y visibilidad de los grupos de la barra. Se aplica a todos. Si entra un administrador
// (window.__UI_ADMIN__), aparece el botón "⚙ Interfaz" para editarla en vivo y guardarla para todos (PUT /api/ui).
(function () {
  const MIN = 0.8, MAX = 1.4;
  const clone = o => JSON.parse(JSON.stringify(o));
  const DEFAULT = { panelOrder: [], toolbarOrder: [], toolbarHidden: [], scale: { toolbar: 1, panels: 1 } };
  let ui = Object.assign(clone(DEFAULT), clone(window.__UI__ || {}));
  ui.scale = Object.assign({ toolbar: 1, panels: 1 }, ui.scale || {});

  const style = document.createElement('style');
  document.head.appendChild(style);

  // Grupos de la barra de arriba: cada .grp con una clave estable (su id, o el de su primer botón).
  const header = () => document.querySelector('.app > header') || document.querySelector('header');
  const groups = () => {
    const h = header();
    // Grupos de botones, el botón de pantalla completa y el menú Archivo (todo lo que se ve en la barra).
    const sel = ':scope > .grp, :scope > .hscroll > .grp, :scope > .hscroll > #fullscreen, :scope > #fullscreen, :scope > .hscroll > details.menu, :scope > details.menu';
    return h ? [...h.querySelectorAll(sel)] : [];
  };
  const keyOf = g => g.id || (g.matches('details.menu') ? 'archivo' : '') || g.querySelector('[id]')?.id || g.querySelector('[data-mode],[data-view],[data-cam]')?.getAttribute('data-mode') || (g.textContent || '').trim().slice(0, 20);
  const labelOf = g => {
    if (g.matches('details.menu')) return 'Archivo';
    if (g.id === 'fullscreen') return 'Pantalla completa';
    const names = [...g.querySelectorAll('button, label')].map(b => (b.textContent || b.title || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    return (names.slice(0, 3).join(' · ') || keyOf(g)).slice(0, 48);
  };

  function apply() {
    const t = ui.scale.toolbar, p = ui.scale.panels;
    // zoom escala botones, iconos y letras juntos sin mover nada de lugar.
    style.textContent = `${t !== 1 ? `.app > header{zoom:${t}}` : ''}${p !== 1 ? `aside.lib, aside.right{zoom:${p}}` : ''}`;
    const order = ui.toolbarOrder || [], hidden = new Set(ui.toolbarHidden || []), h = header();
    const spacer = h?.querySelector('.spacer'), brand = h?.querySelector(':scope > .brand');
    // Los grupos que vienen después del separador en la página van a la derecha (idioma, pantalla completa, archivo).
    const right = g => spacer && (spacer.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING);
    let firstRight = Infinity;
    groups().forEach(g => {
      const k = keyOf(g), i = order.indexOf(k);
      const o = i >= 0 ? (i + 1) * 2 : null;
      g.style.order = o === null ? '' : String(o);
      if (o !== null && right(g)) firstRight = Math.min(firstRight, o);
      g.classList.toggle('pl-ui-oculto', hidden.has(k));
    });
    if (brand) brand.style.order = order.length ? '-1000' : '';
    if (spacer) spacer.style.order = order.length ? String(firstRight === Infinity ? 999 : firstRight - 1) : '';
  }
  const css2 = document.createElement('style');
  css2.textContent = '.pl-ui-oculto{display:none!important}';
  document.head.appendChild(css2);
  const ready = fn => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn());
  ready(() => { apply(); setTimeout(apply, 800); });

  if (!window.__UI_ADMIN__) return;

  // ---------------- Editor (solo administración) ----------------
  const ecss = document.createElement('style');
  ecss.textContent = `
  .pl-ui-btn{position:fixed;left:12px;bottom:12px;z-index:2147482000;height:40px;padding:0 14px;border-radius:999px;border:0;background:#1c1917;color:#fff;
    font:600 14px/1 'DM Sans',system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.25);cursor:pointer}
  .pl-ui{position:fixed;left:12px;bottom:60px;z-index:2147482001;width:min(360px,calc(100vw - 24px));max-height:min(75vh,640px);overflow:auto;background:#fff;
    border-radius:18px;box-shadow:0 20px 50px rgba(28,25,23,.3);font:14px/1.4 'DM Sans',system-ui,sans-serif;color:#1c1917;padding:16px}
  .pl-ui h3{margin:0 0 4px;font:700 16px 'Sora','DM Sans',sans-serif;display:flex;justify-content:space-between;align-items:center}
  .pl-ui h4{margin:16px 0 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#78716c}
  .pl-ui p.nota{margin:0;color:#78716c;font-size:12px}
  .pl-ui label.rng{display:block;margin:8px 0}
  .pl-ui label.rng span{display:flex;justify-content:space-between;font-weight:600}
  .pl-ui input[type=range]{width:100%;accent-color:#b5653a}
  .pl-ui ul{list-style:none;margin:0;padding:0;border:1px solid #e7e5e4;border-radius:12px}
  .pl-ui li{display:flex;align-items:center;gap:6px;padding:6px 8px;border-top:1px solid #f0eeec}
  .pl-ui li:first-child{border-top:0}
  .pl-ui li .n{flex:1;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pl-ui li.off .n{color:#a8a29e;text-decoration:line-through}
  .pl-ui li button{width:30px;height:30px;border-radius:50%;border:1px solid #d6d3d1;background:#fff;cursor:pointer}
  .pl-ui li button:disabled{opacity:.3}
  .pl-ui .acts{display:flex;gap:8px;margin-top:14px;position:sticky;bottom:-16px;background:#fff;padding:10px 0 2px}
  .pl-ui .acts button,.pl-ui .ancho{flex:1;min-height:42px;border-radius:12px;border:1px solid #d6d3d1;background:#fff;font-weight:600;cursor:pointer}
  .pl-ui .acts .ok{background:#b5653a;border-color:#b5653a;color:#fff}
  .pl-ui .ancho{width:100%;margin-top:6px}
  .pl-ui .cerrar{width:30px;height:30px;border-radius:50%;border:0;background:#d23c32;color:#fff;font-size:18px;cursor:pointer}`;
  document.head.appendChild(ecss);

  let box = null;
  const pct = v => `${Math.round(v * 100)}%`;
  const currentOrder = () => {
    const known = groups().map(keyOf);
    const saved = (ui.toolbarOrder || []).filter(k => known.includes(k));
    return [...saved, ...known.filter(k => !saved.includes(k))];
  };

  function render() {
    if (!box) return;
    const byKey = Object.fromEntries(groups().map(g => [keyOf(g), g]));
    const order = currentOrder(), hidden = new Set(ui.toolbarHidden || []);
    const panel = ui.panelOrder && ui.panelOrder.length ? ui.panelOrder : null;
    box.innerHTML = `
      <h3>Interfaz del diseñador <button type="button" class="cerrar" data-a="cerrar" aria-label="Cerrar">×</button></h3>
      <p class="nota">Solo la ves tú (administración). Lo que guardes se aplica a todos.</p>
      <h4>Tamaños</h4>
      <label class="rng"><span>Barra de arriba (botones, iconos y letras) <b>${pct(ui.scale.toolbar)}</b></span>
        <input type="range" min="${MIN}" max="${MAX}" step="0.05" value="${ui.scale.toolbar}" data-s="toolbar"></label>
      <label class="rng"><span>Catálogo y Propiedades <b>${pct(ui.scale.panels)}</b></span>
        <input type="range" min="${MIN}" max="${MAX}" step="0.05" value="${ui.scale.panels}" data-s="panels"></label>
      <h4>Barra de arriba</h4>
      <p class="nota">Sube, baja u oculta cada grupo de botones.</p>
      <ul>${order.map((k, i) => `<li class="${hidden.has(k) ? 'off' : ''}" data-k="${k}"><span class="n">${byKey[k] ? labelOf(byKey[k]) : k}</span>
        <button type="button" data-t="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
        <button type="button" data-t="1" ${i === order.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button>
        <button type="button" data-h="1" aria-label="${hidden.has(k) ? 'Mostrar' : 'Ocultar'}" title="${hidden.has(k) ? 'Mostrar' : 'Ocultar'}">${hidden.has(k) ? '👁' : '—'}</button></li>`).join('')}</ul>
      <h4>Propiedades</h4>
      <p class="nota">${panel ? `Orden para todos: ${panel.slice(0, 5).join(' → ')}${panel.length > 5 ? '…' : ''}` : 'Sin orden para todos: se usa el de la app.'}
        Ordénalas con "↕ Ordenar secciones" al final de Propiedades y luego tócalo aquí.</p>
      <button type="button" class="ancho" data-a="panel">Usar el orden que ves ahora en Propiedades</button>
      <div class="acts"><button type="button" data-a="reset">Volver a lo normal</button><button type="button" class="ok" data-a="guardar">Guardar para todos</button></div>`;
    box.querySelectorAll('input[data-s]').forEach(r => r.oninput = () => { ui.scale[r.dataset.s] = Number(r.value); apply(); r.closest('label').querySelector('b').textContent = pct(ui.scale[r.dataset.s]); });
    box.querySelectorAll('li [data-t]').forEach(b => b.onclick = () => {
      const o = currentOrder(), k = b.closest('li').dataset.k, i = o.indexOf(k), j = i + Number(b.dataset.t);
      [o[i], o[j]] = [o[j], o[i]]; ui.toolbarOrder = o; apply(); render();
    });
    box.querySelectorAll('li [data-h]').forEach(b => b.onclick = () => {
      const k = b.closest('li').dataset.k, h = new Set(ui.toolbarHidden || []);
      if (h.has(k)) h.delete(k); else h.add(k);
      ui.toolbarHidden = [...h]; apply(); render();
    });
    box.querySelector('[data-a=cerrar]').onclick = () => toggle(false);
    box.querySelector('[data-a=panel]').onclick = async () => {
      ui.panelOrder = window.plOrdenActual ? window.plOrdenActual() : [];
      render();
      await window.plAlert?.('Listo: ese orden de Propiedades queda para todos cuando toques "Guardar para todos".');
    };
    box.querySelector('[data-a=reset]').onclick = async () => {
      if (!(await window.plConfirm('¿Volver a la interfaz normal para todos? Se guarda al tocar "Guardar para todos".', { ok: 'Volver a lo normal' }))) return;
      ui = clone(DEFAULT); apply(); render();
    };
    box.querySelector('[data-a=guardar]').onclick = async () => {
      try {
        const r = await fetch('/api/ui', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ui) });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || 'No se pudo guardar.');
        ui = Object.assign(clone(DEFAULT), data.ui || ui);
        window.__UI__ = clone(ui);
        await window.plAlert?.('Guardado. Todos ven la interfaz así desde que abren el diseñador.');
      } catch (e) { await window.plAlert?.(e.message || 'No se pudo guardar.'); }
    };
  }

  function toggle(open) {
    if (open && !box) { box = document.createElement('div'); box.className = 'pl-ui'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Interfaz del diseñador'); document.body.appendChild(box); render(); }
    else if (!open && box) { box.remove(); box = null; }
  }
  ready(() => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pl-ui-btn'; b.textContent = '⚙ Interfaz'; b.title = 'Editar la interfaz para todos (solo administración)';
    b.onclick = () => toggle(!box);
    document.body.appendChild(b);
  });
})();
