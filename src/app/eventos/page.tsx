import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageLink } from "@/components/PageLink";
import { getReferralOrigin, listEvents, listVenues, requireOrg, requireUser } from "@/lib/dal";
import { EVENT_KIND_LABELS, EVENT_STATUS_LABELS, PLAN_LABELS, SECTIONS, activeModules, isLitePlan, isOwnerKind, sectionOf, type Section } from "@/lib/domain";
import { NewEventForm } from "./NewEventForm";
import { SignOutButton } from "./SignOutButton";
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

const fecha = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fechaPlan = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long" });
const WHATSAPP_PROLINK = "https://wa.me/526681305828?text=Hola%2C%20quiero%20activar%20mi%20plan%20de%20Espacios%203D";

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
  const expired = active.length === 0;
  const visible: Section[] = expired ? org.modules : active;
  // Con código: solo el lugar del código y un solo evento. Personal: un evento activo a la vez.
  const origin = await getReferralOrigin(org);
  const [events, venues] = await Promise.all([listEvents(org.id), listVenues(org.id, origin?.venueId)]);
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
  const planName = origin ? `Con código de ${origin.issuerName}` : PLAN_LABELS[org.plan];
  const planLine = org.planEndsAt
    ? `${planName} · ${expired ? "terminó el" : "hasta el"} ${fechaPlan.format(org.planEndsAt)}`
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
        <div className="flex shrink-0 items-center gap-2">
          {isOwnerKind(org.kind) && (
            <Link
              href="/lugares"
              className="flex h-10 items-center rounded-xl border border-stone-300 px-3 text-sm font-medium active:bg-stone-100"
            >
              Mis lugares
            </Link>
          )}
          <Link
            href="/negocio"
            className="flex h-10 items-center rounded-xl border border-stone-300 px-3 text-sm font-medium active:bg-stone-100"
          >
            Mi negocio
          </Link>
          <SignOutButton />
        </div>
      </header>

      {expired && (
        <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
          <h2 className="text-lg font-semibold">Tu plan terminó</h2>
          <p className="mt-1 text-sm">
            Tus proyectos siguen guardados, pero ya no se pueden abrir ni crear nuevos. Escríbenos y lo activamos el mismo día.
          </p>
          <a
            href={WHATSAPP_PROLINK}
            target="_blank"
            rel="noopener"
            className="mt-3 inline-flex h-11 items-center rounded-xl bg-red-700 px-4 text-sm font-medium text-white active:bg-red-800"
          >
            Activar mi plan por WhatsApp
          </a>
        </section>
      )}

      {events.length === 0 && !expired && !lite && <Welcome modules={active} />}
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

      {!expired && limitReached && (
        <p className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
          {org.plan === "invitado"
            ? "Tu código cubre un solo evento: ábrelo arriba para seguir trabajando en él."
            : "El plan Personal incluye un evento activo a la vez. Marca el anterior como realizado o cancelado para crear otro."}
        </p>
      )}
      {!expired && !limitReached && (
        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="mb-1 text-lg font-semibold">{COPY[section].title}</h2>
          <p className="mb-4 text-sm text-stone-500">{COPY[section].hint}</p>
          <NewEventForm key={`${section}-${wanted?.id ?? ""}`} section={section} venues={places} defaultVenueId={wanted?.id} />
        </section>
      )}
      {events.length > 0 && !expired && !lite && <SamplesLink />}
    </>
  );
}
