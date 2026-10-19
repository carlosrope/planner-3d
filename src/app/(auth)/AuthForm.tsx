"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

const input =
  "h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-800";

export function AuthForm({
  mode,
  inviteRequired = false,
  inviteValue,
  notice,
  next,
  google = false,
}: {
  mode: "entrar" | "registro";
  inviteRequired?: boolean;
  /** Código ya validado (de referido): se manda sin pedirlo. */
  inviteValue?: string;
  /** Aviso arriba del formulario (de quién es el código, o que ya no sirve). */
  notice?: string;
  /** A dónde ir después de entrar (por omisión, Proyectos). */
  next?: string;
  /** Muestra "Continuar con Google" (solo si Railway tiene las llaves de Google). */
  google?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const registering = mode === "registro";
  const formRef = useRef<HTMLFormElement>(null);

  // Con Google: Entrar solo abre cuentas que ya existen; Crear cuenta pide el código antes de ir a Google.
  const withGoogle = async () => {
    const invite = registering ? String(new FormData(formRef.current ?? undefined).get("invite") ?? "").trim() : "";
    if (registering && inviteRequired && !invite) {
      setError("Escribe primero tu código de invitación o del salón.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.social(
      {
        provider: "google",
        callbackURL: next ?? "/eventos",
        errorCallbackURL: registering ? "/registro" : "/entrar",
        requestSignUp: registering,
      },
      { headers: registering ? { "x-invite-code": invite } : {} },
    );
    if (error) {
      setBusy(false);
      setError(error.code === "INVALID_INVITE_CODE" ? "El código de invitación no es válido." : "No se pudo abrir Google. Intenta de nuevo.");
    }
  };

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

  const googleBlock = (where: "top" | "bottom") => (
    <>
      {where === "bottom" && (
        <div className="my-4 flex items-center gap-3 text-xs text-stone-500" aria-hidden="true">
          <span className="h-px flex-1 bg-stone-200" />o<span className="h-px flex-1 bg-stone-200" />
        </div>
      )}
      <button
        type="button"
        onClick={withGoogle}
        disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white font-medium text-stone-900 active:bg-stone-100 disabled:opacity-60"
      >
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Continuar con Google
      </button>
      {where === "top" && (
        <div className="my-4 flex items-center gap-3 text-xs text-stone-500" aria-hidden="true">
          <span className="h-px flex-1 bg-stone-200" />o con tu correo<span className="h-px flex-1 bg-stone-200" />
        </div>
      )}
    </>
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">{registering ? "Crear cuenta" : "Entrar"}</h1>
      {notice && <p className={`mb-4 rounded-xl p-3 text-sm ${inviteValue ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{notice}</p>}
      {google && !registering && googleBlock("top")}
      <form ref={formRef} onSubmit={submit} className="space-y-3">
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
      {google && registering && googleBlock("bottom")}
      <p className="mt-6 text-center text-sm text-stone-600">
        {registering ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
        <Link href={registering ? "/entrar" : "/registro"} className="font-medium text-stone-900 underline">
          {registering ? "Entrar" : "Crear una"}
        </Link>
      </p>
    </main>
  );
}
