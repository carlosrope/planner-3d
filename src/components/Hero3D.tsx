"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const SRC = "/disenador/salon-demo?embed=1&vista=3d";
const COARSE = "(pointer: coarse)";
const onCoarse = (cb: () => void) => {
  const m = matchMedia(COARSE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/**
 * Portada: el Salón Demostración de verdad, en 3D (el mismo diseñador, incrustado con ?embed=1, ver
 * src/designer/embed.js). Gira solo hasta que la persona lo toca; se gira arrastrando, se acerca con la rueda (tras
 * un clic) o pellizcando, y cambia entre el plano 2D y el 3D con los botones de arriba. Mientras carga se ve una foto
 * del 3D. En pantallas táctiles el primer toque «activa» el 3D (antes, deslizar el dedo baja la página) y «Listo»
 * lo suelta otra vez. Solo se mira: los muebles no se seleccionan ni se mueven; para editar está el botón de abrirlo
 * en grande.
 */
export function Hero3D() {
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [load, setLoad] = useState(false);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"2d" | "3d">("3d");
  // Pantalla táctil (en el servidor se supone que no)
  const touch = useSyncExternalStore(onCoarse, () => matchMedia(COARSE).matches, () => false);
  const [active, setActive] = useState(false);
  const [used, setUsed] = useState(false);

  useEffect(() => {
    // El 3D pesa: se carga cuando la página ya terminó lo suyo, para no frenar la primera vista
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const later = () => {
      if (w.requestIdleCallback) w.requestIdleCallback(() => setLoad(true), { timeout: 1500 });
      else setTimeout(() => setLoad(true), 300);
    };
    if (document.readyState === "complete") later();
    else addEventListener("load", later, { once: true });
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.data?.plantea !== "embed") return;
      if (e.data.listo) setReady(true);
      if (e.data.activo) setUsed(true);
    };
    addEventListener("message", onMsg);
    return () => removeEventListener("message", onMsg);
  }, []);

  // Al salir de la pantalla, el 3D se suelta (en el celular vuelve a dejar bajar la página con el dedo)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => !e.isIntersecting && setActive(false), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const show = (v: "2d" | "3d") => {
    setView(v);
    setUsed(true);
    frame.current?.contentWindow?.postMessage({ plantea: "portada", vista: v }, location.origin);
  };

  return (
    <div ref={box} className="relative">
      <div className="relative aspect-[16/15] w-full overflow-hidden rounded-[25px] border border-stone-200 bg-[#efebe4] shadow-2xl shadow-stone-900/15">
        {/* Foto del 3D mientras carga (y si el 3D no puede cargar) */}
        {/* eslint-disable-next-line @next/next/no-img-element -- captura propia */}
        <img
          src="/portada/espacios-salon-3d.jpg"
          alt="El Salón Demostración en 3D"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}
        />
        {load && (
          <iframe
            ref={frame}
            src={SRC}
            title="El Salón Demostración en 3D: arrástralo para girarlo"
            loading="eager"
            className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
          />
        )}

        {/* En pantallas táctiles: tocar para mover el 3D; mientras no, el dedo baja la página */}
        {touch && ready && !active && (
          <button
            type="button"
            onClick={() => {
              setActive(true);
              setUsed(true);
            }}
            className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-stone-900/35 via-transparent to-transparent pb-5"
            aria-label="Tocar para mover el salón en 3D"
          >
            <span className="rounded-full bg-stone-900/85 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur">Toca para girarlo y acercarlo</span>
          </button>
        )}

        {/* 2D / 3D */}
        <div role="radiogroup" aria-label="Vista" className="absolute left-3 top-3 grid grid-cols-2 rounded-full bg-white/90 p-1 text-sm font-semibold shadow-md backdrop-blur">
          {(["2d", "3d"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              disabled={!ready}
              onClick={() => show(v)}
              className={`rounded-full px-4 py-1.5 transition-colors disabled:opacity-60 ${view === v ? "bg-[#b5653a] text-white" : "text-stone-700 hover:text-stone-900"}`}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="absolute right-3 top-3 flex items-center gap-2">
          {touch && active && (
            <button type="button" onClick={() => setActive(false)} className="rounded-full bg-stone-900/85 px-3 py-1.5 text-sm font-semibold text-white shadow-md backdrop-blur">
              Listo
            </button>
          )}
          <Link
            href="/disenador/salon-demo"
            aria-label="Abrir el Salón Demostración en grande"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow-md backdrop-blur hover:text-[#b5653a]"
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
            </svg>
          </Link>
        </div>

        {ready && !used && (
          <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-stone-900/80 px-3 py-1.5 text-xs font-medium text-white shadow-md backdrop-blur max-sm:hidden">
            Arrastra para girar · haz clic y usa la rueda para acercar
          </span>
        )}
      </div>
    </div>
  );
}
