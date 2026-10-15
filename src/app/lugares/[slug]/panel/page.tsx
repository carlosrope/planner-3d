import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageLink } from "@/components/PageLink";
import { getOwnedVenue, requireOrg, requireUser } from "@/lib/dal";
import { EVENT_KIND_LABELS, EVENT_STATUS_LABELS, VENUE_STATUS_LABELS } from "@/lib/domain";
import { siteOrigin } from "@/lib/prolink";
import { formatWhatsapp, waLink } from "@/lib/whatsapp";
import { ReferralSection } from "@/app/negocio/ReferralSection";
import { CopyField } from "./CopyField";
import { AccessForms, SeenButton } from "./PanelForms";
import { formatDay, formatInstant } from "@/lib/dates";

export const metadata: Metadata = { title: "Panel del lugar" };

export default function PanelPage({ params }: PageProps<"/lugares/[slug]/panel">) {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
        <Panel params={params} />
      </Suspense>
    </main>
  );
}


async function Panel({ params }: { params: PageProps<"/lugares/[slug]/panel">["params"] }) {
  const user = await requireUser("/lugares");
  const org = await requireOrg(user);
  const { slug: wanted } = await params;
  const v = await getOwnedVenue(org.id, wanted);
  if (!v) notFound();
  const slug = v.slug ?? v.id;
  const origin = siteOrigin();
  const link3d = `${origin}/lugares/${slug}/3d`;
  const salon = v.kind === "salon";
  const pending = v.inquiries.filter((q) => !q.seenAt).length;
  const planos = v.files.filter((f) => f.kind === "plano");

  return (
    <>
      <p className="text-sm text-stone-500">
        <Link href="/lugares" className="underline">
          Mis lugares
        </Link>
      </p>
      <h1 className="mt-1 text-2xl font-semibold">{v.name}</h1>
      <p className="text-stone-500">
        {v.city} · {VENUE_STATUS_LABELS[v.status]} · {v.viewCount} aperturas del 3D
      </p>

      <section className="mt-5 space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Enlace y QR</h2>
        {v.status === "publicado" && v.hasPlan ? (
          <>
            <p className="text-sm text-stone-600">Mándalo a tus clientes o imprime el QR para el salón y tus folletos.</p>
            <CopyField value={link3d} />
            <div className="grid gap-2 sm:grid-cols-3">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Mira ${v.name} en 3D: ${link3d}`)}`}
                target="_blank"
                rel="noopener"
                className="flex h-11 items-center justify-center rounded-xl bg-[#25d366] text-sm font-medium text-white"
              >
                Compartir por WhatsApp
              </a>
              <PageLink href={`/lugares/${slug}/letrero`} className="flex h-11 items-center justify-center rounded-xl border border-stone-300 text-sm font-medium">
                Letrero con QR
              </PageLink>
              <PageLink href={`/lugares/${slug}`} className="flex h-11 items-center justify-center rounded-xl border border-stone-300 text-sm font-medium">
                Ficha pública
              </PageLink>
            </div>
          </>
        ) : v.status === "revision" && v.hasPlan ? (
          <>
            <p className="text-sm text-stone-600">Tu lugar ya está en 3D. Revísalo y confírmalo para que se publique.</p>
            <PageLink href={`/revisar/${v.reviewToken}`} className="flex h-11 items-center justify-center rounded-xl bg-stone-900 text-sm font-medium text-white">
              Revisar y confirmar
            </PageLink>
          </>
        ) : (
          <p className="text-sm text-stone-600">
            {v.reviewNotes ? `Recibimos tus correcciones: “${v.reviewNotes}”. ` : ""}
            Estamos armando el plano 2D y el 3D. Te avisamos por WhatsApp cuando esté para revisarlo.
          </p>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Solicitudes{" "}
            {pending > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">{pending} nuevas</span>}
          </h2>
          {pending > 0 && <SeenButton venueId={v.id} />}
        </div>
        {v.inquiries.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">Cuando alguien pida informes desde tu ficha o tu 3D, lo verás aquí.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100">
            {v.inquiries.map((q) => (
              <li key={q.id} className={`py-3 ${q.seenAt ? "" : "font-medium"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p>
                      {q.name} ·{" "}
                      <a href={waLink(q.phone, `Hola ${q.name}, te escribimos de ${v.name}.`)} target="_blank" rel="noopener" className="underline">
                        {formatWhatsapp(q.phone)}
                      </a>
                    </p>
                    <p className="text-sm font-normal text-stone-500">
                      {[q.eventDate ? formatDay(q.eventDate) : null, q.guests ? `${q.guests} invitados` : null].filter(Boolean).join(" · ")}
                    </p>
                    {q.message && <p className="mt-1 text-sm font-normal text-stone-700">{q.message}</p>}
                  </div>
                  <span className="shrink-0 text-xs font-normal text-stone-400">{formatInstant(q.createdAt, "dateTime")}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="text-lg font-semibold">{salon ? "Eventos planeados aquí" : "Proyectos con este modelo"}</h2>
        {v.events.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">Todavía nadie ha planeado aquí.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-stone-500">
              <tr>
                <th className="py-1 font-medium">Fecha</th>
                <th className="py-1 font-medium">{salon ? "Tipo" : "Proyecto"}</th>
                <th className="py-1 font-medium">{salon ? "Invitados" : ""}</th>
                <th className="py-1 font-medium">Planner</th>
                <th className="py-1 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {v.events.map((e) => (
                <tr key={e.id} className="border-t border-stone-100">
                  <td className="py-2">{e.eventDate ? formatDay(e.eventDate) : "Sin fecha"}</td>
                  <td className="py-2">{EVENT_KIND_LABELS[e.kind]}</td>
                  <td className="py-2">{salon ? (e.guestCount ?? "") : ""}</td>
                  <td className="py-2">{e.mine ? "Tu negocio" : e.orgName}</td>
                  <td className="py-2 text-stone-500">{EVENT_STATUS_LABELS[e.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {v.status === "publicado" && v.hasPlan && <ReferralSection org={org} venues={[{ id: v.id, name: v.name }]} venueId={v.id} />}

      <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Planners con acceso</h2>
        <p className="mt-1 text-sm text-stone-500">
          {v.isPublic
            ? "Tu lugar está abierto a todas las planners del catálogo. Además puedes invitar a alguien por el correo de su cuenta."
            : "Tu lugar solo lo usan las planners que invites por el correo de su cuenta."}
        </p>
        <AccessForms venueId={v.id} access={v.access.map((a) => ({ orgId: a.orgId, orgName: a.orgName }))} />
      </section>

      <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Últimos 6 meses</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-stone-500">
            <tr>
              <th className="py-1 font-medium">Mes</th>
              <th className="py-1 font-medium">{salon ? "Eventos planeados" : "Proyectos"}</th>
              <th className="py-1 font-medium">Solicitudes</th>
            </tr>
          </thead>
          <tbody>
            {v.months.map((m) => (
              <tr key={m.month} className="border-t border-stone-100">
                <td className="py-2 capitalize">{formatDay(`${m.month}-01`, "month")}</td>
                <td className="py-2">{m.events}</td>
                <td className="py-2">{m.inquiries}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Lo que nos mandaste</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {planos.map((f) => (
            <li key={f.id}>
              <a href={`/lugares/${slug}/archivo/${f.id}`} className="underline">
                {f.name}
              </a>{" "}
              <span className="text-stone-400">· {(f.size / 1024 / 1024).toFixed(1)} MB</span>
            </li>
          ))}
          <li className="text-stone-500">
            {v.photos.length} {v.photos.length === 1 ? "foto" : "fotos"}
            {v.contactName ? ` · contacto: ${v.contactName}` : ""}
          </li>
        </ul>
        <p className="mt-2 text-sm text-stone-500">Para cambiar fotos, aforo o descripción, escríbenos por WhatsApp y lo actualizamos.</p>
      </section>
    </>
  );
}
