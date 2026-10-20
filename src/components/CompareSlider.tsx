"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

/**
 * Las fotos «Por fuera» (izquierda) y «Por dentro» (derecha) del lugar en un mismo recuadro, con una línea que se
 * arrastra para ver más de una o de otra. Al cargar hace un vaivén una sola vez para que se note que se mueve; al
 * tocarla deja de hacerlo. Arrastrar solo mueve la línea (no abre la ficha) y subir o bajar la página sigue igual.
 */
export function CompareSlider({
  outside,
  inside,
  place,
  name,
  illustrative,
  className = "aspect-[4/3]",
  rounded = "",
}: {
  outside: string;
  inside: string;
  /** "Salón" o "Casa": las etiquetas dicen «Salón por fuera», «Casa por dentro»… */
  place: "Salón" | "Casa";
  name: string;
  illustrative?: boolean;
  className?: string;
  rounded?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(50);
  const [touched, setTouched] = useState(false);
  const dragging = useRef(false);
  // El vaivén de aviso empieza cuando la tarjeta ya se ve en pantalla (si no, se haría sin que nadie lo viera).
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && (setInView(true), io.disconnect()), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const move = (v: number) => {
    setTouched(true);
    setX(Math.max(0, Math.min(100, v)));
  };
  const at = (e: PointerEvent<HTMLDivElement>) => {
    const r = box.current!.getBoundingClientRect();
    move(((e.clientX - r.left) / r.width) * 100);
  };
  const KEYS: Record<string, number> = { ArrowLeft: x - 5, ArrowRight: x + 5, Home: 0, End: 100 };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!(e.key in KEYS)) return;
    e.preventDefault();
    move(KEYS[e.key]);
  };

  return (
    <div
      ref={box}
      role="slider"
      tabIndex={0}
      aria-label={`${name}: compara el ${place.toLowerCase()} por fuera y por dentro`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(x)}
      aria-valuetext={x < 50 ? `Más por dentro` : x > 50 ? `Más por fuera` : `Mitad y mitad`}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        at(e);
      }}
      onPointerMove={(e) => dragging.current && at(e)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      onKeyDown={onKey}
      style={{ "--x": `${x}%` } as React.CSSProperties}
      className={`comparar relative w-full cursor-ew-resize touch-pan-y select-none overflow-hidden bg-stone-100 outline-none focus-visible:ring-4 focus-visible:ring-[#f3c9ad] ${inView && !touched ? "comparar-guia" : ""} ${className} ${rounded}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- fotos guardadas en la base, servidas por la app */}
      <img src={inside} alt={`${name}, por dentro`} draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover" loading="lazy" />
      {/* eslint-disable-next-line @next/next/no-img-element -- fotos guardadas en la base, servidas por la app */}
      <img
        src={outside}
        alt={`${name}, por fuera`}
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover [clip-path:inset(0_calc(100%-var(--x))_0_0)]"
        loading="lazy"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[var(--x)] -ml-px w-0.5 bg-white shadow-[0_0_6px_rgba(0,0,0,0.35)]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[var(--x)] top-1/2 -ml-[21px] -mt-[21px] flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white text-[#b5653a] shadow-[0_4px_14px_rgba(0,0,0,0.3)]"
      >
        <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
        </svg>
      </div>
      {/* Cada etiqueta se oculta cuando su lado queda muy angosto, para no quedar encima de la otra foto. */}
      <span className={`pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-semibold text-white transition-opacity ${x < 38 ? "opacity-0" : ""}`}>
        {place} por fuera
      </span>
      <span className={`pointer-events-none absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-semibold text-white transition-opacity ${x > 62 ? "opacity-0" : ""}`}>
        {place} por dentro
      </span>
      {illustrative && (
        <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-stone-800">Imagen ilustrativa</span>
      )}
      {!touched && (
        <span className="pointer-events-none absolute bottom-2.5 right-2.5 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] text-white">Desliza ↔</span>
      )}
    </div>
  );
}
