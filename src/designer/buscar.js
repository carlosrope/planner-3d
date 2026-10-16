// Búsqueda en el catálogo del diseñador: una píldora arriba de las piezas que filtra al escribir (sin importar
// acentos ni mayúsculas). Si no hay nada, ofrece mandar la sugerencia a Plantea (POST /api/sugerencias), con unas
// preguntas de opción y sin pedir datos a la persona.
(function () {
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const css = document.createElement('style');
  css.textContent = `
  .pl-buscar{position:sticky;top:0;z-index:2;padding:8px 10px;background:var(--panel,#fbf8f4)}
  @media (min-width:1101px){.pl-buscar{top:47px}}
  .pl-buscar label{display:flex;align-items:center;gap:8px;height:40px;padding:0 12px;border:1px solid #d6d3d1;border-radius:999px;background:#fff}
  .pl-buscar label:focus-within{border-color:#b5653a;box-shadow:0 0 0 3px #f3e3d6}
  .pl-buscar input{flex:1;min-width:0;border:0;outline:0;font:15px 'DM Sans',system-ui,sans-serif;background:transparent}
  .pl-buscar .x{border:0;background:#e7e5e4;color:#57534e;width:22px;height:22px;border-radius:50%;cursor:pointer;line-height:1}
  .pl-vacio{margin:14px 12px;padding:14px;border:1px dashed #d6c7b8;border-radius:14px;text-align:center;color:#57534e;font:14px/1.45 'DM Sans',system-ui,sans-serif}
  .pl-vacio button{margin-top:10px;border:0;background:#b5653a;color:#fff;font-weight:600;border-radius:12px;padding:10px 14px;cursor:pointer}
  .pl-sug .chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px}
  .pl-dlg.pl-sug .chips button{flex:none;min-height:0;height:auto;border:1px solid #d6d3d1;background:#fff;border-radius:999px;padding:7px 12px;font:600 13px/1.2 'DM Sans',sans-serif;cursor:pointer;color:#1c1917}
  .pl-dlg.pl-sug .chips button.on{background:#b5653a;border-color:#b5653a;color:#fff}
  .pl-sug h5{margin:14px 0 2px;font:700 13px 'DM Sans',sans-serif}
  .pl-sug .q{margin:0 0 4px;padding:10px 12px;border-radius:12px;background:#faf7f2;font-weight:600}`;
  document.head.appendChild(css);

  let term = '';
  function filter() {
    const lib = document.getElementById('lib');
    if (!lib) return;
    const q = norm(term);
    let total = 0;
    lib.querySelectorAll('.lib-grid').forEach(grid => {
      const cat = norm(grid.previousElementSibling?.textContent);
      let shown = 0;
      grid.querySelectorAll('.item').forEach(it => {
        const ok = !q || norm(it.querySelector('b')?.textContent).includes(q) || cat.includes(q);
        it.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });
      grid.style.display = shown ? '' : 'none';
      if (grid.previousElementSibling?.tagName === 'H4') grid.previousElementSibling.style.display = shown ? '' : 'none';
      total += shown;
    });
    lib.querySelectorAll(':scope > .hint').forEach(h => { h.style.display = q ? 'none' : ''; });
    let empty = lib.querySelector('.pl-vacio');
    if (q && !total) {
      if (!empty) { empty = document.createElement('div'); empty.className = 'pl-vacio'; lib.prepend(empty); }
      empty.innerHTML = `No encontramos “${escape(term)}” en el catálogo.<br><b>¿No encontraste lo que buscabas?</b> Mándanos un mensaje y con gusto lo añadimos.
        <br><button type="button">Mandar sugerencia</button>`;
      empty.querySelector('button').onclick = () => suggest(term);
    } else if (empty) empty.remove();
  }
  const escape = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function suggest(text) {
    const CATS = ['Mueble', 'Decoración', 'Servicio o show', 'Equipo (audio, luz, pantallas)', 'Otro'];
    const USOS = ['Boda', 'XV años', 'Fiesta infantil', 'Empresa o conferencia', 'Casa', 'Otro'];
    const kindSel = document.getElementById('xKind');
    const tipoEvento = kindSel ? kindSel.options[kindSel.selectedIndex]?.text || '' : '';
    let cat = 'Otro', uso = '';
    const back = document.createElement('div');
    back.className = 'pl-dlg-back';
    back.innerHTML = `<div class="pl-dlg pl-sug" role="dialog" aria-modal="true" aria-label="Sugerir para el catálogo">
      <div class="pl-mark"><span class="pl-dot" aria-hidden="true"></span>Plantea</div>
      <p>Lo agregamos al catálogo para todos. Solo dinos dos cosas; no te pedimos datos.</p>
      <h5>Buscaste</h5><p class="q">${escape(text)}</p>
      <h5>¿Qué es?</h5><div class="chips" data-g="cat">${CATS.map(c => `<button type="button" data-v="${c}" class="${c === cat ? 'on' : ''}">${c}</button>`).join('')}</div>
      <h5>¿Para qué lo usarías? <small style="font-weight:400;color:#78716c">(opcional)</small></h5><div class="chips" data-g="uso">${USOS.map(u => `<button type="button" data-v="${u}">${u}</button>`).join('')}</div>
      <div class="pl-acts"><button type="button" class="pl-cancel">Cancelar</button><button type="button" class="pl-ok">Enviar sugerencia</button></div></div>`;
    window.plDialogStyle?.();
    document.body.appendChild(back);
    back.querySelectorAll('[data-g] button').forEach(b => b.onclick = () => {
      const g = b.parentElement.dataset.g;
      b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b && !(g === 'uso' && uso === b.dataset.v)));
      if (g === 'cat') cat = b.dataset.v; else uso = uso === b.dataset.v ? '' : b.dataset.v;
    });
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('.pl-cancel').onclick = close;
    back.querySelector('.pl-ok').onclick = async () => {
      const ok = back.querySelector('.pl-ok');
      ok.disabled = true; ok.textContent = 'Enviando…';
      try {
        const r = await fetch('/api/sugerencias', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ termino: text, categoria: cat, uso, tipoEvento, lugar: (window.__CASA__ && window.__CASA__.title) || '', pagina: location.pathname }),
        });
        const data = await r.json().catch(() => ({}));
        close();
        await window.plAlert?.(r.ok ? '¡Gracias! Ya nos llegó tu sugerencia; la revisamos para agregarla al catálogo.' : (data.error || 'No se pudo enviar.'));
      } catch { close(); await window.plAlert?.('No se pudo enviar. Revisa tu conexión.'); }
    };
    back.querySelector('.pl-ok').focus();
  }

  function mount() {
    const lib = document.getElementById('lib');
    if (!lib || document.querySelector('.pl-buscar')) return;
    const box = document.createElement('div');
    box.className = 'pl-buscar';
    box.innerHTML = `<label><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#78716c" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input type="search" placeholder="Buscar en el catálogo" aria-label="Buscar en el catálogo" autocomplete="off"><button type="button" class="x" aria-label="Borrar búsqueda" hidden>×</button></label>`;
    lib.before(box);
    const input = box.querySelector('input'), x = box.querySelector('.x');
    input.addEventListener('input', () => { term = input.value; x.hidden = !term; filter(); });
    input.addEventListener('keydown', e => e.stopPropagation());   // que las teclas no muevan muebles ni cambien de vista
    x.onclick = () => { input.value = ''; term = ''; x.hidden = true; filter(); input.focus(); };
    // El catálogo se vuelve a pintar (idioma, 2D/3D): se aplica el filtro otra vez.
    new MutationObserver(() => { if (term) filter(); }).observe(lib, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
