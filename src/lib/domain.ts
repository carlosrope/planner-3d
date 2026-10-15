import { endOfDay } from "./dates";

// Catálogos del negocio compartidos por la base de datos, el servidor y la interfaz.

export const EVENT_KINDS = ["boda", "xv", "graduacion", "corporativo", "casa", "otro"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  boda: "Boda",
  xv: "XV años",
  graduacion: "Graduación",
  corporativo: "Corporativo",
  casa: "Casa / inmobiliaria",
  otro: "Otro",
};

/** Tipos de evento en un salón (la casa tiene su propia sección). */
export const SALON_EVENT_KINDS = ["boda", "xv", "graduacion", "corporativo", "otro"] as const satisfies readonly EventKind[];

/** Las dos secciones de la app: eventos (salones) y casas (inmobiliarias). Cada una es un módulo que la cuenta contrata. */
export const SECTIONS = {
  salones: { label: "Eventos", venueKind: "salon" },
  casas: { label: "Casas", venueKind: "casa" },
} as const;
export type Section = keyof typeof SECTIONS;
export const ALL_SECTIONS = Object.keys(SECTIONS) as Section[];
export const sectionOf = (venueKind: string): Section => (venueKind === "casa" ? "casas" : "salones");

/** Plan comercial de la cuenta. `prueba` vence en `planEndsAt`; los demás no vencen solos. */
export const PLANS = ["prueba", "eventos", "casas", "ambos", "personal", "invitado"] as const;
export type Plan = (typeof PLANS)[number];
export const PLAN_LABELS: Record<Plan, string> = {
  prueba: "Prueba",
  eventos: "Eventos",
  casas: "Casas",
  ambos: "Eventos y casas",
  personal: "Personal",
  invitado: "Con código",
};
/** Módulos que incluye cada plan (la prueba y el código pueden ser de uno o de los dos: se guardan en `modules`). */
export const PLAN_MODULES: Record<Exclude<Plan, "prueba" | "invitado">, readonly Section[]> = {
  eventos: ["salones"],
  casas: ["casas"],
  ambos: ["salones", "casas"],
  personal: ["salones"],
};
/**
 * Nivel del plan: Pro (con un tope de códigos de referido al mes) o Ilimitado (códigos sin tope).
 * Precios solo en prolink365.com.mx.
 */
export const TIERS = ["pro", "ilimitado"] as const;
export type Tier = (typeof TIERS)[number];
export const TIER_LABELS: Record<Tier, string> = { pro: "Pro", ilimitado: "Ilimitado" };
export const isTier = (value: unknown): value is Tier => value === "pro" || value === "ilimitado";
/**
 * Planes chicos: Personal (quien organiza por su cuenta: un evento activo, sin logo, sin hojas de proveedores,
 * sin códigos) y Con código (cliente de un salón o de una planner: un solo evento en ese lugar, lo cubre el plan
 * de quien dio el código). Ninguno de los dos paga por su cuenta ni reparte códigos.
 */
export const isLitePlan = (plan: Plan) => plan === "personal" || plan === "invitado";
/**
 * Códigos de referido que puede dar una cuenta cada mes: el dueño de un salón o desarrolladora 50 (Pro) o sin
 * tope (Ilimitado); la planner o inmobiliaria 5 (Pro) o sin tope. `null` = sin tope; 0 = no reparte códigos.
 */
export function referralQuota(org: { kind: OrgKind; plan: Plan; tier: Tier }): number | null {
  if (org.plan === "prueba" || isLitePlan(org.plan)) return 0;
  if (org.tier === "ilimitado") return null;
  return isOwnerKind(org.kind) ? 50 : 5;
}
/** Días que dura la cuenta de un cliente con código después de la fecha de su evento (o desde que entra, sin fecha). */
export const REFERRAL_DAYS_AFTER_EVENT = 30;
export const REFERRAL_DAYS_WITHOUT_DATE = 90;
/** Fin del plan de un cliente con código: 30 días después de su evento o 90 días desde hoy si no dio fecha. */
export function referralPlanEnd(eventDate: string | null, now = new Date()): Date {
  const base = eventDate ? endOfDay(eventDate) : now;
  return new Date(base.getTime() + (eventDate ? REFERRAL_DAYS_AFTER_EVENT : REFERRAL_DAYS_WITHOUT_DATE) * 86_400_000);
}
export const isSection = (value: unknown): value is Section => typeof value === "string" && value in SECTIONS;
export const isPlan = (value: unknown): value is Plan => typeof value === "string" && (PLANS as readonly string[]).includes(value);

/** Módulos que la cuenta puede usar ahora: los contratados, mientras el plan no haya vencido. */
export function activeModules(org: { modules: readonly Section[]; planEndsAt: Date | null }, now = new Date()): Section[] {
  if (org.planEndsAt && org.planEndsAt.getTime() <= now.getTime()) return [];
  return ALL_SECTIONS.filter((s) => org.modules.includes(s));
}

/** Tipo de lugar: salón de eventos o casa (inmobiliaria). */
export type VenueKind = "salon" | "casa";
export const VENUE_KIND_LABELS: Record<VenueKind, string> = { salon: "Salón de eventos", casa: "Modelo de casa" };
export const isVenueKind = (value: unknown): value is VenueKind => value === "salon" || value === "casa";

/**
 * Estado de un lugar del catálogo: el dueño lo registra (`conversion`: ProLink arma el plano), revisa su enlace
 * (`revision`), lo confirma (`publicado`: aparece en el catálogo público y para las planners) o pide retirarlo.
 */
