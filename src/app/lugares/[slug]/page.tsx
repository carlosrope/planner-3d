import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CodeInput } from "@/components/CodeInput";
import { CompareSlider } from "@/components/CompareSlider";
import { PageLink } from "@/components/PageLink";
import { getPublicVenue, getVenueBasics } from "@/lib/dal";
import { sectionOf } from "@/lib/domain";
import { waLink } from "@/lib/whatsapp";
import { InquiryForm } from "./InquiryForm";
import { SHARE_IMAGE, SITE_URL, jsonLd, venueJsonLd } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/lugares/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const v = await getVenueBasics(slug);
  if (!v || v.status !== "publicado") return { title: "Lugar no encontrado" };
  const title = `${v.name} en 3D`;
  const description = v.kind === "salon" ? `Recorre ${v.name} en 3D y prueba el montaje de tu evento.` : `Recorre ${v.name} en 3D y cámbiale muebles y pisos.`;
  const key = v.slug ?? v.id;
  // Vista previa al compartir el enlace o el QR por WhatsApp: la foto de fuera, la portada (foto o vista 3D automática)
  // o, si todavía no tiene, la imagen general de Plantea (de esa sí se saben las medidas).
  const own = v.outside ?? v.cover;
  const fallback = v.kind === "salon" ? SHARE_IMAGE.salon : SHARE_IMAGE.casa;
  const image = own ? { url: `${SITE_URL}/lugares/${key}/foto/${own}`, alt: title } : { ...fallback, alt: title };
  return {
    title,
    description,
    alternates: { canonical: `/lugares/${key}` },
    openGraph: { title, description, type: "website", locale: "es_MX", siteName: "Plantea", url: `${SITE_URL}/lugares/${key}`, images: [image] },
    twitter: { card: "summary_large_image" },
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
  const outside = v.photos.find((p) => p.kind === "foto" && p.side === "fuera");
  const inside = v.photos.find((p) => p.kind === "foto" && p.side === "dentro");
  const pair = outside && inside ? [outside, inside] : null;
  const [cover, ...others] = v.photos;
  // Con la pareja fuera/dentro arriba, las miniaturas son las demás fotos.
  const rest = pair ? v.photos.filter((p) => p.id !== outside!.id && p.id !== inside!.id) : others;
  const ld = venueJsonLd({
    kind: v.kind,
    name: v.name,
    slug,
    city: v.city,
    address: v.address,
    description: v.description,
    capacity: v.capacity,
    image: (outside ?? cover) ? `${SITE_URL}/lugares/${slug}/foto/${(outside ?? cover)!.id}` : null,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
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
          {pair ? (
            <CompareSlider
              outside={`/lugares/${slug}/foto/${outside!.id}`}
              inside={`/lugares/${slug}/foto/${inside!.id}`}
              place={salon ? "Salón" : "Casa"}
              name={v.name}
              illustrative={pair.some((p) => p.illustrative)}
              className="aspect-[4/3] sm:aspect-[16/10]"
              rounded="rounded-[25px]"
            />
          ) : (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- fotos guardadas en la base, servidas por la app */}
              <img src={`/lugares/${slug}/foto/${cover.id}`} alt={v.name} className="aspect-[16/10] w-full rounded-2xl object-cover" />
              {cover.kind === "render" && <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">Vista 3D</span>}
              {cover.kind === "foto" && cover.illustrative && (
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-stone-800">Imagen ilustrativa</span>
              )}
            </div>
          )}
          {rest.length > 0 && (
            <ul className="grid grid-cols-4 gap-2">
              {rest.slice(0, 8).map((p) => (
                <li key={p.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- fotos guardadas en la base, servidas por la app */}
                  <img src={`/lugares/${slug}/foto/${p.id}`} alt={p.kind === "render" ? "Plano 2D" : ""} className="aspect-square w-full rounded-xl object-cover" loading="lazy" />
                  {p.kind === "render" && <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white">{p.name.startsWith("vista-3d") ? "3D" : "Plano"}</span>}
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
          <p className="mt-3 text-sm font-medium text-stone-800">Tu código</p>
          <div className="mt-1.5 flex items-start gap-2">
            <CodeInput name="codigo" required />
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
        <Link href="/" className="underline">
          Plantea
        </Link>
        {" · "}
        <Link href="/alta" className="underline">
          Registra tu lugar
        </Link>
      </p>
    </>
  );
}
