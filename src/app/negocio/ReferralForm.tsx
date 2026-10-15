"use client";

import { useActionState } from "react";
import { DateField } from "@/components/DateField";
import { createReferral } from "./actions";
import { CodeCard } from "./CodeCard";

const field = "h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-800";

/** Genera un código para un cliente (lugar, nombre y fecha) y lo deja listo para mandar por WhatsApp. */
export function ReferralForm({ venues, venueId, origin }: { venues: { id: string; name: string }[]; venueId?: string; origin: string }) {
  const [state, action, pending] = useActionState(createReferral, null);
  const venueName = venues.find((v) => v.id === state?.venueId)?.name ?? venues[0]?.name ?? "";
  return (
    <div className="mt-4">
      {state?.code && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-emerald-800">Código creado. Mándaselo a tu cliente:</p>
          <CodeCard highlight origin={origin} info={{ code: state.code, guestName: state.guestName ?? "", venueName, eventDate: state.eventDate ?? null }} />
        </div>
      )}
      <form action={action} key={state?.code ?? "nuevo"} className="grid gap-3 sm:grid-cols-2">
        {venueId || venues.length === 1 ? (
          <input type="hidden" name="venueId" value={venueId ?? venues[0].id} />
        ) : (
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-stone-600">Salón</span>
            <select name="venueId" required className={field}>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="space-y-1">
          <span className="text-sm text-stone-600">Nombre del cliente</span>
          <input name="guestName" required minLength={2} maxLength={80} placeholder="Ana y Luis" className={field} />
        </label>
        <div className="space-y-1">
          <span className="text-sm text-stone-600">Fecha del evento (opcional)</span>
          <DateField name="eventDate" min="today" />
        </div>
        {state?.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
        <button disabled={pending} className="h-12 rounded-xl bg-[#b5653a] font-semibold text-white hover:bg-[#a4552d] disabled:opacity-60 sm:col-span-2">
          {pending ? "Generando…" : "Generar código"}
        </button>
      </form>
    </div>
  );
}
