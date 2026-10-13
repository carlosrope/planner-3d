import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getVenueBasics } from "@/lib/dal";
import { PROLINK_WHATSAPP } from "@/lib/prolink";
import { waLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Lugar registrado" };

export default function GraciasPage({ searchParams }: PageProps<"/alta/gracias">) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-12">
      <Suspense fallback={<p className="text-stone-500">Un momento…</p>}>
        <Gracias searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Gracias({ searchParams }: { searchParams: PageProps<"/alta/gracias">["searchParams"] }) {
  const { lugar } = await searchParams;
  const found = typeof lugar === "string" ? await getVenueBasics(lugar) : null;
  const name = found?.name ?? "tu lugar";
  const salon = (found?.kind ?? "salon") === "salon";
  return (
    <div className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-stone-500">Plantea</p>
      <h1 className="text-2xl font-semibold">¡Listo! Registramos {name}.</h1>
      <p className="text-stone-600">
        Ya tenemos tu plano y tus fotos. Armamos el plano 2D y el recorrido 3D y en menos de 7 días te escribimos por
        WhatsApp con un enlace para que revises {salon ? "tu salón" : "tu modelo"} y lo confirmes.
      </p>
      <a
        href={waLink(PROLINK_WHATSAPP, `Hola, acabo de registrar ${name} en Plantea.`)}
        target="_blank"
        rel="noopener"
        className="flex h-12 items-center justify-center rounded-xl bg-[#25d366] font-medium text-white"
      >
        Avisarle a ProLink por WhatsApp
      </a>
      <p className="text-sm text-stone-500">
        Si el plano pesaba mucho o quieres mandar más fotos, hazlo por ese mismo WhatsApp.
      </p>
      <Link href="/" className="block text-center text-sm underline">
        Volver al inicio
      </Link>
    </div>
  );
}
