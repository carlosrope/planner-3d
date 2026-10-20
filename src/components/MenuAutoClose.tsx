"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * El menú del celular es un <details> (funciona sin JavaScript). Con JavaScript, se cierra solo al elegir una opción,
 * al tocar fuera de él y al cambiar de página; si no, se quedaba abierto encima de la página nueva.
 */
export function MenuAutoClose() {
  const marker = useRef<HTMLSpanElement>(null);
  const path = usePathname();

  useEffect(() => {
    const menu = marker.current?.closest("details");
    if (!menu) return;
    menu.open = false;
    const onClick = (e: MouseEvent) => {
      if (!menu.open) return;
      const target = e.target as Node;
      if (!menu.contains(target) || (target instanceof Element && target.closest("a"))) menu.open = false;
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [path]);

  return <span ref={marker} hidden />;
}
