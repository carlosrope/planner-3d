"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { dragVelocity, easeOut, flickTarget } from "@/lib/compare";

/**
 * Las fotos «Por fuera» (izquierda) y «Por dentro» (derecha) del lugar en un mismo recuadro, con una línea que se
 * arrastra para ver más de una o de otra. Si se suelta la línea lanzándola, se desliza sola hasta esa orilla y la
 * perilla queda como pestaña en el borde: tocarla (o arrastrarla) la regresa. Al aparecer en pantalla hace un vaivén
 * una sola vez para que se note que se mueve. Arrastrar solo mueve la línea (no abre la ficha) y subir o bajar la
 * página sigue igual.
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
  /** "Salón" o "Casa": para el texto que leen los lectores de pantalla (las etiquetas dicen solo «Por fuera» y «Por dentro»). */
  place: "Salón" | "Casa";
  name: string;
  illustrative?: boolean;
  className?: string;
  rounded?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(50);
  const [touched, setTouched] = useState(false);
  const drag = useRef<{ id: number; startX: number; moved: boolean; samples: { t: number; x: number }[] } | null>(null);
  const glide = useRef<number | null>(null);

  // El vaivén de aviso empieza cuando la tarjeta ya se ve en pantalla (si no, se haría sin que nadie lo viera).
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && (setInView(true), io.disconnect()), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => () => void (glide.current && cancelAnimationFrame(glide.current)), []);

  const stopGlide = () => {
    if (glide.current) cancelAnimationFrame(glide.current);
    glide.current = null;
  };
  const move = (v: number) => {
    setTouched(true);
    setX(Math.max(0, Math.min(100, v)));
  };
  /** Desliza la línea hasta `to` (0–100) frenando al llegar; sin animación si la persona pidió menos movimiento. */
  const glideTo = (to: number) => {
    stopGlide();
    setTouched(true);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setX(to);
    const from = x;
    const t0 = performance.now();
    const ms = 220 + Math.abs(to - from) * 4;
    const step = (now: number) => {
      const k = easeOut((now - t0) / ms);
      setX(from + (to - from) * k);
      glide.current = k < 1 ? requestAnimationFrame(step) : null;
    };
    glide.current = requestAnimationFrame(step);
  };
  const pct = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * 100;
  };

  const atEdge = x <= 0.5 ? "left" : x >= 99.5 ? "right" : null;
  const KEYS: Record<string, number> = { ArrowLeft: x - 5, ArrowRight: x + 5, Home: 0, End: 100 };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!(e.key in KEYS)) return;
    e.preventDefault();
    stopGlide();
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
      onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
        stopGlide();
        drag.current = { id: e.pointerId, startX: e.clientX, moved: false, samples: [{ t: performance.now(), x: e.clientX }] };
        e.currentTarget.setPointerCapture(e.pointerId);
        // En la orilla, el toque no salta: se espera a ver si es un toque (regresa al centro) o un arrastre.
        if (!atEdge) move(pct(e.clientX));
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        if (!d.moved && Math.abs(e.clientX - d.startX) < 4) return;
        d.moved = true;
        d.samples.push({ t: performance.now(), x: e.clientX });
        if (d.samples.length > 12) d.samples.shift();
        move(pct(e.clientX));
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (!d || d.id !== e.pointerId) return;
        if (!d.moved) {
          if (atEdge) glideTo(50); // tocar la pestaña de la orilla regresa la línea al centro
          return;
        }
        const to = flickTarget(dragVelocity(d.samples));
        if (to !== null) glideTo(to);
      }}
      onPointerCancel={() => (drag.current = null)}
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
      {!atEdge && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[var(--x)] -ml-px w-0.5 bg-white/90 shadow-[0_0_8px_rgba(0,0,0,0.35)]" />}
      {atEdge ? (
        // En la orilla, la perilla queda como pestaña en el borde con la flecha hacia adentro
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 -mt-7 flex h-14 w-7 items-center justify-center bg-stone-900/85 text-white shadow-[0_4px_14px_rgba(0,0,0,0.35)] backdrop-blur ${
            atEdge === "right" ? "right-0 rounded-l-full pl-0.5" : "left-0 rounded-r-full pr-0.5"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d={atEdge === "right" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
          </svg>
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[var(--x)] top-1/2 -ml-[21px] -mt-[21px] flex h-[42px] w-[42px] items-center justify-center rounded-full bg-stone-900/85 text-white shadow-[0_4px_14px_rgba(0,0,0,0.35)] ring-1 ring-white/25 backdrop-blur"
        >
          <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
          </svg>
        </div>
      )}
      {/* Cada etiqueta se oculta cuando su lado queda muy angosto, para no quedar encima de la otra foto. */}
      <span className={`pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur transition-opacity ${x < 38 ? "opacity-0" : ""}`}>
        Por fuera
      </span>
      <span className={`pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur transition-opacity ${x > 62 ? "opacity-0" : ""}`}>
        Por dentro
      </span>
      {illustrative && (
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-stone-800">Imagen ilustrativa</span>
      )}
      {!touched && (
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-0.5 text-[11px] text-white backdrop-blur">Desliza ↔</span>
      )}
    </div>
  );
}
