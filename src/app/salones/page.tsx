import type { Metadata } from "next";
import { Suspense } from "react";
import { Catalogo } from "@/components/Catalogo";

export const metadata: Metadata = {
  title: "Salones de eventos en 3D",
  description: "Recorre los salones de eventos en 3D, prueba el montaje de tu evento y pide informes al salón.",
  alternates: { canonical: "/salones" },
};

export default function SalonesPage() {
  return (
    <Suspense fallback={<p className="p-6 text-stone-500">Cargando salones…</p>}>
      <Catalogo kind="salon" />
    </Suspense>
  );
}
