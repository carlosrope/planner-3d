import Link from "next/link";
import { PageLink } from "@/components/PageLink";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-8 px-6 py-12">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wider text-stone-500">Planner 3D · Los Mochis</p>
        <h1 className="text-3xl font-semibold leading-tight text-stone-900">
          El plano de tu evento, en tu teléfono.
        </h1>
        <p className="text-stone-600">
          Acomoda mesas con el dedo sobre el salón real, revisa pasillos al instante y muéstraselo a la pareja o a
          la quinceañera.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <PageLink
          href="/disenador/salon-demo"
          className="flex h-12 items-center justify-center rounded-xl bg-stone-900 font-medium text-white active:bg-stone-700"
        >
          Probar el diseñador de eventos (salón)
        </PageLink>
        <PageLink
          href="/disenador/chardonnay"
          className="flex h-12 items-center justify-center rounded-xl border border-stone-900 bg-white font-medium active:bg-stone-100"
        >
          Diseñador de casas 2D y 3D (inmobiliaria)
        </PageLink>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/entrar"
            className="flex h-12 items-center justify-center rounded-xl border border-stone-300 bg-white font-medium active:bg-stone-100"
          >
            Entrar
          </Link>
          <Link
            href="/registro"
            className="flex h-12 items-center justify-center rounded-xl border border-stone-300 bg-white font-medium active:bg-stone-100"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </main>
  );
}
