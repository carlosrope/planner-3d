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
  const dists = D.distributions;
  let active = dists.find(d => d.id === D.activeId) || dists[0];
  let api = null, levelId = null;
  let timer = 0, saving = null, pending = false, conflict = false, warned = false, statusText = '';

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
  function setStatus(s) {
    statusText = s;
    const el = document.getElementById('hostStatus');
    if (el) el.textContent = s;
  }

  function save(lv, state) {
    levelId = lv;
    docOf(active).levels[lv] = clone(state);
    if (!EDIT) {
      if (!warned) { warned = true; api?.toast(t('This is a view link: changes are not saved', 'Es una vista para compartir: los cambios no se guardan')); }
      return;
    }
    pending = true;
    setStatus(t('Saving…', 'Guardando…'));
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
      .then(r => { dist.revision = r.revision; setStatus(pending ? t('Saving…', 'Guardando…') : t('Saved', 'Guardado')); })
      .catch(e => {
        if (e.status === 400) {
          conflict = true;
          setStatus(t('Not saved', 'Sin guardar'));
          alert(t('This change could not be saved (invalid data). Reload the page; if it happens again, let us know.',
            'Este cambio no se pudo guardar (datos inválidos). Recarga la página; si vuelve a pasar, avísanos.'));
        } else if (e.status === 401 || e.status === 404) {
          conflict = true;
          setStatus(t('Not saved', 'Sin guardar'));
          alert(t('Your session ended. Sign in again in another tab and reload this page; your last change was not saved.',
            'Tu sesión terminó. Vuelve a entrar en otra pestaña y recarga esta página; el último cambio no se guardó.'));
        } else if (e.status === 409) {
          conflict = true;
          setStatus(t('Not saved', 'Sin guardar'));
          alert(t('Someone else saved this layout. Reload the page to see the latest version.',
            'Otra persona guardó cambios en esta distribución. Recarga la página para ver la versión más reciente.'));
        } else {
          pending = true;
          failed = true;
          setStatus(t('Offline: will retry', 'Sin conexión: se reintentará'));
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
    if (!confirm(t(`Delete layout ${dist.name}? This cannot be undone.`, `¿Eliminar la distribución ${dist.name}? No se puede deshacer.`))) return;
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
  #hostStatus{color:var(--muted);font-size:12px;padding:0 8px;white-space:nowrap}
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
  dialog.hostDlg .muted{color:var(--muted);font-size:12px;margin:8px 0 0}`;

  function renderBar() {
    const bar = document.getElementById('hostBar');
    if (!bar) return;
    bar.hidden = false;
    const tabs = dists.map(d => `<button class="btn dist ${d === active ? 'on' : ''}" data-dist="${d.id}"
      title="${escape(d.note || '')}"><b>${escape(d.name)}</b>${d.recommended ? '<span class="star">★</span>' : ''}${d.note ? `<small>${escape(d.note)}</small>` : ''}</button>`).join('');
    bar.innerHTML = EDIT
      ? `${D.backHref ? `<a class="btn" href="${escape(D.backHref)}">← ${escape(D.backLabel || t('Projects', 'Proyectos'))}</a>` : ''}${tabs}
         <button class="btn" data-a="new" title="${t('New layout (copy of the current one)', 'Nueva distribución (copia de la actual)')}">＋</button>
         <button class="btn primary" data-a="share">${t('Share', 'Compartir')}</button><span id="hostStatus">${escape(statusText)}</span>`
      : `${tabs}<span class="viewonly">${t('View only', 'Solo vista')}</span>`;
    bar.querySelectorAll('[data-dist]').forEach(b => b.onclick = () => {
      const d = dists.find(x => x.id === b.dataset.dist);
      if (d === active && EDIT) editDialog(d); else select(d.id);
    });
    bar.querySelector('[data-a="new"]')?.addEventListener('click', () => create(active));
    bar.querySelector('[data-a="share"]')?.addEventListener('click', shareDialog);
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

  async function shareDialog() {
    await flush();
    let url;
    try { url = new URL((await request('POST', `/api/events/${D.eventId}/share`)).path, location.origin).toString(); }
    catch (e) { return api.toast(e.message); }
    const text = t(`Take a look at the design of ${D.title}: ${url}`, `Mira el diseño de ${D.title}: ${url}`);
    const dlg = dialog(`<h3>${t('Share with your client', 'Compartir con tu cliente')}</h3>
      <label>${t('View link (2D, 3D and walk-through; nothing is saved)', 'Enlace de solo vista (2D, 3D y recorrido; no se guarda nada)')}<input readonly value="${escape(url)}"></label>
      <div class="row">${navigator.share ? `<button class="btn primary" data-a="native">${t('Share…', 'Compartir…')}</button>` : ''}
        <a class="btn wa" data-a="wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(text)}">WhatsApp</a></div>
      <div class="row"><button class="btn" data-a="copy">${t('Copy link', 'Copiar enlace')}</button>
        <a class="btn" target="_blank" rel="noopener" href="${escape(url)}">${t('Open', 'Abrir')}</a></div>
      <p class="muted">${t('It shows every layout; the recommended one opens first.', 'Muestra todas las distribuciones; abre primero la recomendada.')}</p>
      <div class="row"><button class="btn" data-a="close">${t('Close', 'Cerrar')}</button></div>`);
    const input = dlg.querySelector('input');
    input.onfocus = () => input.select();
    dlg.querySelector('[data-a="copy"]').onclick = async () => {
      try { await navigator.clipboard.writeText(url); api.toast(t('Link copied', 'Enlace copiado')); }
      catch { input.focus(); input.select(); }
    };
    dlg.querySelector('[data-a="native"]')?.addEventListener('click', () => navigator.share({ title: D.title, text, url }).catch(() => {}));
    dlg.querySelector('[data-a="close"]').onclick = () => dlg.close();
  }

  window.__HOST__ = {
    get guests() { return D.guests; },
    editable: EDIT,
    async setGuests(n) {
      D.guests = n;
      api?.rerender();
      if (EDIT) { try { await request('PATCH', `/api/events/${D.eventId}`, { guestCount: n }); } catch (e) { api?.toast(e.message); } }
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
    },
  };
})();
