// Diseñador incrustado en la portada de plantea.com.mx (/disenador/[lugar]?embed=1&vista=3d, lo abre
// src/components/Hero3D.tsx): solo el lugar, sin barras ni paneles. La página de afuera cambia entre 2D y 3D con
// postMessage. La rueda del mouse no acerca hasta que la persona hace clic adentro: así, al bajar por la portada,
// la página sigue bajando en lugar de quedarse acercando el 3D. Con el dedo pasa lo mismo: deslizar de lado gira el 3D
// (o mueve el plano) y deslizar hacia arriba o abajo baja la página (touch-action: pan-y, y overscroll-behavior: auto
// para que el desplazamiento pase a la portada; el diseñador en grande lo trae en none); pellizcar acerca. Solo se
// mira: con la clase «embed» el diseñador no deja seleccionar, mover ni borrar nada, ni abrir puertas
// (tools/designer/adapt.py, «viewOnly»).
(function () {
  document.documentElement.classList.add('embed');
  const css = document.createElement('style');
  css.textContent = `
  html.embed header,html.embed aside,html.embed footer,html.embed #fab,html.embed #hint3d,html.embed #hint,html.embed .pl-ayuda,
  html.embed #demoAviso,html.embed #walkHud,html.embed .drawerBack{display:none!important}
  html.embed body{display:block!important;height:100%;overflow:hidden;background:#efebe4}
  html.embed main#stage{position:fixed!important;inset:0!important;width:100%!important;height:100%!important}
  html.embed #stage canvas,html.embed #stage svg{touch-action:pan-y!important}
  html.embed,html.embed body{overscroll-behavior:auto!important}`;
  (document.head || document.documentElement).appendChild(css);

  const say = msg => { try { parent.postMessage({ plantea: 'embed', ...msg }, location.origin); } catch { /* sin página de afuera */ } };
  const view = v => document.querySelector(`[data-view="${v}"]`)?.click();

  // Listo: el 3D ya está a la vista; empieza a girar despacio
  let tries = 0;
  (function ready() {
    const stage = document.getElementById('stage');
    if (window.View3D && stage?.classList.contains('is3d')) {
      window.View3D.spin?.(true);
      say({ listo: true });
      return;
    }
    if (++tries < 200) setTimeout(ready, 100);
  })();

  addEventListener('message', e => {
    if (e.origin !== location.origin || e.data?.plantea !== 'portada') return;
    if (e.data.vista === '2d' || e.data.vista === '3d') {
      view(e.data.vista);
      if (e.data.vista === '3d') setTimeout(() => window.View3D?.spin?.(false), 0);
    }
  });

  // Rueda: hasta que la persona hace clic adentro, la rueda baja la página de afuera
  let active = false;
  addEventListener('pointerdown', () => { active = true; say({ activo: true }); }, true);
  document.documentElement.addEventListener('mouseleave', () => { active = false; });
  addEventListener('wheel', e => {
    if (active) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    try { parent.scrollBy({ top: e.deltaY, left: 0 }); } catch { /* sin página de afuera */ }
  }, { capture: true, passive: false });
})();
