"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/** Manda el enlace para verificar el correo de la cuenta; al abrirlo, regresa a la administración. */
export function VerifyEmailForm({ email, google }: { email: string; google: boolean }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    setError(null);
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/admin" });
    setBusy(false);
    if (error) {
      setError(error.status === 429 ? "Demasiados intentos. Espera unos minutos y vuelve a intentar." : "No se pudo enviar el correo. Intenta de nuevo.");
      return;
    }
    setSent(true);
  };

  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Confirma tu correo</h1>
      <p className="mb-6 text-sm text-stone-600">
        Por seguridad, la administración de Plantea solo se abre con un correo confirmado. Pide el enlace y te lo mandamos a <strong>{email}</strong>;
        ábrelo en este mismo navegador.
      </p>
      {sent ? (
        <div className="space-y-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-medium">Listo. Ya te mandamos el enlace.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Llega en menos de un minuto, de <strong>hola@plantea.com.mx</strong>, con el asunto «Confirma tu correo para entrar a la administración de
              Plantea».
            </li>
            <li>
              Si no lo ves, búscalo en <strong>Correo no deseado</strong>.
            </li>
            <li>El enlace sirve durante una hora.</li>
          </ul>
        </div>
      ) : (
        <>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={send}
            disabled={busy}
            className="h-12 w-full rounded-xl bg-stone-900 font-medium text-white active:bg-stone-700 disabled:opacity-60"
          >
            {busy ? "Un momento…" : "Mandarme el enlace"}
          </button>
        </>
      )}
      {google && <p className="mt-4 text-sm text-stone-600">Si ese correo es de Google, también basta con salir y volver a entrar con «Continuar con Google».</p>}
      <p className="mt-6 text-center text-sm text-stone-600">
        <Link href="/eventos" className="font-medium text-stone-900 underline">
          Ir a mis proyectos
        </Link>
      </p>
    </main>
  );
}
