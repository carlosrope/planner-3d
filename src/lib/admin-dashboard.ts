/**
 * Resumen de la administración (/admin): qué hay que hacer hoy y cómo va Plantea. Puro, sin base de datos:
 * cubierto por admin-dashboard.test.ts.
 */
import { daysSince } from "./activity";
import type { Plan, VenueStatus } from "./domain";

export type DashVenue = { id: string; name: string; slug: string | null; status: VenueStatus; createdAt: Date; updatedAt: Date; ownerOrgId: string | null };
export type DashOrg = { id: string; name: string; plan: Plan; planEndsAt: Date | null; createdAt: Date; paid: boolean };
export type DashPayment = { id: string; orgName: string; amount: number; createdAt: Date };
export type DashPilot = { venueId: string; name: string; alerts: string[] };

export type Task = { tone: "urgente" | "hoy" | "pendiente"; text: string; href: string };

/** Días que se promete entregar un salón desde que llega su plano; desde el día 5 se marca urgente. */
export const DELIVERY_DAYS = 7;
const URGENT_FROM = 5;
/** Días sin respuesta del dueño a su enlace de revisión antes de recordarle. */
const REMIND_REVIEW_AFTER = 3;
/** Días antes del fin de una prueba en que hay que ofrecerle el plan. */
export const TRIAL_ENDING_DAYS = 4;

const PAID_PLANS: readonly Plan[] = ["eventos", "casas", "ambos", "personal"];

/** Cuentas que pagaron alguna vez y tienen el plan vigente (no cuentan la prueba, el código ni "sin plan"). */
export const payingOrgs = (orgs: DashOrg[], now = new Date()) =>
  orgs.filter((o) => o.paid && PAID_PLANS.includes(o.plan) && (!o.planEndsAt || o.planEndsAt > now));

/** Pruebas que terminan en los próximos días (hoy incluido). */
export const trialsEnding = (orgs: DashOrg[], now = new Date(), days = TRIAL_ENDING_DAYS) =>
  orgs.filter((o) => o.plan === "prueba" && o.planEndsAt && o.planEndsAt > now && o.planEndsAt.getTime() - now.getTime() <= days * 86_400_000);

/** Salones por etapa, sin las demos. */
export function venueFunnel(venues: DashVenue[], demoSlugs: readonly string[]) {
  const real = venues.filter((v) => !v.slug || !demoSlugs.includes(v.slug));
  const by = (s: VenueStatus) => real.filter((v) => v.status === s).length;
  return { conversion: by("conversion"), revision: by("revision"), publicado: by("publicado"), retirado: by("retirado") };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const left = (end: Date, now: Date) => Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));

/** Lo que hay que hacer hoy, de lo más urgente a lo que puede esperar. */
export function dashboardTasks(
  input: { venues: DashVenue[]; payments: DashPayment[]; pilot: DashPilot[]; orgs: DashOrg[]; suggestionsOpen: number },
  now = new Date(),
): Task[] {
  const tasks: Task[] = [];
  for (const v of input.venues.filter((x) => x.status === "conversion").sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const d = daysSince(v.createdAt, now) ?? 0;
    tasks.push({
      tone: d >= URGENT_FROM ? "urgente" : "hoy",
      text: `Convertir ${v.name}: lleva ${plural(d, "día", "días")} de ${DELIVERY_DAYS}`,
      href: `/admin/lugares/${v.id}`,
    });
  }
  for (const p of input.payments) {
    tasks.push({ tone: "hoy", text: `Revisar el comprobante de ${p.orgName} por $${p.amount.toLocaleString("es-MX")}`, href: "/admin/pagos" });
  }
  for (const p of input.pilot.filter((x) => x.alerts.length)) {
    tasks.push({ tone: "urgente", text: `Llamar a ${p.name}: ${p.alerts[0].toLowerCase()}`, href: "/admin/piloto" });
  }
  for (const o of trialsEnding(input.orgs, now)) {
    const n = left(o.planEndsAt!, now);
    tasks.push({ tone: "hoy", text: `La prueba de ${o.name} termina ${n <= 1 ? "mañana" : `en ${n} días`}: ofrecerle su plan`, href: "/admin/piloto" });
  }
  for (const v of input.venues.filter((x) => x.status === "revision")) {
    const d = daysSince(v.updatedAt, now) ?? 0;
    if (d >= REMIND_REVIEW_AFTER) {
      tasks.push({ tone: "pendiente", text: `Recordarle a ${v.name} que revise su salón (${plural(d, "día", "días")} sin confirmar)`, href: `/admin/lugares/${v.id}` });
    }
  }
  if (input.suggestionsOpen > 0) {
    tasks.push({ tone: "pendiente", text: `${plural(input.suggestionsOpen, "sugerencia", "sugerencias")} del catálogo por atender`, href: "/admin/sugerencias" });
  }
  const order = { urgente: 0, hoy: 1, pendiente: 2 };
  return tasks.sort((a, b) => order[a.tone] - order[b.tone]);
}
