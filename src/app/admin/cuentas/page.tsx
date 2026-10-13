import type { Metadata } from "next";
import { Suspense } from "react";
import { adminListOrgs, requireAdmin } from "@/lib/dal";
import { ALL_SECTIONS, ORG_KINDS, ORG_KIND_LABELS, PLANS, PLAN_LABELS, SECTIONS, planDaysLeft } from "@/lib/domain";
import { AdminNav } from "../AdminNav";
import { updateOrgPlan } from "../actions";

export const metadata: Metadata = { title: "Administración · Cuentas" };

export default function AdminCuentasPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
        <Cuentas />
      </Suspense>
    </main>
  );
}

const field = "h-10 rounded-xl border border-stone-300 bg-white px-2 text-sm outline-none focus:border-stone-800";
const fecha = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });
const dateInput = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

async function Cuentas() {
  await requireAdmin();
  const orgs = await adminListOrgs();
  return (
    <>
      <AdminNav current="/admin/cuentas" />
      <h1 className="text-2xl font-semibold">Cuentas</h1>
      <p className="mt-1 text-sm text-stone-500">Cambia tipo, plan, módulos y fecha de fin sin tocar la base. Sin fecha = no vence.</p>
      <ul className="mt-4 space-y-3">
        {orgs.map((o) => (
          <li key={o.id} className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="font-semibold">{o.name}</p>
                <p className="text-sm text-stone-500">
                  {o.emails || "sin usuarios"} · {o.events} eventos · {o.venues} lugares · desde {fecha.format(o.createdAt)}
                  {o.pendingPayments > 0 && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">{o.pendingPayments} pago por revisar</span>}
                </p>
              </div>
              <p className="text-sm">
                {PLAN_LABELS[o.plan]} · {o.modules.map((m) => SECTIONS[m].label).join(" y ") || "sin módulos"} ·{" "}
                {o.planEndsAt ? ((planDaysLeft(o.planEndsAt) ?? 1) <= 0 ? <span className="text-red-700">venció el {fecha.format(o.planEndsAt)}</span> : `hasta el ${fecha.format(o.planEndsAt)}`) : "sin vencimiento"}
              </p>
            </div>
            <form action={updateOrgPlan} className="mt-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="orgId" value={o.id} />
              <select name="kind" defaultValue={o.kind} className={field}>
                {ORG_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {ORG_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
              <select name="plan" defaultValue={o.plan} className={field}>
                {PLANS.map((p) => (
                  <option key={p} value={p}>
                    {PLAN_LABELS[p]}
                  </option>
                ))}
              </select>
              {ALL_SECTIONS.map((s) => (
                <label key={s} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="modules" value={s} defaultChecked={o.modules.includes(s)} className="h-4 w-4" />
                  {SECTIONS[s].label}
                </label>
              ))}
              <input name="planEndsAt" type="date" defaultValue={dateInput(o.planEndsAt)} className={field} />
              <button className="h-10 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white">Guardar</button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
