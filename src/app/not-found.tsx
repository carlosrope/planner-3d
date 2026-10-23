import type { Metadata } from "next";
import Link from "next/link";
import { ICONO_WHATSAPP, REDES, RedesIconos } from "@/components/Redes";
import { CONTACT_WHATSAPP } from "@/lib/brand";
import { waLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Página no encontrada", robots: { index: false }, alternates: { canonical: null } };

/** Página para enlaces que no existen: con la marca, en español, y salidas claras a la portada, los salones y las redes. */
export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-4 pb-24 pt-14 text-center sm:pt-20">
      {/* eslint-disable-next-line @next/next/no-img-element -- logo SVG estático */}
      <img src="/marca/plantea-symbol-color.svg" alt="" className="h-16 w-16" />
      <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-[#a4552d]">Error 404</p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">No encontramos esta página</h1>
      <p className="mt-3 text-stone-600">Puede que el enlace esté mal escrito o que ese lugar ya no esté publicado. Desde aquí puedes seguir:</p>
      <div className="mt-7 grid w-full gap-3 sm:grid-cols-2">
        <Link href="/" className="flex h-12 items-center justify-center rounded-xl bg-[#a4552d] font-semibold text-white hover:bg-[#8f4a26]">
          Ir al inicio
        </Link>
        <Link href="/salones" className="flex h-12 items-center justify-center rounded-xl border border-stone-900 bg-white font-semibold hover:bg-stone-50">
          Ver salones en 3D
        </Link>
      </div>
      <p className="mt-10 text-sm font-medium text-stone-700">Síguenos o escríbenos</p>
      <RedesIconos
        className="mt-3"
        redes={[...REDES, { label: "WhatsApp", href: waLink(CONTACT_WHATSAPP, "Hola, llegué a una página de Plantea que no existe."), icon: ICONO_WHATSAPP }]}
      />
    </main>
  );
}
