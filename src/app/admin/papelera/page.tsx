import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { adminListTrash, requireAdmin } from "@/lib/dal";
import { VENUE_KIND_LABELS, trashDaysLeft } from "@/lib/domain";
import { formatDate } from "@/lib/dates";
import { AdminNav } from "../AdminNav";
import { restoreEventAdmin, trashVenue } from "../actions";
import { EsqueletoLista } from "@/components/Esqueleto";

export const metadata: Metadata = { title: "Administración · Papelera" };

export default function AdminPapeleraPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <Suspense fallback={<EsqueletoLista />}>
        <Papelera />
      </Suspense>
    </main>
  );
}

const btn = "h-9 rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium";

async function Papelera() {
  await requireAdmin();
  const { venues, events } = await adminListTrash();
  return (
    <>
      <AdminNav current="/admin/papelera" />
      <h1 className="text-2xl font-semibold">Papelera</h1>
      <p className="mt-1 text-sm text-stone-500">Lugares y eventos borrados. Se pueden restaurar durante 30 días; después se borran de verdad.</p>

      <h2 className="mt-6 text-lg font-semibold">Lugares</h2>
      {venues.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">No hay lugares en la papelera.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {venues.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white p-3">
              <div>
                <Link href={`/admin/lugares/${v.id}`} className="font-medium underline">
                  {v.name}
                </Link>
                <p className="text-sm text-stone-500">
                  {VENUE_KIND_LABELS[v.kind]} · {v.city} · borrado el {formatDate(v.deletedAt!)} · se borra en {trashDaysLeft(v.deletedAt!)} días
                </p>
              </div>
              <form action={trashVenue}>
                <input type="hidden" name="venueId" value={v.id} />
                <input type="hidden" name="restore" value="1" />
                <button className={btn}>Restaurar</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-6 text-lg font-semibold">Eventos y proyectos</h2>
      {events.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">No hay eventos en la papelera.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white p-3">
              <div>
                <p className="font-medium">{e.title}</p>
                <p className="text-sm text-stone-500">
                  {e.orgName} · {e.venueName} · borrado el {formatDate(e.deletedAt!)} · se borra en {trashDaysLeft(e.deletedAt!)} días
                </p>
              </div>
              <form action={restoreEventAdmin}>
                <input type="hidden" name="eventId" value={e.id} />
                <button className={btn}>Restaurar</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
