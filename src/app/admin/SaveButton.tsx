"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/** Botón de guardar de la administración: dice «Guardando…» y, al terminar, «Guardado ✓» unos segundos. */
export function SaveButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  const was = useRef(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (was.current && !pending) {
      setDone(true);
      const t = setTimeout(() => setDone(false), 2500);
      was.current = false;
      return () => clearTimeout(t);
    }
    if (pending) was.current = true;
  }, [pending]);
  return (
    <button disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? "Guardando…" : done ? "Guardado ✓" : children}
    </button>
  );
}
