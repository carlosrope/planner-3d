"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Una o varias fotos en el mismo recuadro. Con varias, cambia de una a otra con un desvanecido lento (cada `every` ms)
 * solo mientras se ve en pantalla; con «menos movimiento» se queda en la primera.
 */
export function FadeImages({
  images,
  every = 4500,
  className = "",
  sizes = "(min-width: 1024px) 500px, (min-width: 640px) 50vw, 100vw",
}: {
  images: { src: string; alt: string }[];
  every?: number;
  className?: string;
  /** Ancho con que se ve, para que el navegador pida la foto de ese tamaño. */
  sizes?: string;
}) {
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
        <Image
          key={img.src}
          src={img.src}
          alt={img.alt}
          aria-hidden={n !== i}
          fill
          sizes={sizes}
          className={`object-cover transition-opacity duration-[1800ms] ease-in-out ${n === i ? "opacity-100" : "opacity-0"}`}
        />
      ))}
    </div>
  );
}
