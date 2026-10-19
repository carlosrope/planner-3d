"use client";

import { useActionState } from "react";
import { startCardPayment } from "./actions";

export type CardOption = { value: string; label: string };

/** Elegir el plan y pagar con tarjeta: abre la página de Mercado Pago. */
export function CardPaymentForm({ options, current, email }: { options: CardOption[]; current?: string; email?: string }) {
  const [state, action, pending] = useActionState(startCardPayment, null);
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
      <label className="space-y-1">
        <span className="text-sm text-stone-600">Plan</span>
        <select name="option" defaultValue={current ?? options[0]?.value} className="h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-800">
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 sm:col-span-2">
        <span className="text-sm text-stone-600">Correo de tu cuenta de Mercado Pago</span>
        <input
          name="mpEmail"
          type="email"
          required
          defaultValue={email}
          autoComplete="email"
          className="h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-800"
        />
        <span className="block text-xs text-stone-500">Para el cobro mensual, Mercado Pago pide entrar con este mismo correo.</span>
      </label>
      <button disabled={pending} className="h-12 self-end rounded-xl bg-[#009ee3] px-5 font-medium text-white active:bg-[#0084c0] disabled:opacity-60">
        {pending ? "Abriendo Mercado Pago…" : "Pagar con tarjeta"}
      </button>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
    </form>
  );
}
