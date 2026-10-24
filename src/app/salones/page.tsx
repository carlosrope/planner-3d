import type { Metadata } from "next";
import { Suspense } from "react";
import { CATALOG_COPY, Catalogo } from "@/components/Catalogo";
import { EsqueletoCatalogo } from "@/components/Esqueleto";

export const metadata: Metadata = {
  title: "Salones de eventos en 3D",
  description: "Recorre los salones de eventos en 3D, prueba el montaje de tu evento y pide informes al salón.",
  alternates: { canonical: "/salones" },
};

export default function SalonesPage() {
  return (
    <Suspense fallback={<EsqueletoCatalogo title={CATALOG_COPY.salon.title} intro={CATALOG_COPY.salon.intro} />}>
      <Catalogo kind="salon" />
    </Suspense>
  );
}
