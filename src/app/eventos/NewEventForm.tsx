"use client";

import { useActionState } from "react";
import { EVENT_KIND_LABELS, SALON_EVENT_KINDS, type Section } from "@/lib/domain";
import { createEvent } from "./actions";

const field = "h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-800";

/** Formulario de la sección: evento en salón (tipo, fecha, invitados) o proyecto de casa (modelo y cliente). */
export function NewEventForm({
  section,
  venues,
  defaultVenueId,
}: {
  section: Section;
  venues: { id: string; name: string; city: string }[];
  /** Lugar preseleccionado (viene del catálogo con ?lugar=). */
  defaultVenueId?: string;
}) {
  const [state, action, pending] = useActionState(createEvent, null);
  const salon = section === "salones";
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="section" value={section} />
      <label className="space-y-1 sm:col-span-2">
        <span className="text-sm text-stone-600">{salon ? "Nombre del evento" : "Nombre del proyecto"}</span>
        <input
          name="title"
          required
          minLength={2}
          placeholder={salon ? "Boda Ana y Luis" : "Casa Chardonnay · Familia Pérez"}
          className={field}
        />
      </label>
      {salon && (
        <>
          <label className="space-y-1">
            <span className="text-sm text-stone-600">Tipo</span>
            <select name="kind" defaultValue="boda" className={field}>
              {SALON_EVENT_KINDS.map((k) => (
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
        </>
      )}
      <label className={`space-y-1 ${salon ? "" : "sm:col-span-2"}`}>
        <span className="text-sm text-stone-600">{salon ? "Salón" : "Modelo de casa"}</span>
        <select name="venueId" required defaultValue={defaultVenueId} className={field}>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} · {v.city}
            </option>
          ))}
        </select>
      </label>
      {salon && (
        <label className="space-y-1">
          <span className="text-sm text-stone-600">Invitados (aprox.)</span>
          <input name="guestCount" type="number" inputMode="numeric" min={1} max={2000} defaultValue={200} required className={field} />
        </label>
      )}
      <label className="space-y-1 sm:col-span-2">
        <span className="text-sm text-stone-600">Cliente (opcional)</span>
        <input
          name="clientNames"
          placeholder={salon ? "Nombres de la pareja o de la familia" : "Comprador o prospecto"}
          className={field}
        />
      </label>
      {venues.length === 0 && (
        <p className="text-sm text-stone-500 sm:col-span-2">
          {salon ? "Todavía no hay salones disponibles." : "Todavía no hay modelos de casa disponibles."}
        </p>
      )}
      {state?.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
      <button
        disabled={pending || venues.length === 0}
        className="h-12 rounded-xl bg-stone-900 font-medium text-white active:bg-stone-700 disabled:opacity-60 sm:col-span-2"
      >
        {pending ? "Armando el plano…" : salon ? "Crear evento con plano inicial" : "Crear proyecto de casa"}
      </button>
    </form>
  );
}
