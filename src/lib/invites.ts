import { ALL_SECTIONS, PLAN_MODULES, isOrgKind, isPlan, isSection, type OrgKind, type Plan, type Section } from "./domain";

/**
 * Códigos de invitación para crear cuenta.
 *
 * - `SIGNUP_CODES`: JSON con un código por cliente o campaña, por ejemplo
 *   `{"PLANNER14":{"kind":"planner","plan":"prueba","modules":["salones"],"days":14},"VDEVACA":{"kind":"venue","plan":"eventos"}}`.
 *   `days` solo aplica a `prueba`; sin `modules`, la prueba abre los dos módulos.
 * - `SIGNUP_CODE`: un solo código con acceso completo y sin vencimiento (compatibilidad con la prueba inicial).
 *
 * Sin ninguno de los dos, cualquiera puede registrarse con acceso completo (solo en desarrollo).
 */
export type Invite = { kind: OrgKind; plan: Plan; modules: Section[]; days: number | null };

export const FULL_ACCESS: Invite = { kind: "planner", plan: "ambos", modules: [...ALL_SECTIONS], days: null };

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
    const plan: Plan = isPlan(o.plan) ? o.plan : "prueba";
    // En una prueba se respetan los módulos pedidos; si no hay ninguno válido, se abren los dos.
    const asked = plan === "prueba" && Array.isArray(o.modules) ? o.modules.filter(isSection) : [];
    const modules: Section[] = plan === "prueba" ? (asked.length ? asked : [...ALL_SECTIONS]) : [...PLAN_MODULES[plan]];
    invites.set(code.trim(), {
      kind: isOrgKind(o.kind) ? o.kind : "planner",
      plan,
      modules,
      days: plan === "prueba" ? (typeof o.days === "number" && o.days > 0 ? Math.floor(o.days) : 14) : null,
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
    planEndsAt: invite.days ? new Date(now.getTime() + invite.days * 86_400_000) : null,
  };
}
