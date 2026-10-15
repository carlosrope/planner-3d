// Salones de eventos en el diseñador: catálogo, mesas numeradas, sillas por mesa,
// invitados contra lugares, lista de invitados con acomodo por mesa, lista de mobiliario
// y exportes para imprimir o guardar en PDF (hoja de montaje, invitados por mesa y A–Z).
// Se carga antes del diseñador (src/designer/disenador.html) solo en salones.
// Datos: window.__EVENTOS__ (catalogo.json). Dibujos 2D y 3D: window.__EXT_MODELS__ (modelos.js).
// Proveedores: window.__PROVEEDORES__ (proveedores.js), que aquí recibe los ayudantes de textos y hojas.
(function () {
  const CAT = window.__EVENTOS__ || [];
  const MODELS = window.__EXT_MODELS__ || { svg: {}, build3d: {}, nolabel: [] };
  const CHAIR = '#c9a24a';   // silla Tiffany dorada
  const SEATED = ['rtable', 'itable', 'headtable', 'schooltable', 'chairrow'];
  const NUMBERED = ['rtable', 'itable', 'schooltable'];
  // Las filas de sillas dan lugares, pero no son mesas: no llevan mantel ni cuentan como mesa.
  const isTable = f => SEATED.includes(f.type) && f.type !== 'chairrow';
  // Staff: los meseros (y capitanes) atienden mesas; cada uno con un color para su sección.
  const SECTIONED = ['mesero', 'capitan'];
  const SECTION_COLORS = ['#2f6fb0', '#2e8b57', '#d9822b', '#8e44ad', '#c0392b', '#16a085', '#b7950b', '#d35400', '#2c3e50', '#a93226'];
  const ROLE_LETTER = { coordinador: 'Co', capitan: 'Ca', mesero: 'M', barman: 'B', hostess: 'H', seguridad: 'S', valet: 'V' };

  // Formato del catálogo del diseñador: [tipo, nombre, ancho, fondo, color, extra]
  const lib = CAT.map(c => ({
    cat: c.cat,
    items: c.items.map(i => [i.type, i.name, i.w, i.d, i.color,
      i.seats ? { seats: i.seats, table: i.table } : i.role ? { role: i.role } : i.kind ? { kind: i.kind } : undefined]),
  }));
  const namesEn = {};
  CAT.forEach(c => { namesEn[c.cat] = c.catEn; c.items.forEach(i => { namesEn[i.name] = i.nameEn; }); });

  // Textos: el diseñador traduce con tr(zh, en, es); aquí no hay versión en chino.
  const t = (en, es) => tr(en, en, es);
  const seats = f => SEATED.includes(f.type) ? (f.seats ?? 0) : 0;
  const host = () => window.__HOST__;
  const guestsOf = state => host()?.guests ?? state.guests ?? window.__CASA__.guests ?? 0;
  // En el enlace del cliente no se muestran los nombres de los invitados.
  const canSeeGuests = () => !host() || host().editable;

  // ---------------------------------------------------------------- staff
  const staffOf = st => st.furniture.filter(f => f.type === 'staff');
  const waiters = st => staffOf(st).filter(f => SECTIONED.includes(f.role));
  /** Mesero (o capitán) que atiende una mesa. */
  const waiterOf = (st, tableId) => waiters(st).find(w => (w.tables || []).includes(tableId));
  const ROLE_PLURAL = { coordinador: ['coordinator', 'coordinadores'], capitan: ['captains', 'capitanes'], mesero: ['waiters', 'meseros'],
    barman: ['bartenders', 'barman'], hostess: ['hostesses', 'hostess'], seguridad: ['security', 'de seguridad'], valet: ['valets', 'valets'] };

  /** Reparte las mesas entre los meseros: cada mesa al mesero más cercano que todavía tenga cupo. */
  function distributeTables(st) {
    const ws = waiters(st).filter(w => w.role === 'mesero');
    const pool = ws.length ? ws : waiters(st);
    if (!pool.length) return false;
    const tables = tablesOf(st);
    const cap = Math.ceil(tables.length / pool.length);
    pool.forEach(w => { w.tables = []; });
    const dist = (a, b) => Math.hypot(a.cx - b.cx, a.cy - b.cy);
    tables.slice().sort((a, b) => Math.min(...pool.map(w => dist(w, a))) - Math.min(...pool.map(w => dist(w, b)))).forEach(f => {
      const w = pool.slice().sort((a, b) => dist(a, f) - dist(b, f)).find(x => x.tables.length < cap) || pool[0];
      w.tables.push(f.id);
    });
    return true;
  }

  /** Dietas y alergias de un grupo de invitados: "2 vegetariano · 1 sin gluten". */
  function dietSummary(guests) {
    const n = {};
    guests.forEach(g => { const d = (g.diet || '').trim().toLowerCase(); if (d) n[d] = (n[d] || 0) + 1; });
    return Object.entries(n).map(([d, k]) => `${k} ${d}`).join(' · ');
  }

  // Dibujo 2D del marcador (círculo con la inicial del rol) y figura simple en 3D.
  function staffSvg(w, d, c, f, K) {
    const r = Math.min(w, d) / 2, letter = ROLE_LETTER[f?.role] || 'S';
    return `<circle r="${r}" fill="${c}" ${K.ST}/><circle r="${r * .78}" fill="none" stroke="#fff" stroke-width="${r * .08}" opacity=".7"/>
      <text font-size="${r * (letter.length > 1 ? .78 : .95)}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-weight="700" pointer-events="none">${letter}</text>`;
  }
  function staff3d(g, f, K) {
    const body = K.mat(f.color || '#2f6fb0', { roughness: .7 }), skin = K.mat('#d9a77f', { roughness: .8 });
    g.add(K.cyl(.13, .17, .82, body, 0, 0, 0, 16), K.cyl(.19, .15, .5, body, 0, .82, 0, 16));
    g.add(K.blob(.11, .13, .11, skin, 0, 1.47, 0, 16));
  }
  // Las mesas de una sección llevan un aro del color de su mesero.
  function withSection(draw) {
    return (w, d, c, f, K) => {
      const base = draw ? draw(w, d, c, f, K) : K.rc(-w / 2, -d / 2, w, d, c);
      const waiter = f?.id && typeof state !== 'undefined' ? waiterOf(state, f.id) : null;
      if (!waiter) return base;
      const shape = (inset, extra) => f.type === 'rtable'
        ? `<circle r="${Math.min(w, d) / 2 - inset}" ${extra} pointer-events="none"/>`
        : `<rect x="${-w / 2 + inset}" y="${-d / 2 + inset}" width="${w - 2 * inset}" height="${d - 2 * inset}" rx="160" ${extra} pointer-events="none"/>`;
      return shape(0, `fill="${waiter.color}" opacity=".2"`) + base + shape(45, `fill="none" stroke="${waiter.color}" stroke-width="90" opacity=".85"`);
    };
  }

  // ---------------------------------------------------------------- invitados
  // Lista por distribución: state.guestList = [{id, name, group, diet, table}] (table = id de la mesa).
  const list = st => st.guestList || (st.guestList = []);
  const tablesOf = st => st.furniture.filter(f => SEATED.includes(f.type))
    .sort((a, b) => tableNo(a) - tableNo(b) || a.name.localeCompare(b.name, 'es'));
  const tableNo = f => +(/^Mesa (\d+)$/.exec(f.name)?.[1] || (f.type === 'headtable' ? 0 : 9999));
  const seatedAt = (st, id) => list(st).filter(g => g.table === id);
  const isSeated = (st, g) => !!g.table && st.furniture.some(f => f.id === g.table);
  let _g = 1;
  const gid = () => 'g' + Date.now().toString(36) + (_g++);

  /** Lista pegada de WhatsApp o Excel: un nombre por línea; "Grupo:" agrupa; "(vegetariano)" es dieta; "+2" acompañantes. */
  function parseList(text) {
    const out = [];
    let group = '';
    for (const raw of text.split(/\r?\n/)) {
      const cols = raw.split('\t').map(c => c.trim());
      if (cols.filter(Boolean).length > 1) {           // copiado de Excel: nombre, grupo, dieta
        if (/^nombre/i.test(cols[0])) continue;
        out.push({ id: gid(), name: cols[0].slice(0, 80), group: (cols[1] || group).slice(0, 60), diet: (cols[2] || '').slice(0, 80) });
        continue;
      }
      let line = raw.replace(/^\s*(?:[-*•·]+|\d+\s*[.)-])\s*/, '').trim();
      if (!line) continue;
      if (/[:：]$/.test(line)) { group = line.slice(0, -1).trim(); continue; }
      let extra = 0;
      const plus = /\s*\+\s*(\d{1,2})$/.exec(line);
      if (plus) { extra = +plus[1]; line = line.slice(0, plus.index).trim(); }
      const diet = /^(.*?)\s*\(([^)]*)\)$/.exec(line);
      const name = (diet ? diet[1] : line).slice(0, 80);
      if (!name) continue;
      out.push({ id: gid(), name, group: group.slice(0, 60), diet: (diet ? diet[2] : '').slice(0, 80) });
      for (let i = 1; i <= extra; i++) out.push({ id: gid(), name: `${t('Guest of', 'Acompañante de')} ${name}`.slice(0, 80), group: group.slice(0, 60), diet: '' });
    }
    return out;
  }

  /** Sienta a los que no tienen mesa: cada grupo junto en la primera mesa numerada donde quepa. */
  function autoSeat(st) {
    const tables = tablesOf(st).filter(f => NUMBERED.includes(f.type));
    const free = new Map(tables.map(f => [f.id, seats(f) - seatedAt(st, f.id).length]));
    const groups = new Map();
    list(st).filter(g => !isSeated(st, g)).forEach(g => {
      const k = g.group || '·' + g.id;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(g);
    });
    let left = 0;
    for (const members of groups.values()) {
      const rest = members.slice();
      while (rest.length) {
        const table = tables.find(f => free.get(f.id) >= rest.length)
          || tables.reduce((a, f) => (free.get(f.id) > (a ? free.get(a.id) : 0) ? f : a), null);
        if (!table) { left += rest.length; break; }
        const n = Math.min(free.get(table.id), rest.length);
        rest.splice(0, n).forEach(g => { g.table = table.id; });
        free.set(table.id, free.get(table.id) - n);
      }
    }
    return left;
  }

  // Nombre de catálogo de una pieza (las mesas se llaman "Mesa 3"); si se cambió el tamaño, se aclara.
  const ITEMS = CAT.flatMap(c => c.items);
  function pieceName(f) {
    if (f.type === 'staff') return nm(ITEMS.find(i => i.role === f.role)?.name || f.name);
    // Primero por nombre (dos piezas del mismo tipo y medida, como el show de payasitas y el de botargas).
    const byName = ITEMS.find(i => i.type === f.type && i.name === f.name && i.w === f.w && i.d === f.d);
    if (byName) return nm(byName.name);
    const same = ITEMS.find(i => i.type === f.type && i.w === f.w && i.d === f.d);
    if (same) return nm(same.name);
    const base = ITEMS.find(i => i.type === f.type);
    return base ? `${nm(base.name)} (${f.w}×${f.d})` : nm(f.name);
  }

  function onAdd(f, it, state) {
    if (it && it[5]) Object.assign(f, it[5]);
    if (V?.onAdd(f, it, state)) return;
    if (f.type === 'staff') {
      // "Mesero 3"; cada mesero con su color para distinguir su sección en el plano
      const base = (ITEMS.find(i => i.role === f.role)?.name) || f.name.replace(/ \d+$/, '');
      const used = new Set(state.furniture.filter(g => g.type === 'staff' && g.role === f.role)
        .map(g => +(new RegExp('^' + base + ' (\\d+)$').exec(g.name)?.[1] || 0)));
      let k = 1;
      while (used.has(k)) k++;
      f.name = `${base} ${k}`;
      if (SECTIONED.includes(f.role)) f.color = SECTION_COLORS[(k - 1) % SECTION_COLORS.length];
      delete f.tables;
      return;
    }
    if (!NUMBERED.includes(f.type)) return;
    const used = new Set(state.furniture.map(g => +(/^Mesa (\d+)$/.exec(g.name)?.[1] || 0)));
    let n = 1;
    while (used.has(n)) n++;
    f.name = `Mesa ${n}`;
  }

  // Nombre del color más parecido, para que la rentadora sepa qué mandar ("Dorado", "Marfil").
  const COLORS = [['Blanco', '#ffffff'], ['Marfil', '#f4efe6'], ['Champaña', '#fbf3df'], ['Arena', '#e9e5de'], ['Dorado', '#c9a24a'],
    ['Plata', '#c0c4c8'], ['Gris', '#8a8a8a'], ['Negro', '#2b2b2d'], ['Rosa palo', '#f1e3e6'], ['Rosa', '#e8a1b4'], ['Vino', '#7b2a3a'],
    ['Rojo', '#c0392b'], ['Terracota', '#b5653a'], ['Durazno', '#f4c7a1'], ['Amarillo', '#f6d27a'], ['Verde olivo', '#7a8450'],
    ['Verde salvia', '#a9bba0'], ['Esmeralda', '#2e7d5b'], ['Azul cielo', '#a9c8e8'], ['Azul marino', '#24324f'], ['Lila', '#c9b7d9'], ['Café', '#7a5a3c']];
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  function colorName(hex) {
    const c = rgb(hex);
    return COLORS.reduce((best, [n, h]) => { const d = rgb(h).reduce((a, v, i) => a + (v - c[i]) ** 2, 0); return d < best[1] ? [n, d] : best; }, ['', Infinity])[0];
  }

  function inventory(st) {
    const tables = st.furniture.filter(f => SEATED.includes(f.type));
    const pieces = {}, chairs = {}, cloths = {};
    st.furniture.forEach(f => { if (f.type === 'staff' || f.type === 'vendor') return; const k = pieceName(f); pieces[k] = (pieces[k] || 0) + 1; });
    tables.forEach(f => { const c = f.chair || CHAIR; chairs[c] = (chairs[c] || 0) + seats(f); });
    tables.filter(isTable).forEach(f => { cloths[f.color] = (cloths[f.color] || 0) + 1; });
    return { tables, pieces: Object.entries(pieces).sort((a, b) => b[1] - a[1]), chairs: Object.entries(chairs), cloths: Object.entries(cloths) };
  }

  function overview(state) {
    const { tables, pieces, chairs, cloths } = inventory(state);
    const places = tables.reduce((a, f) => a + seats(f), 0);
    const guests = guestsOf(state), diff = places - guests;
    const status = !guests ? t('Enter the guest count', 'Escribe cuántos invitados son')
      : diff >= 0 ? t(`${diff} spare seats`, `Sobran ${diff} lugares`) : t(`${-diff} seats missing`, `Faltan ${-diff} lugares`);
    const names = list(state), seated = names.filter(g => isSeated(state, g)).length;
    const sw = c => `<span class="sw" style="background:${c}"></span>`;
    const row = (a, b) => `<tr><td>${a}</td><td class="r">${b}</td></tr>`;
    return `<section><h3>${t('Guests & seats', 'Invitados y lugares')}</h3>
      <div class="stats">
        <div><small>${t('Guests', 'Invitados')}</small>${host() && !host().editable ? `<span class="big">${guests}</span>`
          : `<input type="number" id="xGuests" value="${guests || ''}" min="0" max="5000" step="1" inputmode="numeric"
          style="width:100%;font-size:20px;font-weight:600;border:1px solid var(--line);border-radius:6px;padding:2px 6px">`}</div>
        <div><small>${t('Seats', 'Lugares')}</small><span class="big">${places}</span></div></div>
      <div class="total"><span>${status}</span><b style="color:${diff < 0 ? '#b3372a' : 'inherit'}">${tables.filter(isTable).length ? `${tables.filter(isTable).length} ${t('tables', 'mesas')}` : `${tables.length} ${t('rows', 'filas')}`}</b></div>
      ${canSeeGuests() ? `<div class="actions"><button class="btn primary" id="xOpenGuests">${t('Guest list', 'Lista de invitados')} (${names.length})</button></div>
      ${names.length ? `<div class="muted" style="margin-top:6px">${t(`${seated} seated · ${names.length - seated} without a table`,
        `${seated} sentados · ${names.length - seated} sin mesa`)}</div>` : ''}` : ''}</section>
    <section><h3>${t('Furniture list', 'Lista de mobiliario')} <small>${t('for rental and setup', 'para renta y montaje')}</small></h3>
      <table>${pieces.map(([k, n]) => row(esc(k), n)).join('')}
        ${chairs.map(([c, n]) => row(`${sw(c)}${t('Chairs', 'Sillas')} ${colorName(c).toLowerCase()}`, n)).join('')}</table>
      ${tables.filter(isTable).length ? `<h3 style="margin-top:12px">${t('Tablecloths', 'Manteles')}</h3>
        <table>${cloths.map(([c, n]) => row(`${sw(c)}${colorName(c)}`, n)).join('')}</table>` : ''}
      <div class="actions"><button class="btn" id="xPrintSetup">${t('Setup sheet (PDF)', 'Hoja de montaje (PDF)')}</button></div></section>
    ${staffSection(state)}
    ${V?.section(state) ?? ''}
    ${canSeeGuests() ? `<section><h3>${t('Event type', 'Tipo de evento')}</h3>
      <select id="xKind" style="width:100%;font-size:15px;padding:8px;border:1px solid var(--line);border-radius:8px;background:#fff">
        ${KINDS.map(([v, label]) => `<option value="${v}"${v === kindOf(state) ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select>
      <div class="muted" style="margin-top:6px">${t('Changing it rebuilds the layout with what that party needs; you can undo it.',
        'Al cambiarlo se rearma el montaje con lo que lleva esa fiesta; se puede deshacer.')}</div></section>
    <section><h3>${t('Layout template', 'Plantilla de montaje')} <small>${t(`for ${guests || 'your'} guests`, `para ${guests || 'tus'} invitados`)}</small></h3>
      <div class="actions">${Object.entries(TEMPLATES).map(([k, [en, es]]) => `<button class="btn" data-template="${k}">${t(en, es)}</button>`).join('')}</div>
      <div class="muted" style="margin-top:6px">${t('Replaces the furniture of this layout; you can undo it.', 'Reemplaza los muebles de esta distribución; se puede deshacer.')}</div></section>` : ''}`;
  }

  function staffSection(st) {
    const staff = staffOf(st);
    if (!staff.length) return `<section><h3>${t('Staff', 'Staff')}</h3><div class="muted">${t(
      'Add coordinators, captains, waiters, bartenders… from the “Staff” catalog to plan the service.',
      'Agrega coordinador, capitanes, meseros, barman… desde el catálogo “Staff” para planear el servicio.')}</div></section>`;
    const byRole = {};
    staff.forEach(f => { byRole[f.role] = (byRole[f.role] || 0) + 1; });
    const summary = Object.entries(byRole).map(([r, n]) => `${n} ${t((ROLE_PLURAL[r] || [r, r])[0], (ROLE_PLURAL[r] || [r, r])[1])}`).join(' · ');
    const ws = waiters(st), tables = tablesOf(st), free = tables.filter(f => !waiterOf(st, f.id)).length;
    return `<section><h3>${t('Staff', 'Staff')}</h3><div>${esc(summary)}</div>
      ${ws.length ? `<table style="margin-top:6px">${ws.map(w => `<tr class="click" data-fsel="${w.id}"><td><span class="sw" style="background:${w.color}"></span>${esc(w.name)}</td>
        <td class="r">${(w.tables || []).filter(id => tables.some(f => f.id === id)).length} ${t('tables', 'mesas')}</td></tr>`).join('')}</table>
        ${free ? `<div class="muted" style="margin-top:4px;color:#b3372a">${t(`${free} tables without a waiter`, `${free} mesas sin mesero`)}</div>` : ''}
        <div class="actions"><button class="btn" id="xDistribute">${t('Split tables among waiters', 'Repartir mesas entre meseros')}</button>
        <button class="btn" id="xPrintWaiters">${t('Waiters sheet (PDF)', 'Hoja de meseros (PDF)')}</button></div>` : ''}</section>`;
  }

  const TEMPLATES = {
    redondas: ['Round tables', 'Redondas'], imperial: ['Banquet tables', 'Imperiales'], coctel: ['Cocktail', 'Cóctel'],
    auditorio: ['Theater rows', 'Auditorio'], escuela: ['Classroom', 'Escuela'],
  };
  // Tipos de evento (los pone el servidor desde src/lib/domain.ts). El tipo vive en el evento (host) o, en la demo, en el diseño.
  const KINDS = window.__TIPOS_EVENTO__ || [['boda', 'Boda']];
  const kindLabel = k => (KINDS.find(([v]) => v === k) || [k, k])[1];
  const kindOf = st => host()?.kind || st.eventKind || 'boda';

  /** Rearma el montaje con una plantilla; sin plantilla, la que sugiere el tipo de evento. */
  async function applyTemplate(kind, opts = {}) {
    const guests = guestsOf(state) || list(state).length || 200;
    const where = host()?.eventId ? `evento=${encodeURIComponent(host().eventId)}` : `lugar=${encodeURIComponent(window.__CASA__.id)}`;
    if (!opts.confirmed && !confirm(t(`Replace the furniture with the “${TEMPLATES[kind][0]}” template for ${guests} guests? You can undo it.`,
      `¿Reemplazar los muebles con la plantilla “${TEMPLATES[kind][1]}” para ${guests} invitados? Se puede deshacer.`))) return;
    let data;
    try {
      const r = await fetch(`/api/plantilla?${kind ? `tipo=${kind}&` : ''}clase=${encodeURIComponent(opts.eventKind || kindOf(state))}&invitados=${guests}&${where}`);
      data = await r.json();
      if (!r.ok) throw new Error(data.error);
    } catch (e) { return toast(e.message || t('Could not load the template', 'No se pudo cargar la plantilla')); }
    const seated = list(state).some(g => g.table);
    ui.sel = null;
    mutate(() => {
      state.furniture = data.furniture.map(f => ({ ...f, id: uid() }));
      list(state).forEach(g => { delete g.table; });
    });
    toast(seated ? t('Template applied: guests need their tables again', 'Plantilla aplicada: vuelve a acomodar a los invitados')
      : t('Template applied', 'Plantilla aplicada'));
  }

  function bindOverview() {
    const open = document.getElementById('xOpenGuests');
    if (open) open.onclick = () => select({ kind: 'ext', panel: 'guests' });
    document.getElementById('xPrintSetup').onclick = () => printSetup(state);
    document.querySelectorAll('#panel [data-template]').forEach(b => b.onclick = () => applyTemplate(b.dataset.template));
    const kindSel = document.getElementById('xKind');
    if (kindSel) kindSel.onchange = async () => {
      const k = kindSel.value, prev = kindOf(state);
      if (!confirm(t(`Rebuild the layout for “${kindLabel(k)}”? You can undo it.`, `¿Rearmar el montaje para “${kindLabel(k)}”? Se puede deshacer.`))) { kindSel.value = prev; return; }
      if (host()) await host().setKind(k);
      else mutate(() => { state.eventKind = k; });
      await applyTemplate(null, { confirmed: true, eventKind: k });
    };
    document.querySelectorAll('#panel [data-fsel]').forEach(tr => tr.onclick = () => select({ kind: 'furn', id: tr.dataset.fsel }));
    const dist = document.getElementById('xDistribute');
    if (dist) dist.onclick = () => mutate(() => distributeTables(state)) || toast(t('Tables split among waiters', 'Mesas repartidas entre los meseros'));
    const pw = document.getElementById('xPrintWaiters');
    if (pw) pw.onclick = () => printWaiters(state);
    V?.bindSection();
    const input = document.getElementById('xGuests');
    if (!input) return;
    input.onchange = () => {
      const n = Math.max(0, Math.min(5000, parseInt(input.value, 10) || 0));
      if (host()) host().setGuests(n);
      else mutate(() => { state.guests = n; });
    };
  }

  function panel(f) {
    if (f.type === 'staff' && SECTIONED.includes(f.role)) {
      const tables = tablesOf(state), mine = new Set(f.tables || []);
      return `<div class="full" style="grid-column:1/-1"><b style="font-weight:600">${t('Tables served', 'Mesas que atiende')}</b>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${tables.map(x => {
          const other = !mine.has(x.id) && waiterOf(state, x.id);
          return `<label style="display:flex;align-items:center;gap:4px;padding:4px 8px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);flex-direction:row">
            <input type="checkbox" style="width:auto;margin:0" data-wtable="${x.id}" ${mine.has(x.id) ? 'checked' : ''}>${esc(x.name.replace(/^Mesa /, ''))}${other ? `<span class="sw" style="background:${other.color};margin:0 0 0 4px"></span>` : ''}</label>`;
        }).join('')}</div>
        <div class="muted" style="margin-top:4px">${t('A colored dot means another waiter has it.', 'El punto de color indica que la atiende otro mesero.')}</div></div>`;
    }
    if (V?.isVendor(f)) return V.panel(f);
    if (!SEATED.includes(f.type)) return '';
    return `<label>${t('Chairs', 'Sillas')}<input type="number" id="xSeats" value="${f.seats ?? 0}" min="0" max="40" step="1" inputmode="numeric"></label>
      <label>${t('Chair color', 'Color de silla')}<input type="color" id="xChair" value="${f.chair || CHAIR}"></label>
      <div class="muted full" style="grid-column:1/-1">${t('“Color” is the tablecloth.', '“Color” es el del mantel.')}</div>`;
  }

  function bindPanel(f, upd) {
    if (V?.isVendor(f)) return V.bindPanel(f, upd);
    document.querySelectorAll('#panel [data-wtable]').forEach(cb => cb.onchange = () => mutate(() => {
      const id = cb.dataset.wtable;
      waiters(state).forEach(w => { if (w.id !== f.id && w.tables) w.tables = w.tables.filter(x => x !== id); });
      const me = state.furniture.find(g => g.id === f.id);
      me.tables = (me.tables || []).filter(x => x !== id).concat(cb.checked ? [id] : []);
    }));
    const s = document.getElementById('xSeats');
    if (!s) return;
    s.onchange = () => { const v = parseInt(s.value, 10); if (!isNaN(v)) upd(g => { g.seats = Math.max(0, Math.min(40, v)); }); };
    document.getElementById('xChair').onchange = e => upd(g => { g.chair = e.target.value; });
    document.querySelectorAll('#panel [data-unseat]').forEach(b => b.onclick = () =>
      mutate(() => { const g = list(state).find(x => x.id === b.dataset.unseat); if (g) delete g.table; }));
    document.querySelectorAll('#panel [data-viewfrom]').forEach(b => b.onclick = () => viewFromTable(b.dataset.viewfrom));
    const add = document.getElementById('xSeatGuest');
    if (add) add.onchange = () => add.value && mutate(() => { const g = list(state).find(x => x.id === add.value); if (g) g.table = f.id; });
  }

  /** Debajo de las propiedades de una mesa: quién se sienta ahí y agregar a alguien sin mesa. */
  function panelAfter(f) {
    if (!SEATED.includes(f.type)) return V?.panelAfter(f) ?? '';
    const here = seatedAt(state, f.id), cap = seats(f);
    const waiter = waiterOf(state, f.id), diets = dietSummary(here);
    const head = `<h3>${t('Guests at this table', 'Invitados en esta mesa')} <small>${here.length}/${cap}</small></h3>
      ${waiter ? `<div class="muted"><span class="sw" style="background:${waiter.color}"></span>${t('Served by', 'La atiende')} ${esc(waiter.name)}</div>` : ''}
      ${diets && canSeeGuests() ? `<div class="muted" style="color:#b5653a">${esc(diets)}</div>` : ''}`;
    const view = `<div class="actions"><button class="btn primary" data-viewfrom="${f.id}">${t('View from this table (3D)', 'Ver desde esta mesa (3D)')}</button></div>`;
    if (!canSeeGuests()) return `<section>${head}${view}</section>`;
    const free = list(state).filter(g => !isSeated(state, g));
    return `<section>${head}
      <table>${here.map(g => `<tr><td>${esc(g.name)}${g.diet ? ` <small class="muted">· ${esc(g.diet)}</small>` : ''}</td>
        <td class="r"><button class="btn" data-unseat="${g.id}" title="${t('Remove from table', 'Quitar de la mesa')}">×</button></td></tr>`).join('')
        || `<tr><td class="muted">${t('Nobody yet', 'Todavía nadie')}</td></tr>`}</table>
      ${free.length ? `<select id="xSeatGuest" style="width:100%;margin-top:8px;padding:8px;border:1px solid var(--line);border-radius:8px;background:#fff">
        <option value="">＋ ${t('Seat a guest without a table…', 'Sentar a un invitado sin mesa…')}</option>
        ${free.map(g => `<option value="${g.id}">${esc(g.name)}${g.group ? ` · ${esc(g.group)}` : ''}</option>`).join('')}</select>` : ''}
      <div class="actions"><button class="btn" onclick="select({kind:'ext',panel:'guests'})">${t('Open guest list', 'Abrir lista de invitados')}</button></div>
      ${view}</section>`;
  }

  /** Lugar de un invitado en la mesa (mm): del lado opuesto a la pista (o al escenario, o a la mesa principal), mirando hacia allá. */
  function seatView(st, f) {
    const focus = ['dancefloor', 'stage', 'headtable'].map(k => st.furniture.find(g => g.type === k && g.id !== f.id)).find(Boolean);
    const tx = focus ? focus.cx : BOUNDS.x + BOUNDS.w / 2, ty = focus ? focus.cy : BOUNDS.y + BOUNDS.h / 2;
    const dx = f.cx - tx, dy = f.cy - ty, len = Math.hypot(dx, dy) || 1;
    const back = Math.min(f.w, f.d) / 2 + 150;   // detrás de la silla
    return { x: f.cx + dx / len * back, y: f.cy + dy / len * back, tx, ty };
  }

  /** Cámara 3D sentada en la mesa, mirando a la pista (o al escenario, o a la mesa principal). */
  async function viewFromTable(id) {
    const f = state.furniture.find(g => g.id === id);
    if (!f) return;
    const v = seatView(state, f);
    if (typeof is3D === 'function' && !is3D()) { await setView('3d'); await new Promise(r => setTimeout(r, 200)); }
    closeDrawers?.();
    window.View3D?.viewFrom(v.x, v.y, v.tx, v.ty);
  }

  /** «Ir a…» del recorrido: la pista (de pie, de espaldas al escenario, mirando a los invitados) y cada mesa (sentado, como en «Ver desde esta mesa»). */
  function walkSpots(st) {
    const out = [], dance = st.furniture.find(g => g.type === 'dancefloor');
    if (dance) {
      const stage = ['stage', 'dj'].map(k => st.furniture.find(g => g.type === k)).find(Boolean);
      const ax = stage ? dance.cx - stage.cx : BOUNDS.x + BOUNDS.w / 2 - dance.cx, ay = stage ? dance.cy - stage.cy : BOUNDS.y + BOUNDS.h / 2 - dance.cy;
      const len = Math.hypot(ax, ay), ux = len ? ax / len : 0, uy = len ? ay / len : 1;
      const back = Math.max(0, Math.min(dance.w, dance.d) / 2 - 500);   // en la orilla del lado del escenario: se ve toda la pista
      out.push({ group: t('Places', 'Lugares'), label: t('Dance floor', 'Pista de baile'), x: dance.cx - ux * back, y: dance.cy - uy * back,
        tx: dance.cx + ux * 6000, ty: dance.cy + uy * 6000, sit: false });
    }
    tablesOf(st).forEach(f => out.push({ group: t('Tables', 'Mesas'), label: nm(f.name), id: f.id, cx: f.cx, cy: f.cy,
      r: Math.max(f.w, f.d) / 2, sit: true, ...seatView(st, f) }));
    return out;
  }

  /** Nombre en el plano: con lista de invitados, la mesa muestra cuántos lleva ("Mesa 3 · 7/10"). */
  function label(f) {
    if (V?.isVendor(f)) return V.label(f);
    if (!SEATED.includes(f.type) || !canSeeGuests() || !list(state).length) return null;
    return `${nm(f.name)} · ${seatedAt(state, f.id).length}/${seats(f)}`;
  }

  // ---------------------------------------------------------------- panel de la lista
  const ui2 = { filter: 'all', query: '', adding: false, editing: null };

  function guestsPanel() {
    const all = list(state), tables = tablesOf(state);
    const seated = all.filter(g => isSeated(state, g)).length;
    const q = ui2.query.trim().toLowerCase();
    const tableName = id => tables.find(f => f.id === id)?.name || '';
    const shown = all.filter(g => (ui2.filter === 'all' || (ui2.filter === 'free') !== isSeated(state, g))
      && (!q || [g.name, g.group, g.diet, tableName(g.table)].some(v => (v || '').toLowerCase().includes(q))));
    const opts = g => `<option value="">${t('No table', 'Sin mesa')}</option>` + tables.map(f =>
      `<option value="${f.id}" ${g.table === f.id ? 'selected' : ''}>${esc(f.name)} · ${seatedAt(state, f.id).length}/${seats(f)}</option>`).join('');
    const inp = 'style="width:100%;padding:8px;border:1px solid var(--line);border-radius:8px;font:inherit;font-size:16px;background:#fff"';
    const chip = (k, txt) => `<button class="btn chip ${ui2.filter === k ? 'on' : ''}" data-gfilter="${k}">${txt}</button>`;
    const rows = shown.map(g => ui2.editing === g.id
      ? `<tr><td colspan="2"><div class="form">
          <label class="full">${t('Name', 'Nombre')}<input id="geName" value="${esc(g.name)}" maxlength="80"></label>
          <label>${t('Group', 'Grupo')}<input id="geGroup" value="${esc(g.group || '')}" maxlength="60"></label>
          <label>${t('Diet / allergy', 'Dieta / alergia')}<input id="geDiet" value="${esc(g.diet || '')}" maxlength="80"></label></div>
          <div class="actions"><button class="btn primary" data-gsave="${g.id}">${t('Save', 'Guardar')}</button>
          <button class="btn danger" data-gdel="${g.id}">${t('Delete', 'Eliminar')}</button>
          <button class="btn" data-gcancel>${t('Cancel', 'Cancelar')}</button></div></td></tr>`
      : `<tr><td class="click" data-gedit="${g.id}"><b style="font-weight:500">${esc(g.name)}</b>
          ${g.group || g.diet ? `<br><small class="muted">${esc([g.group, g.diet].filter(Boolean).join(' · '))}</small>` : ''}</td>
        <td class="r"><select data-gtable="${g.id}" style="max-width:11em;padding:6px;border:1px solid var(--line);border-radius:8px;background:#fff">${opts(g)}</select></td></tr>`).join('');
    return `<section><h3>${t('Guest list', 'Lista de invitados')} <small>${all.length} · ${seated} ${t('seated', 'sentados')}</small></h3>
      <div class="actions"><button class="btn ${ui2.adding ? 'on' : ''}" id="gAddToggle">＋ ${t('Add', 'Agregar')}</button>
        <button class="btn" id="gAuto" ${all.length ? '' : 'disabled'}>${t('Seat automatically', 'Acomodar automáticamente')}</button></div>
      ${ui2.adding ? `<div style="margin-top:8px"><textarea id="gPaste" rows="7" ${inp} placeholder="${t(
        'Paste the list: one name per line.\nGroup: on its own line groups the next names.\n(vegetarian) after a name is the diet; +2 adds companions.',
        'Pega la lista: un nombre por línea.\nFamilia Pérez: en su propio renglón agrupa los siguientes.\n(vegetariano) después del nombre es la dieta; +2 agrega acompañantes.')}"></textarea>
        <div class="actions"><button class="btn primary" id="gAdd">${t('Add to the list', 'Agregar a la lista')}</button></div></div>` : ''}
      <input id="gSearch" type="search" ${inp} placeholder="${t('Search a guest, group or table', 'Buscar invitado, grupo o mesa')}" value="${esc(ui2.query)}" style="margin-top:10px">
      <div class="actions" style="margin-top:6px">${chip('all', t('All', 'Todos'))}${chip('free', t('No table', 'Sin mesa'))}${chip('seated', t('Seated', 'Con mesa'))}</div>
      <table style="margin-top:6px">${rows || `<tr><td class="muted">${all.length ? t('No matches', 'Sin resultados') : t('Paste your list with “Add”.', 'Pega tu lista con “Agregar”.')}</td></tr>`}</table>
      <div class="actions" style="margin-top:12px">
        <button class="btn" id="gPrintTables" ${all.length ? '' : 'disabled'}>${t('PDF by table', 'PDF por mesa')}</button>
        <button class="btn" id="gPrintAbc" ${all.length ? '' : 'disabled'}>${t('PDF A–Z', 'PDF alfabético')}</button>
        <button class="btn" id="gCsv" ${all.length ? '' : 'disabled'}>CSV</button>
        <button class="btn danger" id="gClear" ${all.length ? '' : 'disabled'}>${t('Clear list', 'Vaciar lista')}</button>
        <button class="btn" id="gBack">${t('← Back', '← Volver')}</button></div></section>`;
  }

  function bindGuestsPanel() {
    const $$ = sel => document.querySelectorAll('#panel ' + sel), $1 = id => document.getElementById(id);
    $1('gAddToggle').onclick = () => { ui2.adding = !ui2.adding; renderPanel(); if (ui2.adding) $1('gPaste')?.focus(); };
    if ($1('gAdd')) $1('gAdd').onclick = () => {
      const found = parseList($1('gPaste').value);
      if (!found.length) return toast(t('Write at least one name', 'Escribe al menos un nombre'));
      ui2.adding = false;
      mutate(() => list(state).push(...found));
      toast(t(`${found.length} guests added`, `Se agregaron ${found.length} invitados`));
    };
    $1('gAuto').onclick = () => {
      let left = 0;
      mutate(() => { left = autoSeat(state); });
      toast(left ? t(`${left} guests did not fit: add tables or chairs`, `${left} invitados no cupieron: agrega mesas o sillas`)
        : t('Everyone has a table', 'Todos tienen mesa'));
    };
    const search = $1('gSearch');
    search.oninput = () => { ui2.query = search.value; const pos = search.selectionStart; renderPanel(); const s2 = $1('gSearch'); s2.focus(); s2.setSelectionRange(pos, pos); };
    $$('[data-gfilter]').forEach(b => b.onclick = () => { ui2.filter = b.dataset.gfilter; renderPanel(); });
    $$('[data-gtable]').forEach(sel => sel.onchange = () => mutate(() => {
      const g = list(state).find(x => x.id === sel.dataset.gtable);
      if (!g) return;
      if (sel.value) g.table = sel.value; else delete g.table;
    }));
    $$('[data-gedit]').forEach(td => td.onclick = () => { ui2.editing = td.dataset.gedit; renderPanel(); });
    $$('[data-gcancel]').forEach(b => b.onclick = () => { ui2.editing = null; renderPanel(); });
    $$('[data-gsave]').forEach(b => b.onclick = () => {
      const name = $1('geName').value.trim().slice(0, 80);
      if (!name) return toast(t('The name is required', 'El nombre es obligatorio'));
      ui2.editing = null;
      mutate(() => Object.assign(list(state).find(x => x.id === b.dataset.gsave) || {},
        { name, group: $1('geGroup').value.trim().slice(0, 60), diet: $1('geDiet').value.trim().slice(0, 80) }));
    });
    $$('[data-gdel]').forEach(b => b.onclick = () => { ui2.editing = null; mutate(() => { state.guestList = list(state).filter(x => x.id !== b.dataset.gdel); }); });
    $1('gPrintTables').onclick = () => printByTable(state);
    $1('gPrintAbc').onclick = () => printAbc(state);
    $1('gCsv').onclick = () => exportCsv(state);
    $1('gClear').onclick = () => {
      if (confirm(t('Delete the whole guest list? You can undo it.', '¿Borrar toda la lista de invitados? Se puede deshacer.'))) mutate(() => { state.guestList = []; });
    };
    $1('gBack').onclick = () => select(null);
  }

  // ---------------------------------------------------------------- exportes para imprimir o guardar en PDF
  const today = () => new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

  // La hoja se abre encima de la página (no en ventana nueva: Safari y el navegador de WhatsApp
  // bloquean ventanas emergentes). Al imprimir solo sale la hoja; en el iPhone, "Imprimir" permite
  // guardarla como PDF o mandarla por WhatsApp.
  const PRINT_CSS = `
#printDoc{position:fixed;inset:0;z-index:200;overflow:auto;background:#fff;color:#2b2824;-webkit-user-select:text;user-select:text;
  font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
#printDoc .page{max-width:920px;margin:0 auto;padding:16px 16px 40px}
#printDoc h1{font-size:22px;margin:0 0 2px}#printDoc h2{font-size:16px;margin:22px 0 8px;padding-bottom:4px;border-bottom:1px solid #ddd5c8;break-after:avoid}
#printDoc .muted{color:#7d7366}#printDoc table{border-collapse:collapse;width:100%}
#printDoc td,#printDoc th{padding:5px 6px;border-bottom:1px solid #eee7dc;text-align:left;vertical-align:top}
#printDoc th{font-size:12px;color:#7d7366;font-weight:600}#printDoc .r{text-align:right}
#printDoc .sw{display:inline-block;width:12px;height:12px;border-radius:3px;border:1px solid #0002;margin-right:6px;vertical-align:-1px}
#printDoc .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
#printDoc .card{border:1px solid #ddd5c8;border-radius:10px;padding:10px 12px;break-inside:avoid}
#printDoc .card h3{margin:0 0 6px;font-size:15px;display:flex;justify-content:space-between}#printDoc .card ol{margin:0;padding-left:20px}
#printDoc .diet{font-size:11px;color:#b5653a}#printDoc .plan{width:100%;height:auto;border:1px solid #eee7dc;border-radius:8px;background:#f7f4ee}
#printDoc .bar{position:sticky;top:0;background:#fff;padding:10px 16px;display:flex;gap:8px;justify-content:flex-end;border-bottom:1px solid #eee7dc}
#printDoc .bar button{font:inherit;padding:10px 16px;border-radius:10px;border:1px solid #ddd5c8;background:#fff;color:#2b2824}
#printDoc .bar button.go{border:0;background:#2b2824;color:#fff}
@media print{html,body{height:auto!important;overflow:visible!important}body>*:not(#printDoc){display:none!important}
  #printDoc{position:static;overflow:visible}#printDoc .bar{display:none}#printDoc .page{max-width:none;padding:0}}`;

  function openPrint(title, body) {
    document.getElementById('printDoc')?.remove();
    if (!document.getElementById('printCss')) {
      const st = document.createElement('style'); st.id = 'printCss'; st.textContent = PRINT_CSS; document.head.appendChild(st);
    }
    const doc = document.createElement('div');
    doc.id = 'printDoc';
    doc.innerHTML = `<div class="bar"><button data-close>${t('Close', 'Cerrar')}</button>
      <button class="go" data-print>${t('Print or save PDF', 'Imprimir o guardar PDF')}</button></div><div class="page">${body}</div>`;
    document.body.appendChild(doc);
    const prev = document.title;
    doc.querySelector('[data-print]').onclick = () => { document.title = title; print(); document.title = prev; };
    doc.querySelector('[data-close]').onclick = () => doc.remove();
  }

  const header = (what) => `<h1>${esc(window.__CASA__.title)}</h1><p class="muted">${what} · ${today()}</p>`;

  function planSvg() {
    const clone = document.getElementById('plan').cloneNode(true);
    clone.setAttribute('viewBox', `${BOUNDS.x} ${BOUNDS.y} ${BOUNDS.w} ${BOUNDS.h}`);
    clone.removeAttribute('style'); clone.setAttribute('class', 'plan');
    clone.querySelector('#gSel').innerHTML = '';
    clone.querySelector('#gGrid').innerHTML = '';
    return new XMLSerializer().serializeToString(clone);
  }

  function printSetup(st) {
    const { tables, pieces, chairs, cloths } = inventory(st);
    const sw = c => `<span class="sw" style="background:${c}"></span>`;
    const body = `${header(t('Setup sheet', 'Hoja de montaje'))}${planSvg()}
      <h2>${t('Furniture', 'Mobiliario')}</h2><table>
        ${pieces.map(([k, n]) => `<tr><td>${esc(k)}</td><td class="r">${n}</td></tr>`).join('')}
        ${chairs.map(([c, n]) => `<tr><td>${sw(c)}${t('Chairs', 'Sillas')} ${colorName(c).toLowerCase()} <small class="muted">${c}</small></td><td class="r">${n}</td></tr>`).join('')}
        ${cloths.map(([c, n]) => `<tr><td>${sw(c)}${t('Tablecloths', 'Manteles')} ${colorName(c).toLowerCase()} <small class="muted">${c}</small></td><td class="r">${n}</td></tr>`).join('')}</table>
      ${tables.length ? `<h2>${t('Tables', 'Mesas')}</h2><table><tr><th>${t('Table', 'Mesa')}</th><th>${t('Type', 'Tipo')}</th>
        <th class="r">${t('Chairs', 'Sillas')}</th><th>${t('Cloth', 'Mantel')}</th><th>${t('Chair', 'Silla')}</th><th class="r">${t('Guests', 'Invitados')}</th></tr>
        ${tables.map(f => `<tr><td>${esc(f.name)}</td><td>${esc(pieceName(f))}</td><td class="r">${seats(f)}</td><td>${sw(f.color)}${colorName(f.color)}</td>
          <td>${sw(f.chair || CHAIR)}${colorName(f.chair || CHAIR)}</td><td class="r">${seatedAt(st, f.id).length}</td></tr>`).join('')}</table>` : ''}`;
    openPrint(t('Setup sheet', 'Hoja de montaje'), body);
  }

  function printByTable(st) {
    const cards = tablesOf(st).map(f => {
      const here = seatedAt(st, f.id);
      const diets = dietSummary(here), waiter = waiterOf(st, f.id);
      return `<div class="card"><h3><span>${esc(f.name)}</span><span class="muted">${here.length}/${seats(f)}</span></h3>
        ${waiter || diets ? `<p class="muted" style="margin:-2px 0 6px;font-size:12px">${[waiter ? esc(waiter.name) : '', diets ? `<span class="diet">${esc(diets)}</span>` : ''].filter(Boolean).join(' · ')}</p>` : ''}
        <ol>${here.map(g => `<li>${esc(g.name)}${g.diet ? ` <span class="diet">${esc(g.diet)}</span>` : ''}</li>`).join('')}</ol></div>`;
    });
    const free = list(st).filter(g => !isSeated(st, g));
    if (free.length) cards.push(`<div class="card"><h3><span>${t('No table', 'Sin mesa')}</span><span class="muted">${free.length}</span></h3>
      <ol>${free.map(g => `<li>${esc(g.name)}</li>`).join('')}</ol></div>`);
    openPrint(t('Guests by table', 'Invitados por mesa'), `${header(t('Guests by table', 'Invitados por mesa'))}<div class="grid">${cards.join('')}</div>`);
  }

  /** Para cada mesero: sus mesas, cuántos invitados y las dietas de cada mesa. */
  function printWaiters(st) {
    const tables = tablesOf(st);
    const cards = waiters(st).map(w => {
      const mine = tables.filter(f => (w.tables || []).includes(f.id));
      const guests = mine.reduce((a, f) => a + seatedAt(st, f.id).length, 0);
      return `<div class="card"><h3><span><span class="sw" style="background:${w.color}"></span>${esc(w.name)}</span><span class="muted">${guests} ${t('guests', 'invitados')}</span></h3>
        <table>${mine.map(f => { const here = seatedAt(st, f.id); const d = dietSummary(here);
          return `<tr><td><b>${esc(f.name)}</b></td><td class="r">${here.length}/${seats(f)}</td></tr>${d ? `<tr><td colspan="2" class="diet">${esc(d)}</td></tr>` : ''}`; }).join('')
          || `<tr><td class="muted">${t('No tables yet', 'Sin mesas asignadas')}</td></tr>`}</table></div>`;
    });
    const free = tables.filter(f => !waiterOf(st, f.id));
    if (free.length) cards.push(`<div class="card"><h3><span>${t('Without a waiter', 'Sin mesero')}</span><span class="muted">${free.length}</span></h3>
      <p>${free.map(f => esc(f.name)).join(', ')}</p></div>`);
    openPrint(t('Waiters sheet', 'Hoja de meseros'), `${header(t('Waiters sheet', 'Hoja de meseros'))}${planSvg()}<div class="grid" style="margin-top:12px">${cards.join('')}</div>`);
  }

  function printAbc(st) {
    const tables = tablesOf(st), name = id => tables.find(f => f.id === id)?.name || '—';
    const rows = list(st).slice().sort((a, b) => a.name.localeCompare(b.name, 'es'))
      .map(g => `<tr><td>${esc(g.name)}</td><td><b>${esc(isSeated(st, g) ? name(g.table) : '—')}</b></td><td class="muted">${esc(g.group || '')}</td></tr>`).join('');
    openPrint(t('Guests A–Z', 'Invitados en orden alfabético'), `${header(t('Guests A–Z (for the entrance)', 'Invitados en orden alfabético (para la entrada)'))}
      <table><tr><th>${t('Guest', 'Invitado')}</th><th>${t('Table', 'Mesa')}</th><th>${t('Group', 'Grupo')}</th></tr>${rows}</table>`);
  }

  function exportCsv(st) {
    const tables = tablesOf(st), name = id => tables.find(f => f.id === id)?.name || '';
    const q = v => `"${String(v || '').replace(/"/g, '""')}"`;
    const lines = [['Nombre', 'Grupo', 'Dieta', 'Mesa'].join(',')]
      .concat(list(st).map(g => [g.name, g.group, g.diet, isSeated(st, g) ? name(g.table) : ''].map(q).join(',')));
    download(`${window.__CASA__.title} - invitados.csv`, new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  }

  // Proveedores (proveedores.js): marcadores con ficha, resaltado de sus cosas y sus hojas
  const V = window.__PROVEEDORES__?.({ t, ITEMS, pieceName, openPrint, planSvg, host, canEdit: canSeeGuests }) || null;

  window.__EXT__ = {
    lib, namesEn, nolabel: (MODELS.nolabel || []).concat('staff'),
    svg: Object.assign({}, MODELS.svg, { staff: staffSvg }, V ? { vendor: V.svg } : {},
      Object.fromEntries(SEATED.map(k => [k, withSection((MODELS.svg || {})[k])]))),
    // Los proveedores son de logística: en 3D no se dibujan
    build3d: Object.assign({}, MODELS.build3d, { staff: staff3d }, V ? { vendor: () => {} } : {}),
    seats, onAdd, overview, bindOverview, panel, bindPanel, panelAfter, label, CHAIR,
    selExtra: (f, px) => V?.selExtra(f, px) ?? '', vendors: V,
    extPanel: sel => (sel.panel === 'guests' && canSeeGuests() ? guestsPanel() : ''),
    bindExtPanel: sel => { if (sel.panel === 'guests' && canSeeGuests()) bindGuestsPanel(); },
    parseList, autoSeat, walkSpots,
  };
})();
