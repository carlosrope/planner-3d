import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageLink } from "@/components/PageLink";
import { getVenueForReview } from "@/lib/dal";
import { VENUE_STATUS_LABELS } from "@/lib/domain";
import { PROLINK_WHATSAPP } from "@/lib/prolink";
import { waLink } from "@/lib/whatsapp";
import { ReviewForms } from "./ReviewForms";

export const metadata: Metadata = { title: "Revisa tu lugar" };

export default function RevisarPage({ params }: PageProps<"/revisar/[token]">) {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
        <Revision params={params} />
      </Suspense>
    </main>
  );
}

async function Revision({ params }: { params: PageProps<"/revisar/[token]">["params"] }) {
  const { token } = await params;
  const v = await getVenueForReview(token);
  if (!v) notFound();
  const slug = v.slug ?? v.id;
  const salon = v.kind === "salon";
  const what = salon ? "tu salón" : "tu modelo";
  const ask = waLink(PROLINK_WHATSAPP, `Hola, tengo una duda sobre ${v.name} en Plantea.`);

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-wider text-stone-500">Plantea · revisión</p>
      <h1 className="mt-1 text-2xl font-semibold">{v.name}</h1>
      <p className="mt-1 text-stone-500">
        {v.city} · <span className="font-medium text-stone-700">{VENUE_STATUS_LABELS[v.status]}</span>
      </p>

      {v.photos.length > 0 && (
        <ul className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
          {v.photos.map((p) => (
            <li key={p.id} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- fotos guardadas en la base, servidas por la app */}
              <img src={`/lugares/${slug}/foto/${p.id}`} alt="" className="h-24 w-32 rounded-xl object-cover" />
            </li>
          ))}
        </ul>
      )}

      {v.status === "publicado" && (
        <section className="mt-6 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          <h2 className="text-lg font-semibold">Ya está publicado</h2>
          <p className="text-sm">Este es tu enlace para mandar a tus clientes, y tu QR para el salón o tus folletos.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <PageLink href={`/lugares/${slug}/3d`} className="flex h-12 items-center justify-center rounded-xl bg-emerald-700 font-medium text-white">
              Míralo en 3D
            </PageLink>
            <PageLink href={`/lugares/${slug}/letrero`} className="flex h-12 items-center justify-center rounded-xl border border-emerald-700 bg-white font-medium">
              Letrero con QR para imprimir
            </PageLink>
          </div>
          <p className="text-sm">
            Ficha pública: <PageLink href={`/lugares/${slug}`} className="underline">/lugares/{slug}</PageLink>
          </p>
        </section>
      )}

      {v.status === "revision" && v.hasPlan && (
        <section className="mt-6 space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Así quedó {what} en 3D</h2>
          <p className="text-sm text-stone-600">
            Ábrelo, recórrelo y revisa que los muros, las puertas, las columnas y las medidas estén bien. Si todo está en
            orden, confírmalo y queda publicado. Si hay algo que corregir, cuéntanos qué y lo ajustamos.
          </p>
          <PageLink href={`/lugares/${slug}/3d?r=${token}`} className="flex h-12 items-center justify-center rounded-xl bg-stone-900 font-medium text-white">
            Abrir {what} en 3D
          </PageLink>
          <ReviewForms token={token} />
        </section>
      )}

      {v.status === "conversion" && (
        <section className="mt-6 space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Estamos armando {what} en 3D</h2>
          {v.reviewNotes ? (
            <p className="text-sm text-stone-600">
              Recibimos tus correcciones: <i>“{v.reviewNotes}”</i>. Te avisamos por WhatsApp cuando esté la versión corregida.
            </p>
          ) : (
            <p className="text-sm text-stone-600">En cuanto esté, te avisamos por WhatsApp para que lo revises en este mismo enlace.</p>
          )}
        </section>
      )}

      {v.status === "retirado" && (
        <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Este lugar está retirado del catálogo</h2>
          <p className="mt-1 text-sm text-stone-600">Si quieres volver a publicarlo, escríbenos.</p>
        </section>
      )}

      <p className="mt-6 text-center text-sm text-stone-500">
        ¿Dudas?{" "}
        <a href={ask} target="_blank" rel="noopener" className="underline">
          Escríbenos por WhatsApp
        </a>
      </p>
    </>
  );
}
