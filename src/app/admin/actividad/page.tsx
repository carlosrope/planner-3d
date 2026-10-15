import type { Metadata } from "next";
import { Suspense } from "react";
import { ACTIVITY_STAGE_LABELS, activityStage, daysSince, latest, type ActivityStage } from "@/lib/activity";
import { adminListActivity, requireAdmin } from "@/lib/dal";
import { formatInstant } from "@/lib/dates";
import { ORG_KIND_LABELS, PLAN_LABELS, planDaysLeft } from "@/lib/domain";
import { AdminNav } from "../AdminNav";

export const metadata: Metadata = { title: "Administración · Actividad" };

export default function AdminActividadPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
        <Actividad />
      </Suspense>
    </main>
  );
}

const STAGE_STYLE: Record<ActivityStage, string> = {
  sin_entrar: "bg-stone-200 text-stone-700",
  entro: "bg-amber-100 text-amber-900",
  armo: "bg-sky-100 text-sky-900",
  compartio: "bg-indigo-100 text-indigo-900",
  visto: "bg-emerald-100 text-emerald-900",
};

const ago = (d: Date | null) => {
  const n = daysSince(d);
  return n === null ? "nunca" : n === 0 ? "hoy" : n === 1 ? "ayer" : `hace ${n} días`;
};

async function Actividad() {
  await requireAdmin();
  const rows = (await adminListActivity()).map((r) => ({ ...r, stage: activityStage(r), last: latest(r.lastLogin, r.lastEdit, r.lastShareView) }));
  // Primero las cuentas en prueba (son las que hay que llamar), luego por actividad más reciente.
  rows.sort((a, b) => Number(b.plan === "prueba") - Number(a.plan === "prueba") || (b.last?.getTime() ?? 0) - (a.last?.getTime() ?? 0));
  const trials = rows.filter((r) => r.plan === "prueba");
  const using = trials.filter((r) => r.stage === "compartio" || r.stage === "visto").length;
  return (
    <>
      <AdminNav current="/admin/actividad" />
      <h1 className="text-2xl font-semibold">Actividad</h1>
      <p className="mt-1 text-sm text-stone-500">
        Qué hizo cada cuenta (la «última sesión» solo se ve mientras la sesión sigue abierta; al cerrarla o vencer se borra): entrar, armar un evento propio (los de ejemplo no cuentan), compartir el enlace y si su cliente lo abrió. Las vistas previas
        de WhatsApp no se cuentan como visitas. Horas de Los Mochis.
      </p>
      {trials.length > 0 && (
        <p className="mt-3 rounded-xl bg-stone-100 p-3 text-sm">
          <strong>{trials.length}</strong> en prueba · <strong>{using}</strong> ya compartieron un evento con su cliente.
        </p>
      )}
      <ul className="mt-4 space-y-3">
        {rows.map((r) => {
          const left = planDaysLeft(r.planEndsAt);
          return (
            <li key={r.id} className={`rounded-2xl border p-4 ${r.plan === "prueba" ? "border-amber-200 bg-amber-50/40" : "border-stone-200 bg-white"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-sm text-stone-500">
                    {r.emails || "sin usuarios"} · {ORG_KIND_LABELS[r.kind]}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_STYLE[r.stage]}`}>{ACTIVITY_STAGE_LABELS[r.stage]}</span>
              </div>
              <p className="mt-2 text-sm">
                {PLAN_LABELS[r.plan]}
                {r.planEndsAt ? (left !== null && left <= 0 ? ` · venció el ${formatInstant(r.planEndsAt)}` : ` · quedan ${left} días`) : ""}
                {" · "}alta {formatInstant(r.createdAt)} · última actividad {ago(r.last)}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                {r.lastLogin ? `Última sesión ${ago(r.lastLogin)}` : "Sin sesión abierta"} · {r.ownEvents} {r.ownEvents === 1 ? "evento propio" : "eventos propios"}
                {r.sampleEvents ? ` (+${r.sampleEvents} de ejemplo)` : ""} · editó {ago(r.lastEdit)} · {r.shares} {r.shares === 1 ? "enlace" : "enlaces"} ·{" "}
                {r.shareViews} {r.shareViews === 1 ? "visita de su cliente" : "visitas de sus clientes"}
                {r.lastShareView ? ` (última ${ago(r.lastShareView)})` : ""} · {r.comments} {r.comments === 1 ? "comentario" : "comentarios"}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
