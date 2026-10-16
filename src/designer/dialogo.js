// Ventanas de confirmación y aviso con la estética de Plantea (en lugar de confirm() y alert() del navegador,
// que no se pueden estilizar y salen arriba de la pantalla). Las usan el diseñador, host.js y eventos.js.
//   await plConfirm(mensaje, { ok, cancel, danger })  → true / false
//   await plAlert(mensaje, { ok })
(function () {
  const css = `
  .pl-dlg-back{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;
    background:rgba(28,25,23,.45);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);animation:plFade .15s ease-out}
  .pl-dlg{width:100%;max-width:400px;background:#fff;border-radius:20px;padding:22px 20px 18px;color:#1c1917;
    box-shadow:0 24px 60px rgba(28,25,23,.25);font-family:'DM Sans',system-ui,-apple-system,'Segoe UI',sans-serif;animation:plPop .18s ease-out}
  .pl-dlg .pl-mark{display:flex;align-items:center;gap:8px;margin-bottom:12px;font-family:'Sora','DM Sans',system-ui,sans-serif;font-weight:700;font-size:15px}
  .pl-dlg .pl-dot{width:10px;height:10px;border-radius:50%;background:#b5653a;box-shadow:0 0 0 4px #f3e3d6}
  .pl-dlg p{margin:0;font-size:16px;line-height:1.5;white-space:pre-line}
  .pl-dlg .pl-acts{display:flex;gap:8px;margin-top:20px}
  .pl-dlg button{flex:1;min-height:46px;border-radius:12px;font:600 15px/1 'DM Sans',system-ui,sans-serif;cursor:pointer;border:1px solid #d6d3d1;background:#fff;color:#1c1917}
  .pl-dlg button.pl-ok{background:#b5653a;border-color:#b5653a;color:#fff}
  .pl-dlg button.pl-ok.pl-danger{background:#b3372a;border-color:#b3372a}
  .pl-dlg button:focus-visible{outline:3px solid #f3c9ad;outline-offset:2px}
  @keyframes plFade{from{opacity:0}to{opacity:1}}
  @keyframes plPop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}`;
  let styled = false;
  const style = () => {
    if (styled) return;
    styled = true;
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  };
  const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function open(message, { ok = 'Aceptar', cancel = 'Cancelar', danger = false, single = false } = {}) {
    style();
    return new Promise(resolve => {
      const back = document.createElement('div');
      back.className = 'pl-dlg-back';
      back.innerHTML = `<div class="pl-dlg" role="${single ? 'alertdialog' : 'dialog'}" aria-modal="true" aria-describedby="plDlgMsg">
        <div class="pl-mark"><span class="pl-dot" aria-hidden="true"></span>Plantea</div>
        <p id="plDlgMsg">${esc(message)}</p>
        <div class="pl-acts">${single ? '' : `<button type="button" class="pl-cancel">${esc(cancel)}</button>`}
          <button type="button" class="pl-ok${danger ? ' pl-danger' : ''}">${esc(ok)}</button></div></div>`;
      const prev = document.activeElement;
      const done = v => {
        document.removeEventListener('keydown', onKey, true);
        back.remove();
        try { prev?.focus?.(); } catch { /* nada */ }
        resolve(v);
      };
      const onKey = e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(single); }
        else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); done(true); }
        else if (e.key === 'Tab') {
          const bs = [...back.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
          e.preventDefault(); bs[(i + (e.shiftKey ? bs.length - 1 : 1)) % bs.length].focus();
        }
      };
      back.addEventListener('click', e => { if (e.target === back) done(single); });
      back.querySelector('.pl-ok').onclick = () => done(true);
      back.querySelector('.pl-cancel')?.addEventListener('click', () => done(false));
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(back);
      back.querySelector('.pl-ok').focus();
    });
  }

  window.plConfirm = (message, opts) => open(message, opts);
  /** Carga los estilos de la ventana (para otras ventanas con el mismo diseño, como la de sugerencias). */
  window.plDialogStyle = style;
  window.plAlert = (message, opts) => open(message, { ...opts, single: true });
})();
