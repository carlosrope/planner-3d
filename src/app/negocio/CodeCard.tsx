"use client";

import { useState } from "react";
import { referralMessage, whatsappShare, type MessageSetting } from "@/lib/referral-message";

export type CodeInfo = { code: string; guestName: string; venueName: string; eventDate: string | null };

const day = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Un código listo para mandar: grande para dictarlo, con WhatsApp y copiar el mensaje. */
export function CodeCard({ info, origin, setting, highlight = false }: { info: CodeInfo; origin: string; setting?: MessageSetting; highlight?: boolean }) {
  const [copied, setCopied] = useState(false);
  const message = referralMessage(info, origin, setting);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sin portapapeles: queda el botón de WhatsApp */
    }
  };
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? "border-[#b5653a] bg-[#fbf3ec]" : "border-stone-200 bg-white"}`}>
      <p className="text-sm text-stone-600">
        <span className="font-semibold text-stone-900">{info.guestName}</span>
        {info.eventDate ? ` · ${day.format(new Date(`${info.eventDate}T12:00:00Z`))}` : ""} · {info.venueName}
      </p>
      <p className="mt-2 select-all font-mono text-2xl font-bold tracking-[0.12em] text-[#a4552d]">{info.code}</p>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <a
          href={whatsappShare(message)}
          target="_blank"
          rel="noopener"
          className="flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#25d366] px-3 text-sm font-semibold text-white hover:bg-[#1ebe5b]"
        >
          Enviar por WhatsApp
        </a>
        <button type="button" onClick={copy} aria-label="Copiar el mensaje con el código" className="h-11 whitespace-nowrap rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800">
          {copied ? "¡Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
