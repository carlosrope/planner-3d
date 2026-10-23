import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_WHATSAPP } from "@/lib/brand";
import { waLink } from "@/lib/whatsapp";
import { CASAS_QUOTE_MESSAGE, PROFILES } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Planes y precios",
  description: "Planes de Plantea para planners y salones de eventos, con precios en pesos e IVA incluido, y el plan de Casas para desarrolladoras, inmobiliarias y dueños de casa. La demo es gratis.",
  alternates: { canonical: "/planes" },
};

const FAQ = [
  { q: "¿Hay que instalar algo?", a: "No. Funciona en el navegador del celular, la tablet o la computadora." },
  { q: "¿Mi cliente necesita crear una cuenta?", a: "No. Recibe un enlace de solo vista con tu marca y puede dejarte comentarios." },
  { q: "¿Qué necesitan de mi salón o de mis casas?", a: "El plano (CAD o PDF) o un croquis con medidas y fotos. Lo convertimos a 3D y lo revisas antes de publicarlo." },
  { q: "¿Los precios incluyen IVA?", a: "Sí, todos los precios son en pesos con IVA incluido. Te damos factura." },
  {
    q: "¿Cuánto cuesta poner una casa en 3D?",
    a: "Si construyes casas nuevas, se cotiza por proyecto según cuántos modelos tienes y de cuántas plantas son; los convertimos nosotros desde tu AutoCAD. Si vendes o rentas casas, por casa, con su plano o sus medidas (en Los Mochis la medimos; fuera, se cotiza). Si es tu casa y es un modelo que ya está en Plantea, pídele tu código a la desarrolladora; si no, mándanos su plano y te decimos cuánto cuesta.",
  },
  { q: "¿Cómo sé que Plantea es real?", a: "En plantea.com.mx/nosotros están quién es el responsable, cómo contactarnos y cómo comprobarlo antes de pagar. La demo es gratis y sin cuenta." },
  {
    q: "¿Cómo pago?",
    a: "Desde tu cuenta en Plantea: con tarjeta por Mercado Pago (el mensual se cobra solo y lo cancelas cuando quieras; tu plan se activa al aprobarse el pago) o por transferencia (SPEI), subiendo el comprobante; esa la activamos el mismo día hábil.",
  },
];

export default function PlanesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-8">
      <p className="text-sm font-medium uppercase tracking-wider text-[#a4552d]">Planes y precios</p>
      <h1 className="mt-2 text-3xl font-semibold">La demo es gratis. Tu espacio real va con plan.</h1>
      <p className="mt-2 text-stone-600">Precios al mes, en pesos, con IVA incluido. Las casas se cotizan por proyecto o por casa.</p>

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
          {p.intro && <p className="mt-1 text-stone-600">{p.intro}</p>}
          <div className={`mt-4 grid gap-4 ${p.plans.length > 2 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
            {p.plans.map((plan) => (
              <div key={plan.name} className={`relative flex flex-col rounded-2xl border bg-white p-5 ${plan.featured ? "border-[#b5653a] ring-1 ring-[#b5653a]" : "border-stone-200"}`}>
                {plan.featured && plan.name === "Ilimitado" && (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-[#a4552d] px-2.5 py-0.5 text-xs font-semibold text-white">Recomendado</span>
                )}
                <p className="font-semibold">{plan.name}</p>
                <p className="mt-1">
                  <span className={plan.quote ? "text-2xl font-semibold" : "text-3xl font-semibold"}>{plan.price}</span>
                  {!plan.quote && <span className="text-sm text-stone-500"> al mes</span>}
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-stone-700">
                  {plan.points.map((pt) => (
                    <li key={pt} className="flex gap-2">
                      <span aria-hidden="true" className="text-[#a4552d]">
                        ✓
                      </span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {p.plans.some((plan) => plan.quote) && (
            <a
              href={waLink(CONTACT_WHATSAPP, CASAS_QUOTE_MESSAGE)}
              target="_blank"
              rel="noopener"
              className="mt-4 inline-flex h-12 items-center rounded-xl bg-[#a4552d] px-5 font-semibold text-white hover:bg-[#8f4a26]"
            >
              Pedir una propuesta con mis planos
            </a>
          )}
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
        <b>Plan Personal, $250 al mes:</b> para quien organiza su propia fiesta sin código de un salón; un evento activo a la vez.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={waLink(CONTACT_WHATSAPP, "Hola, quiero una cuenta de Plantea.")}
          target="_blank"
          rel="noopener"
          className="inline-flex h-12 items-center rounded-xl bg-[#a4552d] px-5 font-semibold text-white hover:bg-[#8f4a26]"
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
