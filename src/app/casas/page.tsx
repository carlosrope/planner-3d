import type { Metadata } from "next";
import { Suspense } from "react";
import { CATALOG_COPY, Catalogo } from "@/components/Catalogo";
import { EsqueletoCatalogo } from "@/components/Esqueleto";

export const metadata: Metadata = {
  title: "Modelos de casa en 3D",
  description: "Recorre los modelos de casa en 3D, cámbiales muebles y pisos, y pide informes a la desarrolladora.",
  alternates: { canonical: "/casas" },
};

export default function CasasPage() {
  return (
    <Suspense fallback={<EsqueletoCatalogo title={CATALOG_COPY.casa.title} intro={CATALOG_COPY.casa.intro} />}>
      <Catalogo kind="casa" />
    </Suspense>
  );
}
