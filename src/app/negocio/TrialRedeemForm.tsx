"use client";

import { useActionState } from "react";
import { CodeInput } from "@/components/CodeInput";
import { redeemTrialAction } from "./actions";

/** Mi negocio: una cuenta sin plan de pago escribe su código de mes gratis (MES-…) y queda en plan Prueba. */
export function TrialRedeemForm({ open = false }: { open?: boolean }) {
  const [state, action, pending] = useActionState(redeemTrialAction, null);
  return (
    <details open={open || Boolean(state)} className="group rounded-2xl border border-stone-200 bg-white p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
        ¿Tienes un código de mes gratis?
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-stone-400 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      {state?.ok ? (
        <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
          {state.message}
        </p>
      ) : (
        <form action={action} className="mt-3 space-y-2">
          <p className="text-sm text-stone-600">Escríbelo como te llegó por WhatsApp (por ejemplo MES-7K3MQ2).</p>
          <div className="flex gap-2">
            <CodeInput name="code" placeholder="Ej. MES-7K3MQ2" required />
            <button disabled={pending} className="h-12 shrink-0 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white disabled:opacity-60">
              {pending ? "Revisando…" : "Usar código"}
            </button>
          </div>
          {state?.error && (
            <p role="alert" className="text-sm text-red-700">
              {state.error}
            </p>
          )}
        </form>
      )}
    </details>
  );
}
