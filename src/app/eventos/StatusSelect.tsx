"use client";

import { EVENT_STATUSES, EVENT_STATUS_LABELS, type EventStatus } from "@/lib/domain";
import { setEventStatusAction } from "./actions";

/** Estado del evento (borrador, confirmado, realizado, cancelado); se guarda al elegirlo. */
export function StatusSelect({ eventId, status, title }: { eventId: string; status: EventStatus; title: string }) {
  return (
    <form action={setEventStatusAction} className="flex items-center justify-end gap-2 pr-1 text-sm text-stone-500">
      <input type="hidden" name="eventId" value={eventId} />
      <label htmlFor={`estado-${eventId}`}>Estado</label>
      <select
        id={`estado-${eventId}`}
        name="status"
        defaultValue={status}
        aria-label={`Estado de ${title}`}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-8 rounded-lg border border-stone-200 bg-white px-2 text-sm text-stone-700"
      >
        {EVENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {EVENT_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
