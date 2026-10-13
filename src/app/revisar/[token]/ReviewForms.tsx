"use client";

import { useActionState, useState } from "react";
import { confirmReview, requestCorrections } from "./actions";

/** Dos salidas de la revisión: confirmar (se publica) o pedir correcciones (vuelve a conversión con las notas). */
export function ReviewForms({ token }: { token: string }) {
  const [confirmState, confirmAction, confirming] = useActionState(confirmReview, null);
  const [fixState, fixAction, fixing] = useActionState(requestCorrections, null);
  const [fixing_, setFixing] = useState(false);
  return (
    <div className="space-y-3">
      <form action={confirmAction}>
        <input type="hidden" name="token" value={token} />
        <button disabled={confirming} className="h-12 w-full rounded-xl bg-emerald-700 font-medium text-white active:bg-emerald-800 disabled:opacity-60">
          {confirming ? "Publicando…" : "Sí, está bien: publícalo"}
        </button>
        {confirmState?.error && <p className="mt-2 text-sm text-red-600">{confirmState.error}</p>}
      </form>
      {!fixing_ ? (
        <button type="button" onClick={() => setFixing(true)} className="h-12 w-full rounded-xl border border-stone-300 bg-white font-medium active:bg-stone-100">
          Hay algo que corregir
        </button>
      ) : (
        <form action={fixAction} className="space-y-2 rounded-xl bg-stone-50 p-3">
          <input type="hidden" name="token" value={token} />
          <label className="block space-y-1">
            <span className="text-sm text-stone-600">¿Qué hay que corregir?</span>
            <textarea
              name="notes"
              required
              minLength={5}
              maxLength={600}
              rows={3}
              placeholder="Ej. La puerta de servicio va del lado de la cocina; el escenario mide 8 m, no 6."
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-800"
            />
          </label>
          {fixState?.error && <p className="text-sm text-red-600">{fixState.error}</p>}
          <div className="flex gap-2">
            <button disabled={fixing} className="h-11 flex-1 rounded-xl bg-stone-900 font-medium text-white disabled:opacity-60">
              {fixing ? "Enviando…" : "Enviar correcciones"}
            </button>
            <button type="button" onClick={() => setFixing(false)} className="h-11 rounded-xl border border-stone-300 bg-white px-4 font-medium">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
