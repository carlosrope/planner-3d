"use client";

import { useActionState } from "react";
import { sendInquiry } from "./actions";

const field = "h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-800";

export function InquiryForm({ venueId, salon }: { venueId: string; salon: boolean }) {
  const [state, action, pending] = useActionState(sendInquiry, null);
  if (state?.ok) {
    return (
      <div className="rounded-xl bg-emerald-50 p-4 text-emerald-900">
        <p className="font-medium">¡Listo! Tu solicitud quedó registrada.</p>
        {state.whatsapp ? (
          <a href={state.whatsapp} target="_blank" rel="noopener" className="mt-3 flex h-11 items-center justify-center rounded-xl bg-[#25d366] font-medium text-white">
            Abrir WhatsApp con tu mensaje
          </a>
        ) : (
          <p className="mt-1 text-sm">Te contactan por WhatsApp.</p>
        )}
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="venueId" value={venueId} />
      <label className="space-y-1">
        <span className="text-sm text-stone-600">Tu nombre</span>
        <input name="name" required minLength={2} maxLength={80} autoComplete="name" className={field} />
      </label>
      <label className="space-y-1">
        <span className="text-sm text-stone-600">Tu WhatsApp</span>
        <input name="phone" type="tel" inputMode="tel" required placeholder="668 123 4567" autoComplete="tel" className={field} />
      </label>
      {salon && (
        <>
          <label className="space-y-1">
            <span className="text-sm text-stone-600">Fecha del evento</span>
            <input name="eventDate" type="date" className={field} />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-stone-600">Invitados (aprox.)</span>
            <input name="guests" type="number" inputMode="numeric" min={1} max={5000} className={field} />
          </label>
        </>
      )}
      <label className="space-y-1 sm:col-span-2">
        <span className="text-sm text-stone-600">Mensaje (opcional)</span>
        <textarea
          name="message"
          rows={2}
          maxLength={400}
          placeholder={salon ? "Boda, XV años, graduación… ¿qué incluye el paquete?" : "¿Precio, enganche, fecha de entrega?"}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-800"
        />
      </label>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
      <button disabled={pending} className="h-12 rounded-xl bg-stone-900 font-medium text-white active:bg-stone-700 disabled:opacity-60 sm:col-span-2">
        {pending ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  );
}
