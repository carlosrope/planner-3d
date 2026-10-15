"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

const input =
  "h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-800";

export function AuthForm({
  mode,
  inviteRequired = false,
  inviteValue,
  notice,
  next,
}: {
  mode: "entrar" | "registro";
  inviteRequired?: boolean;
  /** Código ya validado (de referido): se manda sin pedirlo. */
  inviteValue?: string;
  /** Aviso arriba del formulario (de quién es el código, o que ya no sirve). */
  notice?: string;
  /** A dónde ir después de entrar (por omisión, Proyectos). */
  next?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const registering = mode === "registro";

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setBusy(true);
    setError(null);
    const { error } = registering
      ? await authClient.signUp.email(
          { name: String(form.get("name") ?? "").trim(), email, password },
          { headers: { "x-invite-code": String(form.get("invite") ?? "").trim() } },
        )
      : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429
          ? "Demasiados intentos. Espera unos minutos y vuelve a intentar."
          : error.status === 401 || error.code === "INVALID_EMAIL_OR_PASSWORD"
          ? "Correo o contraseña incorrectos."
          : error.code === "USER_ALREADY_EXISTS" || error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
            ? "Ya existe una cuenta con ese correo."
            : error.code === "INVALID_INVITE_CODE"
              ? "El código de invitación no es válido."
              : error.code === "PASSWORD_TOO_SHORT"
                ? "La contraseña debe tener al menos 8 caracteres."
                : "No se pudo completar. Intenta de nuevo.",
      );
      return;
    }
    router.push(next ?? "/eventos");
    router.refresh();
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">{registering ? "Crear cuenta" : "Entrar"}</h1>
      {notice && <p className={`mb-4 rounded-xl p-3 text-sm ${inviteValue ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{notice}</p>}
      <form onSubmit={submit} className="space-y-3">
        {registering && (
          <input name="name" required autoComplete="name" placeholder="Tu nombre" className={input} />
        )}
        <input name="email" type="email" required autoComplete="email" placeholder="Correo" className={input} />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={registering ? "new-password" : "current-password"}
          placeholder="Contraseña (mínimo 8 caracteres)"
          className={input}
        />
        {registering && inviteValue ? (
          <input type="hidden" name="invite" value={inviteValue} />
        ) : registering && inviteRequired ? (
          <input name="invite" required autoComplete="off" placeholder="Código de invitación o del salón" className={input} />
        ) : registering ? (
          <input name="invite" autoComplete="off" placeholder="Código del salón (si te dieron uno)" className={input} />
        ) : null}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!registering && (
          <p className="text-right text-sm">
            <Link href="/olvide" className="text-stone-600 underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </p>
        )}
        <button
          disabled={busy}
          className="h-12 w-full rounded-xl bg-stone-900 font-medium text-white active:bg-stone-700 disabled:opacity-60"
        >
          {busy ? "Un momento…" : registering ? "Crear cuenta" : "Entrar"}
        </button>
        {registering && (
          <p className="text-center text-xs text-stone-500">
            Al crear tu cuenta aceptas los{" "}
            <Link href="/terminos" className="underline" target="_blank">
              Términos de servicio
            </Link>{" "}
            y el{" "}
            <Link href="/privacidad" className="underline" target="_blank">
              Aviso de privacidad
            </Link>
            .
          </p>
        )}
      </form>
      <p className="mt-6 text-center text-sm text-stone-600">
        {registering ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
        <Link href={registering ? "/entrar" : "/registro"} className="font-medium text-stone-900 underline">
          {registering ? "Entrar" : "Crear una"}
        </Link>
      </p>
    </main>
  );
}
