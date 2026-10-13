import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageLink } from "@/components/PageLink";
import { listOwnedVenues, requireOrg, requireUser } from "@/lib/dal";
import { VENUE_KIND_LABELS, VENUE_STATUS_LABELS, isOwnerKind } from "@/lib/domain";

export const metadata: Metadata = { title: "Mis lugares" };

export default function LugaresPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <Suspense fallback={<p className="text-stone-500">Cargando tus lugares…</p>}>
        <Lugares />
      </Suspense>
    </main>
  );
}

const STATUS_STYLE: Record<string, string> = {
  conversion: "bg-amber-100 text-amber-900",
  revision: "bg-sky-100 text-sky-900",
  publicado: "bg-emerald-100 text-emerald-900",
  retirado: "bg-stone-200 text-stone-700",
};

async function Lugares() {
  const user = await requireUser("/lugares");
  const org = await requireOrg(user);
  const venues = await listOwnedVenues(org.id);
  const owner = isOwnerKind(org.kind);
  return (
    <>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">{org.name}</p>
          <h1 className="text-2xl font-semibold">Mis lugares</h1>
        </div>
        <Link href="/eventos" className="flex h-10 shrink-0 items-center rounded-xl border border-stone-300 px-3 text-sm font-medium active:bg-stone-100">
          Proyectos
        </Link>
      </header>

      {venues.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-stone-300 p-6 text-center">
          <p className="text-stone-600">
            {owner
              ? "Todavía no tienes lugares registrados. Manda el plano y las fotos de tu salón o de tus modelos y los ponemos en 3D."
              : "Esta sección es para salones y desarrolladoras: aquí ven sus lugares, quién planea en ellos y las solicitudes que reciben."}
          </p>
          <Link href="/alta" className="mt-4 inline-flex h-11 items-center rounded-xl bg-stone-900 px-4 font-medium text-white">
            Registrar un lugar
          </Link>
        </section>
      ) : (
        <ul className="space-y-3">
          {venues.map((v) => {
            const slug = v.slug ?? v.id;
            return (
              <li key={v.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{v.name}</h2>
                    <p className="text-sm text-stone-500">
                      {VENUE_KIND_LABELS[v.kind]} · {v.city}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[v.status]}`}>
                    {VENUE_STATUS_LABELS[v.status]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-stone-600">
                  {v.events} {v.events === 1 ? "evento planeado" : "eventos planeados"} · {v.viewCount} aperturas del 3D
                  {v.pendingInquiries > 0 && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      {v.pendingInquiries} {v.pendingInquiries === 1 ? "solicitud nueva" : "solicitudes nuevas"}
                    </span>
                  )}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Link href={`/lugares/${slug}/panel`} className="flex h-10 items-center justify-center rounded-xl bg-stone-900 text-sm font-medium text-white">
                    Panel
                  </Link>
                  {v.status === "publicado" && v.hasPlan && (
                    <PageLink href={`/lugares/${slug}/3d`} className="flex h-10 items-center justify-center rounded-xl border border-stone-300 text-sm font-medium">
                      Ver en 3D
                    </PageLink>
                  )}
                  {v.status === "publicado" && (
                    <PageLink href={`/lugares/${slug}`} className="flex h-10 items-center justify-center rounded-xl border border-stone-300 text-sm font-medium">
                      Ficha pública
                    </PageLink>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {venues.length > 0 && (
        <p className="mt-6 text-center text-sm">
          <Link href="/alta" className="underline">
            Registrar otro lugar
          </Link>
        </p>
      )}
    </>
  );
}
