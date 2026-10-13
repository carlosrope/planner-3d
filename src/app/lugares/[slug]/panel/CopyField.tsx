"use client";

import { useState } from "react";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* el usuario puede seleccionar el texto */
    }
  };
  return (
    <div className="flex gap-2">
      <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="h-11 min-w-0 flex-1 rounded-xl border border-stone-300 bg-stone-50 px-3 text-sm" />
      <button type="button" onClick={copy} className="h-11 shrink-0 rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium active:bg-stone-100">
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
