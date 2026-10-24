import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { adminListTrialCodes, requireAdmin } from "@/lib/dal";
import { siteOrigin } from "@/lib/brand";
import { formatDate, formatInstant } from "@/lib/dates";
import {
  TRIAL_CODE_BATCH_MAX,
  TRIAL_CODE_DAYS,
  TRIAL_CODE_KINDS,
  TRIAL_CODE_KIND_LABELS,
  TRIAL_CODE_STATE_LABELS,
  trialCodeMessage,
  trialCodeState,
  type TrialCodeState,
} from "@/lib/trial-codes";
import { AdminNav } from "../AdminNav";
import { SaveButton } from "../SaveButton";
import { createTrialCodes, toggleTrialCode } from "../actions";
import { CopyList, ShareCode } from "./CopyButtons";
import { EsqueletoLista } from "@/components/Esqueleto";

export const metadata: Metadata = { title: "Administración · Códigos de mes gratis" };

export default function AdminCodigosPage({ searchParams }: PageProps<"/admin/codigos">) {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <Suspense fallback={<EsqueletoLista />}>
        <Codigos searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const field = "h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-800";
const FILTERS: { id: "todos" | TrialCodeState; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "libre", label: "Sin usar" },
  { id: "usado", label: "Usados" },
  { id: "desactivado", label: "Desactivados" },
];
const PILL: Record<TrialCodeState, string> = {
  libre: "bg-emerald-100 text-emerald-900",
  usado: "bg-stone-200 text-stone-800",
  desactivado: "bg-red-100 text-red-900",
};

type Row = Awaited<ReturnType<typeof adminListTrialCodes>>[number];

/** En qué va el mes de quien usó el código. */
function monthLine(c: Row, now: Date): string {
  if (c.startedAt && c.endsAt) {
    const over = c.endsAt.getTime() <= now.getTime();
    return `Su mes: del ${formatDate(c.startedAt)} al ${formatDate(c.endsAt)}${over ? " (ya terminó)" : ""}.`;
  }
  if (c.startedAt) return `Al publicarse su salón ya tenía un plan de pago; su plan no cambió.`;
  return `Su mes empieza el día que su salón quede publicado y a su nombre.${c.orgPlan === "prueba" && c.orgPlanEndsAt ? ` Mientras tanto, prueba abierta hasta el ${formatDate(c.orgPlanEndsAt)}.` : ""}`;
}

