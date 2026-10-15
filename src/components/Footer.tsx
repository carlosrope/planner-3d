import Link from "next/link";
import { PARTNER_SITE } from "@/lib/brand";

/** Pie de toda la app: la marca, "Hecho por ProLink365" y los enlaces de siempre. */
export function Footer() {
  return (
    <footer className="mt-16 border-t border-stone-200 bg-[#f3ece2]">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- logo en SVG */}
          <img src="/marca/plantea-horizontal-color.svg" alt="Plantea" className="h-7 w-auto" />
          <p className="mt-2 max-w-md text-sm text-stone-600">
            Plantea tu evento o tu casa en 3D antes de vivirlo. Salones y casas reales de México, desde el celular.
          </p>
          <p className="mt-3 text-sm text-stone-600">
            Hecho por{" "}
            <a href={PARTNER_SITE} target="_blank" rel="noopener" className="font-semibold text-[#0d8a4f]">
              ProLink365
            </a>
            {" · "}Automatización empresarial con IA · México
          </p>
        </div>
        <nav className="grid gap-1 text-sm sm:text-right" aria-label="Más">
          <Link href="/salones" className="text-stone-700 hover:underline">
            Salones en 3D
          </Link>
          <Link href="/casas" className="text-stone-700 hover:underline">
            Modelos de casa
          </Link>
          <Link href="/alta" className="text-stone-700 hover:underline">
            Registra tu lugar
          </Link>
          <Link href="/planes" className="text-stone-700 hover:underline">
            Planes y precios
          </Link>
          <Link href="/privacidad" className="text-stone-500 hover:underline">
            Aviso de privacidad
          </Link>
          <Link href="/terminos" className="text-stone-500 hover:underline">
            Términos de servicio
          </Link>
        </nav>
      </div>
    </footer>
  );
}
