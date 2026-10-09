"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

/** Hoja que sube desde abajo (teléfono); en pantallas anchas queda como panel flotante. */
export function Sheet({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center md:items-center">
      <button aria-label="Cerrar" className="absolute inset-0 bg-black/25" onClick={onClose} />
      <section
        role="dialog"
        aria-label={title}
        className="relative flex max-h-[75dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl md:max-w-lg md:rounded-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <header className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <h2 className="text-base font-semibold text-stone-800">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-10 place-items-center rounded-full text-stone-500 active:bg-stone-100"
          >
            <X size={20} />
          </button>
        </header>
        <div className="overflow-y-auto overscroll-contain p-4">{children}</div>
      </section>
    </div>
  );
}
