import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser, requireOrg } from "@/lib/dal";
import { isOwnerKind } from "@/lib/domain";
import { PRICES_URL } from "@/lib/prolink";
import { AltaForm } from "./AltaForm";

export const metadata: Metadata = {
  title: "Registra tu lugar",
  description: "Manda el plano y las fotos de tu salón o de tu modelo de casa y lo convertimos a 3D.",
};

export default function AltaPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-stone-500">Espacios 3D</p>
      <h1 className="mt-1 text-2xl font-semibold">Pon tu salón o tu modelo de casa en 3D</h1>
      <p className="mt-2 text-stone-600">
        Mándanos tu plano (CAD, PDF o una foto del croquis con medidas) y unas fotos. Lo convertimos a un plano 2D y
        un recorrido 3D, te mandamos el enlace para que lo revises y, cuando lo confirmes, queda publicado con su
        enlace y su QR.
      </p>
      <ol className="mt-4 grid gap-2 text-sm text-stone-600 sm:grid-cols-3">
        <li className="rounded-xl border border-stone-200 bg-white p-3"><b className="text-stone-900">1.</b> Llena el formulario (10 minutos).</li>
        <li className="rounded-xl border border-stone-200 bg-white p-3"><b className="text-stone-900">2.</b> Armamos el 3D y te mandamos el enlace por WhatsApp.</li>
        <li className="rounded-xl border border-stone-200 bg-white p-3"><b className="text-stone-900">3.</b> Lo revisas, lo confirmas y queda publicado.</li>
      </ol>
      <p className="mt-3 text-sm text-stone-500">
        Los planes y precios están en{" "}
        <a href={PRICES_URL} className="underline" target="_blank" rel="noopener">
          prolink365.com.mx
        </a>
        .
      </p>
      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
          <AltaContent />
        </Suspense>
      </section>
      <p className="mt-6 text-center text-sm text-stone-500">
        <Link href="/" className="underline">
          Volver al inicio
        </Link>
      </p>
    </main>
  );
}

/** Con sesión de salón o desarrolladora, el lugar queda ligado a ese negocio desde el alta. */
async function AltaContent() {
  const user = await getCurrentUser();
  const org = user ? await requireOrg(user) : null;
  const owner = org && isOwnerKind(org.kind) ? { name: org.name, contact: user!.name } : null;
  return <AltaForm owner={owner} />;
}
