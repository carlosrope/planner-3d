import Link from "next/link";
import { PageLink } from "@/components/PageLink";
import { jsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/site";

// Portada de Plantea: qué es, pruébalo sin cuenta, cómo funciona, para quién y cómo entra un salón.

const PASOS = [
  { n: "01", t: "Elige el lugar", p: "Un salón o una casa real del catálogo, ya en 3D. Si es tuyo, nos mandas el plano y lo convertimos." },
  { n: "02", t: "Acomoda con el dedo", p: "Mesas, pista, barra, muebles. Plantea arma el primer acomodo según tus invitados y tú lo ajustas." },
  { n: "03", t: "Siéntalos y recórrelo", p: "Pon a tus invitados por mesa, míralo en 3D como si ya estuvieras ahí y compártelo por WhatsApp." },
];

const QUIEN = [
  { t: "Salones de eventos", p: "Tu salón en el catálogo con su enlace y QR; tus clientes arman su fiesta ahí con un código tuyo.", href: "/alta", cta: "Registra tu salón" },
  { t: "Planners y organizadores", p: "Todos tus eventos en cualquier salón: distribuciones A, B y C, hojas para imprimir y el enlace con tu marca.", href: "/registro", cta: "Crear cuenta" },
  { t: "Novios, quinceañeras y familias", p: "Si ya apartaste el salón, pídele tu código: armas tu evento sin costo y lo compartes con tu familia.", href: "/salones", cta: "Buscar mi salón" },
  { t: "Inmobiliarias y desarrolladoras", p: "Cada modelo de casa amueblado, con pisos y recorrido guiado, para mostrarlo con tu marca.", href: "/casas", cta: "Ver modelos" },
];

export default function Home() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd([organizationJsonLd(), websiteJsonLd()]) }} />
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-[48%_52%_40%_60%/55%_45%_55%_45%] bg-[#f3ece2]" aria-hidden="true" />
        <div className="mx-auto grid max-w-5xl items-center gap-8 px-4 pb-12 pt-10 md:grid-cols-[1.05fr_1fr] md:pb-16 md:pt-16">
          <div className="relative">
            <h1 className="text-[2.1rem] font-bold leading-[1.08] text-stone-900 sm:text-5xl" style={{ textWrap: "balance" }}>
              Plantea tu evento o tu casa <span className="text-[#b5653a]">en 3D antes de vivirlo.</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-stone-600">
              Acomoda las mesas sobre el salón real, sienta a tus invitados y recórrelo desde el celular. Para salones, planners, familias e inmobiliarias de Los Mochis.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <PageLink href="/disenador/salon-demo" className="flex h-12 items-center justify-center rounded-xl bg-[#b5653a] px-5 font-semibold text-white shadow-lg shadow-[#b5653a]/25 hover:bg-[#a4552d]">
                Probar con un salón
              </PageLink>
              <PageLink href="/disenador/chardonnay" className="flex h-12 items-center justify-center rounded-xl border border-stone-900 bg-white px-5 font-semibold text-stone-900 hover:bg-stone-50">
                Probar con una casa
              </PageLink>
            </div>
            <p className="mt-3 text-sm text-stone-500">Sin cuenta y sin costo: es un salón y una casa de ejemplo. Nada se guarda.</p>
          </div>
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- captura propia */}
            <img src="/portada/espacios-salon-3d.jpg" alt="Un salón de eventos en 3D con mesas, pista y escenario" width={800} height={575} className="w-full rounded-2xl border border-stone-200 shadow-2xl shadow-stone-900/15" />
            {/* eslint-disable-next-line @next/next/no-img-element -- captura propia */}
            <img src="/portada/espacios-salon-2d.jpg" alt="El mismo salón en plano 2D" width={800} height={575} className="absolute -bottom-6 -left-4 w-[44%] rotate-[-4deg] rounded-xl border border-stone-200 shadow-xl sm:-left-8" />
            <div className="absolute -right-3 -top-3 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element -- símbolo */}
              <img src="/marca/plantea-symbol-color.svg" alt="" className="h-5 w-5" />
              2D + 3D, el mismo plano
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">Cómo funciona</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {PASOS.map((s) => (
            <li key={s.n} className="rounded-2xl border border-stone-200 bg-white p-5">
              <span className="font-display text-3xl font-bold text-[#b5653a]/35">{s.n}</span>
              <h3 className="mt-2 text-lg font-semibold text-stone-900">{s.t}</h3>
              <p className="mt-1 text-stone-600">{s.p}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Para quién */}
      <section className="bg-[#f3ece2]">
        <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
          <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">Para quién es Plantea</h2>
          <p className="mt-2 max-w-2xl text-stone-600">Para todos los que organizan: el dueño del salón, la planner, la familia que ya apartó la fecha y quien vende casas.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {QUIEN.map((q) => (
              <article key={q.t} className="flex flex-col rounded-2xl border border-stone-200/70 bg-white p-5">
                <h3 className="text-lg font-semibold text-stone-900">{q.t}</h3>
                <p className="mt-1 flex-1 text-stone-600">{q.p}</p>
                <Link href={q.href} className="mt-4 inline-flex h-10 w-fit items-center rounded-xl border border-stone-900 px-4 text-sm font-semibold text-stone-900 hover:bg-stone-900 hover:text-white">
                  {q.cta} →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Catálogo + registro */}
      <section className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/salones" className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- captura propia */}
            <img src="/portada/espacios-salon-2d.jpg" alt="" className="aspect-[16/9] w-full object-cover transition group-hover:scale-[1.02]" />
            <div className="p-5">
              <h3 className="text-lg font-semibold text-stone-900">Salones de eventos en 3D</h3>
              <p className="mt-1 text-stone-600">Recorre los salones de Los Mochis, prueba el montaje y pide informes directo al salón.</p>
            </div>
          </Link>
          <Link href="/casas" className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- captura propia */}
            <img src="/portada/espacios-casa-2d.jpg" alt="" className="aspect-[16/9] w-full object-cover transition group-hover:scale-[1.02]" />
            <div className="p-5">
              <h3 className="text-lg font-semibold text-stone-900">Modelos de casa en 3D</h3>
              <p className="mt-1 text-stone-600">Cada modelo amueblado y con recorrido, para verlo como si ya vivieras ahí.</p>
            </div>
          </Link>
        </div>
        <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl bg-stone-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold">¿Tienes un salón o vendes casas?</h3>
            <p className="mt-1 text-stone-300">Mándanos el plano o un croquis con medidas y en 7 días está en 3D, con su enlace y su QR. Empezar no tiene costo.</p>
          </div>
          <Link href="/alta" className="inline-flex h-12 shrink-0 items-center rounded-xl bg-[#b5653a] px-5 font-semibold text-white hover:bg-[#a4552d]">
            Registrar mi lugar
          </Link>
        </div>
        <p className="mt-6 text-center text-sm text-stone-500">
          Planes y precios en{" "}
          <Link href="/planes" className="underline">
            plantea.com.mx/planes
          </Link>
          . ¿Ya tienes cuenta?{" "}
          <Link href="/entrar" className="underline">
            Entrar
          </Link>
        </p>
      </section>
    </main>
  );
}
