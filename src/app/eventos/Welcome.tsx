"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { createSamples } from "./actions";

function SamplesButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="h-12 w-full rounded-xl bg-white font-medium text-stone-900 active:bg-stone-100 disabled:opacity-70"
    >
      {pending ? "Preparando ejemplos…" : "Cargar proyectos de ejemplo"}
    </button>
  );
}

/** Primera vez en la cuenta: cómo funciona, ejemplos listos para mostrar y la marca del negocio. */
export function Welcome() {
  return (
    <section className="mb-6 rounded-2xl bg-stone-900 p-5 text-white">
      <h2 className="text-xl font-semibold">Te damos la bienvenida</h2>
      <ol className="mt-3 space-y-2 text-sm text-stone-200">
        <li>
          <b className="text-white">1.</b> Crea un evento en un salón o un proyecto de casa.
        </li>
        <li>
          <b className="text-white">2.</b> Acomoda mesas o muebles con el dedo, acomoda a los invitados y revísalo en 3D.
        </li>
        <li>
          <b className="text-white">3.</b> Compártelo por WhatsApp: tu cliente lo ve con tu logo, sin crear cuenta.
        </li>
      </ol>
      <p className="mt-4 text-sm text-stone-300">
        ¿Quieres verlo funcionando ya? Carga una boda con 220 invitados sentados y dos propuestas, unos XV años y una casa
        amueblada y sin muebles.
      </p>
      <form action={createSamples} className="mt-3">
        <SamplesButton />
      </form>
      <Link href="/negocio" className="mt-3 block text-center text-sm text-stone-200 underline">
        Poner mi logo y mi WhatsApp
      </Link>
    </section>
  );
}
