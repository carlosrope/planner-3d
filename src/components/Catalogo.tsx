import Link from "next/link";
import { CompareSlider } from "./CompareSlider";
import { PageLink } from "@/components/PageLink";
import { listCatalog, listCatalogCities, type CatalogVenue } from "@/lib/dal";
import type { VenueKind } from "@/lib/domain";
import { cityFromSlug } from "@/lib/slug";

const COPY: Record<VenueKind, { title: string; intro: string; empty: string; base: string; cta: string }> = {
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
    cta: "¿Vendes casas? Registra tus modelos y los ponemos en 3D.",
  },
};

/** Catálogo público de un tipo de lugar, en todas las ciudades o en una (slug). */
export async function Catalogo({ kind, citySlug }: { kind: VenueKind; citySlug?: string }) {
  const copy = COPY[kind];
  const [venues, cities] = await Promise.all([listCatalog(kind, citySlug), listCatalogCities(kind)]);
  const cityName = citySlug ? (cities.find((c) => c.slug === citySlug)?.city ?? cityFromSlug(citySlug)) : null;
  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-stone-500">Plantea</p>
      <h1 className="mt-1 text-2xl font-semibold">
        {copy.title}
        {cityName ? ` en ${cityName}` : ""}
      </h1>
      <p className="mt-2 text-stone-600">{copy.intro}</p>

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
          {venues.map((v) => (
            <li key={v.id}>
              <Tarjeta v={v} />
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

export function Tarjeta({ v }: { v: CatalogVenue }) {
  const slug = v.slug ?? v.id;
  const facts = [
    v.kind === "salon" && v.capacity ? `${v.capacity} personas` : null,
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
        />
      ) : (
        <PageLink href={`/lugares/${slug}`} className="block">
          {v.cover ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- fotos guardadas en la base, servidas por la app */}
              <img src={`/lugares/${slug}/foto/${v.cover}`} alt={v.name} className="aspect-[4/3] w-full object-cover" loading="lazy" />
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
