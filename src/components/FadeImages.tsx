"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Una o varias fotos en el mismo recuadro. Con varias, cambia de una a otra con un desvanecido lento (cada `every` ms)
 * solo mientras se ve en pantalla; con «menos movimiento» se queda en la primera.
 */
export function FadeImages({ images, every = 4500, className = "" }: { images: { src: string; alt: string }[]; every?: number; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el || images.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !timer) timer = setInterval(() => setI((n) => (n + 1) % images.length), every);
      if (!e.isIntersecting && timer) {
        clearInterval(timer);
        timer = null;
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) clearInterval(timer);
    };
  }, [images.length, every]);

  return (
    <div ref={box} className={`relative overflow-hidden bg-[#efebe4] ${className}`}>
      {images.map((img, n) => (
        // eslint-disable-next-line @next/next/no-img-element -- fotos propias de la portada
        <img
          key={img.src}
          src={img.src}
          alt={img.alt}
          aria-hidden={n !== i}
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1600ms] ease-in-out ${n === i ? "opacity-100" : "opacity-0"}`}
        />
      ))}
    </div>
  );
}
