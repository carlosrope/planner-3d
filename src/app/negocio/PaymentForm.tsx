"use client";

import { useActionState } from "react";
import { PAYMENT_PERIODS, PAYMENT_PERIOD_LABELS, PLAN_LABELS, type Plan } from "@/lib/domain";
import { submitPayment } from "./actions";

const field = "h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-800";
const PLANS_FOR_SALE: Plan[] = ["eventos", "casas", "ambos"];

export function PaymentForm({ currentPlan }: { currentPlan: Plan }) {
  const [state, action, pending] = useActionState(submitPayment, null);
  if (state?.ok) {
    return <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Recibimos tu comprobante. Te confirmamos por WhatsApp en cuanto lo revisemos.</p>;
  }
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-3">
      <label className="space-y-1">
        <span className="text-sm text-stone-600">Plan</span>
        <select name="plan" defaultValue={PLANS_FOR_SALE.includes(currentPlan) ? currentPlan : "eventos"} className={field}>
          {PLANS_FOR_SALE.map((p) => (
            <option key={p} value={p}>
              {PLAN_LABELS[p]}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-sm text-stone-600">Periodo</span>
        <select name="period" defaultValue="mes" className={field}>
          {PAYMENT_PERIODS.map((p) => (
            <option key={p} value={p}>
              {PAYMENT_PERIOD_LABELS[p]}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-sm text-stone-600">Monto transferido (pesos)</span>
        <input name="amount" type="number" inputMode="numeric" min={1} max={1_000_000} required className={field} />
      </label>
      <label className="space-y-1 sm:col-span-3">
        <span className="text-sm text-stone-600">Comprobante (imagen o PDF, hasta 5 MB)</span>
        <input name="receipt" type="file" accept="image/*,application/pdf" required className="block w-full text-sm" />
      </label>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-3">{state.error}</p>}
      <button disabled={pending} className="h-12 rounded-xl bg-stone-900 font-medium text-white active:bg-stone-700 disabled:opacity-60 sm:col-span-3">
        {pending ? "Enviando…" : "Enviar comprobante"}
      </button>
    </form>
  );
}
