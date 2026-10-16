// Anfitrión del diseñador para diseños guardados en el servidor.
// Lo cargan /eventos/[id] (modo "edit") y /v/[token] (modo "view", el enlace para el cliente)
// antes del diseñador. Datos: window.__HOST_DATA__ (src/lib/designer/page.ts → HostData).
//
// - Carga el estado de cada planta desde la distribución activa y guarda los cambios
//   (PUT /api/layouts/[id] con la revisión; si otra persona guardó antes, se detiene).
// - Pestañas A/B/C: cambiar sin recargar, crear (copia de la actual), renombrar,
//   descripción, recomendada, duplicar y eliminar.
// - Compartir: enlace de solo vista (copiar, WhatsApp o el menú de compartir del teléfono).
// - En modo "view" se puede mover todo para probar, pero no se guarda nada.
(function () {
  const D = window.__HOST_DATA__;
  const EDIT = D.mode === 'edit';
  const Q = new URLSearchParams(location.search);
  // Llegó cambiando de planta (desde el 3D o por la escalera, ?recorrido=): sin portada; el diseñador abre el 3D solo
  const ARRIVED = Q.has('vista') || Q.has('recorrido');
  // Enlace del cliente con ?visita: entra directo a la visita guiada en lugar de la portada
  const TOUR_LINK = !EDIT && Q.has('visita') && !ARRIVED;
  // La portada sale una vez por pestaña: al cambiar de planta en 2D no vuelve a aparecer
  const COVER_KEY = 'planner3d-portada-' + D.eventId;
  const coverSeen = () => { try { return sessionStorage.getItem(COVER_KEY) === '1'; } catch { return false; } };
  const coverDone = () => { try { sessionStorage.setItem(COVER_KEY, '1'); } catch { /* sin almacenamiento */ } };
  const OPENS_KEY = 'planner3d-compartir-abre';
  const dists = D.distributions;
  let active = dists.find(d => d.id === D.activeId) || dists[0];
  let api = null, levelId = null;
  let timer = 0, saving = null, pending = false, conflict = false, warned = false, statusText = '', saveKind = 'idle', savedAt = 0;

  const clone = v => JSON.parse(JSON.stringify(v));
  const t = (en, es) => api ? api.tr(en, en, es) : es;
  const docOf = d => (d.doc && d.doc.levels ? d.doc : (d.doc = { v: 1, levels: {} }));
  const levelOf = (d, lv) => (docOf(d).levels[lv] ? clone(d.doc.levels[lv]) : null);
  const escape = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  async function request(method, url, body, keepalive) {
    const r = await fetch(url, {
      method, keepalive,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || 'Error'), { status: r.status });
    return data;
  }

  // ---------------------------------------------------------------- guardado
  // Estado de guardado como icono de ancho fijo (el texto que cambiaba de largo movía toda la barra).
  // kind: idle (nada que guardar), saving, saved, error (no se guardó) u offline (se reintentará).
  const SAVE_ICONS = {
    idle: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 10a4 4 0 0 1-1 8z"/><path d="m9.5 13.5 2 2 3.5-4"/>',
    saved: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 10a4 4 0 0 1-1 8z"/><path d="m9.5 13.5 2 2 3.5-4"/>',
    saving: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 10a4 4 0 0 1-1 8z"/><path class="giro" d="M12 10.5a3 3 0 1 0 3 3"/>',
    error: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 10a4 4 0 0 1-1 8z"/><path d="M12 11v3M12 16.2v.01"/>',
    offline: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 10a4 4 0 0 1-1 8z"/><path d="M4 4l16 16"/>',
  };
  const sinceSaved = ms => {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 10) return t('just now', 'hace un momento');
    if (s < 60) return t(`${s} s ago`, `hace ${s} s`);
    const m = Math.round(s / 60);
    if (m < 60) return t(`${m} min ago`, `hace ${m} min`);
    return t(`${Math.round(m / 60)} h ago`, `hace ${Math.round(m / 60)} h`);
  };
  function saveText() {
    if (saveKind === 'saving') return t('Saving your changes…', 'Guardando tus cambios…');
    if (saveKind === 'saved') return `${t('Saved', 'Guardado')} · ${sinceSaved(Date.now() - savedAt)}`;
    if (saveKind === 'error') return `${t('Not saved', 'Sin guardar')}: ${statusText}`;
    if (saveKind === 'offline') return t('No connection: your changes will be saved when it returns', 'Sin conexión: tus cambios se guardan cuando vuelva');
    return t('Everything is saved', 'Todo está guardado');
  }
  function paintStatus() {
    const el = document.getElementById('hostStatus');
    if (!el) return;
    el.dataset.state = saveKind;
    el.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SAVE_ICONS[saveKind]}</svg>`;
    el.setAttribute('aria-label', saveText());
    const tip = document.getElementById('hostStatusTip');
    if (tip) tip.textContent = saveText();
  }
  function setStatus(kind, reason = '') {
    saveKind = kind;
    statusText = reason;
    if (kind === 'saved') savedAt = Date.now();
    paintStatus();
  }
  function statusTip(open) {
    let tip = document.getElementById('hostStatusTip');
    if (!open) { tip?.remove(); return; }
    const el = document.getElementById('hostStatus');
    if (!el) return;
    if (!tip) { tip = document.createElement('div'); tip.id = 'hostStatusTip'; tip.setAttribute('role', 'status'); document.body.appendChild(tip); }
    tip.textContent = saveText();
    const r = el.getBoundingClientRect();
    tip.style.top = `${r.bottom + 8}px`;
    tip.style.left = `${Math.max(8, Math.min(innerWidth - tip.offsetWidth - 8, r.left + r.width / 2 - tip.offsetWidth / 2))}px`;
  }

  function save(lv, state) {
    levelId = lv;
    docOf(active).levels[lv] = clone(state);
    if (!EDIT) {
      if (!warned) { warned = true; api?.toast(t('This is a view link: changes are not saved', 'Es una vista para compartir: los cambios no se guardan')); }
      return;
    }
    pending = true;
    setStatus('saving');
    clearTimeout(timer);
    timer = setTimeout(flush, 700);
  }

  async function flush() {
    clearTimeout(timer);
    while (saving) await saving;
    if (!pending || conflict || !EDIT) return;
    pending = false;
    const dist = active;
    let failed = false;
    saving = request('PUT', `/api/layouts/${dist.id}`, { doc: dist.doc, revision: dist.revision })
      .then(r => { dist.revision = r.revision; setStatus(pending ? 'saving' : 'saved'); })
      .catch(e => {
        if (e.status === 400) {
          conflict = true;
          setStatus('error', t('invalid data, reload the page', 'datos inválidos, recarga la página'));
          window.plAlert(t('This change could not be saved (invalid data). Reload the page; if it happens again, let us know.',
            'Este cambio no se pudo guardar (datos inválidos). Recarga la página; si vuelve a pasar, avísanos.'));
        } else if (e.status === 401 || e.status === 404) {
          conflict = true;
          setStatus('error', t('your session ended', 'tu sesión terminó'));
          window.plAlert(t('Your session ended. Sign in again in another tab and reload this page; your last change was not saved.',
            'Tu sesión terminó. Vuelve a entrar en otra pestaña y recarga esta página; el último cambio no se guardó.'));
        } else if (e.status === 409) {
          conflict = true;
          setStatus('error', t('someone else saved this layout', 'otra persona guardó esta distribución'));
          window.plAlert(t('Someone else saved this layout. Reload the page to see the latest version.',
            'Otra persona guardó cambios en esta distribución. Recarga la página para ver la versión más reciente.'));
        } else {
          pending = true;
          failed = true;
          setStatus('offline');
          timer = setTimeout(flush, 4000);
        }
      })
      .finally(() => { saving = null; });
    await saving;
    if (pending && !conflict && !failed) return flush();
  }

  /** Guarda lo pendiente antes de cambiar de distribución; si no se pudo, no cambia. */
  async function settled() {
    await flush();
    if (!pending && !conflict) return true;
    api.toast(t('Could not save; check your connection', 'No se pudo guardar; revisa la conexión'));
    return false;
  }

  // Al cerrar o cambiar de página se manda lo pendiente aunque la página ya no espere la respuesta.
  addEventListener('pagehide', () => {
    if (pending && !conflict && EDIT) request('PUT', `/api/layouts/${active.id}`, { doc: active.doc, revision: active.revision }, true).catch(() => {});
  });
  addEventListener('beforeunload', e => { if (EDIT && (pending || saving) && !conflict) e.preventDefault(); });

  // ---------------------------------------------------------------- distribuciones
  function syncUrl() {
    const u = new URL(location.href);
    u.searchParams.set('d', active.id);
    history.replaceState(null, '', u);
  }

  async function select(id) {
    if (id === active.id || !(await settled())) return;
    active = dists.find(d => d.id === id);
    api.replace(levelOf(active, levelId));
    syncUrl();
    renderBar();
  }

  function nextName() {
    const used = new Set(dists.map(d => d.name));
    for (let i = 0; i < 26; i++) { const n = String.fromCharCode(65 + i); if (!used.has(n)) return n; }
    return String(dists.length + 1);
  }

  async function create(from) {
    if (!(await settled())) return;
    const doc = clone(docOf(from));
    if (from === active && levelId) doc.levels[levelId] = clone(api.state);
    const name = nextName();
    try {
      const r = await request('POST', `/api/events/${D.eventId}/layouts`, { name, note: '', doc });
      const dist = { id: r.id, name, note: '', recommended: false, revision: r.revision, doc };
      dists.push(dist);
      active = dist;
      api.replace(levelOf(dist, levelId));
      syncUrl();
      renderBar();
      api.toast(t(`Layout ${name}: copy of ${from.name}`, `Distribución ${name}: copia de la ${from.name}`));
    } catch (e) { api.toast(e.message); }
  }

  async function patch(dist, change) {
    try {
      await request('PATCH', `/api/layouts/${dist.id}`, change);
      Object.assign(dist, change);
      if (change.recommended) dists.forEach(d => { if (d !== dist) d.recommended = false; });
      renderBar();
    } catch (e) { api.toast(e.message); }
  }

  async function remove(dist) {
    if (dists.length < 2) return api.toast(t('At least one layout must remain', 'Siempre debe quedar al menos una distribución'));
    if (!(await window.plConfirm(t(`Delete layout ${dist.name}? This cannot be undone.`, `¿Eliminar la distribución ${dist.name}? No se puede deshacer.`),
      { ok: t('Delete', 'Eliminar'), cancel: t('Cancel', 'Cancelar'), danger: true }))) return;
    try {
      if (dist === active) { await flush(); pending = false; }
      await request('DELETE', `/api/layouts/${dist.id}`);
      dists.splice(dists.indexOf(dist), 1);
      if (dist === active) { active = dists[0]; api.replace(levelOf(active, levelId)); syncUrl(); }
      renderBar();
    } catch (e) { api.toast(e.message); }
  }

  // ---------------------------------------------------------------- interfaz
  const css = `
  #hostBar{gap:2px}
  #hostBar a.btn,dialog.hostDlg a.btn{color:inherit;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
  dialog.hostDlg .row .btn.wa{background:#25d366;border-color:#25d366;color:#fff;font-weight:600}
  #hostBar .dist{display:inline-flex;align-items:center;gap:4px;max-width:12em}
  #hostBar .dist small{opacity:.7;overflow:hidden;text-overflow:ellipsis}
  #hostBar .star{color:#c9962b}
  #hostBar .btn.on .star{color:#f6d27a}
  #hostStatus{width:36px;min-width:36px;color:#15803d;padding:6px 8px;display:inline-flex;align-items:center;justify-content:center}
  #hostStatus[data-state=saving]{color:var(--muted)} #hostStatus[data-state=error]{color:#b3372a} #hostStatus[data-state=offline]{color:#b45309}
  #hostStatus .giro{transform-origin:12px 13.5px;animation:hostGiro 1s linear infinite}
  @keyframes hostGiro{to{transform:rotate(360deg)}}
  #hostStatusTip{position:fixed;z-index:2147480000;background:#1c1917;color:#fff;font:13px/1.35 'DM Sans',system-ui,sans-serif;padding:7px 10px;border-radius:10px;
    white-space:nowrap;pointer-events:none;box-shadow:0 8px 20px rgba(0,0,0,.18)}
  #hostBar .viewonly{color:var(--accent);font-size:12px;padding:0 8px;white-space:nowrap}
  dialog.hostDlg{border:1px solid var(--line);border-radius:14px;padding:18px;width:min(380px,92vw);background:var(--panel);color:var(--ink);
    box-shadow:0 20px 60px rgba(40,30,20,.25)}
  dialog.hostDlg::backdrop{background:rgba(30,25,20,.35)}
  dialog.hostDlg h3{margin:0 0 12px;font-size:16px}
  dialog.hostDlg label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);margin-bottom:10px}
  dialog.hostDlg input{font:inherit;font-size:16px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);
    -webkit-user-select:text;user-select:text}
  dialog.hostDlg .row{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
  dialog.hostDlg .row .btn{border:1px solid var(--line);background:#fff;min-height:40px;flex:1}
  dialog.hostDlg .row .btn.primary{background:var(--accent);color:#fff;border-color:var(--accent)}
  dialog.hostDlg .row .btn.danger{color:#b3372a}
  dialog.hostDlg .muted{color:var(--muted);font-size:12px;margin:8px 0 0}
  dialog.hostDlg .opens{display:flex;gap:4px;padding:3px;border-radius:10px;background:#f2ede4;margin-bottom:6px}
  dialog.hostDlg .opens button{flex:1;min-height:36px;border:0;border-radius:8px;background:transparent;font:inherit;font-size:13px;color:var(--ink);cursor:pointer}
  dialog.hostDlg .opens button.on{background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.12);font-weight:600}
  dialog.hostDlg .thumb{width:100%;aspect-ratio:1200/630;object-fit:cover;border-radius:10px;border:1px solid var(--line);background:#f2ede4;margin-bottom:10px}
  #hostBar .brandChip{display:inline-flex;align-items:center;gap:6px;padding:0 8px 0 2px;font-weight:600;white-space:nowrap;max-width:14em}
  #hostBar .brandChip span{overflow:hidden;text-overflow:ellipsis}
  .brandMark{width:28px;height:28px;border-radius:8px;object-fit:contain;background:#fff;flex-shrink:0}
  .brandMark.initial{display:grid;place-items:center;color:#fff;font-weight:700;font-size:14px}
  #clientWelcome{position:fixed;inset:0;z-index:150;display:grid;place-items:center;padding:20px;
    background:rgba(40,32,24,.35);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
  #clientWelcome .card{width:min(400px,100%);background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:22px;
    box-shadow:0 24px 70px rgba(40,30,20,.3);text-align:center}
  #clientWelcome .who{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:14px;text-align:left}
  #clientWelcome .who .brandMark{width:48px;height:48px;border-radius:12px;font-size:20px}
  #clientWelcome .who small{display:block;color:var(--muted);font-size:12px}
  #clientWelcome h2{margin:0 0 6px;font-size:20px;line-height:1.25}
  #clientWelcome .props{color:var(--muted);font-size:13px;margin:0 0 16px}
  #clientWelcome .btn{display:flex;width:100%;justify-content:center;min-height:46px;margin-top:8px;border-radius:12px;font-size:15px;
    border:1px solid var(--line);background:#fff;color:var(--ink);text-decoration:none;align-items:center}
  #clientWelcome .btn.go{border:0;color:#fff;font-weight:600}
  #clientWelcome .btn.wa{border:0;background:#25d366;color:#fff;font-weight:600}
  #clientWelcome .tiny{color:var(--muted);font-size:11px;margin:14px 0 0}
  #hostBar .badge{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#b3372a;color:#fff;font-size:11px;margin-left:4px}
  dialog.hostDlg textarea{font:inherit;font-size:16px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);
    min-height:90px;resize:vertical;-webkit-user-select:text;user-select:text}
  dialog.hostDlg .comments{max-height:46vh;overflow:auto;margin:6px -4px 0;padding:0 4px}
  dialog.hostDlg .cmt{border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin-top:8px;background:#fff}
  dialog.hostDlg .cmt.done{opacity:.55}
  dialog.hostDlg .cmt .meta{font-size:12px;color:var(--muted);display:flex;justify-content:space-between;gap:8px}
  dialog.hostDlg .cmt p{margin:4px 0 0;white-space:pre-wrap}
  dialog.hostDlg .cmt .row{margin-top:6px}
  dialog.hostDlg .cmt .row .btn{min-height:34px;font-size:13px}
  dialog.hostDlg .seg2{display:flex;gap:6px;margin-bottom:10px}
  dialog.hostDlg .seg2 .btn{flex:1;min-height:38px;border:1px solid var(--line);background:#fff}
  dialog.hostDlg .seg2 .btn.on{background:var(--ink);color:#fff;border-color:var(--ink)}`;

  // ---------------------------------------------------------------- ficha de la casa
  const IS_CASA = window.__CASA__?.kind !== 'salon';
  const details = D.details || {};
  const money = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
  const num = n => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  function specs() {
    const out = [];
    if (details.builtM2) out.push(`${num(details.builtM2)} m² ${t('built', 'de construcción')}`);
    if (details.landM2) out.push(`${num(details.landM2)} m² ${t('lot', 'de terreno')}`);
    if (details.bedrooms) out.push(`${details.bedrooms} ${t(details.bedrooms === 1 ? 'bedroom' : 'bedrooms', details.bedrooms === 1 ? 'recámara' : 'recámaras')}`);
    if (details.bathrooms) out.push(`${num(details.bathrooms)} ${t(details.bathrooms === 1 ? 'bath' : 'baths', details.bathrooms === 1 ? 'baño' : 'baños')}`);
    if (details.parking) out.push(`${details.parking} ${t(details.parking === 1 ? 'parking spot' : 'parking spots', details.parking === 1 ? 'auto' : 'autos')}`);
    return out;
  }
  const hasDetails = () => Object.values(details).some(v => v !== undefined && v !== '' && v !== 0);
  const detailsHtml = () => `${details.price ? `<p style="font-size:22px;font-weight:700;margin:2px 0 6px">${money(details.price)}</p>` : ''}
    ${specs().length ? `<p class="specs" style="margin:0 0 6px">${specs().map(escape).join(' · ')}</p>` : ''}
    ${details.location ? `<p class="muted" style="margin:0 0 6px">📍 ${escape(details.location)}</p>` : ''}
    ${details.description ? `<p style="margin:0 0 6px;white-space:pre-wrap;text-align:left">${escape(details.description)}</p>` : ''}`;

  /** Muestra u oculta los muebles en 2D y 3D (la casa amueblada o vacía). */
  function toggleFurniture() {
    document.querySelector('[data-layer="furn"]')?.click();
    document.querySelector('[data-t="furn"]')?.click();
    renderBar();
  }
  const furnitureShown = () => document.querySelector('[data-layer="furn"]')?.classList.contains('on') !== false;

  function detailsDialog() {
    if (!EDIT) {
      const dlg = dialog(`<h3>${escape(D.title)}</h3>${detailsHtml() || `<p class="muted">${t('No details yet.', 'Todavía sin ficha.')}</p>`}
        <div class="row"><button class="btn" data-a="close">${t('Close', 'Cerrar')}</button></div>`);
      dlg.querySelector('[data-a="close"]').onclick = () => dlg.close();
      return;
    }
    const field = (k, label, type = 'number', step = '1') => `<label>${label}<input data-k="${k}" type="${type}" ${type === 'number' ? `inputmode="decimal" step="${step}" min="0"` : 'maxlength="120"'} value="${escape(details[k] ?? '')}"></label>`;
    const dlg = dialog(`<h3>${t('Property details', 'Ficha de la casa')}</h3>
      <p class="muted" style="margin:-6px 0 10px">${t('Your client sees it when opening the link.', 'Tu cliente la ve al abrir el enlace.')}</p>
      ${field('price', t('Price (MXN)', 'Precio (MXN)'), 'number', '1000')}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 10px">
        ${field('builtM2', t('Built m²', 'm² de construcción'), 'number', '0.1')}${field('landM2', t('Lot m²', 'm² de terreno'), 'number', '0.1')}
        ${field('bedrooms', t('Bedrooms', 'Recámaras'))}${field('bathrooms', t('Bathrooms', 'Baños'), 'number', '0.5')}
        ${field('parking', t('Parking', 'Estacionamientos'))}</div>
      ${field('location', t('Location', 'Ubicación'), 'text')}
      <label>${t('Description', 'Descripción')}<textarea data-k="description" maxlength="600">${escape(details.description ?? '')}</textarea></label>
      <div class="row"><button class="btn primary" data-a="save">${t('Save', 'Guardar')}</button><button class="btn" data-a="close">${t('Cancel', 'Cancelar')}</button></div>`);
    dlg.querySelector('[data-a="close"]').onclick = () => dlg.close();
    dlg.querySelector('[data-a="save"]').onclick = async () => {
      const next = {};
      dlg.querySelectorAll('[data-k]').forEach(el => {
        const k = el.dataset.k, v = el.value.trim();
        if (!v) return;
        next[k] = el.type === 'number' ? (['bedrooms', 'parking', 'price'].includes(k) ? Math.round(+v) : +v) : v;
      });
      try { await request('PATCH', `/api/events/${D.eventId}`, { details: next }); }
      catch (e) { return api.toast(e.message); }
      Object.keys(details).forEach(k => delete details[k]);
      Object.assign(details, next);
      dlg.close();
      api.toast(t('Details saved', 'Ficha guardada'));
    };
  }

  // ---------------------------------------------------------------- comentarios del cliente
  const comments = D.comments || [];
  const pendingComments = () => comments.filter(c => !c.resolved).length;
  const ago = when => {
    const s2 = (Date.now() - new Date(when).getTime()) / 1000, rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    if (s2 < 3600) return rtf.format(-Math.max(1, Math.round(s2 / 60)), 'minute');
    if (s2 < 86400) return rtf.format(-Math.round(s2 / 3600), 'hour');
    return rtf.format(-Math.round(s2 / 86400), 'day');
  };
  /** Nombre de la pieza comentada en la distribución donde se comentó. */
  const objectName = c => {
    if (!c.objectId) return '';
    const d = dists.find(x => x.id === c.layoutId);
    const all = d === active ? api.state.furniture : Object.values(docOf(d || active).levels).flatMap(l => l.furniture || []);
    return all.find(f => f.id === c.objectId)?.name || t('a removed piece', 'una pieza que ya no está');
  };
  const cmtHtml = (c, actions) => `<div class="cmt ${c.resolved ? 'done' : ''}" data-cid="${c.id}">
      <div class="meta"><b>${escape(c.authorName)}</b><span>${escape(dists.find(d => d.id === c.layoutId)?.name || '')} · ${ago(c.createdAt)}</span></div>
      ${c.objectId ? `<div class="meta">${t('About', 'Sobre')} ${escape(objectName(c))}</div>` : ''}
      <p>${escape(c.body)}</p>${actions ? `<div class="row">${actions(c)}</div>` : ''}</div>`;

  /** La planner revisa los comentarios: ver la pieza en el plano y marcar como resuelto. */
  function commentsDialog() {
    const dlg = dialog(`<h3>${t('Client comments', 'Comentarios del cliente')}</h3>
      ${comments.length ? '' : `<p class="muted">${t('When your client comments from the link, you will see it here.',
        'Cuando tu cliente comente desde el enlace, lo verás aquí.')}</p>`}
      <div class="comments">${comments.map(c => cmtHtml(c, x => `${x.objectId ? `<button class="btn" data-see="${x.id}">${t('See it', 'Ver en el plano')}</button>` : ''}
        <button class="btn" data-done="${x.id}">${x.resolved ? t('Reopen', 'Reabrir') : '✓ ' + t('Resolved', 'Resuelto')}</button>`)).join('')}</div>
      <div class="row"><button class="btn" data-a="close">${t('Close', 'Cerrar')}</button></div>`);
    dlg.querySelector('[data-a="close"]').onclick = () => dlg.close();
    dlg.querySelectorAll('[data-done]').forEach(b => b.onclick = async () => {
      const c = comments.find(x => x.id === b.dataset.done);
      try { await request('PATCH', `/api/comments/${c.id}`, { resolved: !c.resolved }); c.resolved = !c.resolved; }
      catch (e) { return api.toast(e.message); }
      dlg.close(); renderBar(); commentsDialog();
    });
    dlg.querySelectorAll('[data-see]').forEach(b => b.onclick = async () => {
      const c = comments.find(x => x.id === b.dataset.see);
      dlg.close();
      if (c.layoutId !== active.id) await select(c.layoutId);
      if (api.state.furniture.some(f => f.id === c.objectId)) window.select({ kind: 'furn', id: c.objectId });
    });
  }

  /** El cliente comenta desde su enlace: en general o sobre la pieza que tiene seleccionada. */
  function commentDialog() {
    const sel = typeof ui !== 'undefined' && ui.sel?.kind === 'furn' ? api.state.furniture.find(f => f.id === ui.sel.id) : null;
    let about = sel ? sel.id : null;
    let saved = '';
    try { saved = localStorage.getItem('planner3d-nombre') || ''; } catch { /* sin almacenamiento */ }
    const mine = comments.filter(c => c.layoutId === active.id);
    const dlg = dialog(`<h3>${t('Comment on proposal', 'Comentar la propuesta')} ${escape(active.name)}</h3>
      ${sel ? `<div class="seg2"><button class="btn on" data-about="obj">${escape(sel.name)}</button><button class="btn" data-about="all">${t('In general', 'En general')}</button></div>`
        : `<p class="muted" style="margin:-4px 0 10px">${t('Tip: tap a table or piece first to comment about it.', 'Consejo: toca primero una mesa o mueble para comentar sobre él.')}</p>`}
      <label>${t('Your name', 'Tu nombre')}<input id="cmName" maxlength="60" value="${escape(saved)}" autocomplete="name"></label>
      <label>${t('Comment', 'Comentario')}<textarea id="cmBody" maxlength="600" placeholder="${t('E.g. Move my parents’ table closer to the dance floor', 'Ej. Acerca la mesa de mis papás a la pista')}"></textarea></label>
      <div class="row"><button class="btn primary" data-a="send">${t('Send', 'Enviar')}</button><button class="btn" data-a="close">${t('Cancel', 'Cancelar')}</button></div>
      ${mine.length ? `<div class="comments">${mine.map(c => cmtHtml(c)).join('')}</div>` : ''}`);
    dlg.querySelectorAll('[data-about]').forEach(b => b.onclick = () => {
      about = b.dataset.about === 'obj' ? sel.id : null;
      dlg.querySelectorAll('[data-about]').forEach(x => x.classList.toggle('on', x === b));
    });
    dlg.querySelector('[data-a="close"]').onclick = () => dlg.close();
    dlg.querySelector('[data-a="send"]').onclick = async () => {
      const authorName = dlg.querySelector('#cmName').value.trim(), body = dlg.querySelector('#cmBody').value.trim();
      if (!authorName || !body) return api.toast(t('Write your name and your comment', 'Escribe tu nombre y tu comentario'));
      try { localStorage.setItem('planner3d-nombre', authorName); } catch { /* sin almacenamiento */ }
      const token = location.pathname.split('/')[2];
      try {
        const r = await request('POST', `/api/v/${token}/comments`, { layoutId: active.id, objectId: about || undefined, authorName, body });
        comments.unshift(r.comment);
      } catch (e) { return api.toast(e.message); }
      dlg.close();
      api.toast(t('Thanks! Your comment was sent', `¡Gracias! Tu comentario le llegó a ${B.name || 'la planner'}`));
    };
  }

  // ---------------------------------------------------------------- marca del negocio
  const B = D.brand || { name: '' };
  const brandColor = () => B.color || '#b5653a';
  const brandMark = () => B.logo
    ? `<img class="brandMark" src="${escape(B.logo)}" alt="">`
    : `<span class="brandMark initial" style="background:${escape(brandColor())}">${escape((B.name || '?').trim().charAt(0).toUpperCase())}</span>`;
  const waLink = text => B.whatsapp ? `https://wa.me/${B.whatsapp}?text=${encodeURIComponent(text)}` : '';

  function renderBar() {
    const bar = document.getElementById('hostBar');
    if (!bar) return;
    bar.hidden = false;
    const tabs = dists.map(d => `<button class="btn dist ${d === active ? 'on' : ''}" data-dist="${d.id}"
      title="${escape(d.note || '')}"><b>${escape(d.name)}</b>${d.recommended ? '<span class="star">★</span>' : ''}${d.note ? `<small>${escape(d.note)}</small>` : ''}</button>`).join('');
    bar.innerHTML = EDIT
      ? `${D.backHref ? `<a class="btn" href="${escape(D.backHref)}">← ${escape(D.backLabel || t('Projects', 'Proyectos'))}</a>` : ''}${tabs}
         <button class="btn" data-a="new" title="${t('New layout (copy of the current one)', 'Nueva distribución (copia de la actual)')}">＋</button>
         ${IS_CASA ? `<button class="btn" data-a="details">${t('Details', 'Ficha')}</button>` : ''}
         <button class="btn primary" data-a="share">${t('Share', 'Compartir')}</button>
         <button class="btn" data-a="comments" title="${t('Client comments', 'Comentarios del cliente')}">💬${pendingComments() ? `<span class="badge">${pendingComments()}</span>` : ''}</button>
         <button type="button" class="btn ico" id="hostStatus" data-state="${saveKind}"></button>`
      : `${B.name ? `<span class="brandChip">${brandMark()}<span>${escape(B.name)}</span></span>` : ''}${tabs}
         ${B.whatsapp ? `<a class="btn primary" target="_blank" rel="noopener" href="${escape(waLink(t(`Hi, I saw the design of ${D.title}`, `Hola, vi el diseño de ${D.title}`)))}">WhatsApp</a>` : ''}
         ${IS_CASA && hasDetails() ? `<button class="btn" data-a="details">${t('Details', 'Ficha')}</button>` : ''}
         ${IS_CASA ? `<button class="btn" data-a="furn">${furnitureShown() ? t('Unfurnished', 'Sin muebles') : t('Furnished', 'Amueblada')}</button>` : ''}
         <button class="btn" data-a="comment">💬 ${t('Comment', 'Comentar')}</button>
         <span class="viewonly">${t('View only', 'Solo vista')}</span>`;
    bar.querySelectorAll('[data-dist]').forEach(b => b.onclick = () => {
      const d = dists.find(x => x.id === b.dataset.dist);
      if (d === active && EDIT) editDialog(d); else select(d.id);
    });
    bar.querySelector('[data-a="new"]')?.addEventListener('click', () => create(active));
    bar.querySelector('[data-a="share"]')?.addEventListener('click', shareDialog);
    bar.querySelector('[data-a="comments"]')?.addEventListener('click', commentsDialog);
    const st = bar.querySelector('#hostStatus');
    if (st) {
      paintStatus();
      st.addEventListener('mouseenter', () => statusTip(true));
      st.addEventListener('mouseleave', () => statusTip(false));
      st.addEventListener('focus', () => statusTip(true));
      st.addEventListener('blur', () => statusTip(false));
      // En celular no hay cursor: un toque muestra el estado unos segundos.
      st.addEventListener('click', () => { statusTip(true); clearTimeout(st._t); st._t = setTimeout(() => statusTip(false), 2500); });
    }
    bar.querySelector('[data-a="comment"]')?.addEventListener('click', commentDialog);
    bar.querySelector('[data-a="details"]')?.addEventListener('click', detailsDialog);
    bar.querySelector('[data-a="furn"]')?.addEventListener('click', toggleFurniture);
  }

  function dialog(html) {
    const dlg = document.createElement('dialog');
    dlg.className = 'hostDlg';
    dlg.innerHTML = html;
    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => dlg.remove());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    dlg.showModal();
    return dlg;
  }

  function editDialog(d) {
    const dlg = dialog(`<h3>${t('Layout', 'Distribución')} ${escape(d.name)}</h3>
      <label>${t('Short name', 'Nombre corto')}<input id="hdName" maxlength="12" value="${escape(d.name)}"></label>
      <label>${t('Description', 'Descripción')}<input id="hdNote" maxlength="60" placeholder="${t('E.g. Imperial tables', 'Ej. Mesas imperiales')}" value="${escape(d.note)}"></label>
      <div class="row"><button class="btn" data-a="rec">${d.recommended ? '★ ' + t('Recommended', 'Es la recomendada') : '☆ ' + t('Mark as recommended', 'Marcar como recomendada')}</button></div>
      <div class="row"><button class="btn" data-a="dup">${t('Duplicate', 'Duplicar')}</button>
        <button class="btn danger" data-a="del" ${dists.length < 2 ? 'disabled' : ''}>${t('Delete', 'Eliminar')}</button></div>
      <div class="row"><button class="btn primary" data-a="ok">${t('Done', 'Listo')}</button></div>`);
    const commit = () => {
      const name = dlg.querySelector('#hdName').value.trim().slice(0, 12);
      const note = dlg.querySelector('#hdNote').value.trim().slice(0, 60);
      const change = {};
      if (name && name !== d.name) change.name = name;
      if (note !== d.note) change.note = note;
      if (Object.keys(change).length) patch(d, change);
    };
    dlg.querySelector('[data-a="rec"]').onclick = () => { commit(); patch(d, { recommended: !d.recommended }); dlg.close(); };
    dlg.querySelector('[data-a="dup"]').onclick = () => { commit(); dlg.close(); create(d); };
    dlg.querySelector('[data-a="del"]').onclick = () => { dlg.close(); remove(d); };
    dlg.querySelector('[data-a="ok"]').onclick = () => { commit(); dlg.close(); };
  }

  const loadImage = src => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });

  /** Imagen para la vista previa del enlace: el 3D si está abierto (o el plano 2D) y una franja con la marca. */
  async function previewImage() {
    const W = 1200, H = 630, band = 104;
    let src;
    if (typeof is3D === 'function' && is3D() && window.View3D?.snap) src = window.View3D.snap();
    else {
      const clone = document.getElementById('plan').cloneNode(true);
      clone.setAttribute('viewBox', `${BOUNDS.x} ${BOUNDS.y} ${BOUNDS.w} ${BOUNDS.h}`);
      clone.setAttribute('width', Math.round(BOUNDS.w / 8)); clone.setAttribute('height', Math.round(BOUNDS.h / 8));
      clone.querySelector('#gSel').innerHTML = '';
      clone.querySelector('#gGrid').innerHTML = '';
      src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
    }
    const img = await loadImage(src);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#f7f4ee'; g.fillRect(0, 0, W, H);
    const areaH = H - band, tall = img.height > img.width * 1.2 && !src.startsWith('data:image/jpeg');
    const iw = tall ? img.height : img.width, ih = tall ? img.width : img.height;
    const k = src.startsWith('data:image/jpeg') ? Math.max(W / iw, areaH / ih) : Math.min((W - 40) / iw, (areaH - 30) / ih);
    g.save(); g.translate(W / 2, areaH / 2); if (tall) g.rotate(-Math.PI / 2);
    g.drawImage(img, -img.width * k / 2, -img.height * k / 2, img.width * k, img.height * k); g.restore();
    g.fillStyle = brandColor(); g.fillRect(0, areaH, W, band);
    let x = 34;
    if (B.logo) {
      try { const logo = await loadImage(B.logo); const s2 = band - 34; g.fillStyle = '#fff'; g.fillRect(x - 4, areaH + 13, s2 + 8, s2 + 8);
        const lk = Math.min(s2 / logo.width, s2 / logo.height); g.drawImage(logo, x + (s2 - logo.width * lk) / 2, areaH + 17 + (s2 - logo.height * lk) / 2, logo.width * lk, logo.height * lk); x += s2 + 26; } catch { /* sin logo */ }
    }
    g.fillStyle = '#fff'; g.textBaseline = 'middle';
    g.font = '700 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    g.fillText(D.title.slice(0, 48), x, areaH + band / 2 - (B.name ? 16 : 0));
    if (B.name) { g.font = '400 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'; g.globalAlpha = .9; g.fillText(t(`Design by ${B.name}`, `Diseño de ${B.name}`).slice(0, 70), x, areaH + band / 2 + 24); g.globalAlpha = 1; }
    // WhatsApp a veces no muestra imágenes de más de ~300 KB: se baja la calidad hasta que quepa
    let q = 0.84, out = cv.toDataURL('image/jpeg', q);
    while (out.length > 380_000 && q > 0.5) out = cv.toDataURL('image/jpeg', (q -= 0.1));
    return out;
  }

  /** Portada del enlace del cliente: quién hizo el diseño y botones grandes para verlo. */
  function clientWelcome() {
    const props = dists.length > 1
      ? t(`${dists.length} proposals: `, `${dists.length} propuestas: `) + dists.map(d => `${d.name}${d.recommended ? ' ★' : ''}${d.note ? ` (${d.note})` : ''}`).join(' · ')
      : (active.note || '');
    const el = document.createElement('div');
    el.id = 'clientWelcome';
    el.innerHTML = `<div class="card">
      ${B.name ? `<div class="who">${brandMark()}<div><small>${t('Design by', 'Diseño de')}</small><b>${escape(B.name)}</b></div></div>` : ''}
      <h2>${escape(D.title)}</h2>${IS_CASA && hasDetails() ? detailsHtml() : ''}${props ? `<p class="props">${escape(props)}</p>` : ''}
      <button class="btn go" data-go="tour" style="background:${escape(brandColor())}">▶ ${t('Guided tour', 'Visita guiada')}</button>
      <button class="btn" data-go="3d">${t('Explore in 3D', 'Explorar en 3D')}</button>
      <button class="btn" data-go="2d">${t('See the floor plan', 'Ver plano')}</button>
      ${B.whatsapp ? `<a class="btn wa" target="_blank" rel="noopener" href="${escape(waLink(t(`Hi, I saw the design of ${D.title}`, `Hola, vi el diseño de ${D.title}`)))}">${t('Message', 'Escribir a')} ${escape(B.name || t('the planner', 'la planner'))}</a>` : ''}
      <p class="tiny">${t('You can move things around to try ideas; nothing is saved.', 'Puedes mover cosas para probar ideas; no se guarda nada.')}</p></div>`;
    document.body.appendChild(el);
    el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
      el.remove(); coverDone();
      // El 3D carga three.js de internet: se espera hasta 10 s a que esté listo
      const tour = b.dataset.go === 'tour';
      if (tour || b.dataset.go === '3d') {
        const go = (n = 0) => window.View3D ? setView('3d').then(() => tour && window.View3D.tour?.())
          : n < 100 && setTimeout(() => go(n + 1), 100);
        go();
      }
    });
  }

  async function shareDialog() {
    await flush();
    const busy = dialog(`<h3>${t('Preparing the link…', 'Preparando el enlace…')}</h3><p class="muted">${t('Creating the preview image', 'Creando la imagen de vista previa')}</p>`);
    let preview = null, url;
    try { preview = await previewImage(); } catch { /* sin vista previa */ }
    try { url = new URL((await request('POST', `/api/events/${D.eventId}/share`, preview ? { preview } : {})).path, location.origin).toString(); }
    catch (e) { busy.close(); return api.toast(e.message); }
    busy.close();
    // Al abrir el enlace: la visita guiada directo (se recuerda la elección) o la portada con botones
    let opens = 'tour';
    try { opens = localStorage.getItem(OPENS_KEY) || 'tour'; } catch { /* sin almacenamiento */ }
    const link = () => { const u = new URL(url); if (opens === 'tour') u.searchParams.set('visita', '1'); return u.toString(); };
    const text = () => opens === 'tour'
      ? t(`Take the guided 3D tour of ${D.title}: ${link()}`, `Mira la visita guiada en 3D de ${D.title}: ${link()}`)
      : t(`Take a look at the design of ${D.title}: ${link()}`, `Mira el diseño de ${D.title}: ${link()}`);
    const dlg = dialog(`<h3>${t('Share with your client', 'Compartir con tu cliente')}</h3>
      ${preview ? `<img class="thumb" src="${preview}" alt="">` : ''}
      ${preview && !(typeof is3D === 'function' && is3D()) ? `<p class="muted" style="margin:-4px 0 10px">${t(
        'Tip: share from the 3D view so the WhatsApp preview shows the 3D.',
        'Consejo: comparte desde la Vista 3D para que la vista previa en WhatsApp salga en 3D.')}</p>` : ''}
      <label>${t('When they open it', 'Al abrir el enlace')}</label>
      <div class="opens" role="group"><button data-opens="tour">▶ ${t('Guided tour', 'Visita guiada')}</button>
        <button data-opens="cover">${t('Cover page', 'Portada')}</button></div>
      <p class="muted" data-a="note" style="margin:0 0 10px"></p>
      <label>${t('View link (2D, 3D and walk-through; nothing is saved)', 'Enlace de solo vista (2D, 3D y recorrido; no se guarda nada)')}<input readonly></label>
      <div class="row">${navigator.share ? `<button class="btn primary" data-a="native">${t('Share…', 'Compartir…')}</button>` : ''}
        <a class="btn wa" data-a="wa" target="_blank" rel="noopener">WhatsApp</a></div>
      <div class="row"><button class="btn" data-a="copy">${t('Copy link', 'Copiar enlace')}</button>
        <a class="btn" data-a="open" target="_blank" rel="noopener">${t('Open', 'Abrir')}</a></div>
      <p class="muted">${t('It shows every layout; the recommended one opens first.', 'Muestra todas las distribuciones; abre primero la recomendada.')}</p>
      <div class="row"><button class="btn" data-a="close">${t('Close', 'Cerrar')}</button></div>`);
    const input = dlg.querySelector('input');
    const apply = () => {
      dlg.querySelectorAll('[data-opens]').forEach(b => b.classList.toggle('on', b.dataset.opens === opens));
      dlg.querySelector('[data-a="note"]').textContent = opens === 'tour'
        ? t('It starts the guided 3D tour right away; then they can walk around or see the plan.',
          'Entra directo a la visita guiada en 3D; después puede recorrer por su cuenta o ver el plano.')
        : t('It opens a cover with your brand and buttons for the tour, the 3D and the plan.',
          'Abre una portada con tu marca y botones para la visita, el 3D y el plano.');
      input.value = link();
      dlg.querySelector('[data-a="wa"]').href = `https://wa.me/?text=${encodeURIComponent(text())}`;
      dlg.querySelector('[data-a="open"]').href = link();
    };
    dlg.querySelectorAll('[data-opens]').forEach(b => b.onclick = () => {
      opens = b.dataset.opens;
      try { localStorage.setItem(OPENS_KEY, opens); } catch { /* sin almacenamiento */ }
      apply();
    });
    apply();
    input.onfocus = () => input.select();
    dlg.querySelector('[data-a="copy"]').onclick = async () => {
      try { await navigator.clipboard.writeText(link()); api.toast(t('Link copied', 'Enlace copiado')); }
      catch { input.focus(); input.select(); }
    };
    dlg.querySelector('[data-a="native"]')?.addEventListener('click', () => navigator.share({ title: D.title, text: text(), url: link() }).catch(() => {}));
    dlg.querySelector('[data-a="close"]').onclick = () => dlg.close();
  }

  /** Enlace con ?visita: en lugar de la portada, entra directo a la visita guiada (si el 3D no carga, la portada). */
  function tourIntro() {
    const el = document.createElement('div');
    el.id = 'clientWelcome';
    el.innerHTML = `<div class="card">
      ${B.name ? `<div class="who">${brandMark()}<div><small>${t('Design by', 'Diseño de')}</small><b>${escape(B.name)}</b></div></div>` : ''}
      <h2>${escape(D.title)}</h2><p class="props">${t('Getting the guided tour ready…', 'Preparando la visita guiada…')}</p></div>`;
    document.body.appendChild(el);
    const go = (n = 0) => {
      if (window.View3D) { el.remove(); coverDone(); setView('3d').then(() => window.View3D.tour?.()); }
      else if (n < 100) setTimeout(() => go(n + 1), 100);
      else { el.remove(); clientWelcome(); }   // el 3D no cargó (three.js viene de internet): la portada de siempre
    };
    go();
  }

  window.__HOST__ = {
    get guests() { return D.guests; },
    get kind() { return D.kind || null; },   // tipo de evento (boda, xv, infantil…)
    get date() { return D.date || null; },   // AAAA-MM-DD
    brand: B,
    editable: EDIT,
    eventId: D.eventId,
    async setGuests(n) {
      D.guests = n;
      api?.rerender();
      if (EDIT) { try { await request('PATCH', `/api/events/${D.eventId}`, { guestCount: n }); } catch (e) { api?.toast(e.message); } }
    },
    async setKind(k) {
      D.kind = k;
      if (EDIT) { try { await request('PATCH', `/api/events/${D.eventId}`, { kind: k }); } catch (e) { api?.toast(e.message); } }
    },
    loadState(lv) { levelId = lv; return levelOf(active, lv); },
    save,
    async navigate(url) { if (!EDIT || await settled()) location.href = url; },
    mount(a) {
      api = a;
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
      syncUrl();
      renderBar();
      if (TOUR_LINK) tourIntro(); else if (!EDIT && !ARRIVED && !coverSeen()) clientWelcome();
    },
  };
})();
