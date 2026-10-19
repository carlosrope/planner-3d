import type { Metadata } from "next";
import Link from "next/link";
import { PlanChooser } from "@/components/PlanChooser";
import { Suspense } from "react";
import { PageLink } from "@/components/PageLink";
import { getReferralOrigin, isAdmin, listEvents, listTrashedEvents, listVenues, requireOrg, requireUser } from "@/lib/dal";
import { EVENT_KIND_LABELS, EVENT_STATUS_LABELS, PLAN_LABELS, SECTIONS, activeModules, isLitePlan, sectionOf, trashDaysLeft, type Section } from "@/lib/domain";
import { CONTACT_WHATSAPP } from "@/lib/brand";
import { formatDate, formatDay, formatInstant } from "@/lib/dates";
import { waLink } from "@/lib/whatsapp";
import { restoreEventAction, trashEventAction } from "./actions";
import { StatusSelect } from "./StatusSelect";
import { NewEventForm } from "./NewEventForm";
import { SamplesLink, Welcome } from "./Welcome";

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

const ACTIVATE_PLAN_LINK = waLink(CONTACT_WHATSAPP, "Hola, quiero activar mi plan de Plantea");

const COPY: Record<Section, { empty: string; title: string; hint: string }> = {
  salones: {
    empty: "Todavía no tienes eventos. Crea el primero abajo.",
    title: "Nuevo evento",
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
  const { seccion, lugar } = await searchParams;
  // Solo las secciones de los módulos contratados; si el plan venció, se ven los proyectos pero no se crean ni se abren.
  const active = activeModules(org);
  // Sin plan (llegó sin código): ve el catálogo y las demos; para crear, la ventana de planes.
  const free = org.plan === "libre";
  const expired = !free && active.length === 0;
  const visible: Section[] = expired ? org.modules : active;
  // Con código: solo el lugar del código y un solo evento. Personal: un evento activo a la vez.
  const origin = await getReferralOrigin(org);
  const [events, venues, trashed] = await Promise.all([listEvents(org.id), listVenues(org.id, origin?.venueId), listTrashedEvents(org.id)]);
  const lite = isLitePlan(org.plan);
  const limitReached =
    org.plan === "invitado" ? events.length > 0 : org.plan === "personal" ? events.some((e) => e.status === "borrador" || e.status === "confirmado") : false;
  // ?lugar=: viene del catálogo ("Planear mi evento aquí"): se preselecciona el lugar y se abre su sección.
  const wanted = typeof lugar === "string" ? venues.find((v) => v.id === lugar || v.slug === lugar) : undefined;
  const asked = wanted ? sectionOf(wanted.kind) : seccion === "casas" ? "casas" : undefined;
  const section: Section = asked && visible.includes(asked) ? asked : (visible[0] ?? "salones");
  const mine = events.filter((e) => sectionOf(e.venueKind) === section);
  const places = venues.filter((v) => sectionOf(v.kind) === section);
  const count = (s: Section) => events.filter((e) => sectionOf(e.venueKind) === s).length;
  const admin = isAdmin(user);
  const planName = admin ? "Administración · acceso completo" : origin ? `Con código de ${origin.issuerName}` : PLAN_LABELS[org.plan];
  const planLine = org.planEndsAt && !admin
    ? `${planName} · ${expired ? "terminó el" : "hasta el"} ${formatInstant(org.planEndsAt, "dayMonth")}`
    : planName;

  return (
    <>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">
            {org.name} · <span className={expired ? "text-red-600" : ""}>{planLine}</span>
          </p>
          <h1 className="text-2xl font-semibold">Proyectos</h1>
        </div>
      </header>

      {free && (
        <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Tu cuenta está lista</h2>
          <p className="mt-1 text-sm text-stone-600">
            Ya puedes ver el catálogo de salones y casas y probar las demos. Para crear tus propios proyectos, elige el plan de tu perfil.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <PlanChooser openAtStart={typeof lugar === "string"} />
            <Link
              href="/disenador/salon-demo"
              className="flex h-12 items-center justify-center rounded-xl border border-stone-300 font-medium active:bg-stone-100"
            >
              Probar la demo
            </Link>
          </div>
        </section>
      )}

      {expired && (
        <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
          <h2 className="text-lg font-semibold">Tu plan terminó</h2>
          <p className="mt-1 text-sm">
            Tus proyectos siguen guardados, pero ya no se pueden abrir ni crear nuevos. Escríbenos y lo activamos el mismo día.
          </p>
          <a
            href={ACTIVATE_PLAN_LINK}
            target="_blank"
            rel="noopener"
            className="mt-3 inline-flex h-11 items-center rounded-xl bg-red-700 px-4 text-sm font-medium text-white active:bg-red-800"
          >
            Activar mi plan por WhatsApp
          </a>
        </section>
      )}

      {events.length === 0 && !expired && !free && !lite && <Welcome modules={active} />}
      {events.length === 0 && !expired && origin && (
        <section className="mb-6 rounded-2xl bg-stone-900 p-5 text-white">
          <h2 className="text-xl font-semibold">Tu evento en {origin.venueName}</h2>
          <p className="mt-2 text-sm text-stone-200">
            Ponle nombre, di cuántos invitados tendrás y Plantea arma el primer acomodo de mesas. Después mueves lo que quieras, acomodas a tus
            invitados por mesa, lo ves en 3D y lo compartes con tu familia por WhatsApp.
          </p>
        </section>
      )}

      {visible.length > 1 && (
      <nav className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-stone-200/70 p-1" aria-label="Secciones">
        {visible.map((s) => (
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
      )}

      {!(free && events.length === 0) && (
      <section className="mb-8 space-y-2">
        {mine.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-stone-500">
            {COPY[section].empty}
          </p>
        ) : (
          mine.map((e) => (
            <div key={e.id} className="space-y-1">
            <div className="flex items-stretch gap-2">
            <PageLink
              href={`/eventos/${e.id}`}
              className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 active:bg-stone-50"
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
                  <p className="font-medium">{e.eventDate ? formatDay(e.eventDate) : "Sin fecha"}</p>
                )}
                <p className="text-stone-500">{EVENT_STATUS_LABELS[e.status]}</p>
              </div>
            </PageLink>
            <form action={trashEventAction} className="flex">
              <input type="hidden" name="eventId" value={e.id} />
              <button
                aria-label={`Mandar ${e.title} a la papelera`}
                title="Mandar a la papelera"
                className="w-11 rounded-2xl border border-stone-200 bg-white text-stone-500 active:bg-red-50 active:text-red-700"
              >
                <svg viewBox="0 0 24 24" className="mx-auto h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
            </div>
            {org.plan !== "invitado" && <StatusSelect key={e.status} eventId={e.id} status={e.status} title={e.title} />}
            </div>
          ))
        )}
      </section>
      )}

      {!expired && !free && limitReached && (
        <p className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
          {org.plan === "invitado"
            ? "Tu código cubre un solo evento: ábrelo arriba para seguir trabajando en él."
            : "El plan Personal incluye un evento activo a la vez. Cambia el estado del anterior a Realizado o Cancelado (abajo de cada evento) para crear otro."}
        </p>
      )}
      {!expired && !free && !limitReached && (
        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="mb-1 text-lg font-semibold">{COPY[section].title}</h2>
          <p className="mb-4 text-sm text-stone-500">{COPY[section].hint}</p>
          <NewEventForm key={`${section}-${wanted?.id ?? ""}`} section={section} venues={places} defaultVenueId={wanted?.id} />
        </section>
      )}
      {events.length > 0 && !expired && !free && !lite && <SamplesLink />}
      {trashed.length > 0 && (
        <details className="mt-8 rounded-2xl border border-stone-200 bg-white p-4">
          <summary className="cursor-pointer font-medium">Papelera ({trashed.length})</summary>
          <p className="mt-1 text-sm text-stone-500">Lo que borras se queda aquí 30 días y después se borra para siempre.</p>
          <ul className="mt-3 space-y-2">
            {trashed.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.title}</p>
                  <p className="truncate text-stone-500">
                    {t.venueName} · borrado el {formatDate(t.deletedAt!)} · quedan {trashDaysLeft(t.deletedAt!)} días
                  </p>
                </div>
                <form action={restoreEventAction}>
                  <input type="hidden" name="eventId" value={t.id} />
                  <button className="h-9 shrink-0 rounded-lg border border-stone-300 px-3 font-medium">Restaurar</button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
