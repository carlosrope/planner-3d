"use client";

import { useState } from "react";
import { whatsappShare } from "@/lib/referral-message";

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sin portapapeles: queda el texto para seleccionarlo */
    }
  };
  return { copied, copy };
}

/** WhatsApp con el mensaje listo (se elige el contacto en WhatsApp) y copiar el mismo mensaje. */
export function ShareCode({ message }: { message: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={whatsappShare(message)}
        target="_blank"
        rel="noopener"
        className="flex h-10 items-center justify-center whitespace-nowrap rounded-xl bg-[#25d366] px-3 text-sm font-semibold text-white hover:bg-[#1ebe5b]"
      >
        Enviar por WhatsApp
      </a>
      <button type="button" onClick={() => copy(message)} aria-label="Copiar el mensaje con el código" className="h-10 whitespace-nowrap rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium">
        {copied ? "¡Copiado!" : "Copiar mensaje"}
      </button>
    </div>
  );
}

/** Copia varios códigos a la vez, uno por renglón (para pegarlos en el Excel de llamadas o en una nota). */
export function CopyList({ text, label }: { text: string; label: string }) {
  const { copied, copy } = useCopy();
  return (
    <button type="button" onClick={() => copy(text)} className="h-10 whitespace-nowrap rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium">
      {copied ? "¡Copiados!" : label}
    </button>
  );
}
