"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { startCardPayment } from "./actions";

export type PlanPeriodPrice = { value: string; amount: number };
export type PlanCardData = {
  key: string;
  name: string;
  who: string;
  points: string[];
  featured?: boolean;
  current?: boolean;
  monthly?: PlanPeriodPrice;
  annual?: PlanPeriodPrice;
};

const money = (n: number) => `$${n.toLocaleString("es-MX")}`;

function PayButton({ amount, period, primary }: { amount: number; period: "mes" | "anio"; primary?: boolean }) {
  const { pending } = useFormStatus();
  // El plan recomendado lleva el botón de color; los demás, con borde, para que se note cuál conviene.
  const look = primary
    ? "bg-[#b5653a] text-white hover:bg-[#a4552d] active:bg-[#93491f]"
    : "border border-stone-900 bg-white text-stone-900 hover:bg-stone-50 active:bg-stone-100";
  return (
    <button disabled={pending} className={`mt-auto flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 font-semibold disabled:opacity-60 ${look}`}>
      {pending ? "Abriendo Mercado Pago…" : `Pagar ${money(amount)}${period === "mes" ? " al mes" : ""}`}
    </button>
  );
}

/** Planes como tarjetas, con mensual o anual; cada tarjeta abre el pago con tarjeta en Mercado Pago. */
export function PlanPicker({ cards }: { cards: PlanCardData[] }) {
  const [state, action] = useActionState(startCardPayment, null);
  const hasAnnual = cards.some((c) => c.annual);
  const [period, setPeriod] = useState<"mes" | "anio">("mes");
  // En anual solo salen los planes que tienen pago anual; los demás se nombran abajo.
  const shown = cards.filter((c) => (period === "anio" ? c.annual : c.monthly));
  const monthlyOnly = period === "anio" ? cards.filter((c) => !c.annual && c.monthly) : [];

  return (
    <div>
      {hasAnnual && (
        <div className="mt-4 flex justify-center">
          <div role="radiogroup" aria-label="Forma de pago" className="inline-flex rounded-full border border-stone-200 bg-stone-100 p-1 text-sm font-medium">
            {(["mes", "anio"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={period === p}
                onClick={() => setPeriod(p)}
                className={`rounded-full px-4 py-2 transition ${period === p ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}
              >
                {p === "mes" ? "Mensual" : "Anual · 2 meses gratis"}
              </button>
            ))}
          </div>
        </div>
      )}

      <ul className={`mt-4 grid gap-3 ${shown.length >= 2 ? "sm:grid-cols-2" : ""}`}>
        {shown.map((c) => {
          const price = (period === "anio" ? c.annual : c.monthly)!;
          return (
            <li
              key={c.key}
              className={`relative flex flex-col rounded-2xl border bg-white p-4 ${c.featured ? "border-[#b5653a] ring-1 ring-[#b5653a]" : "border-stone-200"}`}
            >
              {(c.current || c.featured) && (
                <span
                  className={`absolute -top-2.5 left-4 rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.current ? "bg-stone-900 text-white" : "bg-[#b5653a] text-white"}`}
                >
                  {c.current ? "Tu plan" : "Recomendado"}
                </span>
              )}
              <p className="text-sm text-stone-500">{c.who}</p>
              <p className="text-lg font-semibold">{c.name}</p>
              <p className="mt-2">
                <span className="text-3xl font-semibold tracking-tight">{money(price.amount)}</span>
                <span className="text-sm text-stone-500"> {period === "mes" ? "al mes" : "al año"}</span>
              </p>
              <p className="text-xs text-stone-500">
                {period === "mes" ? "Se cobra solo cada mes · cancela cuando quieras" : `Un solo pago · equivale a ${money(Math.round(price.amount / 12))} al mes`}
              </p>
              <ul className="my-4 space-y-1.5 text-sm text-stone-700">
                {c.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span aria-hidden="true" className="text-[#b5653a]">
                      ✓
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
              <form action={action} className="mt-auto">
                <input type="hidden" name="option" value={price.value} />
                <PayButton amount={price.amount} period={period} primary={c.featured} />
              </form>
            </li>
          );
        })}
      </ul>

      {monthlyOnly.length > 0 && (
        <p className="mt-3 text-center text-sm text-stone-500">
          {monthlyOnly.map((c) => `${c.name}${c.who === "Organizo mi fiesta" ? "" : ` (${c.who})`}`).join(" y ")} {monthlyOnly.length === 1 ? "se paga" : "se pagan"} solo
          en mensual.{" "}
          <button type="button" onClick={() => setPeriod("mes")} className="underline">
            Ver mensual
          </button>
        </p>
      )}
      {state?.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-stone-500">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        Pago seguro con Mercado Pago · tarjeta de crédito o débito · Plantea no ve tu tarjeta
      </p>
    </div>
  );
}
