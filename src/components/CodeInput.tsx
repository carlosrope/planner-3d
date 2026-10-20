"use client";

import { useRef, useState } from "react";
import { codeFrom } from "@/lib/referrals";

/**
 * Caja del código de un salón con un botón para pegarlo: el ejemplo es corto para que nunca se corte en el celular,
 * y lo que se pega o se escribe queda en mayúsculas y sin espacios.
 */
export function CodeInput({
  name,
  placeholder = "Ej. PALMAS-7K3MQ2",
  required,
  label = "Pegar código",
  className = "",
}: {
  name: string;
  placeholder?: string;
  required?: boolean;
  label?: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [hint, setHint] = useState("");

  async function paste() {
    setHint("");
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setValue(codeFrom(text));
        ref.current?.focus();
        return;
      }
      setHint("No hay nada copiado todavía. Copia el código que te mandó el salón.");
    } catch {
      // Sin permiso para leer lo copiado (o un navegador que no lo deja): que lo pegue a mano.
      setHint("Mantén presionada la caja y elige «Pegar».");
    }
    ref.current?.focus();
  }

  return (
    <div className={`min-w-0 flex-1 ${className}`}>
      <div className="relative">
        <input
          ref={ref}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase().replace(/\s+/g, ""))}
          onPaste={(e) => {
            e.preventDefault();
            setValue(codeFrom(e.clipboardData.getData("text")));
          }}
          required={required}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          placeholder={placeholder}
          aria-label="Código"
          className="h-12 w-full rounded-xl border border-stone-300 bg-white pl-3 pr-14 text-base uppercase tracking-wide outline-none placeholder:normal-case placeholder:tracking-normal focus:border-stone-800 sm:pr-28"
        />
        <button
          type="button"
          onClick={paste}
          aria-label={label}
          title={label}
          className="absolute inset-y-1 right-1 flex items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-stone-700 hover:bg-stone-100 active:bg-stone-200"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="8" y="3" width="8" height="4" rx="1" />
            <path d="M16 5h1.5A1.5 1.5 0 0 1 19 6.5v13a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-13A1.5 1.5 0 0 1 6.5 5H8" />
            <path d="M9 13h6M9 16.5h4" />
          </svg>
          <span className="hidden sm:inline">Pegar</span>
        </button>
      </div>
      {hint && (
        <p role="status" className="mt-1.5 text-sm text-stone-600">
          {hint}
        </p>
      )}
    </div>
  );
}
