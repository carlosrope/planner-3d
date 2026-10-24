import type { Metadata } from "next";
import { Suspense } from "react";
import { adminListPayments, requireAdmin } from "@/lib/dal";
import { PAYMENT_PERIOD_LABELS, PAYMENT_STATUS_LABELS, PLAN_LABELS, TIER_LABELS } from "@/lib/domain";
import { AdminNav } from "../AdminNav";
import { resolvePayment } from "../actions";
import { formatDate } from "@/lib/dates";
import { EsqueletoLista } from "@/components/Esqueleto";

export const metadata: Metadata = { title: "Administración · Pagos" };

export default function AdminPagosPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <Suspense fallback={<EsqueletoLista />}>
        <Pagos />
      </Suspense>
    </main>
  );
}


async function Pagos() {
  await requireAdmin();
  const payments = await adminListPayments();
  return (
    <>
      <AdminNav current="/admin/pagos" />
      <h1 className="text-2xl font-semibold">Pagos por transferencia</h1>
      <p className="mt-1 text-sm text-stone-500">Confirmar activa el plan de la cuenta y le suma un mes o un año (desde hoy si ya venció). La factura CFDI se hace fuera de la app.</p>
      {payments.length === 0 ? (
        <p className="mt-6 text-stone-500">No hay comprobantes.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {payments.map((p) => (
            <li key={p.id} className={`rounded-2xl border p-4 ${p.status === "pendiente" ? "border-amber-300 bg-amber-50" : "border-stone-200 bg-white"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">
                  {p.orgName} · {PLAN_LABELS[p.plan]}{p.plan === "personal" ? "" : ` ${TIER_LABELS[p.tier]}`} · {PAYMENT_PERIOD_LABELS[p.period]} · ${p.amount.toLocaleString("es-MX")}
                </p>
                <p className="text-sm text-stone-500">
                  {formatDate(p.createdAt)} · {PAYMENT_STATUS_LABELS[p.status]}
                  {p.planEndsAt ? ` · plan hasta ${formatDate(p.planEndsAt)}` : " · sin vencimiento"}
                </p>
              </div>
              <p className="mt-1 text-sm">
                {p.method === "tarjeta" ? (
                  <span className="text-stone-600">Pagado con tarjeta (Mercado Pago){p.note ? ` · ${p.note}` : ""}</span>
                ) : (
                <>
                <a href={`/admin/comprobantes/${p.id}`} target="_blank" rel="noopener" className="underline">
                  Ver comprobante ({p.receiptName})
                </a>
                {p.note ? ` · ${p.note}` : ""}
                </>
                )}
              </p>
              {p.status === "pendiente" && (
                <form action={resolvePayment} className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="paymentId" value={p.id} />
                  <input name="note" placeholder="Nota (opcional): folio, factura…" maxLength={200} className="h-10 min-w-64 flex-1 rounded-xl border border-stone-300 bg-white px-3 text-sm" />
                  <button name="status" value="confirmado" className="h-10 rounded-xl bg-emerald-700 px-4 text-sm font-medium text-white">
                    Confirmar y activar
                  </button>
                  <button name="status" value="rechazado" className="h-10 rounded-xl border border-red-300 bg-white px-4 text-sm font-medium text-red-700">
                    Rechazar
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
