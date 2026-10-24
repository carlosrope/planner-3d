import Image from "next/image";
import Link from "next/link";
import { CompareSlider } from "./CompareSlider";
import { PageLink } from "@/components/PageLink";
import { listCatalog, listCatalogCities, type CatalogVenue } from "@/lib/dal";
import type { VenueKind } from "@/lib/domain";
import { cityFromSlug } from "@/lib/slug";
import { capacityFact, shownCapacities } from "@/lib/designer/capacity";
import { banquetRange, cityMeta } from "@/lib/seo-text";
import { breadcrumbJsonLd, itemListJsonLd, jsonLd } from "@/lib/site";

/** Títulos y textos del catálogo (también los usa su esqueleto de carga). */
export const CATALOG_COPY: Record<VenueKind, { title: string; intro: string; empty: string; base: string; cta: string }> = {
  salon: {
    title: "Salones de eventos en 3D",
    intro: "Recorre cada salón en 3D, prueba cómo quedan las mesas y pide informes directo al salón.",
    empty: "Todavía no hay salones publicados en esta ciudad.",
    base: "/salones",
    cta: "¿Tienes un salón? Regístralo y lo ponemos en 3D.",
  },
  casa: {
    title: "Modelos de casa en 3D",
    intro: "Recorre cada modelo en 3D, cámbiale muebles y pisos, y pide informes a la desarrolladora.",
    empty: "Todavía no hay modelos publicados en esta ciudad.",
    base: "/casas",
    cta: "¿Vendes o construyes casas? Regístralas y las ponemos en 3D.",
  },
};

/** Catálogo público de un tipo de lugar, en todas las ciudades o en una (slug). */
export async function Catalogo({ kind, citySlug }: { kind: VenueKind; citySlug?: string }) {
  const copy = CATALOG_COPY[kind];
  const [venues, cities] = await Promise.all([listCatalog(kind, citySlug), listCatalogCities(kind)]);
  const cityName = citySlug ? (cities.find((c) => c.slug === citySlug)?.city ?? cityFromSlug(citySlug)) : null;
  const shown = venues.map((v) => ({ v, caps: shownCapacities(v.capacityAuto, v.capacityManual, v.capacity) }));
  // En la página de una ciudad, un párrafo propio (cuántos hay y de cuántos invitados) y los datos para buscadores.
  const city = cityName ? cityMeta(kind, cityName, venues.length, banquetRange(shown.map((x) => x.caps.find((c) => c.template === "redondas")?.value))) : null;
  const title = `${copy.title}${cityName ? ` en ${cityName}` : ""}`;
  const ld = [
    itemListJsonLd(title, venues.map((v) => ({ name: v.name, slug: v.slug ?? v.id }))),
    breadcrumbJsonLd([
      { name: "Plantea", path: "/" },
      { name: kind === "salon" ? "Salones" : "Modelos de casa", path: copy.base },
      ...(cityName && citySlug ? [{ name: cityName, path: `${copy.base}/${citySlug}` }] : []),
    ]),
  ];
  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-6">
      {venues.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />}
      <p className="text-sm font-semibold uppercase tracking-wider text-stone-500">Plantea</p>
      <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-stone-600">{city?.intro || copy.intro}</p>

      {cities.length > 1 && (
        <nav className="mt-4 flex gap-2 overflow-x-auto no-scrollbar" aria-label="Ciudades">
          <Link href={copy.base} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${!citySlug ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white"}`}>
            Todas
          </Link>
          {cities.map((c) => (
            <Link
              key={c.slug}
              href={`${copy.base}/${c.slug}`}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${citySlug === c.slug ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white"}`}
            >
              {c.city} <span className="opacity-70">{c.total}</span>
            </Link>
          ))}
        </nav>
      )}

      {venues.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-stone-300 p-8 text-center text-stone-500">{copy.empty}</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {venues.map((v, i) => (
            <li key={v.id}>
              <Tarjeta v={v} eager={i === 0} />
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10 rounded-2xl bg-stone-900 p-5 text-white">
        <p className="font-medium">{copy.cta}</p>
        <p className="mt-1 text-sm text-stone-300">Mándanos el plano y unas fotos; te mandamos el enlace para revisarlo.</p>
        <Link href="/alta" className="mt-3 inline-flex h-11 items-center rounded-xl bg-white px-4 font-medium text-stone-900">
          Registrar mi lugar
        </Link>
      </section>
    </main>
  );
}

/** `eager`: la tarjeta se ve de entrada (la primera), así que su foto se pide desde el principio y con prioridad. */
export function Tarjeta({ v, eager = false }: { v: CatalogVenue; eager?: boolean }) {
  const slug = v.slug ?? v.id;
  const facts = [
    v.kind === "salon" ? capacityFact(shownCapacities(v.capacityAuto, v.capacityManual, v.capacity), v.capacity) : null,
    v.kind === "casa" && v.areaM2 ? `${v.areaM2} m²` : null,
    v.city,
  ].filter(Boolean);
  return (
    <article className="overflow-hidden rounded-[25px] border border-stone-200 bg-white">
      {v.outside && v.inside ? (
        // Fuera y dentro en el mismo recuadro, con una línea que se arrastra; la ficha se abre con el nombre o con «Ficha».
        <CompareSlider
          outside={`/lugares/${slug}/foto/${v.outside}`}
          inside={`/lugares/${slug}/foto/${v.inside}`}
          place={v.kind === "salon" ? "Salón" : "Casa"}
          name={v.name}
          illustrative={v.sidesIllustrative}
          eager={eager}
        />
      ) : (
        <PageLink href={`/lugares/${slug}`} className="block">
          {v.cover ? (
            <div className="relative">
              <Image
                src={`/lugares/${slug}/foto/${v.cover}`}
                alt={v.name}
                width={1200}
                height={900}
                sizes="(min-width: 1024px) 500px, (min-width: 640px) 50vw, 100vw"
                loading={eager ? "eager" : "lazy"}
                fetchPriority={eager ? "high" : undefined}
                className="aspect-[4/3] w-full object-cover"
              />
              {v.coverIsRender && <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">Vista 3D</span>}
              {!v.coverIsRender && v.coverIsIllustrative && (
                <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-stone-800">Imagen ilustrativa</span>
              )}
            </div>
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center bg-stone-100 text-sm text-stone-500">Sin fotos todavía</div>
          )}
        </PageLink>
      )}
      <div className="p-4">
        <h2 className="font-semibold">
          <PageLink href={`/lugares/${slug}`} className="hover:underline">
            {v.name}
          </PageLink>
        </h2>
        <p className="text-sm text-stone-500">{facts.join(" · ")}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <PageLink href={`/lugares/${slug}/3d`} className="flex h-10 items-center justify-center rounded-xl bg-stone-900 text-sm font-medium text-white">
            Ver en 3D
          </PageLink>
          <PageLink href={`/lugares/${slug}`} className="flex h-10 items-center justify-center rounded-xl border border-stone-300 text-sm font-medium">
            Ficha
          </PageLink>
        </div>
      </div>
    </article>
  );
}
