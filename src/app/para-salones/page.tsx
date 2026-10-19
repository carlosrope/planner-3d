import type { Metadata } from "next";
import Link from "next/link";
import { PageLink } from "@/components/PageLink";
import { CONTACT_WHATSAPP } from "@/lib/brand";
import { waLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Para dueños de salón",
  description: "Tu salón de eventos en 3D en el catálogo de Plantea: nos mandas el plano y en 7 días tienes enlace, QR y solicitudes por WhatsApp. Precios con IVA incluido.",
  alternates: { canonical: "/para-salones" },
};

const RECIBES = [
  { t: "Tu salón en 3D", p: "Recorrible desde el celular, con tu logo y tu WhatsApp." },
  { t: "Enlace, QR y letrero", p: "Para tus redes, tu mostrador y la entrada del salón." },
  { t: "Ficha en el catálogo", p: "Con tus fotos; las solicitudes de informes te llegan por WhatsApp." },
  { t: "Tus clientes arman su evento", p: "10 códigos al mes: quien renta contigo acomoda sus mesas e invitados sin pagar." },
  { t: "Planners invitadas", p: "Las planners con las que trabajas montan sus eventos en tu salón." },
  { t: "Tu panel", p: "Solicitudes, eventos planeados en tu salón y un reporte de 6 meses." },
];

const PLANO = [
  { t: "Plano CAD o PDF", p: "El arquitectónico o el de Protección Civil sirve." },
  { t: "Croquis con medidas", p: "Hecho a mano, con fotos de cada lado del salón." },
  { t: "Sin plano", p: "En Los Mochis, un arquitecto va a medir tu salón sin costo extra. En otras ciudades necesitamos el plano; el de Protección Civil sirve." },
];

const PASOS = [
  { n: "1", t: "Registras tu salón", p: "Subes el plano o el croquis, fotos, aforo y tu contacto." },
  { n: "2", t: "Lo convertimos a 3D", p: "En 7 días desde que tenemos el plano. Está incluido en tu plan." },
  { n: "3", t: "Lo revisas y confirmas", p: "Te mandamos un enlace privado; pides cambios o lo apruebas." },
  { n: "4", t: "Se publica", p: "Aparece en el catálogo y ya puedes compartir su enlace y su QR." },
];

const FAQ = [
  { q: "¿Mis clientes tienen que pagar?", a: "No. Con un código tuyo crean su cuenta y arman su evento en tu salón sin costo; lo cubre tu plan." },
  { q: "¿Hay que instalar algo?", a: "No. Funciona en el navegador del celular, la tablet o la computadora." },
  { q: "¿Las medidas son exactas?", a: "Salen de tu plano. Muebles y acabados son una representación ilustrativa." },
  { q: "¿Tengo varios salones?", a: "Cada salón adicional cuesta $250 al mes, con IVA incluido." },
];

export default function ParaSalonesPage() {
  const whatsapp = waLink(CONTACT_WHATSAPP, "Hola, quiero mi salón en 3D en Plantea.");
  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <p className="text-sm font-medium uppercase tracking-wider text-[#b5653a]">Para dueños de salón</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">Tu salón en 3D, listo para que te lo renten.</h1>
      <p className="mt-3 text-lg text-stone-600">Nos mandas tu plano y en 7 días tienes tu salón en 3D, con enlace, QR y tu lugar en el catálogo.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/alta" className="flex h-12 items-center justify-center rounded-xl bg-[#b5653a] px-5 font-semibold text-white hover:bg-[#a4552d]">
          Registrar mi salón
        </Link>
        <PageLink href="/disenador/salon-demo" className="flex h-12 items-center justify-center rounded-xl border border-stone-900 bg-white px-5 font-semibold text-stone-900 hover:bg-stone-50">
          Mira un salón en 3D
        </PageLink>
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Qué recibes</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {RECIBES.map((r) => (
            <li key={r.t} className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="font-semibold">{r.t}</p>
              <p className="mt-1 text-sm text-stone-600">{r.p}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Qué nos mandas</h2>
        <p className="mt-1 text-stone-600">Una de estas tres:</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {PLANO.map((p) => (
            <li key={p.t} className="rounded-2xl bg-[#f3ece2] p-4">
              <p className="font-semibold">{p.t}</p>
              <p className="mt-1 text-sm text-stone-700">{p.p}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Cómo funciona</h2>
        <ol className="mt-4 space-y-3">
          {PASOS.map((s) => (
            <li key={s.n} className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-4">
              <span className="font-display text-2xl font-bold text-[#b5653a]">{s.n}</span>
              <div>
                <p className="font-semibold">{s.t}</p>
                <p className="text-sm text-stone-600">{s.p}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 rounded-2xl border border-[#b5653a] bg-white p-5">
        <h2 className="text-xl font-semibold">Precio</h2>
        <p className="mt-2">
          <span className="text-3xl font-semibold">$790</span> <span className="text-stone-500">al mes · Salón Pro con 10 códigos</span>
        </p>
        <p className="mt-1 text-stone-600">$999 al mes con códigos sin tope. Precios con IVA incluido.</p>
        <Link href="/planes#salon" className="mt-3 inline-block font-semibold text-[#b5653a] underline">
          Ver el plan completo
        </Link>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Preguntas</h2>
        <div className="mt-3 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
          {FAQ.map((f) => (
            <details key={f.q} className="px-4 py-3">
              <summary className="cursor-pointer font-medium">{f.q}</summary>
              <p className="mt-2 text-sm text-stone-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/alta" className="flex h-12 items-center justify-center rounded-xl bg-[#b5653a] px-5 font-semibold text-white hover:bg-[#a4552d]">
          Registrar mi salón
        </Link>
        <a href={whatsapp} target="_blank" rel="noopener" className="flex h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-5 font-semibold text-stone-900">
          Preguntar por WhatsApp
        </a>
      </div>
    </main>
  );
}
