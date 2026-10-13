"use client";

import { useActionState } from "react";
import { createReferral } from "./actions";

const field = "h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-800";

/** Genera un código para un cliente: lugar, nombre y fecha del evento. */
export function ReferralForm({ venues, venueId }: { venues: { id: string; name: string }[]; venueId?: string }) {
  const [state, action, pending] = useActionState(createReferral, null);
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-3">
      {venueId ? (
        <input type="hidden" name="venueId" value={venueId} />
      ) : (
        <label className="space-y-1 sm:col-span-3">
          <span className="text-sm text-stone-600">Lugar del evento</span>
          <select name="venueId" required className={field}>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="space-y-1 sm:col-span-2">
        <span className="text-sm text-stone-600">Nombre del cliente</span>
        <input name="guestName" required minLength={2} maxLength={80} placeholder="Ana y Luis" className={field} />
      </label>
      <label className="space-y-1">
        <span className="text-sm text-stone-600">Fecha del evento</span>
        <input name="eventDate" type="date" className={field} />
      </label>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-3">{state.error}</p>}
      {state?.code && (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 sm:col-span-3">
          Código creado: <b className="font-mono text-base">{state.code}</b>. Abajo está listo para mandarlo por WhatsApp.
        </p>
      )}
      <button disabled={pending} className="h-12 rounded-xl bg-stone-900 font-medium text-white active:bg-stone-700 disabled:opacity-60 sm:col-span-3">
        {pending ? "Generando…" : "Generar código"}
      </button>
    </form>
  );
}
