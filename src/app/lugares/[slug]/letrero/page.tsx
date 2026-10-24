import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPublicVenue } from "@/lib/dal";
import { PrintButton } from "./PrintButton";
import { EsqueletoLista } from "@/components/Esqueleto";

export const metadata: Metadata = { title: "Letrero con QR" };

/** Hoja para imprimir (tamaño carta o A4) con el QR del 3D del lugar. */
export default function LetreroPage({ params }: PageProps<"/lugares/[slug]/letrero">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl p-6">
          <EsqueletoLista filas={1} />
        </div>
      }
    >
      <Letrero params={params} />
    </Suspense>
  );
}

async function Letrero({ params }: { params: PageProps<"/lugares/[slug]/letrero">["params"] }) {
  const { slug: wanted } = await params;
  const v = await getPublicVenue(wanted);
  if (!v) notFound();
  const slug = v.slug ?? v.id;
  const salon = v.kind === "salon";
  const brand = v.owner;
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-6 py-10 text-center print:min-h-0 print:max-w-none print:py-0">
      <div className="w-full rounded-3xl border border-stone-200 bg-white p-8 print:rounded-none print:border-0">
        {brand?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo guardado como data URL
          <img src={brand.logoUrl} alt={brand.name} className="mx-auto mb-4 h-16 object-contain" />
        ) : (
          brand && <p className="mb-4 text-lg font-semibold">{brand.name}</p>
        )}
        <p className="text-sm font-semibold uppercase tracking-wider text-stone-500">{salon ? "Recorre el salón en 3D" : "Recorre la casa en 3D"}</p>
        <h1 className="mt-1 text-3xl font-semibold">{v.name}</h1>
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG generado por la app */}
        <img src={`/lugares/${slug}/qr.svg`} alt="Código QR" className="mx-auto my-6 h-64 w-64" />
        <p className="text-lg font-medium">Escanea y {salon ? "prueba cómo queda tu evento" : "recórrela amueblada"}</p>
        <p className="mt-2 break-all text-sm text-stone-500">/lugares/{slug}/3d</p>
        <p className="mt-6 text-xs text-stone-400">plantea.com.mx</p>
      </div>
      <PrintButton />
    </main>
  );
}