async function Codigos({ searchParams }: { searchParams: PageProps<"/admin/codigos">["searchParams"] }) {
  await requireAdmin();
  const { ver, nuevos } = await searchParams;
  const all = await adminListTrialCodes();
  const origin = siteOrigin();
  const now = new Date();
  const filter = FILTERS.find((f) => f.id === ver)?.id ?? "todos";
  const counts = Object.fromEntries(FILTERS.map((f) => [f.id, f.id === "todos" ? all.length : all.filter((c) => trialCodeState(c) === f.id).length]));
  const rows = filter === "todos" ? all : all.filter((c) => trialCodeState(c) === filter);
  // Los recién generados comparten la misma hora de creación (se insertan juntos): son los primeros de la lista.
  const fresh = Number(nuevos) > 0 && all.length ? all.filter((c) => c.createdAt.getTime() === all[0].createdAt.getTime()) : [];
  const freshIds = new Set(fresh.map((c) => c.id));

  return (
    <>
      <AdminNav current="/admin/codigos" />
      <h1 className="text-2xl font-semibold">Códigos de mes gratis</h1>
      <p className="mt-1 text-sm text-stone-500">
        Quien crea su cuenta con uno (o lo escribe en Mi negocio, si no tiene plan de pago) queda en plan Prueba con Eventos. Cada código sirve una sola vez.
        Salón: cuenta de salón con 5 códigos para sus clientes; su mes empieza el día que su salón queda publicado y a su nombre. Planner o quien recomendó un
        salón: su mes empieza al entrar.
      </p>

      <form action={createTrialCodes} className="mt-4 grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-[6rem_1fr_6rem] sm:items-end">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Cuántos</span>
          <input name="count" type="number" min={1} max={TRIAL_CODE_BATCH_MAX} defaultValue={1} required className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Para quién</span>
          <select name="kind" defaultValue="venue" className={field}>
            {TRIAL_CODE_KINDS.map((k) => (
              <option key={k} value={k}>
                {TRIAL_CODE_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Días</span>
          <input name="days" type="number" min={1} max={365} defaultValue={TRIAL_CODE_DAYS} required className={field} />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">Nota (opcional)</span>
          <input name="note" maxLength={120} placeholder="Ej. Salón Atalia · Guasave" className={field} />
        </label>
        <SaveButton className="h-11 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white">Generar</SaveButton>
      </form>

      {fresh.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p>
            {fresh.length === 1 ? "Listo el código nuevo" : `Listos ${fresh.length} códigos nuevos`}: van primero en la lista, marcados en verde.
          </p>
          {fresh.length > 1 && <CopyList label={`Copiar los ${fresh.length} códigos`} text={fresh.map((c) => (c.note ? `${c.code}\t${c.note}` : c.code)).join("\n")} />}
        </div>
      )}

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Filtrar códigos">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={f.id === "todos" ? "/admin/codigos" : `/admin/codigos?ver=${f.id}`}
            aria-current={f.id === filter ? "page" : undefined}
            className={`flex h-9 items-center rounded-full px-3 text-sm ${f.id === filter ? "bg-stone-900 text-white" : "border border-stone-300 bg-white"}`}
          >
            {f.label} · {counts[f.id]}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="mt-6 text-stone-500">{all.length ? "No hay códigos en este filtro." : "Todavía no hay códigos. Genera el primero arriba."}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((c) => {
            const state = trialCodeState(c);
            return (
              <li key={c.id} className={`rounded-2xl border p-4 ${freshIds.has(c.id) ? "border-emerald-300 bg-emerald-50/40" : "border-stone-200 bg-white"}`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="select-all font-mono text-xl font-bold tracking-[0.1em] text-[#a4552d]">{c.code}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PILL[state]}`}>{TRIAL_CODE_STATE_LABELS[state]}</span>
                  <span className="text-sm text-stone-600">
                    {TRIAL_CODE_KIND_LABELS[c.kind]} · {c.days} días
                  </span>
                </div>
                {c.note && <p className="mt-1 text-sm font-medium">{c.note}</p>}
                <p className="mt-1 text-xs text-stone-500">
                  Generado el {formatInstant(c.createdAt, "dateTime")} por {c.createdBy}
                  {c.disabledAt ? ` · desactivado el ${formatDate(c.disabledAt)}` : ""}
                </p>
                {c.usedAt && (
                  <div className="mt-2 rounded-xl bg-stone-50 p-3 text-sm">
                    <p>
                      Lo usó{" "}
                      {c.usedByOrgId ? (
                        <Link href="/admin/cuentas" className="font-medium underline">
                          {c.usedByName ?? "una cuenta"}
                        </Link>
                      ) : (
                        <span className="font-medium">una cuenta que ya se borró</span>
                      )}
                      {c.usedByEmail ? ` (${c.usedByEmail})` : ""} el {formatInstant(c.usedAt, "dateTime")}
                    </p>
                    <p className="text-stone-600">{monthLine(c, now)}</p>
                  </div>
                )}
                {state !== "usado" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {state === "libre" && <ShareCode message={trialCodeMessage(c, origin)} />}
                    <form action={toggleTrialCode}>
                      <input type="hidden" name="codeId" value={c.id} />
                      <input type="hidden" name="disabled" value={state === "libre" ? "1" : "0"} />
                      <SaveButton className="h-10 rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium">
                        {state === "libre" ? "Desactivar" : "Reactivar"}
                      </SaveButton>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
