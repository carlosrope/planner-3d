"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

const input = "h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-800";

/** Nueva contraseña con el token del correo; sin token (vencido o usado) ofrece pedir otro enlace. */
export function RestablecerForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (error) {
      setError(
        error.code === "INVALID_TOKEN"
          ? "El enlace ya venció o ya se usó. Pide uno nuevo."
          : error.code === "PASSWORD_TOO_SHORT"
            ? "La contraseña debe tener al menos 8 caracteres."
            : "No se pudo cambiar la contraseña. Intenta de nuevo.",
      );
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/entrar"), 1500);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Nueva contraseña</h1>
      {done ? (
        <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">Listo. Tu contraseña cambió; ahora entra con ella.</p>
      ) : !token ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Este enlace ya venció o ya se usó.{" "}
          <Link href="/olvide" className="font-medium underline">
            Pide uno nuevo
          </Link>
          .
        </p>
      ) : (
        <>
          <p className="mb-6 text-sm text-stone-600">Escribe tu contraseña nueva dos veces.</p>
          <form onSubmit={submit} className="space-y-3">
            <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Contraseña nueva (mínimo 8)" className={input} />
            <input name="confirm" type="password" required minLength={8} autoComplete="new-password" placeholder="Repite la contraseña" className={input} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button disabled={busy} className="h-12 w-full rounded-xl bg-stone-900 font-medium text-white active:bg-stone-700 disabled:opacity-60">
              {busy ? "Un momento…" : "Guardar contraseña"}
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
