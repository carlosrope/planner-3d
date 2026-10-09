"use client";

import { useActionState } from "react";
import { EVENT_KIND_LABELS, EVENT_KINDS } from "@/lib/domain";
import { createEvent } from "./actions";

const field = "h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-800";

export function NewEventForm({ venues }: { venues: { id: string; name: string; city: string }[] }) {
  const [state, action, pending] = useActionState(createEvent, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 sm:col-span-2">
        <span className="text-sm text-stone-600">Nombre del evento</span>
        <input name="title" required minLength={2} placeholder="Boda Ana y Luis" className={field} />
      </label>
      <label className="space-y-1">
        <span className="text-sm text-stone-600">Tipo</span>
        <select name="kind" defaultValue="boda" className={field}>
          {EVENT_KINDS.map((k) => (
            <option key={k} value={k}>
              {EVENT_KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-sm text-stone-600">Fecha</span>
        <input name="eventDate" type="date" className={field} />
      </label>
      <label className="space-y-1">
        <span className="text-sm text-stone-600">Salón</span>
        <select name="venueId" required className={field}>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} · {v.city}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-sm text-stone-600">Invitados (aprox.)</span>
        <input name="guestCount" type="number" inputMode="numeric" min={1} max={2000} defaultValue={200} required className={field} />
      </label>
      <label className="space-y-1 sm:col-span-2">
        <span className="text-sm text-stone-600">Cliente (opcional)</span>
        <input name="clientNames" placeholder="Nombres de la pareja o de la familia" className={field} />
      </label>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
      <button
        disabled={pending || venues.length === 0}
        className="h-12 rounded-xl bg-stone-900 font-medium text-white active:bg-stone-700 disabled:opacity-60 sm:col-span-2"
      >
        {pending ? "Armando el plano…" : "Crear evento con plano inicial"}
      </button>
    </form>
  );
}
