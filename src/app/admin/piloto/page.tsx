import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { daysSince } from "@/lib/activity";
import { adminListPilot, requireAdmin } from "@/lib/dal";
import { formatInstant } from "@/lib/dates";
import { TRIAL_VENUE_REFERRALS, VENUE_STATUS_LABELS, planDaysLeft } from "@/lib/domain";
import { PILOT_DAYS, PILOT_HEALTH_LABELS, pilotAlerts, pilotDay, pilotHealth, type PilotHealth } from "@/lib/pilot";
import { AdminNav } from "../AdminNav";

export const metadata: Metadata = { title: "Administración · Piloto" };

export default function AdminPilotoPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
        <Piloto />
      </Suspense>
    </main>
  );
}

const HEALTH_STYLE: Record<PilotHealth, string> = {
  provecho: "bg-emerald-100 text-emerald-900",
  en_camino: "bg-sky-100 text-sky-900",
  llamar: "bg-red-100 text-red-900",
  sin_publicar: "bg-stone-200 text-stone-700",
};

const ago = (d: Date | null) => {
  const n = daysSince(d);
  return n === null ? "nunca" : n === 0 ? "hoy" : n === 1 ? "ayer" : `hace ${n} días`;
};

function Dato({ label, value, detail }: { label: string; value: number | string; detail?: string }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
      {detail && <p className="text-xs text-stone-500">{detail}</p>}
    </div>
  );
}

async function Piloto() {
  await requireAdmin();
  const rows = (await adminListPilot()).map((r) => ({ ...r, health: pilotHealth(r), alerts: pilotAlerts(r), day: pilotDay(r.publishedAt) }));
  const order: Record<PilotHealth, number> = { llamar: 0, en_camino: 1, provecho: 2, sin_publicar: 3 };
  rows.sort((a, b) => order[a.health] - order[b.health] || a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
  const count = (h: PilotHealth) => rows.filter((r) => r.health === h).length;
  return (
    <>
      <AdminNav current="/admin/piloto" />
      <h1 className="text-2xl font-semibold">Piloto · salones en prueba</h1>
      <p className="mt-1 text-sm text-stone-500">
        Cada salón cuyo dueño está en plan de prueba ({TRIAL_VENUE_REFERRALS} códigos al mes, {PILOT_DAYS} días desde que se publica). Los eventos y las visitas son los
        de los clientes que entraron con uno de sus códigos; las visitas no cuentan robots ni la vista previa de WhatsApp. La «última sesión» solo se ve mientras la
        sesión sigue abierta. Horas de Los Mochis.
      </p>
      {rows.length > 0 && (
        <p className="mt-3 rounded-xl bg-stone-100 p-3 text-sm">
          <strong>{rows.length}</strong> en prueba · <strong>{count("provecho")}</strong> le sacan provecho · <strong>{count("llamar")}</strong> para llamar ·{" "}
          <strong>{count("sin_publicar")}</strong> sin publicar
        </p>
      )}
      {rows.length === 0 && <p className="mt-6 text-stone-500">Todavía no hay salones en prueba. Se activan en Cuentas: plan Prueba, módulo Eventos y fecha de fin.</p>}
      <ul className="mt-4 space-y-3">
        {rows.map((r) => {
          const left = planDaysLeft(r.planEndsAt);
          return (
            <li key={r.venueId} className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    <Link href={`/admin/lugares/${r.venueId}`} className="underline">
                      {r.name}
                    </Link>
                  </p>
                  <p className="text-sm text-stone-500">
                    {r.city} · {VENUE_STATUS_LABELS[r.status]} · {r.orgName} · {r.emails || "sin usuarios"}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${HEALTH_STYLE[r.health]}`}>{PILOT_HEALTH_LABELS[r.health]}</span>
              </div>
              <p className="mt-2 text-sm">
                {r.day !== null ? `Día ${r.day} de ${PILOT_DAYS} · publicado ${formatInstant(r.publishedAt!)}` : "Sin publicar"}
                {r.planEndsAt ? (left !== null && left <= 0 ? ` · venció el ${formatInstant(r.planEndsAt)}` : ` · quedan ${left} días`) : " · sin fecha de fin"}
                {" · "}última sesión {ago(r.lastLogin)} · {r.opens} {r.opens === 1 ? "apertura" : "aperturas"} de su ficha
              </p>
              {r.alerts.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-red-800">
                  {r.alerts.map((a) => (
                    <li key={a}>• {a}</li>
                  ))}
                </ul>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <Dato label="Solicitudes" value={r.inquiries} detail={r.inquiries ? `${r.inquiriesUnseen} sin ver · última ${ago(r.lastInquiry)}` : undefined} />
                <Dato label="Códigos dados" value={r.codesGiven} detail={`${r.codesThisMonth} de ${TRIAL_VENUE_REFERRALS} este mes`} />
                <Dato label="Códigos usados" value={r.codesUsed} />
                <Dato
                  label="Eventos de sus clientes"
                  value={r.clientEvents}
                  detail={`${r.ownerEvents} ${r.ownerEvents === 1 ? "suyo" : "suyos"}${r.clientEdit ? ` · editado ${ago(r.clientEdit)}` : ""}`}
                />
                <Dato
                  label="Visitas de las familias"
                  value={r.clientViews}
                  detail={`${r.clientShares} ${r.clientShares === 1 ? "enlace" : "enlaces"} · ${r.clientComments} ${r.clientComments === 1 ? "comentario" : "comentarios"}${r.clientLastView ? ` · última ${ago(r.clientLastView)}` : ""}`}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
