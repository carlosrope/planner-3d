import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listEvents, listVenues, requireOrg, requireUser } from "@/lib/dal";
import { EVENT_KIND_LABELS, EVENT_STATUS_LABELS } from "@/lib/domain";
import { NewEventForm } from "./NewEventForm";
import { SignOutButton } from "./SignOutButton";

export const metadata: Metadata = { title: "Eventos" };

export default function EventosPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <Suspense fallback={<p className="text-stone-500">Cargando tus eventos…</p>}>
        <EventosContent />
      </Suspense>
    </main>
  );
}

const fecha = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

async function EventosContent() {
  const user = await requireUser();
  const org = await requireOrg(user);
  const [events, venues] = await Promise.all([listEvents(org.id), listVenues(org.id)]);

  return (
    <>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">{org.name}</p>
          <h1 className="text-2xl font-semibold">Eventos</h1>
        </div>
        <SignOutButton />
      </header>

      <section className="mb-8 space-y-2">
        {events.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-stone-500">
            Todavía no tienes eventos. Crea el primero abajo.
          </p>
        ) : (
          events.map((e) => (
            <Link
              key={e.id}
              href={`/eventos/${e.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 active:bg-stone-50"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{e.title}</p>
                <p className="truncate text-sm text-stone-500">
                  {EVENT_KIND_LABELS[e.kind]} · {e.venueName}
                  {e.guestCount ? ` · ${e.guestCount} invitados` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right text-sm">
                <p className="font-medium">{e.eventDate ? fecha.format(new Date(e.eventDate)) : "Sin fecha"}</p>
                <p className="text-stone-500">{EVENT_STATUS_LABELS[e.status]}</p>
              </div>
            </Link>
          ))
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="mb-1 text-lg font-semibold">Nuevo evento</h2>
        <p className="mb-4 text-sm text-stone-500">
          Se arma un plano inicial con pista, mesa principal y las mesas que necesitas según los invitados.
        </p>
        <NewEventForm venues={venues} />
      </section>
    </>
  );
}
