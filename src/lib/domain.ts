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

/** Las dos secciones de la app: eventos en salón (wedding planners) y casas (inmobiliarias). */
export const SECTIONS = {
  salones: { label: "Eventos en salón", venueKind: "salon" },
  casas: { label: "Casas", venueKind: "casa" },
} as const;
export type Section = keyof typeof SECTIONS;
export const sectionOf = (venueKind: string): Section => (venueKind === "casa" ? "casas" : "salones");

export const EVENT_STATUSES = ["borrador", "confirmado", "realizado", "cancelado"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  borrador: "Borrador",
  confirmado: "Confirmado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

export type OrgKind = "planner" | "venue";
export type MemberRole = "owner" | "assistant" | "staff";

export const SHARE_ROLES = ["cliente", "staff", "proveedor", "salon"] as const;
export type ShareRole = (typeof SHARE_ROLES)[number];
