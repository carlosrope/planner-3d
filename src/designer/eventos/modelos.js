// Dibujos del mobiliario de eventos (salones) para el diseñador.
// · svg[tipo](w, d, c, f, K): planta en mm centrada en (0,0); x = ancho, y = fondo, +y = frente.
// · build3d[tipo](g, f, K): modelo en m; origen al centro sobre el piso, y arriba, +z = frente.
// Las mesas con sillas comparten geometrías cacheadas y dibujan sillas, platos y copas con InstancedMesh
// (8 draw calls por mesa con todo); la decoración se fusiona por material para pocas llamadas.
(function () {
  'use strict';

  const GOLD = '#c9a24a', IVORY = '#f8f3ea', PI = Math.PI, TAU = PI * 2, TOP = .762;
  const TABLE_FLOWERS = ['#fbf6ef', '#f3d6da', '#e6b4bd', '#fffaf4', '#d99ca8', '#f5e6d6'];
  const GREENS = ['#7d9670', '#93ab84', '#a9bca5', '#6b875f'];
  const BLOOM = [[0, 0], [.5, .1], [.88, .38], [1, .62], [.86, .74], [.6, .62], [.62, .8], [.38, .96], [.12, .92], [0, .82]];
  const FLAME = [[0, 0], [.0065, .006], [.0075, .013], [.0045, .023], [0, .033]];
  const r1 = v => Math.round(v * 10) / 10;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const isNum = v => typeof v === 'number' && isFinite(v);
  const pick = (R, a) => a[Math.floor(R() * a.length) % a.length];
  function rand(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  /* ======================= Mesas con sillas: datos y acomodo (mm) ======================= */
  function catItem(type, w, d) {
    let hit = null;
    try { (window.__EVENTOS__ || []).forEach(c => (c.items || []).forEach(i => { if (!hit && i.type === type && i.w === w && i.d === d) hit = i; })); } catch { /* sin catálogo */ }
    return hit;
  }
  function seating(type, w, d, f) {
    const it = catItem(type, w, d);
    let table = isNum(f?.table) ? f.table : type === 'rtable' ? Math.min(w, d) - 1100 : type === 'itable' ? 1000 : 900;
    table = type === 'rtable' ? clamp(table, 500, Math.min(w, d) - 60) : clamp(table, 400, Math.max(400, d - 250));
    let n = isNum(f?.seats) ? f.seats : isNum(it?.seats) ? it.seats : null;
    if (n == null) {
      const L = w - 200;
      n = type === 'rtable' ? (table >= 1700 ? 10 : table >= 1400 ? 8 : 6) : type === 'itable' ? 2 * Math.max(1, Math.round(L / 650)) : Math.max(1, Math.round(L / 650));
    }
    return { table, n: clamp(Math.round(n), 0, 40), col: f?.chair || GOLD };
  }
  // Sillas y lugares: [x, y, giro°] (giro 0 = la silla mira hacia +y). Lo usan el 2D y el 3D por igual.
  function layout(type, w, d, s) {
    const o = { chairs: [], places: [], cw: 420, ps: 1 }, n = s.n;
    if (type === 'rtable') {
      const t = s.table / 2, R = Math.min(t + 230, Math.min(w, d) / 2 - 200), Rp = Math.max(t * .45, t - 200);
      o.cw = clamp(TAU * R / Math.max(1, n) - 40, 240, 420);
      o.ps = clamp(TAU * Rp / Math.max(1, n) / 360, .5, 1);
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU, deg = i / n * 360;
        o.chairs.push([R * Math.sin(a), -R * Math.cos(a), deg]);
        o.places.push([Rp * Math.sin(a), -Rp * Math.cos(a), deg]);
      }
    } else if (type === 'itable') {
      const L = Math.max(600, w - 120), td = s.table, nb = Math.ceil(n / 2), nf = n - nb, off = Math.min(td / 2 + 230, d / 2 - 200), po = td / 2 - 200;
      o.L = L; o.cw = clamp(L / Math.max(1, nb) - 60, 240, 420); o.ps = clamp(L / Math.max(1, nb) / 380, .5, 1);
      for (let i = 0; i < nb; i++) { const x = -L / 2 + L / nb * (i + .5); o.chairs.push([x, -off, 0]); o.places.push([x, -po, 0]); }
      for (let i = 0; i < nf; i++) { const x = -L / 2 + L / nf * (i + .5); o.chairs.push([x, off, 180]); o.places.push([x, po, 180]); }
    } else {
      const L = Math.max(600, w - 160), td = s.table, ty = d / 2 - 60 - td / 2, sp = Math.min(L / Math.max(1, n), 760);
      const cy = Math.max(ty - td / 2 - 240, -d / 2 + 230);
      o.L = L; o.ty = ty; o.cy = cy; o.cw = clamp(sp - 50, 260, 480); o.ps = clamp(sp / 380, .5, 1);
      for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * sp; o.chairs.push([x, cy, 0]); o.places.push([x, ty - td / 2 + 200, 0]); }
    }
    return o;
  }

  /* ======================= 2D ======================= */
  const FS = 'stroke="#3d3a34" stroke-opacity=".38" stroke-width="1" vector-effect="non-scaling-stroke"';   // trazo tenue para detalles
  const dot = (cx, cy, r, fill, ex = '') => `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(Math.max(0, r))}" fill="${fill}" ${ex}/>`;
  const oval = (cx, cy, rx, ry, fill, ex = '') => `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(Math.max(0, rx))}" ry="${r1(Math.max(0, ry))}" fill="${fill}" ${ex}/>`;
  const rect2 = (x, y, w, h, fill, ex = '') => `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(Math.max(0, w))}" height="${r1(Math.max(0, h))}" fill="${fill}" ${ex}/>`;
  const line2 = (x1, y1, x2, y2, col, wd = 1, ex = '') => `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${col}" stroke-width="${wd}" vector-effect="non-scaling-stroke" ${ex}/>`;
  const grp = (x, y, a, s, k = 1) => `<g transform="translate(${r1(x)} ${r1(y)})${a ? ` rotate(${r1(a)})` : ''}${k !== 1 ? ` scale(${Math.round(k * 100) / 100})` : ''}">${s}</g>`;

  // Silla Tiffany vista desde arriba, centrada, mirando a +y (respaldo en -y). special = silla de novios (respaldo medallón).
  function chair2d(K, col, cw, special) {
    const cd = special ? 470 : 400, x = -cw / 2, y = -cd / 2, fr = K.shade(col, 1.12), dk = K.shade(col, .8);
    if (special) return K.rc(x + 10, y + 70, cw - 20, cd - 80, fr, 'rx="110"') + K.rc(x + 55, y + 112, cw - 110, cd - 165, IVORY, 'rx="70" stroke-opacity=".45"')
      + K.ec(0, y + 50, cw * .42, 50, dk) + K.ec(0, y + 50, cw * .3, 28, IVORY, 'stroke-opacity=".45"');
    return K.rc(x + 16, y + 42, cw - 32, cd - 50, fr, 'rx="70"') + rect2(x + 50, y + 82, cw - 100, cd - 126, IVORY, 'rx="45"') + K.rc(x, y, cw, 62, dk, 'rx="31" stroke-opacity=".6"');
  }
  const place2d = (K, col) => dot(0, 0, 150, K.shade(col, 1.38), FS) + dot(0, 0, 104, '#ffffff');
  function cluster2d(x, y, r, R) {
    let o = '';
    for (let k = 0; k < 2; k++) { const a = R() * TAU; o += oval(x + Math.cos(a) * r * .9, y + Math.sin(a) * r * .5, r * .8, r * .32, pick(R, GREENS), FS); }
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + R(), q = k ? r * .55 : 0; o += dot(x + Math.cos(a) * q, y + Math.sin(a) * q * .7, r * (.32 + R() * .14), TABLE_FLOWERS[(k + (R() * 6 | 0)) % 6], FS); }
    return o;
  }
  function centre2d(r) {
    // flores solo arriba y abajo del anillo: el centro queda libre para el nombre de la mesa
    let o = dot(0, 0, r, '#f1e6df', 'fill-opacity=".45" ' + FS);
    [-120, -90, -60, 60, 90, 120].forEach((deg, k) => { const a = deg * PI / 180; o += dot(Math.cos(a) * r * .78, Math.sin(a) * r * .78, r * .2, k % 3 === 1 ? '#b9cba9' : TABLE_FLOWERS[(k + 1) % 6], FS); });
    return o;
  }
  function runner2d(len, seed) {
    if (len < 300) return '';
    const R = rand(seed), nc = Math.max(1, Math.round(len / 1000));
    let o = rect2(-len / 2, -130, len, 260, '#eadfce', 'fill-opacity=".7" rx="20" ' + FS);
    for (let i = 0; i < nc; i++) { const x = -len / 2 + len / nc * (i + .5); if (nc > 2 && Math.abs(x) < 300) continue; o += cluster2d(x, 0, 120, R); }
    for (let i = 1; i < nc; i++) { const x = -len / 2 + len / nc * i; if (Math.abs(x) < 300) continue; [-60, 0, 60].forEach(dx => o += dot(x + dx, dx ? 40 : -30, 26, '#fbf3e2', FS) + dot(x + dx, dx ? 40 : -30, 9, '#f2b84b')); }
    return o;
  }
  function garland2d(x0, x1, y, seed) {
    const R = rand(seed); let o = '';
    for (let x = x0; x <= x1; x += 55) {
      const edge = Math.min(x - x0, x1 - x) < 220, rr = (edge ? 60 : 42) + R() * 28;
      if (R() < .35) o += oval(x, y + (R() - .5) * 70, rr * 1.3, rr * .5, pick(R, GREENS), FS);
      o += dot(x + (R() - .5) * 30, y + (R() - .5) * 60, rr, pick(R, TABLE_FLOWERS), FS);
    }
    return o;
  }
  function sofa2d(K, w, d, c, n) {
    const x = -w / 2, y = -d / 2, b = d * .24, a = Math.min(170, w * .14), cw = (w - 2 * a) / n, dk = K.shade(c, .85);
    let s = K.rc(x, y, w, d, dk, 'rx="60"');
    for (let i = 0; i < n; i++) s += K.rc(x + a + i * cw, y + b, cw, d - b - 40, c, 'rx="40"');
    return s + K.rc(x, y, w, b, dk, 'rx="50"') + K.rc(x, y, a, d, dk, 'rx="50"') + K.rc(x + w - a, y, a, d, dk, 'rx="50"');
  }
  // Mantel rectangular con caída: borde (caída) + cubierta
  const cloth2d = (K, x, y, w, h, c) => K.rc(x - 30, y - 30, w + 60, h + 60, K.shade(c, .93), 'rx="40"') + K.rc(x, y, w, h, c, 'rx="20"');

  const SVG = {
    rtable(w, d, c, f, K) {
      const s = seating('rtable', w, d, f), L = layout('rtable', w, d, s), t = s.table / 2;
      let o = L.chairs.map(([x, y, a]) => grp(x, y, a, chair2d(K, s.col, L.cw))).join('');
      o += K.ec(0, 0, t + 35, t + 35, K.shade(c, .93)) + K.ec(0, 0, t, t, c);
      o += L.places.map(([x, y, a]) => grp(x, y, a, place2d(K, s.col), L.ps)).join('');
      return o + centre2d(Math.min(330, t * .4));
    },
    itable(w, d, c, f, K) {
      const s = seating('itable', w, d, f), L = layout('itable', w, d, s), hl = L.L / 2, ht = s.table / 2;
      let o = L.chairs.map(([x, y, a]) => grp(x, y, a, chair2d(K, s.col, L.cw))).join('');
      o += cloth2d(K, -hl, -ht, L.L, s.table, c);
      o += L.places.map(([x, y, a]) => grp(x, y, a, place2d(K, s.col), L.ps)).join('');
      return o + runner2d(L.L - 300, w);
    },
    headtable(w, d, c, f, K) {
      const s = seating('headtable', w, d, f), L = layout('headtable', w, d, s), hl = L.L / 2, ht = s.table / 2;
      let o = L.chairs.map(([x, y, a]) => grp(x, y, a, chair2d(K, s.col, L.cw, true))).join('');
      o += cloth2d(K, -hl, L.ty - ht, L.L, s.table, c);
      o += L.places.map(([x, y, a]) => grp(x, y, a, place2d(K, s.col), L.ps)).join('');
      return o + garland2d(-hl * .92, hl * .92, L.ty + ht - 60, w + 7);
    },
    cocktail(w, d, c, f, K) {
      const r = Math.min(w, d) / 2 - 20;
      return K.ec(0, 0, r, r, c) + dot(0, 0, r - 45, 'none', FS + ' stroke-dasharray="3 3"') + K.ec(0, 0, r * .13, r * .13, K.shade(GOLD, 1.2)) + dot(0, 0, r * .06, '#f2b84b');
    },
    lounge(w, d, c, f, K) {
      const x = -w / 2, y = -d / 2, sw = Math.min(1700, w * .64), sd = Math.min(850, d * .42), sy = y + 60 + sd / 2;
      const aw = Math.min(780, w * .3, d * .4), ay = Math.min(sy + sd / 2 + aw / 2 + 40, d / 2 - 60 - aw / 2), ax = w / 2 - 60 - aw / 2;
      const cw = Math.max(300, Math.min(900, 2 * ax - aw - 200)), ch = Math.min(480, cw * .6);
      let o = K.rc(x + 40, y + 40, w - 80, d - 80, K.shade(c, .86), 'rx="40" fill-opacity=".8"') + K.rc(x + 150, y + 150, w - 300, d - 300, 'none', 'rx="30" stroke-dasharray="3 3" opacity=".5"');
      o += grp(0, sy, 0, sofa2d(K, sw, sd, c, 2)) + grp(-ax, ay, -90, sofa2d(K, aw, aw, c, 1)) + grp(ax, ay, 90, sofa2d(K, aw, aw, c, 1));
      return o + K.ec(0, ay, cw / 2, ch / 2, '#f4f1ec') + oval(0, ay, cw / 2 - 40, ch / 2 - 40, 'none', 'stroke="#c9a24a" stroke-width="1" vector-effect="non-scaling-stroke" opacity=".7"')
        + cluster2d(cw * .2, ay, 70, rand(3));
    },
    dancefloor(w, d, c, f, K) {
      const x = -w / 2, y = -d / 2, t = Math.min(70, w * .02, d * .02), iw = w - 2 * t, id = d - 2 * t;
      const nx = Math.max(1, Math.round(iw / 1200)), ny = Math.max(1, Math.round(id / 1200));
      let o = K.rc(x, y, w, d, K.shade(c, .8)) + K.rc(x + t, y + t, iw, id, c);
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) if ((i + j) % 2) o += rect2(x + t + iw / nx * i, y + t + id / ny * j, iw / nx, id / ny, K.shade(c, .965));
      for (let i = 1; i < nx; i++) o += K.ln(x + t + iw / nx * i, y + t, x + t + iw / nx * i, y + d - t, 'opacity=".4"');
      for (let j = 1; j < ny; j++) o += K.ln(x + t, y + t + id / ny * j, x + w - t, y + t + id / ny * j, 'opacity=".4"');
      return o;
    },
    stage(w, d, c, f, K) {
      const steps = d >= 1600 && w >= 1600, sd = steps ? d - 600 : d, x = -w / 2, y = -d / 2, top = K.shade(c, 1.32);
      let o = K.rc(x, y, w, sd, c, 'rx="20"') + K.rc(x + 70, y + 70, w - 140, sd - 140, top, 'rx="10"');
      const nx = Math.max(1, Math.round((w - 140) / 2440)), ny = Math.max(1, Math.round((sd - 140) / 1220));
      for (let i = 1; i < nx; i++) o += line2(x + 70 + (w - 140) / nx * i, y + 70, x + 70 + (w - 140) / nx * i, y + sd - 70, K.shade(c, 1.05), 1, 'opacity=".55"');
      for (let j = 1; j < ny; j++) o += line2(x + 70, y + 70 + (sd - 140) / ny * j, -x - 70, y + 70 + (sd - 140) / ny * j, K.shade(c, 1.05), 1, 'opacity=".55"');
      if (steps) { const sw = Math.min(1800, w * .3); o += K.rc(-sw / 2, y + sd, sw, 300, K.shade(c, 1.2)) + K.rc(-sw / 2, y + sd + 300, sw, 300, K.shade(c, 1.45)); }
      if (w >= 2400 && sd >= 1200) [-1, 1].forEach(s => o += grp(s * (w / 2 - 450), y + sd - 400, s * 11.5, K.rc(-240, -210, 480, 420, '#2a2a2c', 'rx="20"') + K.ec(0, 150, 150, 40, '#5a5a5e')));
      return o;
    },
    dj(w, d, c, f, K) {
      const bd = Math.min(700, d * .7), y0 = d / 2 - bd, x = -w / 2, ex = w * .27;
      let o = K.rc(x, y0, w, bd, K.shade(c, 1.45), 'rx="20"') + K.rc(x, d / 2 - 70, w, 70, c) + line2(x + 60, d / 2 - 35, -x - 60, d / 2 - 35, '#8f7cff', 2);
      o += K.rc(x + 40, -d / 2 + 40, w - 80, y0 + d / 2 - 80, 'none', 'rx="30" stroke-dasharray="4 4" opacity=".45"');
      [-1, 1].forEach(s => o += K.rc(s * ex - 170, y0 + 110, 340, 400, '#a3a3a8', 'rx="20"') + dot(s * ex, y0 + 300, 120, '#d2d3d6', FS) + dot(s * ex, y0 + 300, 30, '#77777c'));
      o += K.rc(-150, y0 + 110, 300, 380, '#b4b4b9', 'rx="20"');
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) o += dot(-105 + i * 70, y0 + 170 + j * 70, 16, '#77777c');
      return o;
    },
    ledscreen(w, d, c, f, K) {
      const pd = Math.min(80, d * .25), py = -d / 2 + Math.min(50, d * .12);
      let o = '';
      [-1, 1].forEach(s => o += K.rc(s * w * .3 - 40, -d / 2 + 10, 80, d - 20, '#6d6e72', 'rx="15"'));
      return o + K.rc(-w / 2 + 30, py, w - 60, pd, c) + line2(-w / 2 + 50, py + pd + 12, w / 2 - 50, py + pd + 12, '#7fb3ff', 2, 'opacity=".9"');
    },
    bar(w, d, c, f, K) {
      const cd = Math.min(620, d * .62), x = -w / 2, bb = Math.min(260, d * .26), R = rand(w);
      let o = K.rc(x + 100, -d / 2, w - 200, bb, K.shade(c, .82));
      const cols = ['#5b7f63', '#9a6a3a', '#cfdcde', '#4a3a32', '#a54a4a', '#d9b45a'];
      for (let bx = x + 170; bx < -x - 160; bx += 115) o += dot(bx, -d / 2 + bb / 2 + (R() - .5) * 50, 34, pick(R, cols), FS);
      o += K.rc(x, d / 2 - cd, w, cd, '#f5f2ec', 'rx="20"') + K.ln(x + 20, d / 2 - 70, -x - 20, d / 2 - 70, K.DASH);
      for (let i = 0; i < 6; i++) o += dot(-x - 180 - (i % 3) * 110, d / 2 - cd + 130 + (i / 3 | 0) * 110, 38, '#e8f1f3', FS);
      return o;
    },
    dessert(w, d, c, f, K) {
      const L = w - 100, td = d - 100, z = -td * .08;
      let o = cloth2d(K, -L / 2, -td / 2, L, td, c);
      const cols = ['#f3c6cf', '#c8dfe8', '#f6e3a8', '#d9c4ec', '#fbd7b8'];
      [-.42, -.28, -.14, 0, .14, .28, .42].forEach((k, i) => {
        const x = k * L, j = Math.min(i, 6 - i);
        if (j === 3) o += dot(x, z, 200, '#ffffff', FS) + dot(x, z, 140, '#fffaf2', FS) + dot(x, z, 80, '#ffffff', FS) + [0, 1, 2, 3, 4, 5].map(q => dot(x + Math.cos(q) * 170, z + Math.sin(q) * 170, 22, cols[q % 5])).join('');
        else if (j === 1) o += dot(x, z, 75, '#e6f0f2', FS) + dot(x, z, 55, cols[i % 5]);
        else { const r = j === 0 ? 165 : 130; o += dot(x, z, r, '#ffffff', FS) + dot(x, z, r * .55, cols[(i + 2) % 5], FS); }
      });
      return o;
    },
    cake(w, d, c, f, K) {
      const m = Math.min(w, d), R = m / 2 - 40, t = Math.max(R - 60, m * .37);
      let o = K.ec(0, 0, R, R, K.shade(c, .93)) + K.ec(0, 0, t, t, c) + dot(0, 0, 200, '#dcc07e', FS);
      [170, 125, 85].forEach(r => o += dot(0, 0, r, '#fffdf8', FS));
      for (let k = 0; k < 7; k++) { const a = 2.2 + k * .32, r = 175 - k * 14; o += dot(Math.cos(a) * r, Math.sin(a) * r, 26 - k, TABLE_FLOWERS[(k + 1) % 6], FS); }
      return o;
    },
    buffet(w, d, c, f, K) {
      const L = w - 100, td = Math.min(d - 100, 760), n = Math.max(1, Math.floor((L - 300) / 700)), sp = (L - 300) / n;
      let o = cloth2d(K, -L / 2, -td / 2, L, td, c);
      for (let i = 0; i < n; i++) {
        const cx = -L / 2 + 150 + sp * (i + .5);
        o += K.rc(cx - 255, -165, 510, 330, '#dfe2e5', 'rx="60"') + K.rc(cx - 215, -125, 430, 250, '#f0f2f4', 'rx="40" stroke-opacity=".45"') + K.ln(cx - 200, 0, cx + 200, 0, 'opacity=".35"');
      }
      return o;
    },
    coffee(w, d, c, f, K) {
      const x = -w / 2, y = -d / 2;
      let o = K.rc(x, y, w, d, '#a88461', 'rx="20"') + K.rc(x + 30, y + 30, w - 60, d - 60, K.shade(c, 1.02), 'rx="12" stroke-opacity=".4"');
      o += K.rc(x + w * .12, y + 70, w * .27, d * .55, '#b8bbbf', 'rx="25"') + K.rc(x + w * .15, y + 90, w * .21, d * .22, '#dfe1e3', 'rx="15"');
      o += dot(x + w * .48, y + d * .35, 80, '#77787c', FS);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) o += dot(x + w * .6 + i * 95, y + d * .32 + j * 110, 38, '#ffffff', FS);
      [0, 1].forEach(k => o += dot(x + w * .88, y + d * (.3 + k * .38), 95, '#d3d6d9', FS));
      return o;
    },
    candelabra(w, d, c, f, K) {
      const m = Math.min(w, d), R = m * .42;
      let o = K.ec(0, 0, m * .29, m * .29, K.shade(c, 1.25));
      for (let k = 0; k < 4; k++) { const a = (k + .5) / 4 * TAU; o += line2(0, 0, Math.cos(a) * R, Math.sin(a) * R, K.shade(c, .7), 2.5); }
      for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; o += dot(Math.cos(a) * m * .17, Math.sin(a) * m * .17, m * .05, k % 3 ? TABLE_FLOWERS[k % 6] : GREENS[k % 4], FS); }
      for (let k = 0; k < 4; k++) { const a = (k + .5) / 4 * TAU; o += K.ec(Math.cos(a) * R, Math.sin(a) * R, m * .085, m * .085, c) + dot(Math.cos(a) * R, Math.sin(a) * R, m * .035, '#f6bf4f'); }
      return o + K.ec(0, 0, m * .08, m * .08, c) + dot(0, 0, m * .035, '#f6bf4f');
    },
    flowerstand(w, d, c, f, K) {
      const m = Math.min(w, d), R = rand(17), pal = [c, K.shade(c, .85), K.shade(c, .7), '#fffaf4', '#fbf6ef'];
      let o = K.rc(-m * .3, -m * .3, m * .6, m * .6, '#f6f3ee', 'rx="30"');
      for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + .3; o += oval(Math.cos(a) * m * .33, Math.sin(a) * m * .33, m * .11, m * .05, pick(R, GREENS), FS + ` transform="rotate(${r1(a * 180 / PI)} ${r1(Math.cos(a) * m * .33)} ${r1(Math.sin(a) * m * .33)})"`); }
      for (let k = 0; k < 15; k++) { const a = k * 2.4, q = Math.sqrt((k + .5) / 15) * m * .3; o += dot(Math.cos(a) * q, Math.sin(a) * q, m * (.06 + R() * .03), pal[k % 5], FS); }
      return o;
    },
    arch(w, d, c, f, K) {
      const a = w / 2 - 150, bd = Math.min(500, d - 60), R = rand(29), pal = [c, K.shade(c, .85), K.shade(c, .7), '#fffaf4', '#fbf6ef'];
      let o = K.rc(-a - 150, -bd / 2, 300, bd, '#ece6dc') + K.rc(a - 150, -bd / 2, 300, bd, '#ece6dc') + line2(-a, 0, a, 0, '#b8954e', 3);
      const flower = (x, y, r, col) => dot(x, y, r, col, FS);
      for (let k = 0; k < 34; k++) { const t = R(), x = -a + t * a * .72, y = (R() - .5) * 260; o += R() < .3 ? oval(x, y, 110, 40, pick(R, GREENS), FS) : flower(x, y, 50 + R() * 50 * (1 - t * .5), pick(R, pal)); }
      for (let k = 0; k < 12; k++) { const x = a - R() * a * .35, y = (R() - .5) * 220; o += R() < .3 ? oval(x, y, 90, 34, pick(R, GREENS), FS) : flower(x, y, 40 + R() * 40, pick(R, pal)); }
      return o;
    },
    throne(w, d, c, f, K) {
      const tw = Math.min(900, w * .66), td = Math.min(720, d * .6), ty = -d * .06, au = '#d6b46a', y = ty - td / 2;
      let o = K.ec(0, 0, w / 2 - 20, d / 2 - 20, '#f7f3ec') + oval(0, 0, w / 2 - 70, d / 2 - 70, 'none', 'stroke="#c9a24a" stroke-width="1" vector-effect="non-scaling-stroke" opacity=".6"');
      o += K.rc(-tw / 2, y + 40, tw, td - 20, au, 'rx="60"');
      o += K.rc(-tw / 2 + 50, y - 20, tw - 100, 170, K.shade(c, .85), 'rx="80"') + K.ec(0, y - 25, 70, 40, au);
      [-1, 1].forEach(s => o += K.rc(s * (tw / 2 - 60) - 55, y + 160, 110, td - 230, c, 'rx="50"'));
      return o + K.rc(-tw / 2 + 120, y + 150, tw - 240, td - 170, c, 'rx="60"');
    },
    letters(w, d, c, f, K) {
      const ws = GLYPHS.order.map(ch => GLYPHS[ch].w), gap = .07, tot = ws.reduce((a, b) => a + b, 0) + gap * 3, s = (w - 80) / tot, dep = Math.min(220, d * .45);
      let x = -tot * s / 2, o = '';
      GLYPHS.order.forEach((ch, i) => {
        const lw = ws[i] * s;
        o += K.rc(x, -dep / 2, lw, dep, c, 'rx="25"');
        o += `<text x="${r1(x + lw / 2)}" y="0" font-size="${r1(Math.min(d * .85, lw * 1.05))}" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="${K.shade(c, .55)}" opacity=".85" pointer-events="none">${ch}</text>`;
        x += lw + gap * s;
      });
      return o;
    },
    booth(w, d, c, f, K) {
      const bw = w - 200, by = -d / 2 + 170, R = rand(41), pal = ['#ffffff', c, '#f2c9d2', '#d9bf7a', K.shade(c, .85)], cy = d / 2 - 450;
      let o = K.rc(-bw / 2 - 40, -d / 2 + 40, 60, 560, '#55565a') + K.rc(bw / 2 - 20, -d / 2 + 40, 60, 560, '#55565a') + K.rc(-bw / 2, by, bw, 70, c);
      o += K.rc(-bw / 2 + 250, by + 300, bw - 500, d * .38, 'none', 'rx="20" stroke-dasharray="4 4" opacity=".45"');
      for (let k = 0; k < 16; k++) { const t = R(); o += dot(-bw / 2 + 60 + t * bw * .45, by + 35 + (R() - .5) * 200 * (1 - t * .5), 90 + R() * 80, pick(R, pal), FS); }
      [90, 210, 330].forEach(a => o += line2(0, cy, Math.cos(a * PI / 180) * 300, cy + Math.sin(a * PI / 180) * 300, '#3d3a34', 1.2));
      return o + dot(0, cy - 40, 200, 'none', 'stroke="#f2b84b" stroke-width="2" vector-effect="non-scaling-stroke"') + K.rc(-70, cy - 90, 140, 100, '#2b2b2d', 'rx="15"');
    },
    platform360(w, d, c, f, K) {
      const m = Math.min(w, d), R = m / 2 - 100, a = PI / 4, e = m / 2 - 40;
      return dot(0, 0, m / 2 - 10, 'none', FS + ' stroke-dasharray="4 4"') + K.ec(0, 0, R, R, c) + K.ec(0, 0, R - 40, R - 40, '#f3f3f5')
        + dot(0, 0, R - 20, 'none', 'stroke="#9d8cff" stroke-width="1.5" vector-effect="non-scaling-stroke"')
        + line2(Math.cos(a) * (R - 40), Math.sin(a) * (R - 40), Math.cos(a) * e, Math.sin(a) * e, '#2b2b2d', 3) + K.ec(Math.cos(a) * e, Math.sin(a) * e, 45, 45, '#2b2b2d');
    },
  };

  /* ======================= Letras gigantes (unidades: alto = 1) ======================= */
  const GLYPHS = {
    order: ['A', 'M', 'O', 'R'],
    A: { w: .7, outer: [[0, 0], [.2, 0], [.2625, .25], [.4375, .25], [.5, 0], [.7, 0], [.45, 1], [.25, 1]], holes: [[[.305, .42], [.395, .42], [.35, .6]]],
      bulbs: [[[.1125, .06], [.335, .95]], [[.5875, .06], [.365, .95]], [[.26, .335], [.44, .335]]] },
    M: { w: .82, outer: [[0, 0], [.18, 0], [.18, .62], [.41, .2], [.64, .62], [.64, 0], [.82, 0], [.82, 1], [.64, 1], [.41, .55], [.18, 1], [0, 1]], holes: [],
      bulbs: [[[.09, .06], [.09, .94]], [[.73, .06], [.73, .94]], [[.2, .79], [.41, .38], [.62, .79]]] },
    O: { w: .72, ell: [.36, .5, .36, .5, .16, .3], bulbs: [{ e: [.36, .5, .26, .4] }] },
    R: { w: .68, bulbs: [[[.1, .06], [.1, .94]], [[.1, .915], [.38, .915], [.52, .865], [.585, .715], [.52, .565], [.38, .5], [.18, .5]], [[.43, .38], [.57, .06]]] },
  };
  function glyphShape(T, ch, s) {
    const G = GLYPHS[ch], P = (x, y) => [x * s, y * s];
    const shp = new T.Shape();
    if (G.ell) {
      const [cx, cy, rx, ry, hx, hy] = G.ell;
      shp.absellipse(cx * s, cy * s, rx * s, ry * s, 0, TAU, false);
      const h = new T.Path(); h.absellipse(cx * s, cy * s, hx * s, hy * s, 0, TAU, true); shp.holes.push(h);
    } else if (ch === 'R') {
      shp.moveTo(...P(0, 0)); shp.lineTo(...P(.2, 0)); shp.lineTo(...P(.2, .4)); shp.lineTo(...P(.3, .4)); shp.lineTo(...P(.46, 0)); shp.lineTo(...P(.68, 0)); shp.lineTo(...P(.5, .44));
      shp.bezierCurveTo(...P(.62, .48), ...P(.68, .6), ...P(.68, .72)); shp.bezierCurveTo(...P(.68, .9), ...P(.56, 1), ...P(.4, 1)); shp.lineTo(...P(0, 1)); shp.lineTo(...P(0, 0));
      const h = new T.Path(); h.moveTo(...P(.2, .58)); h.lineTo(...P(.38, .58)); h.bezierCurveTo(...P(.46, .58), ...P(.49, .64), ...P(.49, .71));
      h.bezierCurveTo(...P(.49, .78), ...P(.46, .83), ...P(.38, .83)); h.lineTo(...P(.2, .83)); h.lineTo(...P(.2, .58)); shp.holes.push(h);
    } else {
      G.outer.forEach(([x, y], i) => shp[i ? 'lineTo' : 'moveTo'](x * s, y * s)); shp.lineTo(G.outer[0][0] * s, G.outer[0][1] * s);
      G.holes.forEach(hp => { const h = new T.Path(); hp.forEach(([x, y], i) => h[i ? 'lineTo' : 'moveTo'](x * s, y * s)); h.lineTo(hp[0][0] * s, hp[0][1] * s); shp.holes.push(h); });
    }
    return shp;
  }
  // Puntos de focos a lo largo de los trazos (unidades de letra), separados ~step y sin duplicados
  function glyphBulbs(ch, step) {
    const out = [], add = p => { if (!out.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < step * .6)) out.push(p); };
    GLYPHS[ch].bulbs.forEach(b => {
      if (b.e) { const [cx, cy, rx, ry] = b.e, n = Math.max(6, Math.round(PI * (rx + ry) / step)); for (let k = 0; k < n; k++) { const a = k / n * TAU; add([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return; }
      const seg = []; let L = 0;
      for (let i = 1; i < b.length; i++) { const l = Math.hypot(b[i][0] - b[i - 1][0], b[i][1] - b[i - 1][1]); seg.push(l); L += l; }
      const n = Math.max(1, Math.round(L / step));
      for (let k = 0; k <= n; k++) {
        let t = k / n * L, i = 0;
        while (i < seg.length - 1 && t > seg[i]) { t -= seg[i]; i++; }
        const u = seg[i] ? Math.min(1, t / seg[i]) : 0;
        add([b[i][0] + (b[i + 1][0] - b[i][0]) * u, b[i][1] + (b[i + 1][1] - b[i][1]) * u]);
      }
    });
    return out;
  }

  /* ======================= 3D: utilidades ======================= */
  const CACHE = new Map();
  const cached = (key, make) => { let v = CACHE.get(key); if (!v) { v = make(); CACHE.set(key, v); } return v; };
  let RBG = null;   // RoundedBoxGeometry (la clase se toma de K.rbox)

  // Deja una geometría lista para fusionarse: solo position/normal/uv (+color), indexada y sin grupos
  function prep(T, geo, col) {
    for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') geo.deleteAttribute(k);
    const n = geo.attributes.position.count;
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.uv) geo.setAttribute('uv', new T.BufferAttribute(new Float32Array(n * 2), 2));
    if (!geo.index) { const ix = new Uint32Array(n); for (let i = 0; i < n; i++) ix[i] = i; geo.setIndex(new T.BufferAttribute(ix, 1)); }
    geo.clearGroups(); geo.morphAttributes = {};
    if (col) { const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } geo.setAttribute('color', new T.BufferAttribute(a, 3)); }
    return geo;
  }

  // Constructor de geometría fusionada (una por material). ctx compartido permite marcos (withFrame) en varios GB a la vez.
  function GB(K, ctx = {}) {
    const T = K.THREE, list = [];
    if (!RBG) { const o = K.rbox(.1, .1, .1, K.mat('#ffffff')); RBG = o.geometry.constructor; o.geometry.dispose(); }
    const E = new T.Euler(), Q = new T.Quaternion(), P = new T.Vector3(), S = new T.Vector3(), MX = new T.Matrix4(), UP = new T.Vector3(0, 1, 0);
    const put = (geo, col) => { if (ctx.frame) geo.applyMatrix4(ctx.frame); list.push([geo, col]); return geo; };
    const at = (geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, col) => {
      MX.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz)); return put(geo.applyMatrix4(MX), col);
    };
    return {
      ctx, at,
      box: (w, h, d, x = 0, y = 0, z = 0, col, rx = 0, ry = 0, rz = 0) => at(new T.BoxGeometry(w, h, d), x, y + h / 2, z, rx, ry, rz, 1, 1, 1, col),
      rbox: (w, h, d, x = 0, y = 0, z = 0, r = .02, col, rx = 0, ry = 0, rz = 0, seg = 2) =>
        at(new RBG(w, h, d, seg, Math.max(.001, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001))), x, y + h / 2, z, rx, ry, rz, 1, 1, 1, col),
      cyl: (rt, rb, h, x = 0, y = 0, z = 0, seg = 16, col) => at(new T.CylinderGeometry(rt, rb, h, seg), x, y + h / 2, z, 0, 0, 0, 1, 1, 1, col),
      sph: (rx, ry, rz, x = 0, y = 0, z = 0, col, seg = 8, ax = 0, ay = 0, az = 0) => at(new T.SphereGeometry(1, seg, Math.max(4, Math.round(seg * .7))), x, y, z, ax, ay, az, rx, ry, rz, col),
      lathe: (pts, x = 0, y = 0, z = 0, seg = 24, col) => at(new T.LatheGeometry(pts.map(([r, h]) => new T.Vector2(Math.max(r, 1e-4), h)), seg), x, y, z, 0, 0, 0, 1, 1, 1, col),
      torus: (R, r, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, col, seg = 32, rad = 8, sx = 1, sy = 1, sz = 1) => at(new T.TorusGeometry(R, r, rad, seg), x, y, z, rx, ry, rz, sx, sy, sz, col),
      rod(a, b, r0, r1 = r0, seg = 6, col, open = true) {
        const A = new T.Vector3(a[0], a[1], a[2]), B = new T.Vector3(b[0], b[1], b[2]), L = A.distanceTo(B);
        if (L < 1e-5) return null;
        MX.compose(A.clone().add(B).multiplyScalar(.5), Q.setFromUnitVectors(UP, B.clone().sub(A).normalize()), S.set(1, 1, 1));
        return put(new T.CylinderGeometry(r1, r0, L, seg, 1, open).applyMatrix4(MX), col);
      },
      // flor tipo rosa (copa con botón al centro), centrada en (x,y,z) y abierta hacia (nx,ny,nz)
      bloom(s, x, y, z, col, nx = 0, ny = 1, nz = 0, seg = 7) {
        const geo = new T.LatheGeometry(BLOOM.map(([r, h]) => new T.Vector2(Math.max(r * s, 1e-4), (h - .45) * s * 1.1)), seg);
        MX.compose(P.set(x, y, z), Q.setFromUnitVectors(UP, new T.Vector3(nx, ny, nz).normalize()), S.set(1, 1, 1));
        return put(geo.applyMatrix4(MX), col);
      },
      tube: (pts, r, col, seg = 24, rad = 6, closed = false) =>
        put(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new T.Vector3(p[0], p[1], p[2])), closed, 'centripetal'), seg, r, rad, closed), col),
      merge(colored) {
        if (!list.length) return null;
        const geos = list.map(([g, c]) => prep(T, g, colored ? new T.Color(c || '#ffffff') : null));
        list.length = 0;
        const out = geos.length === 1 ? geos[0] : K.mergeGeometries(geos, false);
        if (geos.length > 1) geos.forEach(g => g.dispose());
        if (out) { out.computeBoundingSphere(); out.computeBoundingBox(); }
        return out;
      },
    };
  }
  function withFrame(ctx, m, fn) { const prev = ctx.frame; ctx.frame = prev ? prev.clone().multiply(m) : m; fn(); ctx.frame = prev; }
  function mtx(T, x, y, z, ry = 0, s = 1, rx = 0) {
    return new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, 0)), new T.Vector3(s, s, s));
  }
  function addMesh(K, g, geo, material, cast = true, recv = true, y = 0) {
    if (!geo) return null;
    const o = new K.THREE.Mesh(geo, material); o.castShadow = cast; o.receiveShadow = recv; o.position.y = y; g.add(o); return o;
  }
  function addInst(K, g, geo, material, mats, cast = true, recv = true) {
    if (!geo || !mats.length) return null;
    const o = new K.THREE.InstancedMesh(geo, material, mats.length);
    mats.forEach((m, i) => o.setMatrixAt(i, m)); o.instanceMatrix.needsUpdate = true;
    o.castShadow = cast; o.receiveShadow = recv; g.add(o); return o;
  }
  // [GB, material, sombra?, colores por vértice?]
  const emit = (K, g, parts) => parts.map(([gb, m, cast = true, col = false, recv = true]) => addMesh(K, g, gb.merge(col), m, cast, recv));

  // Materiales (todos pasan por K.mat → caché del diseñador y reflejos según rugosidad)
  const clothMat = (K, c) => K.mat(c, { roughness: .82 });
  function paintMat(K, col) {
    const hsl = {}; new K.THREE.Color(col).getHSL(hsl, K.THREE.SRGBColorSpace);
    const metal = hsl.l > .25 && hsl.l < .82 && (hsl.s > .3 || hsl.s < .1);
    return K.mat(col, metal ? { metalness: .65, roughness: .32 } : { roughness: .38 });
  }
  const goldMat = (K, c = GOLD) => K.mat(c, { metalness: .85, roughness: .3 });
  const steelMat = K => K.mat('#d6d9dc', { metalness: .85, roughness: .25 });
  const blackMat = K => K.mat('#262628', { roughness: .45, metalness: .3 });
  const vcMat = (K, r = .7, two = false) => K.mat('#ffffff', two ? { vertexColors: true, roughness: r, side: K.THREE.DoubleSide } : { vertexColors: true, roughness: r });
  const glassMat = K => K.mat('#dfeef3', { transparent: true, opacity: .35, roughness: .05 });
  const flameMat = K => K.glowMat('#fff4da', '#ffb547', 1.6);
  const waxMat = K => K.mat('#f7efe0', { roughness: .6 });

  // Paleta de flores a partir del color de la pieza
  function florals(T, c) {
    const hsl = {}; new T.Color(c).getHSL(hsl, T.SRGBColorSpace);
    if (hsl.s < .06) return TABLE_FLOWERS;
    const tone = (s, l) => '#' + new T.Color().setHSL(hsl.h, clamp(s, 0, 1), clamp(l, .25, .97), T.SRGBColorSpace).getHexString(T.SRGBColorSpace);
    return [tone(hsl.s, hsl.l), tone(hsl.s * .8 + .2, hsl.l - .1), tone(hsl.s + .3, hsl.l - .22), '#fbf7f0', '#fffdf9', tone(hsl.s * .5 + .1, Math.max(hsl.l, .86))];
  }
  // Hoja: elipsoide plano que sale de (x,y,z) hacia el ángulo th (plano xz), con caída droop (rad, negativo = abajo)
  function leaf(gb, x, y, z, len, th, droop, col) {
    const cd = Math.cos(droop), dx = cd * Math.cos(th), dy = Math.sin(droop), dz = cd * Math.sin(th);
    gb.sph(len / 2, .005, len * .22, x + dx * len / 2, y + dy * len / 2, z + dz * len / 2, col, 6, 0, -th, droop);
  }
  // Domo de flores sobre un elipsoide (phMax > π/2 baja por debajo del ecuador)
  function dome(gb, cx, cy, cz, rx, ry, rz, n, pal, R, smin, smax, phMax = 1.45, greens = 0) {
    for (let i = 0; i < n; i++) {
      const th = i * 2.39996 + R() * .3, ph = Math.acos(1 - (i + .5) / n * (1 - Math.cos(phMax))), s = smin + R() * (smax - smin);
      const nx = Math.sin(ph) * Math.cos(th), ny = Math.cos(ph), nz = Math.sin(ph) * Math.sin(th);
      gb.bloom(s, cx + nx * rx, cy + ny * ry, cz + nz * rz, pick(R, pal), nx + (R() - .5) * .5, ny + .35, nz + (R() - .5) * .5);
    }
    for (let i = 0; i < greens; i++) {
      const th = i / greens * TAU + R() * .4;
      leaf(gb, cx + Math.cos(th) * rx * .8, cy + ry * (.05 + R() * .2), cz + Math.sin(th) * rz * .8, (rx + rz) * (.3 + R() * .15), th, -.2 - R() * .5, pick(R, GREENS));
    }
  }
  // Caída de flores y hojas a lo largo de una curva (cascadas, guirnaldas)
  function trail(gb, pts, n, pal, R, s0, s1, spread = .04, face = [0, 1, 0], leafP = .38) {
    for (let i = 0; i < n; i++) {
      const t = i / Math.max(1, n - 1), f = t * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f)), u = f - k;
      const p = [0, 1, 2].map(j => pts[k][j] + (pts[k + 1][j] - pts[k][j]) * u), s = s0 + (s1 - s0) * t;
      const o = [(R() - .5) * spread, (R() - .5) * spread, (R() - .5) * spread];
      if (R() < leafP) leaf(gb, p[0] + o[0], p[1] + o[1], p[2] + o[2], s * 2.4, R() * TAU, -.3 - R() * .6, pick(R, GREENS));
      else gb.bloom(s, p[0] + o[0], p[1] + o[1], p[2] + o[2], pick(R, pal), face[0] + (R() - .5) * .9, face[1] + (R() - .5) * .9, face[2] + (R() - .5) * .9);
    }
  }

  // Halo de luz para velas y focos: solo se ve de noche (fondo oscuro). No se puede seleccionar.
  let haloTex = null; const haloMats = {};
  function addHalo(K, g, pts, size, carrier, tint = '#ffcf8a') {
    if (!pts.length || !carrier) return null;
    const T = K.THREE;
    if (!haloTex) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.18, 'rgba(255,255,255,.55)'); gr.addColorStop(.5, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      haloTex = new T.CanvasTexture(cv); haloTex.colorSpace = T.SRGBColorSpace;
    }
    const key = size + tint, m = haloMats[key] || (haloMats[key] = new T.PointsMaterial({ size, map: haloTex, color: tint, transparent: true, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true }));
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pts.flat(), 3)); geo.computeBoundingSphere();
    const p = new T.Points(geo, m); p.raycast = () => {}; p.visible = false; p.renderOrder = 2; g.add(p);
    const prev = carrier.onBeforeRender;
    carrier.onBeforeRender = function (r, scene, ...rest) { const b = scene && scene.background; p.visible = !!(b && b.isColor && b.r + b.g + b.b < .4); return prev.call(this, r, scene, ...rest); };
    return p;
  }

  // Mantel / faldón: superficie que cae del contorno (pts en xz, sentido de ángulo creciente) con vuelo y pliegues
  function circlePts(r, step) { const n = Math.max(24, Math.round(TAU * r / step)), p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; }
  function rrectPts(w, d, r, step) {
    r = Math.min(r, w / 2 - .001, d / 2 - .001);
    const p = [], hw = w / 2, hd = d / 2;
    const line = (x0, z0, x1, z1) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / step)); for (let i = 0; i < n; i++) p.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n]); };
    const arc = (cx, cz, a0) => { const n = Math.max(2, Math.round(r * PI / 2 / step)); for (let i = 0; i < n; i++) { const a = a0 + i / n * PI / 2; p.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } };
    line(hw, -hd + r, hw, hd - r); arc(hw - r, hd - r, 0);
    line(hw - r, hd, -hw + r, hd); arc(-hw + r, hd - r, PI / 2);
    line(-hw, hd - r, -hw, -hd + r); arc(-hw + r, -hd + r, PI);
    line(-hw + r, -hd, hw - r, -hd); arc(hw - r, -hd + r, 3 * PI / 2);
    return p;
  }
  function drapeGeo(T, pts, top, o = {}) {
    const N = pts.length, flare = o.flare ?? .06, amp = o.amp ?? .012, wave = o.wave ?? .2, rows = o.rows ?? 6, bottom = o.bottom ?? .004;
    let cx = 0, cz = 0; pts.forEach(p => { cx += p[0]; cz += p[1]; }); cx /= N; cz /= N;
    const nr = [], s = new Float64Array(N + 1);
    for (let i = 0; i < N; i++) {
      const a = pts[(i + N - 1) % N], b = pts[(i + 1) % N], p = pts[i], q = b;
      let nx = b[1] - a[1], nz = a[0] - b[0]; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
      if (nx * (p[0] - cx) + nz * (p[1] - cz) < 0) { nx = -nx; nz = -nz; }
      nr.push([nx, nz]); s[i + 1] = s[i] + Math.hypot(q[0] - p[0], q[1] - p[1]);
    }
    const per = s[N], k1 = Math.max(3, Math.round(per / wave)), k2 = Math.round(k1 * 1.7) + 1;
    const prof = o.skirt ? [[top, 0, .1]] : [[top, 0, 0], [top - .006, .008, 0], [top - .02, .013, .06]], y0 = o.skirt ? top - .02 : top - .035, base = o.skirt ? .004 : .014;
    for (let k = 0; k <= rows; k++) { const t = k / rows; prof.push([y0 - (y0 - bottom) * t, base + flare * Math.pow(t, 1.6), .2 + .8 * Math.pow(t, 1.1)]); }
    const pos = [], idx = [];
    prof.forEach(([y, off, fk]) => {
      for (let i = 0; i < N; i++) {
        const ph = TAU * s[i] / per, e = off + amp * fk * (Math.sin(k1 * ph) + .35 * Math.sin(k2 * ph + 1.3));
        pos.push(pts[i][0] + nr[i][0] * e, y, pts[i][1] + nr[i][1] * e);
      }
    });
    for (let r = 0; r < prof.length - 1; r++) for (let i = 0; i < N; i++) { const a = r * N + i, b = r * N + (i + 1) % N; idx.push(a, b, a + N, b, b + N, a + N); }
    if (o.cap !== false) {
      const c0 = pos.length / 3; pos.push(cx, top, cz);
      for (let i = 0; i < N; i++) pos.push(pts[i][0], top, pts[i][1]);
      for (let i = 0; i < N; i++) idx.push(c0, c0 + 1 + (i + 1) % N, c0 + 1 + i);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
    g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
  const roundCloth = (T, r, top = TOP, flare = .07) => cached(`cloth-r${r.toFixed(3)}-${top}`, () => drapeGeo(T, circlePts(r, .04), top, { flare }));
  const rectCloth = (T, w, d, top = TOP) => cached(`cloth-q${w.toFixed(3)}x${d.toFixed(3)}-${top}`, () => drapeGeo(T, rrectPts(w, d, .05, .04), top, { flare: .06 }));

  /* ======================= Sillas, lugares y centros de mesa (geometría cacheada) ======================= */
  // Silla Tiffany / chiavari: mira a +z, respaldo en -z
  function chiavariGeo(K) {
    const fr = GB(K), cu = GB(K), seat = .43, R = (a, b, r0 = .009, r1 = r0) => fr.rod(a, b, r0, r1, 6);
    [-1, 1].forEach(s => {
      R([s * .178, 0, .18], [s * .168, seat, .165], .01, .013);
      R([s * .172, 0, -.215], [s * .166, seat, -.17], .01, .013);
      R([s * .166, seat, -.17], [s * .158, .93, -.215], .012, .011);
      [.15, .27].forEach(y => { const k = y / seat; R([s * (.178 - .01 * k), y, .18 - .015 * k], [s * (.172 - .006 * k), y, -.215 + .045 * k], .007); });
    });
    R([-.174, .2, .174], [.174, .2, .174], .007); R([-.17, .2, -.2], [.17, .2, -.2], .007);
    const zb = y => -.17 - (y - seat) / (.93 - seat) * .045, xb = y => .166 - (y - seat) / (.93 - seat) * .008;
    [[.6, .009], [.72, .009], [.9, .015]].forEach(([y, r]) => R([-xb(y), y, zb(y)], [xb(y), y, zb(y)], r));
    [-.075, 0, .075].forEach(x => R([x, .6, zb(.6)], [x, .72, zb(.72)], .006));
    fr.box(.36, .026, .36, 0, seat - .026, -.005);
    cu.box(.352, .034, .345, 0, seat, 0); cu.box(.33, .016, .322, 0, seat + .034, .002);
    return { frame: fr.merge(), cushion: cu.merge() };
  }
  // Silla de novios estilo Luis XVI con respaldo de medallón
  function louisGeo(K) {
    const fr = GB(K), up = GB(K), seat = .4;
    [-1, 1].forEach(s => {
      fr.rod([s * .2, 0, .2], [s * .205, seat - .02, .205], .014, .02, 8);
      fr.rod([s * .19, 0, -.235], [s * .2, seat - .02, -.2], .014, .02, 8);
      fr.rod([s * .195, seat, -.2], [s * .16, .68, -.25], .018, .016, 8);
      fr.sph(.024, .02, .024, s * .205, seat - .03, .205, null, 10);
    });
    fr.rbox(.5, .07, .48, 0, seat - .07, 0, .02);
    fr.torus(.2, .017, 0, .9, -.26, -.1, 0, 0, null, 40, 8, 1, 1.28, 1);
    fr.sph(.032, .03, .022, 0, 1.17, -.29, null, 10); fr.sph(.013, .013, .008, 0, .9, -.24, null, 8);
    up.rbox(.47, .09, .45, 0, seat, .01, .04, null, 0, 0, 0, 2);
    up.at(new K.THREE.CylinderGeometry(.186, .186, .035, 28), 0, .9, -.26, PI / 2 - .1, 0, 0, 1, 1, 1.28);
    return { frame: fr.merge(), cushion: up.merge() };
  }
  // Lugar: plato base, plato, servilleta, cubiertos y copa. El comensal está en -z, la mesa hacia +z.
  function settingGeo(K) {
    const ch = GB(K), pl = GB(K), gl = GB(K), cut = '#c4c8cd';
    ch.lathe([[0, 0], [.15, 0], [.162, .004], [.167, .011], [.163, .013]], 0, 0, 0, 20);
    pl.lathe([[0, .011], [.092, .011], [.108, .017], [.128, .028], [.125, .03]], 0, 0, 0, 20, '#fbfaf6');
    pl.box(.085, .02, .16, 0, .016, -.005, '#eadfcd');
    pl.box(.014, .004, .19, .2, .001, 0, cut); pl.box(.014, .004, .19, .228, .001, 0, cut); pl.box(.016, .004, .2, -.205, .001, 0, cut);
    gl.lathe([[.034, 0], [.035, .003], [.006, .008], [.0045, .1], [.028, .118], [.041, .16], [.04, .215]], -.15, 0, .17, 10);
    return { charger: ch.merge(), plate: pl.merge(true), glass: gl.merge() };
  }
  function candle(wx, fm, x, y, z, r, h, halo) {
    wx.cyl(r, r * 1.03, h, x, y, z, 14);
    fm.lathe(FLAME, x, y + h + .003, z, 8);
    if (halo) halo.push([x, y + h + .02, z]);
  }
  // Centro de mesa redonda: compotera dorada con domo de flores y tres velas (y = 0 sobre el mantel)
  function centreGeo(K) {
    const R = rand(11), fl = GB(K), fm = GB(K);
    fl.cyl(.21, .21, .008, 0, 0, 0, 40, '#d9dde0');
    fl.lathe([[.075, 0], [.06, .012], [.024, .03], [.02, .06], [.06, .075], [.13, .11], [.14, .12], [.1, .12]], 0, .008, 0, 24, '#c8a759');
    dome(fl, 0, .11, 0, .19, .12, .19, 28, TABLE_FLOWERS, R, .033, .052, 1.5, 14);
    for (let i = 0; i < 8; i++) { const a = R() * TAU, q = .1 + R() * .1; fl.sph(.012, .012, .012, Math.cos(a) * q, .2 + R() * .04, Math.sin(a) * q, '#ffffff', 6); }
    const wx = { cyl: (...a) => fl.cyl(...a.slice(0, 7), '#f7efe0') };
    [[.5, .08], [2.6, .12], [4.7, .1]].forEach(([a, h]) => { const x = Math.cos(a) * .32, z = Math.sin(a) * .32; fl.cyl(.032, .032, .006, x, 0, z, 16, '#c8a759'); candle(wx, fm, x, .006, z, .024, h); });
    return { flowers: fl.merge(true), flames: fm.merge() };
  }
  // Camino de mesa imperial: tela, guía de follaje, flores y grupos de velas (y = 0 sobre el mantel)
  function runnerGeo(K, L) {
    const R = rand(Math.round(L * 1000)), fl = GB(K), fm = GB(K), len = Math.max(.3, L - .3);
    const wx = { cyl: (...a) => fl.cyl(...a.slice(0, 7), '#f7efe0') };
    fl.box(len, .003, .3, 0, 0, 0, '#e8decf');
    const nl = Math.max(4, Math.round(len / .05));
    for (let i = 0; i < nl; i++) { const x = -len / 2 + .04 + (len - .08) * i / (nl - 1), sd = i % 2 ? 1 : -1; leaf(fl, x, .012, 0, .09 + R() * .03, sd * (PI / 2 + .6 + R() * .6), -.12, pick(R, GREENS)); }
    const nc = Math.max(1, Math.round(len / 1.0));
    for (let i = 0; i < nc; i++) { const x = -len / 2 + len / nc * (i + .5); dome(fl, x, .03, 0, .13, .09, .1, 11, TABLE_FLOWERS, R, .028, .045, 1.5, 4); }
    for (let i = 1; i < nc || (nc === 1 && i === 1); i++) {
      const x = nc === 1 ? len / 2 - .12 : -len / 2 + len / nc * i;
      [[-.07, .04, .1], [0, -.03, .16], [.07, .04, .12]].forEach(([dx, dz, h]) => { fl.cyl(.032, .032, .006, x + dx, 0, dz, 16, '#c8a759'); candle(wx, fm, x + dx, .006, dz, .025, h); });
      if (nc === 1) break;
    }
    return { flowers: fl.merge(true), flames: fm.merge() };
  }
  // Mesa de novios: arreglo bajo al frente, cascadas en las esquinas, guirnalda en el faldón y moños en las sillas
  function headGeo(K, L, s, f) {
    const R = rand(f.w * 3 + s.n), fl = GB(K), fm = GB(K), m = K.M, Lm = m(L.L), td = m(s.table), tz = m(L.ty), fz = tz + td / 2;
    const pal = TABLE_FLOWERS, wx = { cyl: (...a) => fl.cyl(...a.slice(0, 7), '#f7efe0') };
    // arreglo bajo y largo al frente de la cubierta
    const len = Lm * .84, n = Math.round(len / .016);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), x = -len / 2 + len * t, h = .035 + .06 * Math.pow(Math.sin(PI * t), .6) + (Math.min(t, 1 - t) < .08 ? .03 : 0), z = fz - .1 + (R() - .5) * .1, r = R();
      if (r < .32) leaf(fl, x, TOP + .015, z, .08 + R() * .05, R() < .5 ? PI / 2 + (R() - .5) * 1.2 : -PI / 2 + (R() - .5) * 1.2, -.15 - R() * .3, pick(R, GREENS));
      else if (r < .42) fl.sph(.01, .01, .01, x, TOP + .03 + R() * h * 1.2, z, '#ffffff', 6);
      else fl.bloom(.022 + R() * .017, x + (R() - .5) * .03, TOP + .02 + R() * h, z, pick(R, pal), (R() - .5) * .8, 1, .45 + (R() - .5) * .6);
    }
    // cascadas en las esquinas del frente y guirnalda de follaje sobre el faldón
    [-1, 1].forEach(sd => {
      const x = sd * (Lm / 2 - .03);
      trail(fl, [[x, TOP + .05, fz - .03], [x + sd * .03, TOP - .18, fz + .05], [x + sd * .05, .28, fz + .09]], 40, pal, R, .042, .022, .07, [sd * .5, .3, 1], .42);
    });
    const sw = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16, x = -Lm / 2 + .06 + (Lm - .12) * t; sw.push([x, TOP - .04 - .26 * Math.sin(PI * t), fz + .05 + .02 * Math.sin(PI * t)]); }
    trail(fl, sw, Math.round(Lm / .02), pal, R, .024, .024, .03, [0, .3, 1], .62);
    [-.3, 0, .3].map(k => k * Lm).forEach((x, i) => { fl.cyl(.035, .035, .006, x, TOP, fz - .26, 16, '#c8a759'); candle(wx, fm, x, TOP + .006, fz - .26, .03, i === 1 ? .2 : .14); });
    L.chairs.forEach(([x, y]) => dome(fl, m(x), .74, m(y) - .29, .07, .06, .04, 7, pal, R, .022, .032, 1.6, 3));
    return { flowers: fl.merge(true), flames: fm.merge() };
  }

  /* ======================= Mesas con sillas (≈8 draw calls cada una) ======================= */
  function seated3d(type, g, f, K) {
    const T = K.THREE, m = K.M, s = seating(type, f.w, f.d, f), L = layout(type, f.w, f.d, s), c = f.color || '#f4efe6', td = m(s.table);
    if (type === 'rtable') addMesh(K, g, roundCloth(T, td / 2), clothMat(K, c));
    else { const o = addMesh(K, g, rectCloth(T, m(L.L), td), clothMat(K, c)); o.position.z = type === 'headtable' ? m(L.ty) : 0; }
    const kind = type === 'headtable' ? 'louis' : 'chiavari';
    const cg = cached('chair-' + kind, () => kind === 'louis' ? louisGeo(K) : chiavariGeo(K));
    const ck = clamp(L.cw / (kind === 'louis' ? 480 : 420), .6, 1);
    const cm = L.chairs.map(([x, y, a]) => mtx(T, m(x), 0, m(y), -a * PI / 180, ck));
    addInst(K, g, cg.frame, paintMat(K, s.col), cm, true);
    addInst(K, g, cg.cushion, K.fabric(IVORY), cm, true);
    const sg = cached('setting', () => settingGeo(K));
    const sm = L.places.map(([x, y, a]) => mtx(T, m(x), TOP, m(y), -a * PI / 180, L.ps));
    addInst(K, g, sg.charger, K.mat(K.lighter(s.col, .18), { metalness: .75, roughness: .3, side: T.DoubleSide }), sm, false);
    addInst(K, g, sg.plate, vcMat(K, .4, true), sm, false);
    addInst(K, g, sg.glass, glassMat(K), sm, false, false);
    const deco = type === 'rtable' ? cached('centre', () => centreGeo(K))
      : type === 'itable' ? cached('runner' + m(L.L).toFixed(2), () => runnerGeo(K, m(L.L)))
      : cached(`head${f.w}x${f.d}x${s.table}x${s.n}`, () => headGeo(K, L, s, f));
    const y = type === 'headtable' ? 0 : TOP;
    const fl = addMesh(K, g, deco.flowers, vcMat(K, .68), false, true, y), fm = addMesh(K, g, deco.flames, flameMat(K), false, false, y);
    if (type === 'rtable') { const a = K.R() * TAU; fl.rotation.y = a; if (fm) fm.rotation.y = a; }
  }

  /* ======================= 3D: resto de las piezas ======================= */
  function sofa3d(P, w, d, n) {
    const a = Math.min(.17, w * .14), lh = .1, bd = Math.min(.2, d * .25), bz = -d / 2, cw = (w - 2 * a) / n, sd = d - bd - .02;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => P.lg.rod([sx * (w / 2 - .07), 0, sz * (d / 2 - .07)], [sx * (w / 2 - .07), lh + .005, sz * (d / 2 - .07)], .011, .016, 8));
    P.dk.rbox(w, .16, d, 0, lh, 0, .03);
    P.dk.rbox(w, .66, bd, 0, lh, bz + bd / 2, .06);
    [-1, 1].forEach(s => P.dk.rbox(a, .46, d, s * (w / 2 - a / 2), lh, 0, .07));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + a + cw / 2 + i * cw;
      P.up.rbox(cw - .012, .15, sd, x, lh + .16, bz + bd + sd / 2, .055, null, 0, 0, 0, 3);
      P.up.rbox(cw - .03, .42, .16, x, lh + .29, bz + bd + .08, .07, null, -.16, 0, 0, 3);
    }
    if (n > 1) [-1, 1].forEach(s => P.pw.rbox(.4, .4, .12, s * (w / 2 - a - .26), lh + .32, bz + bd + .22, .06, s < 0 ? '#ece3d4' : '#c9b49a', -.3, s * -.25, 0, 3));
    else P.pw.rbox(.38, .26, .1, 0, lh + .33, bz + bd + .2, .05, '#c9b49a', -.25, 0, 0, 3);
  }
  function rampGeo(T, t, h, len) {
    const s = new T.Shape(); s.moveTo(0, 0); s.lineTo(t, 0); s.lineTo(t, h); s.lineTo(0, .006); s.lineTo(0, 0);
    return new T.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }).translate(0, 0, -len / 2);
  }
  const bottlePts = (r, h) => [[r * .95, 0], [r, .01], [r, h * .62], [r * .8, h * .72], [r * .32, h * .8], [r * .3, h * .97], [r * .34, h], [0, h]];
  const BOTTLES = ['#3d6b47', '#7a4a22', '#d9e6e8', '#2a2a2a', '#9c2f2f', '#c9a24a', '#26466e', '#8a6a2a'];

  const B3 = {
    rtable: (g, f, K) => seated3d('rtable', g, f, K),
    itable: (g, f, K) => seated3d('itable', g, f, K),
    headtable: (g, f, K) => seated3d('headtable', g, f, K),

    cocktail(g, f, K) {
      const c = f.color || '#f4efe6', r = clamp(Math.min(K.M(f.w), K.M(f.d)) / 2 - .03, .2, .5), h = 1.1;
      const cv = GB(K), sa = GB(K), au = GB(K), wx = GB(K), fm = GB(K), halo = [];
      cv.lathe([[r * .9, 0], [r * .88, .015], [r * .6, .2], [.085, .6], [.07, .66], [.085, .72], [r * .6, .97], [r * .95, h - .03], [r, h - .012], [r * .97, h], [r * .7, h + .004], [0, h + .005]], 0, 0, 0, 48);
      sa.torus(.077, .016, 0, .66, 0, PI / 2, 0, 0, null, 32, 8);
      sa.sph(.05, .028, .016, -.045, .675, .088, null, 10, 0, 0, .35); sa.sph(.05, .028, .016, .045, .675, .088, null, 10, 0, 0, -.35); sa.sph(.018, .018, .016, 0, .67, .092);
      sa.box(.024, .2, .006, -.022, .46, .107, null, -.24, 0, .12); sa.box(.024, .19, .006, .022, .47, .107, null, -.24, 0, -.12);
      au.lathe([[0, 0], [.035, 0], [.04, .04], [.036, .045]], 0, h + .005, 0, 20);
      candle(wx, fm, 0, h + .01, 0, .028, .03, halo);
      const ms = emit(K, g, [[cv, K.mat(c, { roughness: .55 })], [sa, K.mat('#cdb06a', { roughness: .45 }), false], [au, goldMat(K), false], [wx, waxMat(K), false], [fm, flameMat(K), false, false, false]]);
      addHalo(K, g, halo, .55, ms[4], '#ffbe6a');
    },

    lounge(g, f, K) {
      const T = K.THREE, w = K.M(f.w), d = K.M(f.d), c = f.color || '#efe9df', ctx = {};
      const P = { up: GB(K, ctx), dk: GB(K, ctx), lg: GB(K, ctx), pw: GB(K, ctx) }, rug = GB(K), top = GB(K), R = K.R;
      const sw = Math.min(1.7, w * .64), sd = Math.min(.85, d * .42), sz = -d / 2 + .06 + sd / 2;
      const aw = Math.min(.78, w * .3, d * .4), az = Math.min(sz + sd / 2 + aw / 2 + .04, d / 2 - .06 - aw / 2), ax = w / 2 - .06 - aw / 2;
      withFrame(ctx, mtx(T, 0, 0, sz), () => sofa3d(P, sw, sd, 2));
      withFrame(ctx, mtx(T, -ax, 0, az, PI / 2), () => sofa3d(P, aw, aw, 1));
      withFrame(ctx, mtx(T, ax, 0, az, -PI / 2), () => sofa3d(P, aw, aw, 1));
      const ctw = Math.max(.3, Math.min(.9, 2 * ax - aw - .2)), cth = Math.min(.48, ctw * .6);
      top.at(new T.CylinderGeometry(.5, .5, .03, 48), 0, .415, az, 0, 0, 0, ctw, 1, cth);
      P.lg.torus(.5, .012, 0, .06, az, PI / 2, 0, 0, null, 48, 6, ctw * .8, cth * .8, 1);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => P.lg.rod([a * ctw * .28, .06, az + b * cth * .2], [a * ctw * .33, .4, az + b * cth * .28], .01, .01, 8));
      P.pw.lathe([[0, 0], [.05, 0], [.08, .05], [.085, .06]], ctw * .18, .43, az, 24, '#e9e3d8');
      dome(P.pw, ctw * .18, .47, az, .09, .06, .09, 11, florals(T, '#f3d6da'), R, .022, .034, 1.5, 4);
      rug.box(w - .08, .01, d - .08, 0, .002, 0, K.darker(c, .82)); rug.box(w - .3, .002, d - .3, 0, .012, 0, K.darker(c, .88));
      emit(K, g, [[P.up, K.fabric(c)], [P.dk, K.fabric(K.darker(c, .9))], [P.lg, goldMat(K, '#b8955a')], [P.pw, vcMat(K, .85), true, true],
        [top, K.mat('#f3f0eb', { roughness: .15 })], [rug, vcMat(K, 1), false, true]]);
    },

    dancefloor(g, f, K) {
      const T = K.THREE, w = K.M(f.w), d = K.M(f.d), c = f.color || '#f5f3ef', t = Math.min(.07, w * .02, d * .02), h = .05;
      const iw = w - 2 * t, id = d - 2 * t, nx = Math.max(1, Math.round(iw / 1.2)), nz = Math.max(1, Math.round(id / 1.2)), pw = iw / nx, pd = id / nz;
      const pn = GB(K), base = GB(K), tr = GB(K);
      base.box(iw, h - .012, id, 0, 0, 0);
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) pn.box(pw - .004, .012, pd - .004, -iw / 2 + pw * (i + .5), h - .012, -id / 2 + pd * (j + .5));
      tr.at(rampGeo(T, t, h, d), -w / 2, 0, 0); tr.at(rampGeo(T, t, h, d), w / 2, 0, 0, 0, PI, 0);
      tr.at(rampGeo(T, t, h, w), 0, 0, -d / 2, 0, -PI / 2, 0); tr.at(rampGeo(T, t, h, w), 0, 0, d / 2, 0, PI / 2, 0);
      emit(K, g, [[pn, K.mat(c, { roughness: .06, metalness: .05 }), false], [base, K.mat(K.darker(c, .55), { roughness: .8 }), false], [tr, K.mat('#c3c6ca', { metalness: .8, roughness: .32 }), false]]);
    },

    stage(g, f, K) {
      const T = K.THREE, w = K.M(f.w), d = K.M(f.d), c = f.color || '#3b3733', H0 = .6, ctx = {};
      const steps = d >= 1.6 && w >= 1.6, sd = steps ? d - .6 : d, pz = -d / 2 + sd / 2, front = pz + sd / 2;
      const dk = GB(K), tr = GB(K), sp = GB(K, ctx), gl = GB(K);
      dk.box(w - .02, .04, sd - .02, 0, H0 - .04, pz);
      if (steps) { const sw = Math.min(1.8, w * .3); dk.box(sw, .4, .3, 0, 0, front + .15); dk.box(sw, .2, .3, 0, 0, front + .45); gl.box(sw - .06, .006, .012, 0, .4, front + .292); gl.box(sw - .06, .006, .012, 0, .2, front + .592); }
      [[w + .02, .02, 0, sd / 2 + .005], [w + .02, .02, 0, -sd / 2 - .005]].forEach(([a, b, x, z]) => tr.box(a, .05, b, x, H0 - .05, pz + z));
      [-1, 1].forEach(s => tr.box(.02, .05, sd + .02, s * (w / 2 + .005), H0 - .05, pz));
      const sk = addMesh(K, g, cached(`skirt${w.toFixed(2)}x${sd.toFixed(2)}`, () => drapeGeo(T, rrectPts(w, sd, .02, .025), H0 - .045, { flare: 0, amp: .016, wave: .15, cap: false, skirt: true, rows: 3 })), K.mat(c, { roughness: .92 }));
      sk.position.z = pz;
      if (w >= 2.4 && sd >= 1.2) [-1, 1].forEach(s => withFrame(ctx, mtx(T, s * (w / 2 - .45), H0, front - .4, -s * .2), () => {
        sp.box(.48, .78, .42, 0, 0, 0, '#1c1c1e'); sp.box(.44, .74, .01, 0, .02, .21, '#2d2d30');
        sp.torus(.13, .014, 0, .26, .218, 0, 0, 0, '#4a4a4e', 32, 6); sp.torus(.055, .01, 0, .6, .218, 0, 0, 0, '#4a4a4e', 24, 6);
      }));
      emit(K, g, [[dk, K.mat(K.lighter(c, .06), { roughness: .7 })], [tr, K.mat(K.darker(c, .7), { roughness: .5 })], [sp, vcMat(K, .6), true, true], [gl, K.glowMat('#fffaf0', '#ffe2b0', .8), false, false, false]]);
    },

    dj(g, f, K) {
      const w = K.M(f.w), d = K.M(f.d), c = f.color || '#2b2b2d', bd = Math.min(.7, d * .7), zc = d / 2 - bd / 2, hh = .98, ex = w * .27;
      const body = GB(K), top = GB(K), eq = GB(K), led = GB(K);
      body.box(w - .04, .06, bd - .06, 0, 0, zc - .02, '#111');
      body.rbox(w, hh - .1, bd, 0, .06, zc, .015);
      body.box(w - .26, .04, .02, 0, .26, d / 2 + .005); body.box(w - .26, .04, .02, 0, .72, d / 2 + .005);
      top.box(w - .3, .42, .006, 0, .29, d / 2 + .002);
      [.29, .705].forEach(yy => led.box(w - .3, .008, .008, 0, yy, d / 2 + .006)); [-1, 1].forEach(sd => led.box(.008, .42, .008, sd * (w / 2 - .15), .29, d / 2 + .006));
      led.box(w - .04, .01, .012, 0, .062, d / 2 - .002);
      top.rbox(w + .04, .04, bd + .04, 0, hh - .04, zc, .012);
      const y = hh;
      [-1, 1].forEach(s => {
        eq.rbox(.32, .09, .38, s * ex, y, zc - .04, .02, '#1b1b1d');
        eq.cyl(.105, .105, .012, s * ex, y + .09, zc - .02, 32, '#c7c9cc'); eq.cyl(.03, .03, .006, s * ex, y + .102, zc - .02, 16, '#2b2b2d');
        eq.box(.14, .004, .05, s * ex, y + .09, zc - .19, '#4f8fd0');
      });
      eq.rbox(.3, .1, .38, 0, y, zc - .04, .02, '#202022');
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) eq.cyl(.011, .011, .012, -.09 + i * .06, y + .1, zc - .17 + j * .06, 8, j === 3 ? '#e2e2e5' : '#bfc1c4');
      eq.box(.25, .004, .012, 0, y + .1, zc + .1, '#8a8a8e');
      if (w > 1.4) { const lx = w / 2 - .22; eq.box(.06, .12, .2, lx, y, zc - .08, '#c9ccd0'); eq.box(.32, .012, .22, lx, y + .12, zc - .08, '#c9ccd0', -.2); eq.box(.32, .21, .008, lx, y + .17, zc - .2, '#c9ccd0', -.25); eq.box(.3, .19, .002, lx, y + .18, zc - .195, '#1d2a3a', -.25); }
      emit(K, g, [[body, K.mat(c, { roughness: .45 })], [top, K.mat('#151517', { roughness: .25 })], [eq, vcMat(K, .45), true, true], [led, K.glowMat('#e9e3ff', '#8b74ff', 1.4), false, false, false]]);
    },

    ledscreen(g, f, K) {
      const T = K.THREE, w = K.M(f.w), d = K.M(f.d), c = f.color || '#1d1d1f', pw = w - .06, ph = Math.min(pw * 9 / 16, 2.4);
      const y0 = Math.max(.5, Math.min(1.0, K.H - .35 - ph)), zf = -d / 2 + Math.min(.13, d * .35), zp = Math.max(-d / 2 + .03, zf - .1), fr = GB(K), st = GB(K);
      fr.rbox(pw + .04, ph + .04, .08, 0, y0 - .02, zf - .04, .01);
      [-1, 1].forEach(s => {
        const x = s * pw * .3;
        st.box(.055, y0 + ph * .55, .055, x, 0, zp); st.box(.09, .04, d - .04, x, 0, 0);
        st.rod([x, .04, d / 2 - .08], [x, .5, zp], .012, .012, 8);
      });
      st.box(pw * .6, .05, .05, 0, .35, zp);
      emit(K, g, [[fr, K.mat(c, { roughness: .4 })], [st, blackMat(K)]]);
      const scr = new T.Mesh(new T.PlaneGeometry(pw, ph), ledMaterial(T));
      scr.position.set(0, y0 + ph / 2, zf + .002); g.add(scr);
    },

    bar(g, f, K) {
      const w = K.M(f.w), d = K.M(f.d), c = f.color || '#e9e5de', cd = Math.min(.62, d * .62), zc = d / 2 - cd / 2, bb = Math.min(.26, d * .26), zb = -d / 2 + bb / 2, R = K.R;
      const pl = GB(K), body = GB(K), top = GB(K), led = GB(K), cab = GB(K), bt = GB(K), gl = GB(K), st = GB(K);
      pl.box(w - .06, .1, cd - .1, 0, 0, zc - .03);
      body.box(w - .02, .9, cd - .06, 0, .1, zc - .03);
      for (let x = -w / 2 + .06; x < w / 2 - .04; x += .08) body.cyl(.018, .018, .86, x, .12, d / 2 - .06, 10);
      led.box(w - .1, .008, .01, 0, .995, d / 2 - .005);
      top.rbox(w + .04, .05, cd + .08, 0, 1.0, zc + .02, .012);
      cab.box(w - .2, .9, bb, 0, 0, zb); cab.box(w - .3, .02, .14, 0, 1.17, zb - .04);
      [-1, 0, 1].forEach(s => st.rod([s * (w / 2 - .2), .9, zb - .04], [s * (w / 2 - .2), 1.17, zb - .04], .008, .008, 8));
      for (let x = -w / 2 + .2; x < w / 2 - .18; x += .1 + R() * .03) { const h = .26 + R() * .08; bt.lathe(bottlePts(.035, h), x, .9, zb + .03, 12, pick(R, BOTTLES)); }
      for (let x = -w / 2 + .25; x < w / 2 - .25; x += .14 + R() * .05) { const h = .22 + R() * .06; bt.lathe(bottlePts(.03, h), x, 1.19, zb - .04, 12, pick(R, BOTTLES)); }
      const gx = w / 2 - .2;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) gl.lathe([[.034, 0], [.035, .003], [.006, .008], [.0045, .1], [.028, .118], [.041, .16], [.04, .215]], gx - i * .1, 1.05, zc - .14 + j * .1, 14);
      st.cyl(.09, .075, .2, -w / 2 + .35, 1.05, zc - .05, 24); bt.lathe(bottlePts(.04, .34), -w / 2 + .35, 1.07, zc - .05, 12, '#2f4a36');
      emit(K, g, [[pl, K.mat('#2b2826', { roughness: .6 })], [body, K.mat(c, { roughness: .45 })], [top, K.mat('#f4f1ec', { roughness: .14 })],
        [led, K.glowMat('#fff7e6', '#ffd9a0', .9), false, false, false], [cab, K.mat(K.darker(c, .78), { roughness: .5 })],
        [bt, vcMat(K, .15), false, true], [gl, glassMat(K), false, false, false], [st, steelMat(K), false]]);
    },

    dessert(g, f, K) {
      const T = K.THREE, w = K.M(f.w), d = K.M(f.d), c = f.color || '#f6e8ec', L = w - .1, td = d - .1, z = -td * .08, R = K.R, y = TOP;
      const it = GB(K), au = GB(K), gl = GB(K);
      addMesh(K, g, rectCloth(T, L, td), clothMat(K, c));
      const cols = ['#f3c6cf', '#c8dfe8', '#f6e3a8', '#d9c4ec', '#fbd7b8', '#ffffff'];
      const stand = (x, r, h) => it.lathe([[r * .45, 0], [r * .4, .01], [.02, .03], [.018, h - .02], [.03, h - .008], [r, h], [r * .98, h + .01], [0, h + .012]], x, y, z, 28, '#fbfaf6');
      [-.42, -.28, -.14, 0, .14, .28, .42].forEach((k, i) => {
        const x = k * L, j = Math.min(i, 6 - i);
        if (j === 3) {
          au.cyl(.008, .008, .5, x, y, z, 8); au.cyl(.12, .14, .012, x, y, z, 32);
          [[.17, .05], [.13, .21], [.09, .36]].forEach(([r, h], q) => { au.cyl(r, r, .008, x, y + h, z, 32); for (let a = 0; a < TAU - .01; a += .55 / r * .1) it.sph(.02, .012, .02, x + Math.cos(a + q) * (r - .03), y + h + .02, z + Math.sin(a + q) * (r - .03), cols[(q + Math.round(a * 3)) % 5], 8); });
          dome(it, x, y + .52, z, .05, .04, .05, 7, TABLE_FLOWERS, R, .018, .026, 1.5, 2);
        } else if (j === 1) {
          gl.cyl(.065, .065, .22, x, y, z, 24); au.cyl(.068, .068, .025, x, y + .22, z, 24); au.sph(.018, .014, .018, x, y + .255, z, null, 8);
          it.cyl(.058, .058, .14, x, y + .005, z, 20, cols[i % 5]);
        } else {
          const r = j === 0 ? .16 : .13, h = j === 0 ? .2 : .12; stand(x, r, h);
          const n = j === 0 ? 7 : 5;
          for (let q = 0; q < n; q++) { const a = q / n * TAU, rr = q ? r * .62 : 0; if (!q && j === 0) continue; const cx = x + Math.cos(a) * rr, cz = z + Math.sin(a) * rr; it.cyl(.028, .022, .04, cx, y + h + .012, cz, 12, '#e9d7bf'); it.sph(.03, .025, .03, cx, y + h + .055, cz, cols[(q + i) % 5], 8); }
          if (j === 0) { it.cyl(.07, .07, .1, x, y + h + .012, z, 24, '#fffaf2'); it.cyl(.072, .072, .015, x, y + h + .1, z, 24, cols[(i + 1) % 5]); dome(it, x, y + h + .13, z, .04, .03, .04, 5, TABLE_FLOWERS, R, .015, .02); }
        }
      });
      emit(K, g, [[it, vcMat(K, .5), false, true], [au, goldMat(K), false], [gl, glassMat(K), false, false, false]]);
    },

    cake(g, f, K) {
      const T = K.THREE, m = Math.min(K.M(f.w), K.M(f.d)), r = Math.max(.25, m / 2 - .15), c = f.color || '#ffffff', R = K.R;
      const au = GB(K), ck = GB(K);
      addMesh(K, g, roundCloth(T, r, TOP, .08), clothMat(K, c));
      au.lathe([[.12, 0], [.1, .01], [.03, .03], [.025, .07], [.05, .09], [.2, .1], [.21, .11], [0, .112]], 0, TOP, 0, 40);
      let y = TOP + .112;
      const tiers = [[.17, .14], [.125, .13], [.085, .12]];
      tiers.forEach(([tr, th]) => { ck.cyl(tr, tr, th, 0, y, 0, 40, '#fffdf8'); ck.cyl(tr + .003, tr + .003, .02, 0, y, 0, 40, '#efd0d4'); y += th; });
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12, a = .5 + t * 2.4; let yy = y - t * (y - TOP - .13), tr = .09;
        let acc = TOP + .112; for (const [rr, th] of tiers) { if (yy >= acc && yy <= acc + th + .001) tr = rr; acc += th; }
        pts.push([Math.cos(a) * (tr + .012), yy, Math.sin(a) * (tr + .012)]);
      }
      trail(ck, pts, 26, TABLE_FLOWERS, R, .028, .022, .025);
      dome(ck, 0, y, 0, .06, .05, .06, 9, TABLE_FLOWERS, R, .02, .03, 1.3, 3);
      ck.cyl(.1, .1, .025, -r * .55, TOP, r * .35, 24, '#fbfaf6'); ck.box(.02, .004, .26, r * .5, TOP, r * .3, '#c4c8cd', 0, .4, 0);
      emit(K, g, [[au, goldMat(K)], [ck, vcMat(K, .5), true, true]]);
    },

    buffet(g, f, K) {
      const T = K.THREE, w = K.M(f.w), d = K.M(f.d), c = f.color || '#f4efe6', L = w - .1, td = Math.min(d - .1, .76), y = TOP;
      const stl = GB(K), it = GB(K);
      addMesh(K, g, rectCloth(T, L, td), clothMat(K, c));
      const n = Math.max(1, Math.floor((L - .3) / .7)), sp = (L - .3) / n;
      for (let i = 0; i < n; i++) {
        const x = -L / 2 + .15 + sp * (i + .5);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => stl.rod([x + a * .24, y, b * .14], [x + a * .24, y + .13, b * .15], .007, .007, 6));
        stl.box(.5, .012, .012, x, y + .03, .145); stl.box(.5, .012, .012, x, y + .03, -.145);
        stl.box(.52, .07, .32, x, y + .1, 0);
        stl.at(new T.CylinderGeometry(.16, .16, .5, 16, 1, false, 0, PI), x, y + .17, 0, 0, 0, PI / 2, .65, 1, 1);
        stl.sph(.025, .015, .025, x, y + .17 + .16 * .65 + .01, 0, null, 10);
        [-.12, .12].forEach(dx => it.cyl(.03, .03, .05, x + dx, y, 0, 12, '#2d3a4a'));
      }
      for (let k = 0; k < 8; k++) it.cyl(.12, .12, .012, -L / 2 + .1, y + k * .013, td * .18, 28, '#fbfaf6');
      it.box(.18, .05, .18, L / 2 - .12, y, td * .18, '#eadfcd');
      emit(K, g, [[stl, steelMat(K)], [it, vcMat(K, .4), false, true]]);
    },

    coffee(g, f, K) {
      const w = K.M(f.w), d = K.M(f.d), c = f.color || '#e9e5de', hh = .9;
      const body = GB(K), wood = GB(K), stl = GB(K), blk = GB(K), it = GB(K);
      body.box(w - .04, .08, d - .1, 0, 0, -.03, null); body.box(w, hh - .08, d - .04, 0, .08, -.02);
      for (let x = -w / 2 + .15; x < w / 2 - .1; x += .3) body.box(.006, .6, .006, x, .18, d / 2 - .02);
      wood.rbox(w + .03, .035, d + .02, 0, hh - .005, 0, .01);
      const top = hh + .03, mx = -w * .26;
      stl.rbox(.5, .36, .42, mx, top, -.08, .03); blk.box(.48, .04, .4, mx, top + .36, -.08);
      [-.1, .1].forEach(dx => { stl.cyl(.03, .035, .05, mx + dx, top + .2, .14, 16); blk.box(.025, .02, .14, mx + dx, top + .19, .2); it.cyl(.035, .028, .06, mx + dx, top + .03, .15, 14, '#ffffff'); });
      blk.box(.44, .02, .12, mx, top, .16);
      for (let i = 0; i < 4; i++) it.cyl(.035, .028, .06, mx - .15 + i * .1, top + .4, -.08, 14, '#ffffff');
      const gx = w * .02; blk.box(.18, .32, .2, gx, top, -.1); stl.cyl(.05, .05, .06, gx, top + .32, -.1, 16); it.lathe([[.03, 0], [.09, .14], [.085, .15]], gx, top + .38, -.1, 16, '#5a3a24');
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const x = w * .16 + i * .1, z = -.05 + j * .16; it.cyl(.06, .06, .008, x, top, z, 18, '#ffffff'); it.cyl(.04, .032, .07, x, top + .008, z, 14, '#ffffff'); }
      [-.13, .13].forEach(dz => { const x = w / 2 - .17; stl.cyl(.1, .1, .4, x, top + .06, dz, 24); stl.cyl(.08, .1, .06, x, top + .46, dz, 24); blk.box(.03, .03, .04, x, top + .1, dz + .11); [-1, 1].forEach(s => stl.rod([x + s * .07, top, dz], [x + s * .07, top + .07, dz], .01, .01, 6)); });
      emit(K, g, [[body, K.mat(c, { roughness: .5 })], [wood, K.woodM('#9a7350')], [stl, steelMat(K)], [blk, blackMat(K)], [it, vcMat(K, .3), false, true]]);
    },

    candelabra(g, f, K) {
      const c = f.color || '#d8b45a', s = clamp(Math.min(K.M(f.w), K.M(f.d)) / .6, .6, 1.4), R = K.R, halo = [];
      const au = GB(K), wx = GB(K), fm = GB(K), fl = GB(K);
      au.lathe([[.17, 0], [.17, .015], [.14, .03], [.09, .06], [.05, .1], [.035, .13]].map(([r, h]) => [r * s, h]), 0, 0, 0, 40);
      au.lathe([[.035, 0], [.03, .04], [.045, .1], [.05, .13], [.03, .18], [.022, .5], [.034, .56], [.05, .6], [.034, .64], [.02, .68], [.02, 1.0], [.045, 1.06], [.05, 1.1], [.03, 1.14], [.03, 1.18]], 0, .12, 0, 24);
      const cup = (x, y, z, h) => { au.lathe([[0, 0], [.03, 0], [.05, .025], [.052, .032], [.04, .03], [.03, .02]], x, y - .035, z, 20); candle(wx, fm, x, y - .012, z, .021, h, halo); };
      const top = 1.3, armY = 1.22, R0 = .27 * s, cupY = 1.47;
      for (let k = 0; k < 4; k++) {
        const a = (k + .5) / 4 * TAU, ca = Math.cos(a), sa = Math.sin(a);
        au.tube([[ca * .02, armY, sa * .02], [ca * R0 * .45, armY - .07, sa * R0 * .45], [ca * R0 * .9, armY + .02, sa * R0 * .9], [ca * R0, cupY - .035, sa * R0]], .012, null, 20, 6);
        cup(ca * R0, cupY, sa * R0, .2 + (k % 2) * .03);
      }
      au.lathe([[.03, 0], [.02, .1], [.04, .2], [.03, .25]], 0, top, 0, 20);
      cup(0, top + .285, 0, .26);
      const pal = florals(K.THREE, '#f3d6da');
      for (let i = 0; i < 20; i++) { const a = i / 20 * TAU + R() * .2, q = .08 + R() * .03, sz = .028 + R() * .016; fl.bloom(sz, Math.cos(a) * q, armY + .02 + (R() - .5) * .05, Math.sin(a) * q, pick(R, pal), Math.cos(a), .6 + R() * .5, Math.sin(a)); }
      for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + .3; trail(fl, [[Math.cos(a) * .1, armY, Math.sin(a) * .1], [Math.cos(a) * .15, armY - .15, Math.sin(a) * .15], [Math.cos(a) * .16, armY - .32, Math.sin(a) * .16]], 7, pal, R, .022, .014, .03); }
      const ms = emit(K, g, [[au, goldMat(K, c)], [wx, waxMat(K), false], [fm, flameMat(K), false, false, false], [fl, vcMat(K, .7), false, true]]);
      addHalo(K, g, halo, .8, ms[2], '#ffbe6a');
    },

    flowerstand(g, f, K) {
      const T = K.THREE, c = f.color || '#f1e3e6', s = clamp(Math.min(K.M(f.w), K.M(f.d)) / .6, .6, 1.5), R = K.R, pal = florals(T, c);
      const pd = GB(K), au = GB(K), fl = GB(K);
      pd.box(.36 * s, .05, .36 * s, 0, 0, 0); pd.box(.3 * s, .04, .3 * s, 0, .05, 0);
      pd.lathe([[.13, 0], [.13, .02], [.11, .04], [.1, .07], [.085, .8], [.1, .83], [.12, .86], [.13, .9]].map(([r, h]) => [r * s, h]), 0, .09, 0, 20);
      pd.box(.32 * s, .05, .32 * s, 0, .99, 0);
      au.lathe([[.05, 0], [.06, .01], [.035, .04], [.04, .07], [.11, .13], [.13, .16], [.12, .165]].map(([r, h]) => [r * s, h * s]), 0, 1.04, 0, 28);
      const cy = 1.04 + .17 * s;
      dome(fl, 0, cy, 0, .22 * s, .16 * s, .22 * s, 48, pal, R, .035 * s, .06 * s, 1.75, 14);
      trail(fl, [[.16 * s, cy, .1 * s], [.24 * s, cy - .2, .16 * s], [.26 * s, cy - .45, .18 * s]], 16, pal, R, .045 * s, .025 * s, .05);
      trail(fl, [[-.15 * s, cy - .02, -.12 * s], [-.2 * s, cy - .18, -.18 * s]], 8, pal, R, .04 * s, .028 * s, .05);
      emit(K, g, [[pd, K.mat('#f6f3ee', { roughness: .45 })], [au, goldMat(K)], [fl, vcMat(K, .7), true, true]]);
    },

    arch(g, f, K) {
      const T = K.THREE, w = K.M(f.w), d = K.M(f.d), c = f.color || '#f1e3e6', R = K.R, pal = florals(T, c), a = w / 2 - .15, hp = Math.max(.6, Math.min(2.4, K.H - .3) - a);
      const fr = GB(K), bs = GB(K), fl = GB(K);
      const P = t => {   // t: 0..1 a lo largo del arco (poste izq → arco → poste der)
        const L1 = hp, L2 = PI * a, tot = 2 * L1 + L2, u = t * tot;
        if (u <= L1) return [-a, u, 0];
        if (u <= L1 + L2) { const q = PI - (u - L1) / a; return [Math.cos(q) * a, hp + Math.sin(q) * a, 0]; }
        return [a, hp - (u - L1 - L2), 0];
      };
      const path = []; for (let i = 0; i <= 48; i++) path.push(P(i / 48));
      fr.tube(path, .02, null, 120, 8);
      [-1, 1].forEach(s => { bs.box(.3, .05, Math.min(.5, d - .06), s * a, 0, 0); bs.cyl(.04, .04, .1, s * a, .05, 0, 16); });
      const bloom = (t0, t1, n, big) => {
        for (let i = 0; i < n; i++) {
          const u = (R() + R()) / 2, p = P(t0 + (t1 - t0) * u), k = 1 - Math.abs(u - .5) * 1.4, sz = (big ? .05 : .04) + R() * .045 * k;
          const o = [(R() - .5) * .26 * k, (R() - .5) * .26 * k, (R() - .5) * .3 * k];
          if (R() < .32) leaf(fl, p[0] + o[0], p[1] + o[1], p[2] + o[2], .12 + R() * .09, R() * TAU, (R() - .5) * 1.2, pick(R, GREENS));
          else fl.bloom(sz, p[0] + o[0], p[1] + o[1], p[2] + o[2], pick(R, pal), o[0] * 6 + (R() - .5) * .6, o[1] * 6 + (R() - .5) * .6, (o[2] < 0 ? -1 : 1) * (.6 + R()));
        }
      };
      bloom(.18, .52, 300, true); bloom(.75, .9, 90, false);
      for (let k = 0; k < 4; k++) { const p = P(.36 + k * .03); trail(fl, [p, [p[0] + .02, p[1] - .3, p[2] + .05], [p[0] + .03, p[1] - .6 - R() * .2, p[2] + .06]], 9, pal, R, .022, .014, .03); }
      emit(K, g, [[fr, goldMat(K, '#c8a961')], [bs, K.mat('#f1ece3', { roughness: .5 })], [fl, vcMat(K, .7), true, true]]);
    },

    throne(g, f, K) {
      const T = K.THREE, w = K.M(f.w), d = K.M(f.d), c = f.color || '#e8d2dc', dh = .12, ctx = {};
      const ds = GB(K), au = GB(K, ctx), up = GB(K, ctx), tf = GB(K, ctx);
      ds.at(new T.CylinderGeometry(1, 1, dh, 64), 0, dh / 2, 0, 0, 0, 0, w / 2 - .02, 1, d / 2 - .02);
      au.torus(1, .012, 0, dh - .004, 0, PI / 2, 0, 0, null, 72, 6, w / 2 - .02, d / 2 - .02, 1);
      const tw = Math.min(.9, w * .66), tdp = Math.min(.72, d * .6), z0 = -d * .06, y0 = dh;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => au.lathe([[.03, 0], [.022, .03], [.036, .08], [.02, .15], [.034, .2]], sx * (tw / 2 - .07), y0, z0 + sz * (tdp / 2 - .07), 12));
      au.rbox(tw, .14, tdp, 0, y0 + .2, z0, .03);
      up.rbox(tw - .1, .12, tdp - .06, 0, y0 + .33, z0 + .02, .05, null, 0, 0, 0, 3);
      [-1, 1].forEach(s => {
        const x = s * (tw / 2 - .035), zf = z0 + tdp / 2;
        up.rbox(.1, .07, tdp * .7, x, y0 + .58, z0 - .02, .035, null, 0, 0, 0, 3);
        au.tube([[x, y0 + .34, zf - .05], [x, y0 + .46, zf - .02], [x, y0 + .58, zf - .1]], .024, null, 16, 8);
        au.sph(.035, .035, .035, x, y0 + .6, zf - .1, null, 10);
      });
      const bw = tw - .08, bh = 1.25, shp = new T.Shape();
      shp.moveTo(-bw / 2, 0); shp.lineTo(-bw / 2, bh * .7); shp.bezierCurveTo(-bw / 2, bh * .9, -bw * .2, bh * .9, 0, bh);
      shp.bezierCurveTo(bw * .2, bh * .9, bw / 2, bh * .9, bw / 2, bh * .7); shp.lineTo(bw / 2, 0); shp.lineTo(-bw / 2, 0);
      withFrame(ctx, mtx(T, 0, y0 + .33, z0 - tdp / 2 + .06, 0, 1, -.1), () => {
        up.at(new T.ExtrudeGeometry(shp, { depth: .1, bevelEnabled: true, bevelThickness: .03, bevelSize: .025, bevelSegments: 3, curveSegments: 20 }), 0, 0, -.05);
        const pts = shp.getPoints(24).map(p => [p.x * 1.07, (p.y - bh * .5) * 1.04 + bh * .5, .075]);
        au.tube(pts, .02, null, 96, 6, false);
        [[-.2, .2], [-.2, .45], [-.2, .7], [.2, .2], [.2, .45], [.2, .7], [0, .32], [0, .57], [0, .82], [0, 1.04]].forEach(([x, y]) => tf.sph(.017, .017, .01, x, y, .083, null, 8));
        au.sph(.05, .045, .03, 0, bh + .06, .02, null, 12); au.torus(.055, .012, 0, bh + .13, .02, 0, 0, 0, null, 24, 6); au.sph(.02, .02, .02, 0, bh + .2, .02, null, 8);
      });
      emit(K, g, [[ds, K.mat('#f7f3ec', { roughness: .45 })], [au, goldMat(K)], [up, K.mat(c, { roughness: .85 })], [tf, K.mat(K.darker(c, .72), { roughness: .6 }), false]]);
    },

    letters(g, f, K) {
      const T = K.THREE, w = K.M(f.w), d = K.M(f.d), c = f.color || '#f6e3a1', gap = .07;
      const tot = GLYPHS.order.reduce((a, ch) => a + GLYPHS[ch].w, 0) + gap * 3, s = Math.min(1.25, (w - .06) / tot), dep = Math.min(.2, d * .45);
      const body = GB(K), bl = GB(K), halo = [], bz = dep / 2 + .008 + .012;
      let x = -tot * s / 2;
      GLYPHS.order.forEach(ch => {
        body.at(new T.ExtrudeGeometry(glyphShape(T, ch, s), { depth: dep, bevelEnabled: true, bevelThickness: .008, bevelSize: .006, bevelSegments: 1, curveSegments: 18 }), x, .006, -dep / 2);
        glyphBulbs(ch, .11 / s).forEach(([u, v]) => { const p = [x + u * s, .006 + v * s, bz]; bl.sph(.02, .02, .02, p[0], p[1], p[2], null, 8); halo.push(p); });
        x += GLYPHS[ch].w * s + gap * s;
      });
      const ms = emit(K, g, [[body, K.mat(c, { metalness: .35, roughness: .35 })], [bl, K.glowMat('#fffaf0', '#ffd27a', 1.1), false, false, false]]);
      addHalo(K, g, halo, .3, ms[1]);
    },

    booth(g, f, K) {
      const T = K.THREE, w = K.M(f.w), d = K.M(f.d), c = f.color || '#e6e9f4', R = K.R, bw = w - .2, bh = Math.min(2.3, K.H - .3), bz = -d / 2 + .2, zc = d / 2 - .45;
      const wall = GB(K), mt = GB(K), bal = GB(K), pk = GB(K), wl = GB(K);
      wall.box(bw, bh - .05, .06, 0, .05, bz);
      [-1, 1].forEach(s => { mt.box(.05, bh, .05, s * (bw / 2 + .025), 0, bz - .01); mt.box(.06, .03, .6, s * (bw / 2 + .025), 0, bz); });
      mt.box(bw + .1, .05, .05, 0, bh, bz - .01);
      const heart = []; for (let i = 0; i <= 64; i++) { const t = i / 64 * TAU; heart.push([bw * .16 + .012 * 16 * Math.pow(Math.sin(t), 3), 1.45 + .012 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)), bz + .045]); }
      pk.tube(heart, .009, null, 128, 6, true);
      const pal = ['#ffffff', c, '#f2c9d2', '#d9bf7a', K.lighter(c, .5), '#e8a9b8'];
      for (let i = 0; i < 46; i++) {
        const t = Math.pow(R(), .8), u = t * (bh * .85 + bw * .45), r = .08 + R() * .09 * (1 - t * .5);
        const p = u < bh * .85 ? [-bw / 2 + .05, .25 + u, bz + .08] : [-bw / 2 + .05 + (u - bh * .85), bh - .02, bz + .08];
        bal.sph(r, r * 1.08, r, p[0] + (R() - .5) * .2, p[1] + (R() - .5) * .2, p[2] + R() * .12, pick(R, pal), 14);
      }
      [90, 210, 330].forEach(a => { const q = a * PI / 180; mt.rod([0, 1.12, zc], [Math.cos(q) * .32, 0, zc + Math.sin(q) * .32], .01, .008, 6); });
      mt.rod([0, 1.1, zc], [0, 1.2, zc], .012, .012, 8); mt.box(.15, .1, .09, 0, 1.2, zc);
      mt.at(new T.CylinderGeometry(.035, .04, .08, 16), 0, 1.25, zc - .08, PI / 2, 0, 0);
      wl.torus(.2, .016, 0, 1.25, zc - .03, 0, 0, 0, null, 48, 8);
      emit(K, g, [[wall, K.mat(K.lighter(c, .25), { roughness: .38, metalness: .12 })], [mt, blackMat(K)], [bal, vcMat(K, .25), true, true],
        [pk, K.glowMat('#ffe4ef', '#ff6fa6', 1.3), false, false, false], [wl, K.glowMat('#ffffff', '#fff6e8', 1.1), false, false, false]]);
    },

    platform360(g, f, K) {
      const m = Math.min(K.M(f.w), K.M(f.d)), r = m / 2 - .1, c = f.color || '#2b2b2d', a = PI / 4, ax = Math.cos(a), az = Math.sin(a), R2 = m / 2 - .04;
      const bs = GB(K), tp = GB(K), mt = GB(K), gl = GB(K);
      bs.cyl(r, r + .01, .1, 0, 0, 0, 48);
      tp.cyl(r - .02, r - .02, .015, 0, .1, 0, 48);
      gl.torus(r - .004, .008, 0, .096, 0, PI / 2, 0, 0, null, 72, 6);
      mt.rod([0, .045, 0], [ax * R2, .045, az * R2], .018, .018, 8, null, false);
      mt.cyl(.07, .08, .03, ax * R2, 0, az * R2, 20);
      const ry = Math.atan2(-ax, -az), hx = ax * (R2 - .12), hz = az * (R2 - .12);
      mt.tube([[ax * R2, .03, az * R2], [ax * R2, 1.1, az * R2], [ax * (R2 - .03), 1.32, az * (R2 - .03)], [hx, 1.4, hz]], .016, null, 24, 8);
      mt.box(.08, .15, .012, hx, 1.33, hz, null, 0, ry, 0);
      gl.torus(.09, .01, hx - ax * .01, 1.405, hz - az * .01, 0, ry, 0, null, 32, 6);
      emit(K, g, [[bs, K.mat(c, { roughness: .4 })], [tp, K.mat('#f3f3f5', { roughness: .12 })], [mt, blackMat(K)], [gl, K.glowMat('#efe9ff', '#9d8cff', 1.2), false, false, false]]);
    },
  };

  // Pantalla LED: degradado con destellos suaves (textura emisiva, una sola para todas)
  let ledMat = null;
  function ledMaterial(T) {
    if (ledMat) return ledMat;
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 288;
    const x = cv.getContext('2d'), R = rand(5), gr = x.createLinearGradient(0, 0, 512, 288);
    gr.addColorStop(0, '#24184a'); gr.addColorStop(.55, '#7a2f6b'); gr.addColorStop(1, '#e0975a');
    x.fillStyle = gr; x.fillRect(0, 0, 512, 288);
    for (let i = 0; i < 46; i++) {
      const px = R() * 512, py = R() * 288, r = 4 + R() * 26, b = x.createRadialGradient(px, py, 0, px, py, r);
      b.addColorStop(0, `rgba(255,${200 + (R() * 55 | 0)},${170 + (R() * 60 | 0)},${.25 + R() * .35})`); b.addColorStop(1, 'rgba(255,220,200,0)');
      x.fillStyle = b; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
    }
    x.strokeStyle = 'rgba(255,240,230,.85)'; x.lineWidth = 5; x.beginPath();
    for (let i = 0; i <= 80; i++) { const t = i / 80 * TAU, hx = 256 + 4.2 * 16 * Math.pow(Math.sin(t), 3), hy = 140 - 4.2 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); if (i) x.lineTo(hx, hy); else x.moveTo(hx, hy); }
    x.stroke();
    x.fillStyle = 'rgba(0,0,0,.18)'; for (let yy = 0; yy < 288; yy += 4) x.fillRect(0, yy, 512, 1);
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
    ledMat = new T.MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: .9, roughness: .3 });
    return ledMat;
  }

  window.__EXT_MODELS__ = {
    nolabel: ['candelabra', 'flowerstand', 'cocktail', 'letters', 'plant'],
    svg: SVG,
    build3d: B3,
  };
})();
