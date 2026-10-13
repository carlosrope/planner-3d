import { listPayments, type Org } from "@/lib/dal";
import { PAYMENT_PERIOD_LABELS, PAYMENT_STATUS_LABELS, PLAN_LABELS, SECTIONS, activeModules, planDaysLeft } from "@/lib/domain";
import { PRICES_URL, PROLINK_WHATSAPP, spei } from "@/lib/prolink";
import { waLink } from "@/lib/whatsapp";
import { PaymentForm } from "./PaymentForm";

const fecha = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" });
const fechaCorta = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });

/** Tu plan: qué incluye, cuándo vence, cómo pagar por transferencia y los comprobantes enviados. */
export async function PlanSection({ org }: { org: Org }) {
  const payments = await listPayments(org.id);
  const bank = spei();
  const active = activeModules(org);
  const expired = active.length === 0;
  const daysLeft = planDaysLeft(org.planEndsAt);
  const soon = daysLeft !== null && daysLeft > 0 && daysLeft <= 7;
  const modules = org.modules.map((m) => SECTIONS[m].label).join(" y ");

  return (
    <section className="mt-8 space-y-4">
      <h2 className="text-xl font-semibold">Tu plan</h2>
      <div className={`rounded-2xl border p-4 ${expired ? "border-red-200 bg-red-50" : soon ? "border-amber-200 bg-amber-50" : "border-stone-200 bg-white"}`}>
        <p className="text-lg font-semibold">{PLAN_LABELS[org.plan]}</p>
        <p className="text-sm text-stone-600">Incluye: {modules || "ningún módulo"}.</p>
        <p className="mt-1 text-sm">
          {org.planEndsAt
            ? expired
              ? `Terminó el ${fecha.format(org.planEndsAt)}. Tus proyectos siguen guardados; al confirmar tu pago se reactivan el mismo día.`
              : `Vigente hasta el ${fecha.format(org.planEndsAt)}${soon ? ` (quedan ${daysLeft} días)` : ""}.`
            : "Sin fecha de vencimiento."}
        </p>
        <p className="mt-2 text-sm">
          Planes y precios:{" "}
          <a href={PRICES_URL} target="_blank" rel="noopener" className="underline">
            prolink365.com.mx/espacios-3d
          </a>
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <h3 className="font-semibold">Pagar o renovar por transferencia</h3>
        {bank ? (
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-stone-500">Banco</dt>
            <dd>{bank.bank}</dd>
            <dt className="text-stone-500">CLABE</dt>
            <dd className="font-mono">{bank.clabe}</dd>
            <dt className="text-stone-500">Titular</dt>
            <dd>{bank.holder}</dd>
            <dt className="text-stone-500">Concepto</dt>
            <dd>{org.name}</dd>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-stone-600">
            Pide los datos de la cuenta por{" "}
            <a href={waLink(PROLINK_WHATSAPP, `Hola, quiero pagar el plan de ${org.name} en Espacios 3D.`)} target="_blank" rel="noopener" className="underline">
              WhatsApp
            </a>
            .
          </p>
        )}
        <p className="mt-3 text-sm text-stone-600">
          Después de transferir, sube tu comprobante. Lo confirmamos el mismo día hábil y tu plan queda activo; la factura CFDI llega por correo.
        </p>
        <PaymentForm currentPlan={org.plan} />
      </div>

      {payments.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <h3 className="font-semibold">Comprobantes enviados</h3>
          <ul className="mt-2 divide-y divide-stone-100 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 py-2">
                <div>
                  <p>
                    {PLAN_LABELS[p.plan]} · {PAYMENT_PERIOD_LABELS[p.period]} · ${p.amount.toLocaleString("es-MX")}
                  </p>
                  <p className="text-stone-500">
                    {fechaCorta.format(p.createdAt)}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    p.status === "confirmado" ? "bg-emerald-100 text-emerald-900" : p.status === "rechazado" ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {PAYMENT_STATUS_LABELS[p.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