export const VENUE_STATUSES = ["conversion", "revision", "publicado", "retirado"] as const;
export type VenueStatus = (typeof VENUE_STATUSES)[number];
export const VENUE_STATUS_LABELS: Record<VenueStatus, string> = {
  conversion: "En conversión",
  revision: "Por confirmar",
  publicado: "Publicado",
  retirado: "Retirado",
};
export const isVenueStatus = (value: unknown): value is VenueStatus =>
  typeof value === "string" && (VENUE_STATUSES as readonly string[]).includes(value);

/** Un pago por transferencia: el cliente sube el comprobante y ProLink lo confirma o lo rechaza. */
export const PAYMENT_STATUSES = ["pendiente", "confirmado", "rechazado"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pendiente: "Por revisar",
  confirmado: "Confirmado",
  rechazado: "Rechazado",
};
/** Periodo que cubre un pago. */
export const PAYMENT_PERIODS = ["mes", "anio"] as const;
export type PaymentPeriod = (typeof PAYMENT_PERIODS)[number];
export const PAYMENT_PERIOD_LABELS: Record<PaymentPeriod, string> = { mes: "Un mes", anio: "Un año" };
export const isPaymentPeriod = (value: unknown): value is PaymentPeriod => value === "mes" || value === "anio";

/** Días que faltan para que termine el plan (negativo si ya venció; null si no vence). */
export function planDaysLeft(planEndsAt: Date | null, now = new Date()): number | null {
  return planEndsAt ? Math.ceil((planEndsAt.getTime() - now.getTime()) / 86_400_000) : null;
}

/** Fin del plan después de un pago: se suma al fin vigente si todavía no llega, o a hoy si ya venció. */
export function planEndAfterPayment(current: Date | null, period: PaymentPeriod, now = new Date()): Date {
  const from = current && current.getTime() > now.getTime() ? new Date(current) : new Date(now);
  from.setMonth(from.getMonth() + (period === "anio" ? 12 : 1));
  return from;
}

/** Capas del plano que puede ver cada enlace compartido (según su rol). */
export const LAYERS = ["mobiliario", "decoracion", "staff", "proveedores", "tecnica", "rutas", "zonas"] as const;
export type Layer = (typeof LAYERS)[number];

export const EVENT_STATUSES = ["borrador", "confirmado", "realizado", "cancelado"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  borrador: "Borrador",
  confirmado: "Confirmado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

/** Tipo de negocio: planner u organizador, salón de eventos, inmobiliaria o asesor, desarrolladora o constructora. */
export const ORG_KINDS = ["planner", "venue", "agency", "developer"] as const;
export type OrgKind = (typeof ORG_KINDS)[number];
export const ORG_KIND_LABELS: Record<OrgKind, string> = {
  planner: "Planner u organizador de eventos",
  venue: "Salón de eventos",
  agency: "Inmobiliaria o asesor",
  developer: "Desarrolladora o constructora",
};
export const isOrgKind = (value: unknown): value is OrgKind => typeof value === "string" && (ORG_KINDS as readonly string[]).includes(value);
/** Negocios que son dueños de lugares: registran salones o modelos y tienen panel de lugares. */
export const isOwnerKind = (kind: OrgKind) => kind === "venue" || kind === "developer";
export type MemberRole = "owner" | "assistant" | "staff";

export const SHARE_ROLES = ["cliente", "staff", "proveedor", "salon"] as const;
export type ShareRole = (typeof SHARE_ROLES)[number];

/** Acciones que quedan en el rastro (tabla audit_log, visible en /admin/rastro). */
export const AUDIT_ACTIONS = ["pago_confirmado", "pago_rechazado", "plan_cambiado", "lugar_estado", "lugar_publicado", "lugar_retirado", "lugar_papelera", "lugar_restaurado"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  pago_confirmado: "Confirmó un pago",
  pago_rechazado: "Rechazó un pago",
  plan_cambiado: "Cambió el plan",
  lugar_estado: "Cambió el estado del lugar",
  lugar_publicado: "Publicó el lugar",
  lugar_retirado: "Retiró el lugar",
  lugar_papelera: "Mandó el lugar a la papelera",
  lugar_restaurado: "Restauró el lugar",
};
/** Acción del rastro para un cambio de estado de un lugar. */
export const venueStatusAction = (status: VenueStatus): AuditAction =>
  status === "publicado" ? "lugar_publicado" : status === "retirado" ? "lugar_retirado" : "lugar_estado";
/** Diferencias entre dos versiones de un objeto (para el rastro): solo los campos que cambiaron. */
export function changedFields<T extends Record<string, unknown>>(before: T, after: Partial<T>) {
  const norm = (v: unknown) => (v instanceof Date ? v.toISOString() : Array.isArray(v) ? [...v].sort().join(",") : v ?? null);
  const out: Record<string, { antes: unknown; despues: unknown }> = {};
  for (const k of Object.keys(after)) {
    if (after[k] === undefined) continue;
    if (norm(before[k]) !== norm(after[k])) out[k] = { antes: norm(before[k]), despues: norm(after[k]) };
  }
  return out;
}

/** Días que un evento o un lugar se queda en la papelera antes de borrarse de verdad. */
export const TRASH_DAYS = 30;
/** Cuándo se borra de verdad algo que se mandó a la papelera en `deletedAt`. */
export const trashPurgeAt = (deletedAt: Date) => new Date(deletedAt.getTime() + TRASH_DAYS * 86_400_000);
/** Días que le quedan en la papelera (0 = se borra hoy). */
export const trashDaysLeft = (deletedAt: Date, now = new Date()) =>
  Math.max(0, Math.ceil((trashPurgeAt(deletedAt).getTime() - now.getTime()) / 86_400_000));
