import type { Metadata } from "next";
import Link from "next/link";
import { PageLink } from "@/components/PageLink";
import { RESPONSABLE } from "@/components/Legal";
import { CONTACT_WHATSAPP, PARTNER_SITE, trustData } from "@/lib/brand";
import { SITE_URL, jsonLd, organizationJsonLd } from "@/lib/site";
import { waLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Quiénes somos y cómo verificarnos",
  description:
    "Quién está detrás de Plantea, cómo contactarnos, cómo pagar con seguridad y cómo comprobar que somos un negocio real de México.",
  alternates: { canonical: "/nosotros" },
};

const FAQ = [
  {
    q: "¿Plantea hace páginas web?",
    a: "No. Plantea es un software para planear eventos y casas en 3D: el salón o la casa real en plano y en recorrido, con mesas, invitados y muebles. No vendemos páginas web, dominios ni hosting.",
  },
  {
    q: "¿Cómo sé que Plantea es real antes de pagar?",
    a: "Pruébalo sin pagar ni crear cuenta: la demostración del salón y de la casa funciona completa desde este sitio. Escríbenos por WhatsApp o a hola@plantea.com.mx y te contestamos directamente. Si tienes un salón, primero lo convertimos a 3D y lo revisas; pagas cuando ya lo viste.",
  },
  {
    q: "¿A nombre de quién se paga?",
    a: `Siempre desde tu cuenta en Plantea, de una de dos formas: con tarjeta en la página de Mercado Pago (Mercado Pago procesa el cobro y te da tu comprobante) o por transferencia (SPEI) a la cuenta a nombre de ${RESPONSABLE.nombre}, subiendo el comprobante. Nunca pedimos pagos por fuera de tu cuenta, a nombre de otra persona, en efectivo ni con tarjetas de regalo.`,
  },
  {
    q: "¿Dan factura?",
    a: "Sí, damos factura (CFDI). Los precios ya incluyen IVA.",
  },
  {
    q: "¿Por qué casi no aparecen en Google?",
    a: "Plantea abrió su sitio propio en octubre de 2026. Antes se presentaba como un servicio de ProLink365, el negocio de automatización con IA del mismo responsable, en prolink365.com.mx.",
  },
];

export default function NosotrosPage() {
  const t = trustData();
  const social = [t.instagram && { label: "Instagram", href: t.instagram }, t.facebook && { label: "Facebook", href: t.facebook }, t.google && { label: "Perfil de Google", href: t.google }].filter(
    (x): x is { label: string; href: string } => Boolean(x),
  );
  const whatsapp = waLink(CONTACT_WHATSAPP, "Hola, quiero saber más de Plantea.");
  const datos: [string, React.ReactNode][] = [
    ["Responsable", RESPONSABLE.nombre],
    ["Ciudad", RESPONSABLE.ciudad],
    ...(t.rfc ? ([["RFC", t.rfc]] as [string, string][]) : []),
    ["Correo", <a key="c" href={`mailto:${RESPONSABLE.correo}`} className="underline">{RESPONSABLE.correo}</a>],
    ["WhatsApp", <a key="w" href={whatsapp} target="_blank" rel="noopener" className="underline">{RESPONSABLE.whatsapp}</a>],
    ["Sitio oficial", <a key="s" href={SITE_URL} className="underline">plantea.com.mx</a>],
    ["Desarrollado por", <a key="p" href={PARTNER_SITE} target="_blank" rel="noopener" className="underline">ProLink365</a>],
    ["Pagos", `Tarjeta por Mercado Pago o SPEI a nombre de ${RESPONSABLE.nombre} · factura CFDI · IVA incluido`],
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            organizationJsonLd({ sameAs: social.map((s) => s.href) }),
            { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
          ]),
        }}
      />
      <p className="text-sm font-medium uppercase tracking-wider text-[#a4552d]">Quiénes somos</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight">Plantea es real, y puedes comprobarlo antes de pagar.</h1>
      <p className="mt-3 text-lg text-stone-600">
        Plantea es un software para planear eventos y casas en 3D sobre planos reales: el salón o la casa en plano y en recorrido, con mesas,
        invitados y muebles. No vendemos páginas web, dominios ni hosting.
      </p>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Quién está detrás</h2>
        <p className="mt-2 text-stone-700">
          Plantea es una marca de <b>{RESPONSABLE.nombre}</b>, en {RESPONSABLE.ciudad}. La desarrolla{" "}
          <a href={PARTNER_SITE} target="_blank" rel="noopener" className="font-semibold underline">
            ProLink365
          </a>
          , su negocio de automatización con IA.
        </p>
        <dl className="mt-4 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
          {datos.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-3 px-4 py-3 text-sm">
              <dt className="text-stone-500">{k}</dt>
              <dd className="text-stone-900">{v}</dd>
            </div>
          ))}
        </dl>
        {social.length > 0 && (
          <p className="mt-3 text-sm text-stone-600">
            También estamos en{" "}
            {social.map((s, i) => (
              <span key={s.href}>
                {i > 0 ? (i === social.length - 1 ? " y " : ", ") : ""}
                <a href={s.href} target="_blank" rel="noopener" className="underline">
                  {s.label}
                </a>
              </span>
            ))}
            .
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Cómo comprobar que somos reales</h2>
        <ol className="mt-4 space-y-3">
          {[
            ["Pruébalo sin pagar.", "La demostración del salón y de la casa funciona completa, sin cuenta y sin dar datos."],
            ["Habla con nosotros.", "Escríbenos por WhatsApp o a hola@plantea.com.mx; te contestamos directamente."],
            ["Paga cuando ya lo viste.", "Si tienes un salón o una casa, primero la convertimos a 3D y la revisas. El pago es con tarjeta por Mercado Pago o por SPEI a nombre del responsable, con factura."],
            ["Lee nuestras reglas.", "El aviso de privacidad y los términos de servicio dicen quién es el responsable y qué incluye cada plan."],
          ].map(([t1, t2], i) => (
            <li key={t1} className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-4">
              <span className="font-display text-2xl font-bold text-[#a4552d]">{i + 1}</span>
              <p className="text-stone-700">
                <b className="text-stone-900">{t1}</b> {t2}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <PageLink href="/disenador/salon-demo" className="flex h-12 items-center justify-center rounded-xl bg-[#a4552d] px-5 font-semibold text-white hover:bg-[#8f4a26]">
            Mira ahora en 3D
          </PageLink>
          <a href={whatsapp} target="_blank" rel="noopener" className="flex h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-5 font-semibold text-stone-900">
            Escríbenos por WhatsApp
          </a>
        </div>
        <p className="mt-3 text-sm text-stone-500">
          <Link href="/privacidad" className="underline">
            Aviso de privacidad
          </Link>{" "}
          ·{" "}
          <Link href="/terminos" className="underline">
            Términos de servicio
          </Link>{" "}
          ·{" "}
          <Link href="/planes" className="underline">
            Planes y precios
          </Link>
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Preguntas para estar seguro</h2>
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
