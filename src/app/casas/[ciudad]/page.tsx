import type { Metadata } from "next";
import { Suspense } from "react";
import { Catalogo } from "@/components/Catalogo";
import { cityFromSlug } from "@/lib/slug";

export async function generateMetadata({ params }: PageProps<"/casas/[ciudad]">): Promise<Metadata> {
  const { ciudad } = await params;
  const city = cityFromSlug(ciudad);
  return {
    title: `Modelos de casa en ${city} en 3D`,
    description: `Recorre los modelos de casa de ${city} en 3D y pide informes a la desarrolladora.`,
    alternates: { canonical: `/casas/${ciudad}` },
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
