import type { Metadata } from "next";
import { Suspense } from "react";
import { Catalogo } from "@/components/Catalogo";
import { cityFromSlug } from "@/lib/slug";

export async function generateMetadata({ params }: PageProps<"/salones/[ciudad]">): Promise<Metadata> {
  const { ciudad } = await params;
  const city = cityFromSlug(ciudad);
  return {
    title: `Salones de eventos en ${city} en 3D`,
    description: `Recorre los salones de eventos de ${city} en 3D, prueba el montaje de tu evento y pide informes al salón.`,
  };
}

export default function SalonesCiudadPage({ params }: PageProps<"/salones/[ciudad]">) {
  return (
    <Suspense fallback={<p className="p-6 text-stone-500">Cargando salones…</p>}>
      <Ciudad params={params} />
    </Suspense>
  );
}

async function Ciudad({ params }: { params: PageProps<"/salones/[ciudad]">["params"] }) {
  const { ciudad } = await params;
  return <Catalogo kind="salon" citySlug={ciudad} />;
}
