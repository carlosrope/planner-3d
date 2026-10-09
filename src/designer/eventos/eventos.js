// Salones de eventos en el diseñador: catálogo, mesas numeradas, sillas por mesa,
// invitados contra lugares y lista de mobiliario para renta y montaje.
// Se carga antes del diseñador (src/designer/disenador.html) solo en salones.
// Datos: window.__EVENTOS__ (catalogo.json). Dibujos 2D y 3D: window.__EXT_MODELS__ (modelos.js).
(function () {
  const CAT = window.__EVENTOS__ || [];
  const MODELS = window.__EXT_MODELS__ || { svg: {}, build3d: {}, nolabel: [] };
  const CHAIR = '#c9a24a';   // silla Tiffany dorada
  const SEATED = ['rtable', 'itable', 'headtable'];
  const NUMBERED = ['rtable', 'itable'];

  // Formato del catálogo del diseñador: [tipo, nombre, ancho, fondo, color, extra]
  const lib = CAT.map(c => ({
    cat: c.cat,
    items: c.items.map(i => [i.type, i.name, i.w, i.d, i.color, i.seats ? { seats: i.seats, table: i.table } : undefined]),
  }));
  const namesEn = {};
  CAT.forEach(c => { namesEn[c.cat] = c.catEn; c.items.forEach(i => { namesEn[i.name] = i.nameEn; }); });

  // Textos: el diseñador traduce con tr(zh, en, es); aquí no hay versión en chino.
  const t = (en, es) => tr(en, en, es);
  const seats = f => SEATED.includes(f.type) ? (f.seats ?? 0) : 0;
  const host = () => window.__HOST__;
  const guestsOf = state => host()?.guests ?? state.guests ?? window.__CASA__.guests ?? 0;

  // Nombre de catálogo de una pieza (las mesas se llaman "Mesa 3"); si se cambió el tamaño, se aclara.
  const ITEMS = CAT.flatMap(c => c.items);
  function pieceName(f) {
    const same = ITEMS.find(i => i.type === f.type && i.w === f.w && i.d === f.d);
    if (same) return nm(same.name);
    const base = ITEMS.find(i => i.type === f.type);
    return base ? `${nm(base.name)} (${f.w}×${f.d})` : nm(f.name);
  }

  function onAdd(f, it, state) {
    if (it && it[5]) Object.assign(f, it[5]);
    if (!NUMBERED.includes(f.type)) return;
    const used = new Set(state.furniture.map(g => +(/^Mesa (\d+)$/.exec(g.name)?.[1] || 0)));
    let n = 1;
    while (used.has(n)) n++;
    f.name = `Mesa ${n}`;
  }

  function overview(state) {
    const tables = state.furniture.filter(f => SEATED.includes(f.type));
    const places = tables.reduce((a, f) => a + seats(f), 0);
    const guests = guestsOf(state), diff = places - guests;
    const status = !guests ? t('Enter the guest count', 'Escribe cuántos invitados son')
      : diff >= 0 ? t(`${diff} spare seats`, `Sobran ${diff} lugares`) : t(`${-diff} seats missing`, `Faltan ${-diff} lugares`);
    const pieces = {};
    state.furniture.forEach(f => { const k = pieceName(f); pieces[k] = (pieces[k] || 0) + 1; });
    const chairs = {};
    tables.forEach(f => { const c = f.chair || CHAIR; chairs[c] = (chairs[c] || 0) + seats(f); });
    const cloths = {};
    tables.forEach(f => { cloths[f.color] = (cloths[f.color] || 0) + 1; });
    const sw = c => `<span class="sw" style="background:${c}"></span>`;
    const row = (a, b) => `<tr><td>${a}</td><td class="r">${b}</td></tr>`;
    return `<section><h3>${t('Guests & seats', 'Invitados y lugares')}</h3>
      <div class="stats">
        <div><small>${t('Guests', 'Invitados')}</small>${host() && !host().editable ? `<span class="big">${guests}</span>`
          : `<input type="number" id="xGuests" value="${guests || ''}" min="0" max="5000" step="1" inputmode="numeric"
          style="width:100%;font-size:20px;font-weight:600;border:1px solid var(--line);border-radius:6px;padding:2px 6px">`}</div>
        <div><small>${t('Seats', 'Lugares')}</small><span class="big">${places}</span></div></div>
      <div class="total"><span>${status}</span><b style="color:${diff < 0 ? '#b3372a' : 'inherit'}">${tables.length} ${t('tables', 'mesas')}</b></div></section>
    <section><h3>${t('Furniture list', 'Lista de mobiliario')} <small>${t('for rental and setup', 'para renta y montaje')}</small></h3>
      <table>${Object.entries(pieces).sort((a, b) => b[1] - a[1]).map(([k, n]) => row(esc(k), n)).join('')}
        ${Object.entries(chairs).map(([c, n]) => row(`${sw(c)}${t('Chairs', 'Sillas')}`, n)).join('')}</table>
      ${tables.length ? `<h3 style="margin-top:12px">${t('Tablecloths', 'Manteles')}</h3>
        <table>${Object.entries(cloths).map(([c, n]) => row(`${sw(c)}${c}`, n)).join('')}</table>` : ''}</section>`;
  }

  function bindOverview() {
    const input = document.getElementById('xGuests');
    if (!input) return;
    input.onchange = () => {
      const n = Math.max(0, Math.min(5000, parseInt(input.value, 10) || 0));
      if (host()) host().setGuests(n);
      else mutate(() => { state.guests = n; });
    };
  }

  function panel(f) {
    if (!SEATED.includes(f.type)) return '';
    return `<label>${t('Chairs', 'Sillas')}<input type="number" id="xSeats" value="${f.seats ?? 0}" min="0" max="40" step="1" inputmode="numeric"></label>
      <label>${t('Chair color', 'Color de silla')}<input type="color" id="xChair" value="${f.chair || CHAIR}"></label>
      <div class="muted full" style="grid-column:1/-1">${t('“Color” is the tablecloth.', '“Color” es el del mantel.')}</div>`;
  }

  function bindPanel(f, upd) {
    const s = document.getElementById('xSeats');
    if (!s) return;
    s.onchange = () => { const v = parseInt(s.value, 10); if (!isNaN(v)) upd(g => { g.seats = Math.max(0, Math.min(40, v)); }); };
    document.getElementById('xChair').onchange = e => upd(g => { g.chair = e.target.value; });
  }

  window.__EXT__ = {
    lib, namesEn, nolabel: MODELS.nolabel || [], svg: MODELS.svg || {}, build3d: MODELS.build3d || {},
    seats, onAdd, overview, bindOverview, panel, bindPanel, CHAIR,
  };
})();
