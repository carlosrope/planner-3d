// Captura de la portada automática de un lugar. Corre dentro de un iframe oculto
// (/lugares/[slug]/3d?r=token&captura=1) que abre src/components/PortadaAuto.tsx: toma la vista 3D de
// conjunto (la misma con la que entra el 3D) y el plano 2D cenital, las deja en JPEG de 1200×900 y se
// las manda a la página que abrió el iframe con postMessage; esa página las guarda en
// /api/lugares/[id]/portada. Solo corre con window.__CAPTURA__. Nada se guarda desde aquí.
(function () {
  if (!window.__CAPTURA__) return;
  const W = 1200, H = 900, BG = '#f7f4ee', TYPE = 'plantea:portada';
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const loadImage = src => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => fail(new Error('No se pudo leer la imagen')); i.src = src; });

  /** Encaja la imagen en 1200×900: la 3D llena el cuadro (cover); el plano 2D cabe completo con margen. */
  function toJpeg(img, cover) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = BG; g.fillRect(0, 0, W, H);
    const k = cover ? Math.max(W / img.width, H / img.height) : Math.min((W - 80) / img.width, (H - 80) / img.height);
    g.drawImage(img, (W - img.width * k) / 2, (H - img.height * k) / 2, img.width * k, img.height * k);
    // WhatsApp a veces no muestra vistas previas de más de ~300 KB: se baja la calidad hasta que quepa.
    let q = 0.86, out = cv.toDataURL('image/jpeg', q);
    while (out.length > 380_000 && q > 0.5) out = cv.toDataURL('image/jpeg', (q -= 0.1));
    return out;
  }

  /** Plano 2D cenital: el SVG del diseñador, sin selección ni cuadrícula. */
  async function plano2D() {
    const plan = document.getElementById('plan');
    if (!plan || typeof BOUNDS === 'undefined') return null;
    const clone = plan.cloneNode(true);
    clone.setAttribute('viewBox', `${BOUNDS.x} ${BOUNDS.y} ${BOUNDS.w} ${BOUNDS.h}`);
    clone.setAttribute('width', Math.round(BOUNDS.w / 8)); clone.setAttribute('height', Math.round(BOUNDS.h / 8));
    const sel = clone.querySelector('#gSel'); if (sel) sel.innerHTML = '';
    const grid = clone.querySelector('#gGrid'); if (grid) grid.innerHTML = '';
    const img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone)));
    return toJpeg(img, false);
  }

  /** Vista 3D de conjunto: entra al 3D (termina en la isométrica de toda la planta) y toma el cuadro. */
  async function vista3D() {
    if (typeof setView !== 'function') return null;
    for (let i = 0; i < 50 && !window.View3D; i++) await wait(200);   // three.js carga desde la red
    if (!window.View3D || !window.View3D.snap) return null;
    await setView('3d');
    await wait(500);
    const img = await loadImage(window.View3D.snap());
    return toJpeg(img, true);
  }

  function send(msg) { (window.parent !== window ? window.parent : window).postMessage(Object.assign({ type: TYPE }, msg), location.origin); }

  async function run() {
    try {
      for (let i = 0; i < 50 && !(document.getElementById('plan') && document.getElementById('plan').children.length); i++) await wait(200);
      const images = [];
      const p2 = await plano2D(); if (p2) images.push({ name: 'plano-2d.jpg', data: p2 });
      let p3 = null;
      try { p3 = await vista3D(); } catch { /* sin WebGL: queda el plano 2D */ }
      if (p3) images.unshift({ name: 'vista-3d.jpg', data: p3 });   // primero la 3D: es la portada
      send({ ok: images.length > 0, images, error: images.length ? null : 'El diseñador no terminó de cargar.' });
    } catch (e) {
      send({ ok: false, images: [], error: String((e && e.message) || e) });
    }
  }
  if (document.readyState === 'complete') run(); else window.addEventListener('load', run);
})();
