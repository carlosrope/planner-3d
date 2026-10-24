import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DELIVERY_DAYS, dashboardTasks, payingOrgs, trialsEnding, venueFunnel, type Task } from "@/lib/admin-dashboard";
import { adminDashboard, requireAdmin } from "@/lib/dal";
import { formatInstant } from "@/lib/dates";
import { AUDIT_ACTION_LABELS } from "@/lib/domain";
import { pilotAlerts, pilotHealth } from "@/lib/pilot";
import { DEMO_SLUGS } from "@/lib/testimonials";
import { AdminNav } from "./AdminNav";
import { EsqueletoLista } from "@/components/Esqueleto";

export const metadata: Metadata = { title: "Administración · Resumen" };

export default function AdminResumenPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <Suspense fallback={<EsqueletoLista />}>
        <Resumen />
      </Suspense>
    </main>
  );
}

const money = (n: number) => `$${n.toLocaleString("es-MX")}`;

const TONE: Record<Task["tone"], { dot: string; label: string }> = {
  urgente: { dot: "bg-red-500", label: "Urgente" },
  hoy: { dot: "bg-amber-500", label: "Hoy" },
  pendiente: { dot: "bg-stone-400", label: "Pendiente" },
};

function Kpi({ label, value, detail, href }: { label: string; value: string | number; detail?: string; href: string }) {
  return (
    <Link href={href} className="block rounded-2xl border border-stone-200 bg-white p-4 hover:border-stone-400">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      {detail && <p className="mt-1 text-xs text-stone-500">{detail}</p>}
    </Link>
  );
}

function Paso({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max ? Math.max(4, Math.round((value / max) * 100)) : 4;
  return (
    <li className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 text-sm">
      <span className="text-stone-600">{label}</span>
      <span className="h-3 rounded-full bg-stone-100">
        <span className="block h-3 rounded-full bg-[#a4552d]" style={{ width: `${width}%` }} />
      </span>
      <span className="text-right font-semibold">{value}</span>
    </li>
  );
}

const SHORTCUTS = [
  { href: "/admin/lugares", title: "Lugares", text: "Planos por convertir, revisión y publicación" },
  { href: "/admin/piloto", title: "Piloto", text: "Salones en prueba y si le sacan provecho" },
  { href: "/admin/cuentas", title: "Cuentas", text: "Tipo, plan, módulos y fin de cada cuenta" },
  { href: "/admin/codigos", title: "Códigos de mes gratis", text: "Genera, manda y desactiva códigos; quién los usó" },
  { href: "/admin/pagos", title: "Pagos", text: "Comprobantes por SPEI" },
  { href: "/admin/actividad", title: "Actividad", text: "Qué hace cada cliente en Plantea" },
  { href: "/admin/rastro", title: "Rastro", text: "Quién cambió qué y cuándo" },
] as const;

async function Resumen() {
  const admin = await requireAdmin();
  const d = await adminDashboard();
  const now = new Date();
  const pilot = d.pilot.map((p) => ({ venueId: p.venueId, name: p.name, alerts: pilotAlerts(p, now), health: pilotHealth(p, now) }));
  const tasks = dashboardTasks({ venues: d.venues, payments: d.payments, pilot, orgs: d.orgs, suggestionsOpen: d.suggestionsOpen }, now);
  const paying = payingOrgs(d.orgs, now);
  const funnel = venueFunnel(d.venues, DEMO_SLUGS);
  const trials = d.orgs.filter((o) => o.plan === "prueba" && (!o.planEndsAt || o.planEndsAt > now));
  const toCall = pilot.filter((p) => p.alerts.length).length;
  const ending = trialsEnding(d.orgs, now).length;
  const payingVenues = paying.filter((o) => d.venues.some((v) => v.ownerOrgId === o.id && v.status === "publicado")).length;
  const steps = [
    { label: "Por convertir", value: funnel.conversion },
    { label: "Por confirmar", value: funnel.revision },
    { label: "Publicados", value: funnel.publicado },
    { label: "En prueba", value: d.pilot.length },
    { label: "De pago", value: payingVenues },
  ];
  const max = Math.max(...steps.map((s) => s.value), 1);
  const firstName = admin.name.split(" ")[0] || "Carlos";
  const today = formatInstant(now, "weekday");

  return (
    <>
      <AdminNav current="/admin" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{today.charAt(0).toUpperCase() + today.slice(1)}</p>
          <h1 className="text-2xl font-semibold">Hola, {firstName}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/salones" className="flex h-10 items-center rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium">
            Ver el catálogo
          </Link>
          <Link href="/eventos" className="flex h-10 items-center rounded-xl bg-stone-900 px-3 text-sm font-medium text-white">
            Mis proyectos
          </Link>
        </div>
      </div>

      <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-semibold">Pendientes</h2>
          <p className="text-xs text-stone-500">Los salones se entregan en {DELIVERY_DAYS} días desde que llega el plano</p>
        </div>
        {tasks.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">Nada pendiente por hoy.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100">
            {tasks.map((t) => (
              <li key={`${t.href}|${t.text}`}>
                <Link href={t.href} className="flex items-center gap-3 py-2.5 text-sm hover:bg-stone-50">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TONE[t.tone].dot}`} aria-hidden="true" />
                  <span className="flex-1">{t.text}</span>
                  <span className="shrink-0 text-xs text-stone-500">{TONE[t.tone].label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Cuentas de pago" value={paying.length} detail={`${payingVenues} de salones`} href="/admin/cuentas" />
        <Kpi label="Cobrado este mes" value={money(d.collectedMonth)} detail={`${money(d.collectedTotal)} en total`} href="/admin/pagos" />
        <Kpi label="Salones publicados" value={funnel.publicado} detail="Sin contar las demos" href="/admin/lugares" />
        <Kpi
          label="En prueba"
          value={trials.length}
          detail={`${toCall} para llamar${ending ? ` · ${ending} por terminar` : ""}`}
          href="/admin/piloto"
        />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="font-semibold">Salones, de plano a pago</h2>
          <ul className="mt-3 space-y-2">
            {steps.map((s) => (
              <Paso key={s.label} {...s} max={max} />
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="font-semibold">Últimos 7 días</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {[
              ["Cuentas nuevas", d.week.newAccounts],
              ["Eventos creados", d.week.events],
              ["Códigos dados", d.week.codesGiven],
              ["Códigos usados", d.week.codesUsed],
              ["Enlaces vistos", d.week.linksViewed],
              ["Solicitudes", d.week.inquiries],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-stone-50 p-3">
                <dt className="text-xs text-stone-500">{label}</dt>
                <dd className="text-xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Lo último</h2>
            <Link href="/admin/rastro" className="text-sm underline">
              Ver todo
            </Link>
          </div>
          {d.recent.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">Todavía no hay movimientos.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {d.recent.map((r) => (
                <li key={r.id} className="flex gap-3">
                  <span className="w-24 shrink-0 text-xs text-stone-500">{formatInstant(r.createdAt, "dateTime")}</span>
                  <span>
                    {AUDIT_ACTION_LABELS[r.action] ?? r.action}: <strong className="font-medium">{r.targetLabel}</strong>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="font-semibold">Ir a</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {SHORTCUTS.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="block rounded-xl border border-stone-200 p-3 hover:border-stone-400">
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-stone-500">{s.text}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
