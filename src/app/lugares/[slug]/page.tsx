import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageLink } from "@/components/PageLink";
import { getPublicVenue, getVenueBasics } from "@/lib/dal";
import { sectionOf } from "@/lib/domain";
import { PROLINK_SITE } from "@/lib/prolink";
import { waLink } from "@/lib/whatsapp";
import { InquiryForm } from "./InquiryForm";

export async function generateMetadata({ params }: PageProps<"/lugares/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const v = await getVenueBasics(slug);
  if (!v || v.status !== "publicado") return { title: "Lugar no encontrado" };
  return {
    title: `${v.name} en 3D`,
    description: v.kind === "salon" ? `Recorre ${v.name} en 3D y prueba el montaje de tu evento.` : `Recorre ${v.name} en 3D y pruébalo amueblado.`,
  };
}

export default function LugarPage({ params }: PageProps<"/lugares/[slug]">) {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
        <Ficha params={params} />
      </Suspense>
    </main>
  );
}

async function Ficha({ params }: { params: PageProps<"/lugares/[slug]">["params"] }) {
  const { slug: wanted } = await params;
  const v = await getPublicVenue(wanted);
  if (!v) notFound();
  const slug = v.slug ?? v.id;
  const salon = v.kind === "salon";
  const whatsapp = v.contactPhone ?? v.owner?.whatsapp ?? null;
  const planHref = `/eventos?lugar=${v.id}${sectionOf(v.kind) === "casas" ? "&seccion=casas" : ""}`;
  const facts = [
    salon && v.capacity ? `Aforo ${v.capacity} personas` : null,
    !salon && v.areaM2 ? `${v.areaM2} m² construidos` : null,
    v.address ? v.address : null,
    v.city,
  ].filter((f): f is string => Boolean(f));
  const [cover, ...rest] = v.photos;

  return (
    <>
      <p className="text-sm text-stone-500">
        <Link href={salon ? "/salones" : "/casas"} className="underline">
          {salon ? "Salones" : "Modelos de casa"}
        </Link>{" "}
        · {v.city}
      </p>
      <h1 className="mt-1 text-2xl font-semibold">{v.name}</h1>
      <p className="text-stone-500">{facts.join(" · ")}</p>

      {cover ? (
        <div className="mt-4 grid gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- fotos guardadas en la base, servidas por la app */}
          <img src={`/lugares/${slug}/foto/${cover.id}`} alt={v.name} className="aspect-[16/10] w-full rounded-2xl object-cover" />
          {rest.length > 0 && (
            <ul className="grid grid-cols-4 gap-2">
              {rest.slice(0, 8).map((p) => (
                <li key={p.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- fotos guardadas en la base, servidas por la app */}
                  <img src={`/lugares/${slug}/foto/${p.id}`} alt="" className="aspect-square w-full rounded-xl object-cover" loading="lazy" />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-4 flex aspect-[16/10] items-center justify-center rounded-2xl bg-stone-100 text-stone-500">Sin fotos todavía</div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <PageLink href={`/lugares/${slug}/3d`} className="flex h-12 items-center justify-center rounded-xl bg-stone-900 font-medium text-white">
          Míralo en 3D
        </PageLink>
        {whatsapp && (
          <a
            href={waLink(whatsapp, `Hola, vi ${v.name} en 3D en Plantea y quiero informes.`)}
            target="_blank"
            rel="noopener"
            className="flex h-12 items-center justify-center rounded-xl bg-[#25d366] font-medium text-white"
          >
            WhatsApp {salon ? "del salón" : "de ventas"}
          </a>
        )}
        <Link href={planHref} className="flex h-12 items-center justify-center rounded-xl border border-stone-900 bg-white font-medium">
          {salon ? "Planear mi evento aquí" : "Planear con este modelo"}
        </Link>
      </div>
      <p className="mt-2 text-sm text-stone-500">
        {salon
          ? "En el 3D puedes mover las mesas para probar ideas; para guardar tu montaje, acomodar invitados y compartirlo necesitas una cuenta."
          : "En el 3D puedes cambiar muebles y pisos; para guardar tus propuestas y compartirlas necesitas una cuenta."}
      </p>

      {salon && (
        <form action="/registro" method="get" className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <h2 className="font-semibold">¿Vas a hacer tu evento aquí?</h2>
          <p className="mt-1 text-sm text-stone-600">
            Si ya apartaste el salón, pídele tu código: con él armas tu evento en 3D sin costo, acomodas a tus invitados y lo compartes con tu familia.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              name="codigo"
              required
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="Código, por ejemplo PALMAS-7K3M"
              className="h-12 min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 text-base uppercase outline-none focus:border-stone-800"
            />
            <button className="h-12 shrink-0 rounded-xl bg-stone-900 px-4 font-medium text-white">Entrar</button>
          </div>
        </form>
      )}

      {v.description && <p className="mt-5 whitespace-pre-line text-stone-700">{v.description}</p>}

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Pedir informes</h2>
        <p className="mb-3 text-sm text-stone-500">
          {whatsapp ? "Te abrimos el WhatsApp del lugar con tus datos ya escritos." : "El lugar recibe tu solicitud en su panel."}
        </p>
        <InquiryForm venueId={v.id} salon={salon} />
      </section>

      <p className="mt-8 text-center text-sm text-stone-500">
        Hecho con{" "}
        <a href={`${PROLINK_SITE}/espacios-3d.html`} className="underline" target="_blank" rel="noopener">
          Plantea · por ProLink365
        </a>
        {" · "}
        <Link href="/alta" className="underline">
          Registra tu lugar
        </Link>
      </p>
    </>
  );
}
