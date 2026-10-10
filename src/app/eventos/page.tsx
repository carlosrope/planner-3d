import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageLink } from "@/components/PageLink";
import { listEvents, listVenues, requireOrg, requireUser } from "@/lib/dal";
import { EVENT_KIND_LABELS, EVENT_STATUS_LABELS, SECTIONS, sectionOf, type Section } from "@/lib/domain";
import { NewEventForm } from "./NewEventForm";
import { SignOutButton } from "./SignOutButton";

export const metadata: Metadata = { title: "Proyectos" };

export default function EventosPage({ searchParams }: PageProps<"/eventos">) {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <Suspense fallback={<p className="text-stone-500">Cargando tus proyectos…</p>}>
        <EventosContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const fecha = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const COPY: Record<Section, { empty: string; title: string; hint: string }> = {
  salones: {
    empty: "Todavía no tienes eventos en salón. Crea el primero abajo.",
    title: "Nuevo evento en salón",
    hint: "Se arma un plano inicial con pista, mesa principal y las mesas que necesitas según los invitados.",
  },
  casas: {
    empty: "Todavía no tienes proyectos de casa. Crea el primero abajo.",
    title: "Nuevo proyecto de casa",
    hint: "Abre el modelo amueblado para mostrarlo, cambiar muebles y pisos, y compartirlo con tu cliente.",
  },
};

async function EventosContent({ searchParams }: { searchParams: PageProps<"/eventos">["searchParams"] }) {
  const user = await requireUser();
  const org = await requireOrg(user);
  const { seccion } = await searchParams;
  const section: Section = seccion === "casas" ? "casas" : "salones";
  const [events, venues] = await Promise.all([listEvents(org.id), listVenues(org.id)]);
  const mine = events.filter((e) => sectionOf(e.venueKind) === section);
  const places = venues.filter((v) => sectionOf(v.kind) === section);
  const count = (s: Section) => events.filter((e) => sectionOf(e.venueKind) === s).length;

  return (
    <>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">{org.name}</p>
          <h1 className="text-2xl font-semibold">Proyectos</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/negocio"
            className="flex h-10 items-center rounded-xl border border-stone-300 px-3 text-sm font-medium active:bg-stone-100"
          >
            Mi negocio
          </Link>
          <SignOutButton />
        </div>
      </header>

      <nav className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-stone-200/70 p-1" aria-label="Secciones">
        {(Object.keys(SECTIONS) as Section[]).map((s) => (
          <Link
            key={s}
            href={s === "salones" ? "/eventos" : "/eventos?seccion=casas"}
            replace
            aria-current={s === section ? "page" : undefined}
            className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium ${
              s === section ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 active:bg-stone-100"
            }`}
          >
            {SECTIONS[s].label}
            <span className="rounded-full bg-stone-100 px-2 text-xs text-stone-500">{count(s)}</span>
          </Link>
        ))}
      </nav>

      <section className="mb-8 space-y-2">
        {mine.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-stone-500">
            {COPY[section].empty}
          </p>
        ) : (
          mine.map((e) => (
            <PageLink
              key={e.id}
              href={`/eventos/${e.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 active:bg-stone-50"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{e.title}</p>
                <p className="truncate text-sm text-stone-500">
                  {section === "salones" ? `${EVENT_KIND_LABELS[e.kind]} · ` : ""}
                  {e.venueName}
                  {section === "salones" && e.guestCount ? ` · ${e.guestCount} invitados` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right text-sm">
                {section === "salones" && (
                  <p className="font-medium">{e.eventDate ? fecha.format(new Date(e.eventDate)) : "Sin fecha"}</p>
                )}
                <p className="text-stone-500">{EVENT_STATUS_LABELS[e.status]}</p>
              </div>
            </PageLink>
          ))
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="mb-1 text-lg font-semibold">{COPY[section].title}</h2>
        <p className="mb-4 text-sm text-stone-500">{COPY[section].hint}</p>
        <NewEventForm key={section} section={section} venues={places} />
      </section>
    </>
  );
}
