// Orden de las secciones del panel de Propiedades, a gusto de cada persona (se guarda en el dispositivo).
// El diseñador llama window.plOrdenPanel(panel) cada vez que pinta el resumen (adapt.py). Cada sección se
// reconoce por su título; las que no estén en el orden guardado (nuevas) quedan al final, en su orden original.
(function () {
  const KIND = (window.__CASA__ && window.__CASA__.kind) === 'salon' ? 'salon' : 'casa';
  const KEY = 'plantea-orden-panel-' + KIND + '-v1';
  let editing = false;

  const css = `
  #panel .pl-orden-bar{display:flex;gap:6px;padding:10px 14px 16px}
  #panel .pl-orden-bar button{flex:1;min-height:38px;border-radius:10px;border:1px dashed #c9bfb3;background:transparent;color:#57534e;font-weight:600;cursor:pointer}
  #panel.pl-ordenando .pl-orden-bar button.pl-listo{border-style:solid;background:#b5653a;border-color:#b5653a;color:#fff}
  #panel.pl-ordenando > section{position:relative;padding-right:92px!important;min-height:48px;outline:1px dashed #d6c7b8;outline-offset:-4px;border-radius:10px}
  #panel.pl-ordenando > section > *:not(h3):not(.pl-mover){display:none!important}
  #panel.pl-ordenando > section > h3 small{display:none}
  #panel .pl-mover{display:none}
  #panel.pl-ordenando .pl-mover{display:flex;gap:4px;position:absolute;top:50%;right:10px;transform:translateY(-50%)}
  #panel .pl-mover button{width:36px;height:36px;border-radius:50%;border:1px solid #d6d3d1;background:#fff;font-size:16px;cursor:pointer;color:#1c1917}
  #panel .pl-mover button:disabled{opacity:.3;cursor:default}
  #panel .pl-orden-aviso{margin:6px 14px 0;font-size:12px;color:#78716c}`;
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);

  const keyOf = sec => {
    const h = sec.querySelector(':scope > h3');
    if (!h) return null;
    const txt = [...h.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
    return txt || h.textContent.trim().slice(0, 40);
  };
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
  const write = list => { try { if (list) localStorage.setItem(KEY, JSON.stringify(list)); else localStorage.removeItem(KEY); } catch { /* sin almacenamiento */ } };
  const sections = p => [...p.children].filter(el => el.tagName === 'SECTION' && !el.hidden && keyOf(el));

  function apply(p) {
    const saved = read();
    if (!saved.length) return;
    const secs = sections(p);
    if (secs.length < 2) return;
    const rank = k => { const i = saved.indexOf(k); return i < 0 ? saved.length : i; };
    const sorted = secs.map((el, i) => ({ el, i, r: rank(keyOf(el)) })).sort((a, b) => a.r - b.r || a.i - b.i);
    const anchor = secs[0].previousSibling;
    let ref = anchor ? anchor.nextSibling : p.firstChild;
    for (const { el } of sorted) { p.insertBefore(el, ref); ref = el.nextSibling; }
  }

  function save(p) { write(sections(p).map(keyOf)); }

  function decorate(p) {
    p.querySelectorAll('.pl-mover, .pl-orden-bar, .pl-orden-aviso').forEach(el => el.remove());
    p.classList.toggle('pl-ordenando', editing);
    const secs = sections(p);
    if (secs.length < 2) return;
    if (editing) {
      secs.forEach((sec, i) => {
        const m = document.createElement('div');
        m.className = 'pl-mover';
        m.innerHTML = `<button type="button" data-m="-1" aria-label="Subir" title="Subir" ${i === 0 ? 'disabled' : ''}>↑</button>` +
          `<button type="button" data-m="1" aria-label="Bajar" title="Bajar" ${i === secs.length - 1 ? 'disabled' : ''}>↓</button>`;
        m.querySelectorAll('button').forEach(b => b.onclick = () => {
          const list = sections(p), at = list.indexOf(sec), to = at + Number(b.dataset.m);
          if (to < 0 || to >= list.length) return;
          if (to < at) p.insertBefore(sec, list[to]); else p.insertBefore(sec, list[to].nextSibling);
          save(p);
          decorate(p);
        });
        sec.appendChild(m);
      });
      const aviso = document.createElement('p');
      aviso.className = 'pl-orden-aviso';
      aviso.textContent = 'Sube o baja cada sección. El orden se guarda en este dispositivo.';
      secs[secs.length - 1].after(aviso);
    }
    const bar = document.createElement('div');
    bar.className = 'pl-orden-bar';
    bar.innerHTML = editing
      ? '<button type="button" class="pl-reset">Volver al orden original</button><button type="button" class="pl-listo">Listo</button>'
      : '<button type="button" class="pl-editar">↕ Ordenar secciones</button>';
    (p.querySelector('.pl-orden-aviso') || secs[secs.length - 1]).after(bar);
    bar.querySelector('.pl-editar')?.addEventListener('click', () => { editing = true; decorate(p); p.scrollTop = 0; });
    bar.querySelector('.pl-listo')?.addEventListener('click', () => { editing = false; decorate(p); });
    bar.querySelector('.pl-reset')?.addEventListener('click', () => { write(null); editing = false; window.plRepintarPanel?.(); });
  }

  window.plOrdenPanel = p => { apply(p); decorate(p); };

})();
