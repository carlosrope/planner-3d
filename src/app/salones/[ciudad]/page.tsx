import type { Metadata } from "next";
import { Suspense } from "react";
import { Catalogo } from "@/components/Catalogo";
import { cityFromSlug } from "@/lib/slug";
import { listCatalog, listCatalogCities } from "@/lib/dal";
import { shownCapacities } from "@/lib/designer/capacity";
import { banquetRange, cityMeta } from "@/lib/seo-text";

export async function generateMetadata({ params }: PageProps<"/salones/[ciudad]">): Promise<Metadata> {
  const { ciudad } = await params;
  // Título, descripción y si se indexa salen de los lugares publicados en esa ciudad (src/lib/seo-text.ts).
  const [venues, cities] = await Promise.all([listCatalog("salon", ciudad), listCatalogCities("salon")]);
  const city = cities.find((c) => c.slug === ciudad)?.city ?? cityFromSlug(ciudad);
  const range = banquetRange(venues.map((v) => shownCapacities(v.capacityAuto, v.capacityManual, v.capacity).find((c) => c.template === "redondas")?.value));
  const { title, description } = cityMeta("salon", city, venues.length, range);
  return {
    title,
    description,
    alternates: { canonical: `/salones/${ciudad}` },
    // Una ciudad sin lugares publicados no se indexa (página casi vacía).
    ...(venues.length ? {} : { robots: { index: false, follow: true } }),
  };
}

export default function SalonesCiudadPage({ params }: PageProps<"/salones/[ciudad]">) {
  return (
    <Suspense fallback={<p className="min-h-svh p-6 text-stone-500">Cargando salones…</p>}>
      <Ciudad params={params} />
    </Suspense>
  );
}

async function Ciudad({ params }: { params: PageProps<"/salones/[ciudad]">["params"] }) {
  const { ciudad } = await params;
  return <Catalogo kind="salon" citySlug={ciudad} />;
}
