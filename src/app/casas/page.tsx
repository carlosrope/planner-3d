import type { Metadata } from "next";
import { Suspense } from "react";
import { Catalogo } from "@/components/Catalogo";

export const metadata: Metadata = {
  title: "Modelos de casa en 3D",
  description: "Recorre los modelos de casa en 3D, cámbiales muebles y pisos, y pide informes a la desarrolladora.",
  alternates: { canonical: "/casas" },
};

export default function CasasPage() {
  return (
    <Suspense fallback={<p className="p-6 text-stone-500">Cargando modelos…</p>}>
      <Catalogo kind="casa" />
    </Suspense>
  );
}
