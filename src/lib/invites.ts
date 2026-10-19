import { addDays, endOfDay, today } from "./dates";
import { ALL_SECTIONS, PLAN_MODULES, isOrgKind, isPlan, isSection, referralPlanEnd, sectionOf, type OrgKind, type Plan, type Section } from "./domain";

/** Días de la prueba cuando el código no dice otra cosa (decisión del 15 de octubre de 2026: 7 días). */
export const TRIAL_DAYS = 7;

/**
 * Códigos de invitación para crear cuenta.
 *
 * - `SIGNUP_CODES`: JSON con un código por cliente o campaña, por ejemplo
 *   `{"PLANNER7":{"kind":"planner","plan":"prueba","modules":["salones"],"days":7},"VDEVACA":{"kind":"venue","plan":"eventos"}}`.
 *   `days` solo aplica a `prueba`; sin `modules`, la prueba abre los dos módulos.
 * - `SIGNUP_CODE`: un solo código con acceso completo y sin vencimiento (compatibilidad con la prueba inicial).
 *
 * Sin código (o sin ninguno de los dos definidos en producción), la cuenta nace sin plan (`FREE_ACCOUNT`). En desarrollo, sin
 * códigos definidos, se registra con acceso completo.
 */
export type Invite = {
  kind: OrgKind;
  plan: Plan;
  modules: Section[];
  days: number | null;
  /** Código de referido de un salón o una planner: la cuenta dura hasta 30 días después del evento. */
  referral?: { codeId: string; eventDate: string | null };
};

export const FULL_ACCESS: Invite = { kind: "planner", plan: "ambos", modules: [...ALL_SECTIONS], days: null };
/** Quien llega sin código (publicidad, contenido): cuenta sin plan; ve catálogo y demos y elige su plan para crear. */
export const FREE_ACCOUNT: Invite = { kind: "planner", plan: "libre", modules: [], days: null };

export function parseInvites(codesJson: string | undefined, legacyCode: string | undefined): Map<string, Invite> {
  const invites = new Map<string, Invite>();
  if (legacyCode?.trim()) invites.set(legacyCode.trim(), FULL_ACCESS);
  if (!codesJson?.trim()) return invites;
  let parsed: unknown;
  try {
    parsed = JSON.parse(codesJson);
  } catch {
    throw new Error("SIGNUP_CODES no es JSON válido.");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("SIGNUP_CODES debe ser un objeto {codigo: {...}}.");
  for (const [code, raw] of Object.entries(parsed as Record<string, unknown>)) {
    const o = (raw ?? {}) as Record<string, unknown>;
    const plan: Plan = isPlan(o.plan) && o.plan !== "invitado" && o.plan !== "libre" ? o.plan : "prueba";
    // En una prueba se respetan los módulos pedidos; si no hay ninguno válido, se abren los dos.
    const asked = plan === "prueba" && Array.isArray(o.modules) ? o.modules.filter(isSection) : [];
    const modules: Section[] = plan === "prueba" ? (asked.length ? asked : [...ALL_SECTIONS]) : [...PLAN_MODULES[plan]];
    invites.set(code.trim(), {
      kind: isOrgKind(o.kind) ? o.kind : "planner",
      plan,
      modules,
      days: plan === "prueba" ? (typeof o.days === "number" && o.days > 0 ? Math.floor(o.days) : TRIAL_DAYS) : null,
    });
  }
  return invites;
}

/** Valores con los que se crea el negocio de una cuenta nueva según su invitación. */
export function orgValuesFor(invite: Invite, now = new Date()) {
  return {
    kind: invite.kind,
    plan: invite.plan,
    modules: invite.modules,
    planEndsAt: invite.referral
      ? referralPlanEnd(invite.referral.eventDate, now)
      : invite.days
        ? endOfDay(addDays(today(now), invite.days))
        : null,
    referralCodeId: invite.referral?.codeId ?? null,
  };
}

/** Invitación que abre un código de referido: cuenta "Con código", solo el módulo del lugar. */
export function referralInvite(ref: { id: string; eventDate: string | null; venueKind: string }): Invite {
  return { kind: "planner", plan: "invitado", modules: [sectionOf(ref.venueKind)], days: null, referral: { codeId: ref.id, eventDate: ref.eventDate } };
}
