import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_WHATSAPP } from "@/lib/brand";
import { waLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Planes y precios",
  description: "Planes de Plantea para planners, salones de eventos, inmobiliarias y desarrolladoras. Precios en pesos con IVA incluido. La demo es gratis.",
  alternates: { canonical: "/planes" },
};

// Precios confirmados por el usuario el 15 de octubre de 2026: en pesos, con IVA incluido.
type Plan = { name: string; price: string; points: string[]; featured?: boolean };
type Profile = { id: string; tab: string; title: string; plans: Plan[]; details: string[] };

const PROFILES: Profile[] = [
  {
    id: "planner",
    tab: "Soy planner",
    title: "Planner u organizador de eventos",
    plans: [
      {
        name: "Pro",
        price: "$790",
        featured: true,
        points: ["Eventos ilimitados en cualquier salón del catálogo", "Plano, 3D, invitados, proveedores y hojas para imprimir", "Enlace con tu marca y 5 códigos al mes para tus clientes"],
      },
      { name: "Ilimitado", price: "$999", points: ["Todo lo de Pro", "Códigos sin tope para tus clientes"] },
    ],
    details: ["Pro al año: $7,900 (pagas 10 meses).", "Hasta 3 personas de tu equipo en la misma cuenta."],
  },
  {
    id: "salon",
    tab: "Tengo un salón",
    title: "Salón de eventos",
    plans: [
      {
        name: "Pro",
        price: "$790",
        featured: true,
        points: ["Tu salón en 3D desde tu plano, en el catálogo", "Eventos ilimitados con tu logo; invita a tus planners", "Solicitudes por WhatsApp y 10 códigos al mes para quienes rentan contigo"],
      },
      { name: "Ilimitado", price: "$999", points: ["Todo lo de Pro", "Códigos sin tope para quienes rentan contigo"] },
    ],
    details: ["Pro al año: $7,900 (pagas 10 meses).", "Cada salón adicional: $250 al mes.", "Convertimos tu salón desde tu plano o croquis; está incluido en el plan."],
  },
  {
    id: "casas",
    tab: "Vendo casas",
    title: "Inmobiliarias y desarrolladoras",
    plans: [
      {
        name: "Inmobiliaria o asesor",
        price: "$690",
        featured: true,
        points: ["Las casas del catálogo con tu marca", "Amuebladas o sin muebles, pisos con precio y recorrido", "Enlace para tu cliente con tu WhatsApp"],
      },
      { name: "Desarrolladora o constructora", price: "$790", points: ["Tu modelo de casa en 3D desde tu CAD", "En el catálogo, con enlaces para tus asesores y compradores"] },
    ],
    details: ["Al año: inmobiliaria $6,900 · desarrolladora $7,900.", "Casa propia desde plano (inmobiliaria): $250 cada una.", "Cada modelo adicional (desarrolladora): $250 al mes."],
  },
];

const FAQ = [
  { q: "¿Hay que instalar algo?", a: "No. Funciona en el navegador del celular, la tablet o la computadora." },
  { q: "¿Mi cliente necesita crear una cuenta?", a: "No. Recibe un enlace de solo vista con tu marca y puede dejarte comentarios." },
  { q: "¿Qué necesitan de mi salón o de mis casas?", a: "El plano (CAD o PDF) o un croquis con medidas y fotos. Lo convertimos a 3D y lo revisas antes de publicarlo." },
  { q: "¿Los precios incluyen IVA?", a: "Sí, todos los precios son en pesos con IVA incluido. Te damos factura." },
  { q: "¿Cómo pago?", a: "Por transferencia (SPEI) desde tu cuenta en Plantea; subes el comprobante y activamos tu plan el mismo día." },
];

export default function PlanesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-8">
      <p className="text-sm font-medium uppercase tracking-wider text-[#b5653a]">Planes y precios</p>
      <h1 className="mt-2 text-3xl font-semibold">La demo es gratis. Tu espacio real va con plan.</h1>
      <p className="mt-2 text-stone-600">Precios al mes, en pesos, con IVA incluido.</p>

      <nav aria-label="Elige tu perfil" className="mt-6 grid grid-cols-3 gap-1.5 sm:flex sm:gap-2">
        {PROFILES.map((p) => (
          <a key={p.id} href={`#${p.id}`} className="rounded-full border border-stone-300 bg-white px-2 py-2 text-center text-[13px] font-medium leading-tight text-stone-800 sm:px-4 sm:text-sm">
            {p.tab}
          </a>
        ))}
      </nav>

      {PROFILES.map((p) => (
        <section key={p.id} id={p.id} className="scroll-mt-20 pt-8">
          <h2 className="text-xl font-semibold">{p.title}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {p.plans.map((plan) => (
              <div key={plan.name} className={`flex flex-col rounded-2xl border bg-white p-5 ${plan.featured ? "border-[#b5653a]" : "border-stone-200"}`}>
                <p className="font-semibold">{plan.name}</p>
                <p className="mt-1">
                  <span className="text-3xl font-semibold">{plan.price}</span> <span className="text-sm text-stone-500">al mes</span>
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-stone-700">
                  {plan.points.map((pt) => (
                    <li key={pt} className="flex gap-2">
                      <span aria-hidden="true" className="text-[#b5653a]">
                        ✓
                      </span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <details className="mt-3 rounded-xl bg-white/60 px-4 py-3 text-sm text-stone-600">
            <summary className="cursor-pointer font-medium text-stone-800">Ver detalles</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {p.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </details>
        </section>
      ))}

      <p className="mt-8 rounded-xl bg-stone-100 p-4 text-sm text-stone-700">
        <b>Eventos y Casas juntos:</b> 20% de descuento sobre la suma. <b>Plan Personal, $250 al mes:</b> para quien organiza su propia fiesta sin
        código de un salón; un evento activo a la vez.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
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
      <p className="mt-2 text-sm text-stone-500">Te abrimos la cuenta el mismo día.</p>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Preguntas frecuentes</h2>
        <div className="mt-3 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
          {FAQ.map((f) => (
            <details key={f.q} className="px-4 py-3">
              <summary className="cursor-pointer font-medium">{f.q}</summary>
              <p className="mt-2 text-sm text-stone-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
