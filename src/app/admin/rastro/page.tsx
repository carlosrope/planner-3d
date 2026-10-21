import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { adminListAudit, requireAdmin } from "@/lib/dal";
import { formatInstant } from "@/lib/dates";
import { AUDIT_ACTION_LABELS, PLAN_LABELS, VENUE_STATUS_LABELS, isPlan, isVenueStatus } from "@/lib/domain";
import { AdminNav } from "../AdminNav";

export const metadata: Metadata = { title: "Administración · Rastro" };

export default function AdminRastroPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
        <Rastro />
      </Suspense>
    </main>
  );
}

const FIELD_LABELS: Record<string, string> = {
  status: "estado",
  isPublic: "abierto a todas",
  ownerOrgId: "dueño",
  kind: "tipo",
  plan: "plan",
  modules: "módulos",
  planEndsAt: "fin del plan",
  tier: "nivel",
};

/** Valor legible: plan y estado con su nombre, fechas en hora de Los Mochis, sí/no. */
function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (value === true) return "sí";
  if (value === false) return "no";
  if (isPlan(value)) return PLAN_LABELS[value];
  if (isVenueStatus(value)) return VENUE_STATUS_LABELS[value];
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatInstant(new Date(value));
  return String(value);
}

function describe(details: Record<string, unknown>): string[] {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(details)) {
    if (v && typeof v === "object" && "antes" in v && "despues" in v) {
      const c = v as { antes: unknown; despues: unknown };
      lines.push(`${FIELD_LABELS[k] ?? k}: ${show(c.antes)} → ${show(c.despues)}`);
    }
  }
  if ("monto" in details) lines.push(`$${Number(details.monto).toLocaleString("es-MX")} · ${show(details.plan)} · ${details.periodo === "anio" ? "un año" : "un mes"}`);
  if ("finDespues" in details) lines.push(`plan hasta: ${show(details.finAntes)} → ${show(details.finDespues)}`);
  if (details.codigo) lines.push(`código: ${String(details.codigo)}`);
  if (details.codigos) lines.push(`códigos: ${String(details.codigos)}`);
  if (details.nota) lines.push(`nota: ${String(details.nota)}`);
  return lines;
}

const href = (type: string, id: string) =>
  type === "venue"
    ? `/admin/lugares/${id}`
    : type === "payment"
      ? "/admin/pagos"
      : type === "setting"
        ? "/disenador/salon-demo"
        : type === "trial_code"
          ? "/admin/codigos"
          : "/admin/cuentas";

async function Rastro() {
  await requireAdmin();
  const rows = await adminListAudit();
  return (
    <>
      <AdminNav current="/admin/rastro" />
      <h1 className="text-2xl font-semibold">Rastro</h1>
      <p className="mt-1 text-sm text-stone-500">
        Quién confirmó o rechazó pagos, cambió planes, publicó, retiró o borró lugares y generó o canjeó códigos de mes gratis. Solo se agrega; no se puede editar. Horas de Los Mochis.
      </p>
      {rows.length === 0 ? (
        <p className="mt-6 text-stone-500">Todavía no hay movimientos.</p>
      ) : (
        <ul className="mt-4 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
          {rows.map((r) => (
            <li key={r.id} className="p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p>
                  <span className="font-medium">{AUDIT_ACTION_LABELS[r.action] ?? r.action}</span>
                  {" · "}
                  <Link href={href(r.targetType, r.targetId)} className="underline">
                    {r.targetLabel}
                  </Link>
                </p>
                <p className="text-stone-500">
                  {formatInstant(r.createdAt, "dateTime")} · {r.actor}
                </p>
              </div>
              {describe(r.details).map((line) => (
                <p key={line} className="text-stone-600">
                  {line}
                </p>
              ))}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
