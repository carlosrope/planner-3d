"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import type { Section } from "@/lib/domain";
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

const STEP_ONE: Record<"ambos" | "salones" | "casas", string> = {
  ambos: "Crea un evento en un salón o un proyecto de casa.",
  salones: "Crea un evento en uno de los salones del catálogo.",
  casas: "Crea un proyecto con uno de los modelos de casa.",
};
const SAMPLES: Record<"ambos" | "salones" | "casas", string> = {
  ambos: "Carga una boda con 220 invitados sentados y dos propuestas, unos XV años y una casa amueblada y sin muebles.",
  salones: "Carga una boda con 220 invitados sentados y dos propuestas, y unos XV años.",
  casas: "Carga una casa amueblada y sin muebles.",
};

/** Primera vez en la cuenta: cómo funciona, ejemplos listos para mostrar y la marca del negocio. */
export function Welcome({ modules }: { modules: Section[] }) {
  const which = modules.length > 1 ? "ambos" : (modules[0] ?? "ambos");
  return (
    <section className="mb-6 rounded-2xl bg-stone-900 p-5 text-white">
      <h2 className="text-xl font-semibold">Te damos la bienvenida</h2>
      <ol className="mt-3 space-y-2 text-sm text-stone-200">
        <li>
          <b className="text-white">1.</b> {STEP_ONE[which]}
        </li>
        <li>
          <b className="text-white">2.</b> Acomoda mesas o muebles con el dedo, acomoda a los invitados y revísalo en 3D.
        </li>
        <li>
          <b className="text-white">3.</b> Compártelo por WhatsApp: tu cliente lo ve con tu logo, sin crear cuenta.
        </li>
      </ol>
      <p className="mt-4 text-sm text-stone-300">
        ¿Quieres verlo funcionando ya? {SAMPLES[which]}
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

/** Al final de Proyectos: cargar ejemplos para una demo aunque la cuenta ya tenga proyectos. */
export function SamplesLink() {
  return (
    <form action={createSamples} className="mt-8 text-center">
      <SamplesLinkButton />
    </form>
  );
}

function SamplesLinkButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="text-sm text-stone-500 underline disabled:opacity-60">
      {pending ? "Preparando ejemplos…" : "¿Vas a dar una demo? Cargar proyectos de ejemplo"}
    </button>
  );
}
