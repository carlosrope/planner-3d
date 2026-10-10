// Proveedores del evento: DJ, banda, florería, banquete, barra, pastel, dulces, foto y video, photo booth,
// mobiliario… Cada uno es un marcador en el plano (como el staff) con su ficha: contacto, teléfono, hora de
// llegada, montaje, corriente, por dónde carga y descarga, notas y "sus cosas" (las piezas del plano que le
// tocan). Al seleccionarlo se resaltan sus cosas y su puerta de carga. Hojas para imprimir o guardar en PDF:
// la de todos (por hora de llegada) y la de cada proveedor con su lugar resaltado; y un mensaje de WhatsApp
// con sus datos. El enlace del cliente no recibe proveedores (los quita el servidor).
// Se carga antes de eventos.js, que llama a esta fábrica con sus ayudantes (textos, catálogo, hojas).
window.__PROVEEDORES__ = function vendors(K) {
  const { t, ITEMS, openPrint, planSvg, canEdit } = K;

  // Letras del marcador y piezas del catálogo que suelen ser de ese proveedor (se ligan al agregarlo).
  const KINDS = {
    dj: { letters: 'DJ', links: ['dj', 'ledscreen'] },
    banda: { letters: 'Ba', links: ['stage'] },
    florista: { letters: 'Fl', links: ['arch', 'flowerstand', 'candelabra'] },
    banquete: { letters: 'Bq', links: ['buffet'] },
    barra: { letters: 'Br', links: ['bar'] },
    pastel: { letters: 'Pa', links: ['cake'] },
    dulces: { letters: 'Du', links: ['dessert'] },
    foto: { letters: 'FV', links: [] },
    photobooth: { letters: 'PB', links: ['booth', 'platform360'] },
    mobiliario: { letters: 'Mo', links: [] },
    otro: { letters: '+', links: [] },
  };
  const NOT_THEIRS = ['vendor', 'staff', 'rtable', 'itable', 'headtable'];   // piezas que no se le asignan a un proveedor
  const kindItem = k => ITEMS.find(i => i.type === 'vendor' && i.kind === k) || ITEMS.find(i => i.type === 'vendor' && i.kind === 'otro');
  const rawName = k => kindItem(k)?.name || k;                // nombre del catálogo (en español, como se guarda)
  const kindName = k => nm(rawName(k));
  const named = v => v.name !== rawName(v.kind);              // ¿ya le pusieron nombre ("DJ Beto")?
  const isVendor = f => f?.type === 'vendor';
  const vendorsOf = st => st.furniture.filter(isVendor);
  /** Por hora de llegada; los que no tienen hora, al final. */
  const byArrival = (a, b) => (a.arrive || '99') < (b.arrive || '99') ? -1 : (a.arrive || '99') > (b.arrive || '99') ? 1 : a.name.localeCompare(b.name, 'es');
  const piecesOf = (st, v) => (v.items || []).map(id => st.furniture.find(g => g.id === id)).filter(Boolean);
  const whose = (st, f) => vendorsOf(st).filter(v => (v.items || []).includes(f.id));
  const watts = n => `${Math.round(n).toLocaleString('es-MX')} W`;
  const span = v => v.setupFrom || v.setupTo ? `${v.setupFrom || '?'}–${v.setupTo || '?'}` : '';

  /** Teléfono para wa.me: solo dígitos; 10 dígitos de México llevan el 52 adelante. '' si no alcanza. */
  function waPhone(phone) {
    const d = String(phone || '').replace(/\D/g, '');
    if (d.length === 10) return '52' + d;
    return d.length >= 11 && d.length <= 15 ? d : '';
  }

  /** Fecha del evento ("sábado 14 de noviembre de 2026") o ''. */
  function eventDate() {
    const d = K.host()?.date;
    return d ? new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
  }

  /** Mensaje de WhatsApp con los datos del proveedor. */
  function message(v, ctx) {
    const lines = [`${t('Hi', 'Hola')}${v.contact ? ' ' + v.contact.split(' ')[0] : ''}, ${t('here are the details for', 'te comparto los datos de')} ${ctx.title}${ctx.date ? ` (${ctx.date})` : ''}:`];
    if (v.arrive) lines.push(`• ${t('Arrival', 'Llegada')}: ${v.arrive}`);
    if (span(v)) lines.push(`• ${t('Setup', 'Montaje')}: ${span(v).replace('–', ` ${t('to', 'a')} `)}`);
    if (v.load) lines.push(`• ${t('Loading through', 'Carga y descarga por')}: ${v.load}`);
    if (v.power) lines.push(`• ${t('Power', 'Corriente')}: ${watts(v.power)}`);
    if (v.notes) lines.push(`• ${t('Notes', 'Notas')}: ${v.notes}`);
    lines.push(t('I will send you the sheet with your spot on the floor plan.', 'Te mando la hoja con tu lugar en el plano.'));
    if (ctx.brand) lines.push(`— ${ctx.brand}`);
    return lines.join('\n');
  }
  const ctxOf = () => ({ title: window.__CASA__.title, date: eventDate(), brand: K.host()?.brand?.name || '' });

  // ------------------------------------------------------------ plano
  function svg(w, d, c, f, S) {
    const r = Math.min(w, d) / 2, txt = KINDS[f?.kind]?.letters || '?';
    return `<rect x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" rx="${r * .3}" fill="${c}" ${S.ST}/>
      <rect x="${-r * .78}" y="${-r * .78}" width="${r * 1.56}" height="${r * 1.56}" rx="${r * .2}" fill="none" stroke="#fff" stroke-width="${r * .07}" opacity=".7"/>
      <text font-size="${r * (txt.length > 1 ? .78 : 1.1)}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-weight="700" pointer-events="none">${txt}</text>`;
  }
  /** En el plano el nombre solo se escribe si ya no es el del tipo ("DJ Beto" sí; "DJ" ya lo dice el marcador). */
  const label = f => (named(f) ? nm(f.name) : '');

  /** Resaltado de sus cosas y su puerta de carga. px = tamaño de 1 px en mm (en pantalla) o null (en la hoja impresa). */
  function marks(st, v, px) {
    const col = v.color || '#5d6166', line = px ? 'vector-effect="non-scaling-stroke"' : '';
    const sw = n => px ? n : n * 30, font = px ? 12 * px : 380;
    let s = '';
    piecesOf(st, v).forEach(g => {
      s += `<line x1="${v.cx}" y1="${v.cy}" x2="${g.cx}" y2="${g.cy}" stroke="${col}" stroke-width="${sw(1.5)}" stroke-dasharray="${px ? '6 4' : '240 160'}" ${line} pointer-events="none"/>
        <g transform="translate(${g.cx} ${g.cy}) rotate(${g.rot || 0})"><rect x="${-g.w / 2 - 80}" y="${-g.d / 2 - 80}" width="${g.w + 160}" height="${g.d + 160}" rx="140"
        fill="${col}" fill-opacity=".14" stroke="${col}" stroke-width="${sw(2.5)}" ${line} pointer-events="none"/></g>`;
    });
    DOORS.filter(d => v.load && d.name === v.load).forEach(d => {
      const [x0, y0, x1, y1] = d.rect, m = 120;
      s += `<rect x="${x0 - m}" y="${y0 - m}" width="${x1 - x0 + 2 * m}" height="${y1 - y0 + 2 * m}" fill="${col}" fill-opacity=".45" stroke="${col}" stroke-width="${sw(2)}" ${line} pointer-events="none"/>
        <text x="${(x0 + x1) / 2}" y="${(y0 + y1) / 2}" font-size="${font}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-weight="700"
        stroke="${col}" stroke-width="${font / 4}" paint-order="stroke" pointer-events="none">${esc(t('Loading', 'Carga'))}</text>`;
    });
    return s;
  }
  /** Al seleccionar: un proveedor resalta lo suyo; una pieza de un proveedor se une con su marcador. */
  function selExtra(f, px) {
    if (!canEdit()) return '';
    if (isVendor(f)) return marks(state, f, px);
    return whose(state, f).map(v => `<line x1="${f.cx}" y1="${f.cy}" x2="${v.cx}" y2="${v.cy}" stroke="${v.color}" stroke-width="1.5"
      stroke-dasharray="6 4" vector-effect="non-scaling-stroke" pointer-events="none"/>`).join('');
  }

  // ------------------------------------------------------------ alta
  /** Al agregarlo desde el catálogo (o al duplicarlo): nombre del tipo y sus piezas de siempre. */
  function onAdd(f, it, st) {
    if (!isVendor(f)) return false;
    if (it) {
      f.name = rawName(f.kind);
      f.items = st.furniture.filter(g => (KINDS[f.kind]?.links || []).includes(g.type)).map(g => g.id);
    }
    return true;
  }
  /** «＋ Agregar proveedor» del resumen: el marcador junto a su pieza (o al centro) y se abre su ficha. */
  function addVendor(kind) {
    const it = kindItem(kind);
    if (!it) return;
    const near = state.furniture.find(g => (KINDS[kind]?.links || []).includes(g.type));
    const f = { id: uid(), type: 'vendor', kind, name: it.name, w: it.w, d: it.d, rot: 0, color: it.color,
      cx: near ? near.cx + Math.max(near.w, near.d) / 2 + it.w : BOUNDS.x + BOUNDS.w / 2,
      cy: near ? near.cy : BOUNDS.y + BOUNDS.h / 2 };
    // Sin pieza junto a la cual ponerlo: al centro, a un lado de los otros marcadores para no encimarse
    while (vendorsOf(state).some(v => Math.hypot(v.cx - f.cx, v.cy - f.cy) < it.w)) f.cx += it.w + 200;
    onAdd(f, it, state);
    mutate(() => state.furniture.push(f));
    select({ kind: 'furn', id: f.id });
  }

  // ------------------------------------------------------------ resumen
  const kindOptions = cur => Object.keys(KINDS).map(k => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(kindName(k))}</option>`).join('');
  const selStyle = 'style="padding:8px;border:1px solid var(--line);border-radius:8px;background:#fff;font:inherit"';

  function section(st) {
    if (!canEdit()) return '';
    const vs = vendorsOf(st).sort(byArrival);
    const add = `<select id="vAdd" ${selStyle}><option value="">＋ ${t('Add a vendor…', 'Agregar proveedor…')}</option>${kindOptions('')}</select>`;
    if (!vs.length) return `<section><h3>${t('Vendors', 'Proveedores')}</h3><div class="muted">${t(
      'Add the DJ, catering, cake, photographer… with their arrival time and contact.',
      'Agrega DJ, banquete, pastel, foto y video… con su hora de llegada y su contacto.')}</div><div class="actions">${add}</div></section>`;
    const times = vs.filter(v => v.arrive).map(v => v.arrive), power = vs.reduce((a, v) => a + (+v.power || 0), 0);
    const noTime = vs.length - times.length;
    return `<section><h3>${t('Vendors', 'Proveedores')} <small>${vs.length}</small></h3>
      ${times.length ? `<div class="muted">${t(`Arrivals from ${times[0]} to ${times[times.length - 1]}`, `Llegan de ${times[0]} a ${times[times.length - 1]}`)}${power ? ` · ${watts(power)}` : ''}</div>` : ''}
      <table style="margin-top:6px">${vs.map(v => `<tr class="click" data-fsel="${v.id}"><td><span class="sw" style="background:${v.color}"></span><b style="font-weight:500">${esc(nm(v.name))}</b>
        ${named(v) || span(v) ? `<br><small class="muted">${esc([named(v) ? kindName(v.kind) : '', span(v) ? t('setup', 'montaje') + ' ' + span(v) : ''].filter(Boolean).join(' · '))}</small>` : ''}</td>
        <td class="r">${v.arrive || '—'}</td></tr>`).join('')}</table>
      ${noTime ? `<div class="muted" style="margin-top:4px;color:#b3372a">${t(`${noTime} without an arrival time`, `${noTime} sin hora de llegada`)}</div>` : ''}
      <div class="actions">${add}<button class="btn" id="vPrintAll">${t('Vendors sheet (PDF)', 'Hoja de proveedores (PDF)')}</button></div></section>`;
  }
  function bindSection() {
    const add = document.getElementById('vAdd');
    if (add) add.onchange = () => add.value && addVendor(add.value);
    const all = document.getElementById('vPrintAll');
    if (all) all.onclick = () => printAll(state);
  }

  // ------------------------------------------------------------ ficha
  const doorNames = () => [...new Set(DOORS.map(d => d.name).filter(Boolean))];
  /** Piezas que se le pueden asignar, agrupadas por nombre (los 12 candelabros son una sola casilla). */
  function candidates(st) {
    const groups = new Map();
    st.furniture.filter(g => !NOT_THEIRS.includes(g.type)).forEach(g => {
      const k = K.pieceName(g);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(g.id);
    });
    return [...groups].sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }

  function panel(f) {
    if (!isVendor(f) || !canEdit()) return '';
    const mine = new Set(f.items || []), inp = (id, attrs) => `<input id="${id}" ${attrs}>`;
    return `<label class="full">${t('Type', 'Tipo')}<select id="vKind">${kindOptions(f.kind)}</select></label>
      <label>${t('Contact', 'Contacto')}${inp('vContact', `value="${esc(f.contact || '')}" maxlength="60" autocomplete="off"`)}</label>
      <label>${t('Phone', 'Teléfono')}${inp('vPhone', `type="tel" inputmode="tel" value="${esc(f.phone || '')}" maxlength="20"`)}</label>
      <label>${t('Arrives', 'Llega')}${inp('vArrive', `type="time" value="${f.arrive || ''}"`)}</label>
      <label>${t('Power (W)', 'Corriente (W)')}${inp('vPower', `type="number" min="0" max="100000" step="100" inputmode="numeric" value="${f.power || ''}" placeholder="0"`)}</label>
      <label>${t('Setup from', 'Montaje de')}${inp('vFrom', `type="time" value="${f.setupFrom || ''}"`)}</label>
      <label>${t('to', 'a')}${inp('vTo', `type="time" value="${f.setupTo || ''}"`)}</label>
      <label class="full">${t('Loads and unloads through', 'Carga y descarga por')}<select id="vLoad"><option value="">—</option>
        ${doorNames().map(n => `<option ${n === f.load ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
      <label class="full">${t('Notes', 'Notas')}<textarea id="vNotes" rows="3" maxlength="400"
        style="width:100%;padding:8px;border:1px solid var(--line);border-radius:8px;font:inherit;font-size:16px;resize:vertical">${esc(f.notes || '')}</textarea></label>
      <div class="full" style="grid-column:1/-1"><b style="font-weight:600">${t('Their things on the plan', 'Sus cosas en el plano')}</b>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${candidates(state).map(([name, ids]) =>
          `<label style="display:flex;align-items:center;gap:4px;padding:4px 8px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);flex-direction:row">
            <input type="checkbox" style="width:auto;margin:0" data-vitems="${ids.join(',')}" ${ids.every(id => mine.has(id)) ? 'checked' : ''}>${esc(name)}${ids.length > 1 ? ` <small class="muted">×${ids.length}</small>` : ''}</label>`).join('')
          || `<span class="muted">${t('No pieces yet', 'Todavía no hay piezas')}</span>`}</div></div>`;
  }

  function bindPanel(f, upd) {
    if (!isVendor(f) || !canEdit()) return;
    const on = (id, fn, ev = 'onchange') => { const el = document.getElementById(id); if (el) el[ev] = () => fn(el.value); };
    const text = (id, key, max) => on(id, v => upd(g => { g[key] = v.trim().slice(0, max); }));
    on('vKind', k => upd(g => {
      const it = kindItem(k);
      if (!named(g)) g.name = it.name;   // si no le habían puesto nombre, toma el del tipo nuevo
      g.kind = k; g.color = it.color;
    }));
    text('vContact', 'contact', 60);
    text('vPhone', 'phone', 20);
    text('vLoad', 'load', 80);
    text('vNotes', 'notes', 400);
    on('vArrive', v => upd(g => { g.arrive = v; }));
    on('vFrom', v => upd(g => { g.setupFrom = v; }));
    on('vTo', v => upd(g => { g.setupTo = v; }));
    on('vPower', v => upd(g => { g.power = Math.max(0, Math.min(100000, parseInt(v, 10) || 0)); }));
    document.querySelectorAll('#panel [data-vitems]').forEach(cb => cb.onchange = () => upd(g => {
      const ids = cb.dataset.vitems.split(',');
      g.items = (g.items || []).filter(id => !ids.includes(id)).concat(cb.checked ? ids : []);
    }));
    const one = document.getElementById('vPrintOne');
    if (one) one.onclick = () => printOne(state, f.id);
  }

  /** Debajo de la ficha: mandarle sus datos. Debajo de una pieza: de qué proveedor es. */
  function panelAfter(f) {
    if (!canEdit()) return '';
    if (isVendor(f)) {
      const phone = waPhone(f.phone);
      return `<section><h3>${t('Send to the vendor', 'Mandar al proveedor')}</h3>
        ${phone ? '' : `<div class="muted">${t('Add their phone to message them on WhatsApp.', 'Agrega su teléfono para escribirle por WhatsApp.')}</div>`}
        <div class="actions">
          ${phone ? `<a class="btn primary" style="text-decoration:none" target="_blank" rel="noopener"
              href="https://wa.me/${phone}?text=${encodeURIComponent(message(f, ctxOf()))}">WhatsApp</a>
            <a class="btn" style="text-decoration:none;color:inherit" href="tel:+${phone}">${t('Call', 'Llamar')}</a>` : ''}
          <button class="btn" id="vPrintOne">${t('Vendor sheet (PDF)', 'Hoja del proveedor (PDF)')}</button></div></section>`;
    }
    const vs = whose(state, f);
    if (!vs.length) return '';
    return `<section><h3>${t('Vendor', 'Proveedor')}</h3><table>${vs.map(v => `<tr class="click" onclick="select({kind:'furn',id:'${v.id}'})">
      <td><span class="sw" style="background:${v.color}"></span>${esc(nm(v.name))}</td><td class="r">${v.arrive ? t('arrives', 'llega') + ' ' + v.arrive : ''}</td></tr>`).join('')}</table></section>`;
  }

  // ------------------------------------------------------------ hojas
  const top = what => `<h1>${esc(window.__CASA__.title)}</h1><p class="muted">${esc(what)}${eventDate() ? ' · ' + esc(eventDate()) : ''}</p>`;
  const planWith = extra => planSvg().replace(/<\/svg>\s*$/, `<g>${extra}</g></svg>`);
  const coord = () => {
    const b = K.host()?.brand;
    return b?.name ? `<p><b>${t('Coordination', 'Coordinación')}:</b> ${esc(b.name)}${b.whatsapp ? ` · WhatsApp ${esc(b.whatsapp)}` : ''}</p>` : '';
  };

  /** Todos los proveedores por hora de llegada, con el plano. */
  function printAll(st) {
    const vs = vendorsOf(st).sort(byArrival), power = vs.reduce((a, v) => a + (+v.power || 0), 0);
    const rows = vs.map(v => `<tr><td><b>${v.arrive || '—'}</b></td>
      <td><span class="sw" style="background:${v.color}"></span><b>${esc(nm(v.name))}</b>${named(v) ? `<br><small class="muted">${esc(kindName(v.kind))}</small>` : ''}</td>
      <td>${esc(v.contact || '')}${v.phone ? `<br><small>${esc(v.phone)}</small>` : ''}</td><td>${span(v) || '—'}</td><td>${esc(v.load || '—')}</td>
      <td class="r">${v.power ? watts(v.power) : '—'}</td><td>${esc(v.notes || '')}</td></tr>`).join('');
    openPrint(t('Vendors', 'Proveedores'), `${top(t('Vendors', 'Proveedores'))}${coord()}${planSvg()}
      <h2>${t('Arrivals', 'Llegadas')}${power ? ` <small class="muted">· ${t('power', 'corriente')} ${watts(power)}</small>` : ''}</h2>
      <table><tr><th>${t('Arrives', 'Llega')}</th><th>${t('Vendor', 'Proveedor')}</th><th>${t('Contact', 'Contacto')}</th><th>${t('Setup', 'Montaje')}</th>
        <th>${t('Loading', 'Carga')}</th><th class="r">${t('Power', 'Corriente')}</th><th>${t('Notes', 'Notas')}</th></tr>${rows}</table>`);
  }

  /** La hoja de un proveedor: sus datos, el contacto de coordinación y su lugar resaltado en el plano. */
  function printOne(st, id) {
    const v = st.furniture.find(g => g.id === id);
    if (!v) return;
    const row = (k, val) => val ? `<tr><th style="width:38%">${k}</th><td>${val}</td></tr>` : '';
    const things = piecesOf(st, v).map(g => K.pieceName(g));
    const body = `${top(`${t('Sheet for', 'Hoja para')} ${nm(v.name)}`)}
      <table>${row(t('Type', 'Tipo'), esc(kindName(v.kind)))}${row(t('Contact', 'Contacto'), esc([v.contact, v.phone].filter(Boolean).join(' · ')))}
        ${row(t('Arrival', 'Llegada'), v.arrive ? `<b>${v.arrive}</b>` : '')}${row(t('Setup', 'Montaje'), span(v))}
        ${row(t('Loads and unloads through', 'Carga y descarga por'), esc(v.load || ''))}${row(t('Power', 'Corriente'), v.power ? watts(v.power) : '')}
        ${row(t('Their things', 'Sus cosas'), esc([...new Set(things)].map(n => `${n}${things.filter(x => x === n).length > 1 ? ' ×' + things.filter(x => x === n).length : ''}`).join(', ')))}
        ${row(t('Notes', 'Notas'), esc(v.notes || ''))}</table>${coord()}
      <h2>${t('Your spot on the plan', 'Tu lugar en el plano')}</h2>${planWith(marks(st, v, null))}`;
    openPrint(`${t('Sheet for', 'Hoja para')} ${nm(v.name)}`, body);
  }

  return { KINDS, isVendor, svg, label, onAdd, section, bindSection, panel, bindPanel, panelAfter, selExtra, waPhone, message, byArrival };
};
