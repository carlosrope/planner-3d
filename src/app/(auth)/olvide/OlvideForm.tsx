"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

const input = "h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-800";

/** Pide el correo y manda el enlace para restablecer la contraseña (siempre responde igual, exista o no la cuenta). */
export function OlvideForm() {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setBusy(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/restablecer" });
    setBusy(false);
    if (error) {
      setError(error.status === 429 ? "Demasiados intentos. Espera unos minutos y vuelve a intentar." : "No se pudo enviar el correo. Intenta de nuevo.");
      return;
    }
    setSent(email);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Olvidé mi contraseña</h1>
      {sent ? (
        <div className="space-y-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-medium">Listo. Si {sent} tiene cuenta en Plantea, ya te mandamos el enlace.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Llega en menos de un minuto, de <strong>hola@plantea.com.mx</strong>, con el asunto «Tu enlace para crear una contraseña nueva».
            </li>
            <li>
              Si no lo ves en la bandeja de entrada, búscalo en <strong>Correo no deseado</strong> y márcalo como «No es correo no deseado»: así los
              siguientes llegan bien.
            </li>
            <li>El enlace sirve una sola vez durante una hora.</li>
          </ul>
          <button type="button" onClick={() => setSent(null)} className="font-medium underline">
            ¿Escribiste mal el correo? Intenta otra vez
          </button>
        </div>
      ) : (
        <>
          <p className="mb-6 text-sm text-stone-600">Escribe el correo de tu cuenta y te mandamos un enlace para crear una contraseña nueva.</p>
          <form onSubmit={submit} className="space-y-3">
            <input name="email" type="email" required autoComplete="email" placeholder="Correo" className={input} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button disabled={busy} className="h-12 w-full rounded-xl bg-stone-900 font-medium text-white active:bg-stone-700 disabled:opacity-60">
              {busy ? "Un momento…" : "Enviar enlace"}
            </button>
          </form>
        </>
      )}
      <p className="mt-6 text-center text-sm text-stone-600">
        <Link href="/entrar" className="font-medium text-stone-900 underline">
          Volver a entrar
        </Link>
      </p>
    </main>
  );
}
