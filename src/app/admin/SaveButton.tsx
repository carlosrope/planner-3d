"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/** Botón de guardar de la administración: dice «Guardando…» y, al terminar, «Guardado ✓» unos segundos. */
export function SaveButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  const was = useRef(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (pending) {
      was.current = true;
      return;
    }
    if (!was.current) return;
    was.current = false;
    setDone(true);
    // Sin limpiar el temporizador: al refrescar la página después de guardar, React desconecta y vuelve a conectar este
    // efecto; si se limpiara, el botón se quedaría en «Guardado ✓» y no volvería a su texto.
    setTimeout(() => setDone(false), 2500);
  }, [pending]);
  return (
    <button disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? "Guardando…" : done ? "Guardado ✓" : children}
    </button>
  );
}
