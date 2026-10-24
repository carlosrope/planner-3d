import { expect, test, type Page } from "@playwright/test";
import { skipGuide } from "./helpers";

// Parpadeo al girar el 3D (z-fighting, 24 oct 2026): dos caras distintas en el mismo plano, o casi, se tapan a ratos al
// girar. Pasaba en la calle, el estacionamiento y el piso del terreno (a 1–5 mm, con el plano cercano de la cámara fijo
// en 5 cm) y en muebles con dos partes exactamente en el mismo plano (la franja del ropero y su tapa, la cubierta del
// comedor, el tapete). Arreglo en tools/designer/adapt.py: plano cercano según la distancia, el estacionamiento arriba
// del piso, separaCoplanares() al armar cada mueble y profundidad logarítmica en equipos de 16 bits.

// La escena de three.js vive dentro de un módulo: se toma del primer cuadro que se dibuja.
const HOOK = `import('/vendor/three-0.160.0/build/three.module.min.js').then(T => {
  T.Scene.prototype.onBeforeRender = function (r, s, c) { if (s.children.length > 3) Object.assign(window, { __S: s, __C: c, __T: T }); };
})`;

// Caras alineadas a los ejes de mallas distintas, con material distinto y el mismo polygonOffset, mirando al mismo lado, a
// menos de `tol` metros y encimadas. Con `muebles`, solo partes de un mismo mueble (todas las caras); si no, toda la escena (caras de 2 dm² o más).
const SCAN = (tol: number, muebles: boolean) => `(() => {
  const T = window.__T, S = window.__S; S.updateMatrixWorld(true);
  const root = o => { let p = o; while (p && !(p.userData && p.userData.fid)) p = p.parent; return p; };
  const tris = [], a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), n = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3();
  S.traverse(o => {
    if (!o.isMesh) return; let v = o; while (v) { if (!v.visible) return; v = v.parent; }
    const f = root(o); if (${muebles} && !f) return;
    const g = o.geometry, pos = g.attributes.position; if (!pos) return;
    const idx = g.index, cnt = idx ? idx.count : pos.count, mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.every(m => m.opacity === 0)) return;
    // Las sillas y mesas de evento son copias (InstancedMesh): cada copia, en su lugar
    const im = new T.Matrix4(), M = new T.Matrix4();
    for (let k = 0; k < (o.isInstancedMesh ? o.count : 1); k++) {
    if (o.isInstancedMesh) { o.getMatrixAt(k, im); M.multiplyMatrices(o.matrixWorld, im); } else M.copy(o.matrixWorld);
    for (const gr of (g.groups.length ? g.groups : [{ start: 0, count: cnt, materialIndex: 0 }])) {
      const m = mats[gr.materialIndex] || mats[0];
      for (let i = gr.start; i < gr.start + gr.count; i += 3) {
        const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
        a.fromBufferAttribute(pos, i0).applyMatrix4(M); b.fromBufferAttribute(pos, i1).applyMatrix4(M); c.fromBufferAttribute(pos, i2).applyMatrix4(M);
        n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)); if (n.length() / 2 < (${muebles} ? .0005 : .02)) continue; n.normalize();
        const ax = Math.abs(n.x) > .999 ? 'x' : Math.abs(n.y) > .999 ? 'y' : Math.abs(n.z) > .999 ? 'z' : null; if (!ax) continue;
        if (ax === 'y' && n.y < 0 && a.y < .005) continue;   // caras de abajo a ras del piso: la cámara nunca baja ahí
        const [u, w] = ax === 'x' ? ['y', 'z'] : ax === 'y' ? ['x', 'z'] : ['x', 'y'];
        tris.push({ o, f, m, ax, d: a[ax], s: Math.sign(n[ax]), u0: Math.min(a[u], b[u], c[u]), u1: Math.max(a[u], b[u], c[u]), w0: Math.min(a[w], b[w], c[w]), w1: Math.max(a[w], b[w], c[w]) });
      }
    }
    }
  });
  tris.sort((p, q) => p.ax < q.ax ? -1 : p.ax > q.ax ? 1 : p.d - q.d);
  const found = new Map();
  for (let i = 0; i < tris.length; i++) { const A = tris[i];
    for (let j = i + 1; j < tris.length && tris[j].ax === A.ax && tris[j].d - A.d <= ${tol}; j++) { const B = tris[j];
      if (B.o === A.o || B.s !== A.s || B.m === A.m || (${muebles} && B.f !== A.f)) continue;
      // Con distinto polygonOffset (pisos encimados, muros contra lo que tienen al ras) uno siempre queda encima
      const po = m => m.polygonOffset ? m.polygonOffsetFactor + ',' + m.polygonOffsetUnits : '0,0'; if (po(A.m) !== po(B.m)) continue;
      const ou = Math.min(A.u1, B.u1) - Math.max(A.u0, B.u0), ow = Math.min(A.w1, B.w1) - Math.max(A.w0, B.w0); if (ou <= .005 || ow <= .005) continue;
      const k = ${muebles} ? (A.f.userData.fid) : A.ax + '@' + A.d.toFixed(3); found.set(k, (found.get(k) || 0) + ou * ow);
    } }
  return [...found.entries()].map(([k, m2]) => [k, +m2.toFixed(4)]);
})()`;

async function open3d(page: Page, place: string) {
  await page.goto(`/disenador/${place}${place.includes("?") ? "&" : "?"}vista=3d`);
  await skipGuide(page);
  await page.evaluate(HOOK);
  if (!(await page.evaluate(() => document.getElementById("stage")?.classList.contains("is3d"))))
    await page.evaluate(() => (document.querySelector('[data-view="3d"]') as HTMLElement | null)?.click());
  await page.waitForFunction("window.__S && document.getElementById('stage').classList.contains('is3d')", undefined, { timeout: 45_000 });
  await page.waitForTimeout(2500);   // termina la animación de entrada
}

for (const place of ["salon-demo", "chardonnay", "chardonnay?planta=pa"]) {
  test(`3D sin caras encimadas que parpadeen: ${place} y todo su catálogo`, async ({ page }) => {
    await open3d(page, place);
    // De lejos, el plano cercano de la cámara ya no es de 5 cm (con eso se perdía la precisión)
    expect(await page.evaluate("window.__C.near")).toBeGreaterThan(0.2);
    // Calle, estacionamiento, piso, muros y muebles: nada a menos de 0.8 mm de otra cara encimada (de lo más lejos que
    // deja alejarse la cámara, ~77 m, el 3D distingue ~0.35 mm en un equipo de 24 bits)
    expect(await page.evaluate(SCAN(0.0008, false))).toEqual([]);
    // Una pieza de cada mueble del catálogo, lejos del lugar: ninguna con dos partes en el mismo plano. Se tolera lo que
    // queda en las sillas de evento (facetas de las patas contra el cojín, a 0.4 mm, de unos cm²)
    await page.evaluate(`LIB.flatMap(c => c.items).forEach(([type, name, w, d, color], i) =>
      state.furniture.push({ id: 'prueba' + i, type, name, w, d, color, rot: 0, cx: -40000 - (i % 10) * 4500, cy: 2000 + Math.floor(i / 10) * 4500 }));
      View3D.sync()`);
    await page.waitForTimeout(1500);
    const pieces = (await page.evaluate(SCAN(0.0005, true))) as [string, number][];
    expect(pieces.reduce((sum, [, m2]) => sum + m2, 0)).toBeLessThan(0.02);
  });
}
