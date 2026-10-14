import type { ReactNode } from "react";

/** Página legal de Plantea (aviso de privacidad, términos): un solo ancho de lectura y títulos numerados. */
export function Legal({ tag, title, updated, intro, children }: { tag: string; title: string; updated: string; intro: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <p className="text-sm font-semibold uppercase tracking-wider text-[#b5653a]">{tag}</p>
      <h1 className="mt-1 text-3xl font-bold text-stone-900 sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-stone-500">Última actualización: {updated}</p>
      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4 text-stone-700">{intro}</div>
      <article className="legal mt-8 space-y-8 text-stone-700">{children}</article>
    </main>
  );
}

export function Seccion({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section id={`s${n}`} className="space-y-3">
      <h2 className="text-xl font-semibold text-stone-900">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}

export const RESPONSABLE = {
  nombre: "Carlos Manuel Robles Pérez",
  marca: "ProLink365",
  ciudad: "Los Mochis, Sinaloa, México",
  correo: "carlosrope@prolink365.com.mx",
  whatsapp: "+52 668 130 5828",
};
