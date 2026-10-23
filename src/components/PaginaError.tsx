"use client";

import { useEffect } from "react";
import { RedesBotones } from "./Redes";

/**
 * Lo que se ve cuando una página falla (app/error.tsx dentro del diseño de siempre, app/global-error.tsx cuando falla
 * el diseño mismo): la marca, qué pasó en palabras simples, volver a intentar, el inicio y las redes de Plantea.
 * Los errores del servidor ya llegan a Sentry por instrumentation.ts (traen digest); los del navegador se mandan aquí.
 */
export function PaginaError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : null;

  useEffect(() => {
    if (digest) return;
    const e = error instanceof Error ? error : new Error(String(error));
    const payload = JSON.stringify({
      message: e.message.slice(0, 2000) || "Error sin mensaje",
      type: e.name.slice(0, 100),
      stack: e.stack?.slice(0, 8000),
      url: location.href.slice(0, 500),
    });
    fetch("/api/errores", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  }, [error, digest]);

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-4 pb-24 pt-14 text-center sm:pt-20">
      {/* eslint-disable-next-line @next/next/no-img-element -- logo SVG estático */}
      <img src="/marca/plantea-symbol-color.svg" alt="" className="h-16 w-16" />
      <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-[#a4552d]">Algo salió mal</p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Esta página no cargó bien</h1>
      <p className="mt-3 text-stone-600">Fue un problema de nuestro lado, no tuyo. Vuelve a intentarlo; si sigue pasando, mándanos un mensaje y lo revisamos.</p>
      <div className="mt-7 grid w-full gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => retry()}
          className="flex h-12 items-center justify-center rounded-xl bg-[#a4552d] font-semibold text-white hover:bg-[#8f4a26]"
        >
          Intentar de nuevo
        </button>
        {/* Enlace normal, no <Link>: si falló el diseño, conviene cargar el inicio desde cero. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- recarga completa a propósito */}
        <a href="/" className="flex h-12 items-center justify-center rounded-xl border border-stone-900 bg-white font-semibold hover:bg-stone-50">
          Ir al inicio
        </a>
      </div>
      <p className="mt-10 text-sm font-medium text-stone-700">Síguenos o escríbenos en redes</p>
      <RedesBotones className="mt-3 w-full sm:w-auto" />
      {digest ? <p className="mt-8 text-xs text-stone-500">Código del error: {digest}</p> : null}
    </main>
  );
}
