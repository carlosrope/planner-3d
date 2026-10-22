import type { Metadata } from "next";
import { Suspense } from "react";
import { Catalogo } from "@/components/Catalogo";
import { cityFromSlug } from "@/lib/slug";
import { listCatalog, listCatalogCities } from "@/lib/dal";
import { shownCapacities } from "@/lib/designer/capacity";
import { banquetRange, cityMeta } from "@/lib/seo-text";

export async function generateMetadata({ params }: PageProps<"/casas/[ciudad]">): Promise<Metadata> {
  const { ciudad } = await params;
  // Título, descripción y si se indexa salen de los lugares publicados en esa ciudad (src/lib/seo-text.ts).
  const [venues, cities] = await Promise.all([listCatalog("casa", ciudad), listCatalogCities("casa")]);
  const city = cities.find((c) => c.slug === ciudad)?.city ?? cityFromSlug(ciudad);
  const range = banquetRange(venues.map((v) => shownCapacities(v.capacityAuto, v.capacityManual, v.capacity).find((c) => c.template === "redondas")?.value));
  const { title, description } = cityMeta("casa", city, venues.length, range);
  return {
    title,
    description,
    alternates: { canonical: `/casas/${ciudad}` },
    // Una ciudad sin lugares publicados no se indexa (página casi vacía).
    ...(venues.length ? {} : { robots: { index: false, follow: true } }),
  };
}

export default function CasasCiudadPage({ params }: PageProps<"/casas/[ciudad]">) {
  return (
    <Suspense fallback={<p className="p-6 text-stone-500">Cargando modelos…</p>}>
      <Ciudad params={params} />
    </Suspense>
  );
}

async function Ciudad({ params }: { params: PageProps<"/casas/[ciudad]">["params"] }) {
  const { ciudad } = await params;
  return <Catalogo kind="casa" citySlug={ciudad} />;
}
