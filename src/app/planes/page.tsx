import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_WHATSAPP } from "@/lib/brand";
import { waLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Planes y precios",
  description: "Planes de Plantea para salones de eventos, planners, inmobiliarias y desarrolladoras. La demo es gratis; tu espacio real va con plan.",
  alternates: { canonical: "/planes" },
};

const PLANS = [
  {
    module: "Eventos",
    title: "Planner u organizador",
    price: "$790",
    body: "Eventos ilimitados en cualquier salón del catálogo: plano, 3D, invitados, proveedores, hojas y enlace con tu marca. 5 códigos al mes para tus clientes.",
    extra: "O $7,900 al año. Ilimitado, con códigos sin tope: $999 al mes. Hasta 3 personas de tu equipo.",
  },
  {
    module: "Eventos",
    title: "Salón de eventos",
    price: "$790",
    body: "Tu salón en 3D desde tu plano, en el catálogo; eventos ilimitados con tu logo; invita planners y recibe solicitudes por WhatsApp. 50 códigos al mes para quienes rentan contigo.",
    extra: "O $7,900 al año. Ilimitado, con códigos sin tope: $999 al mes. $250 al mes por cada salón adicional.",
  },
  {
    module: "Casas",
    title: "Inmobiliaria o asesor",
    price: "$690",
    body: "Muestra las casas del catálogo con tu marca: amuebladas o sin muebles, pisos con precio, recorrido y enlace para tu cliente.",
    extra: "O $6,900 al año. Casa propia desde plano: $250 cada una.",
  },
  {
    module: "Casas",
    title: "Desarrolladora o constructora",
    price: "$790",
    body: "Un modelo de casa en 3D desde tu CAD, en el catálogo, con tu marca y enlaces para tus asesores y compradores.",
    extra: "O $7,900 al año. $250 al mes por cada modelo adicional.",
  },
];

export default function PlanesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-10">
      <p className="text-sm font-medium uppercase tracking-wider text-[#b5653a]">Planes y precios</p>
      <h1 className="mt-2 text-3xl font-semibold">La demo es gratis. Tu espacio real va con plan.</h1>
      <p className="mt-3 max-w-2xl text-stone-600">
        Dos módulos, Eventos y Casas, y en cada uno un plan para quien usa el catálogo y otro para quien pone su espacio en él. Tu salón o tu modelo
        se convierte desde tu plano, incluido en el plan. Y tus clientes no pagan: con tu código arman su propio evento.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {PLANS.map((p) => (
          <section key={p.title} className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-6">
            <p className="text-xs uppercase tracking-widest text-stone-500">{p.module}</p>
            <h2 className="text-lg font-semibold">{p.title}</h2>
            <p>
              <span className="text-3xl font-semibold">{p.price}</span> <span className="text-sm text-stone-500">MXN al mes</span>
            </p>
            <p className="text-sm text-stone-700">{p.body}</p>
            <p className="mt-auto pt-2 text-sm text-stone-500">{p.extra}</p>
          </section>
        ))}
      </div>

      <p className="mt-6 text-sm text-stone-600">
        <b>Plan Personal, $250 al mes:</b> para quien organiza su fiesta por su cuenta sin código: un evento activo a la vez, con el diseñador completo y
        enlace para compartir (sin logo ni hojas de proveedores). Los dos módulos juntos: 20% de descuento sobre la suma. Precios antes de IVA, con
        factura. Garantía de 15 días en la primera mensualidad.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={waLink(CONTACT_WHATSAPP, "Hola, quiero una cuenta de Plantea.")}
          target="_blank"
          rel="noopener"
          className="inline-flex h-12 items-center rounded-xl bg-[#b5653a] px-5 font-semibold text-white hover:bg-[#a4552d]"
        >
          Pedir mi cuenta por WhatsApp
        </a>
        <Link href="/disenador/salon-demo" className="inline-flex h-12 items-center rounded-xl border border-stone-300 px-5 font-medium text-stone-800">
          Probar la demo gratis
        </Link>
      </div>
      <p className="mt-3 text-sm text-stone-500">Te abrimos la cuenta el mismo día.</p>
    </main>
  );
}
