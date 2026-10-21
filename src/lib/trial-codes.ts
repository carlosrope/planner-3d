/**
 * Códigos de mes gratis (decisión del usuario, 21 de octubre de 2026): la administración genera los que quiera en
 * /admin/codigos y quien crea su cuenta con uno (o lo canjea en Mi negocio, si no tiene plan de pago) queda en plan
 * Prueba con el módulo Eventos.
 *
 * - Salón: cuenta de salón con 5 códigos para sus clientes; el mes cuenta desde el día que su salón queda publicado y a
 *   su nombre (como el piloto «Salones fundadores»: no pierde los días de la conversión a 3D). Mientras tanto, la cuenta
 *   tiene la prueba abierta de forma provisional.
 * - Planner o quien recomendó un salón: el mes cuenta desde que crea su cuenta o canjea el código.
 *
 * Puro (sin red ni base de datos): cubierto por trial-codes.test.ts.
 */
import { addDays, endOfDay, today } from "./dates";
import { activeModules, type OrgKind, type Plan, type Section } from "./domain";
import { TOKEN_CHARS } from "./tokens";

export const TRIAL_CODE_KINDS = ["venue", "planner"] as const;
export type TrialCodeKind = (typeof TRIAL_CODE_KINDS)[number];
export const TRIAL_CODE_KIND_LABELS: Record<TrialCodeKind, string> = {
  venue: "Salón",
  planner: "Planner o quien recomendó un salón",
};
export const isTrialCodeKind = (value: unknown): value is TrialCodeKind => value === "venue" || value === "planner";

/** Días que da un código si no se pide otra cosa. */
export const TRIAL_CODE_DAYS = 30;
/** Cuántos se pueden generar de una vez. */
export const TRIAL_CODE_BATCH_MAX = 50;
/** Prefijo de todos los códigos: MES-7K3MQ2 («mes» gratis); mismo formato que los de los salones, se dicta igual. */
export const TRIAL_CODE_PREFIX = "MES";
const SUFFIX_LENGTH = 6;

/** Código nuevo; `random` da bytes al azar (en el servidor, crypto.randomBytes). */
export function newTrialCode(random: (n: number) => Uint8Array): string {
  const suffix = Array.from(random(SUFFIX_LENGTH), (b) => TOKEN_CHARS[b % TOKEN_CHARS.length].toUpperCase()).join("");
  return `${TRIAL_CODE_PREFIX}-${suffix}`;
}

/** Módulos que abre un código: los dos tipos son de eventos en salón. */
export const TRIAL_CODE_MODULES: Section[] = ["salones"];

/** El mes de un salón empieza al publicarse su salón; el de los demás, al entrar. */
export const startsOnPublish = (kind: TrialCodeKind) => kind === "venue";

/** Fin del mes que empieza en `from`: `days` días después, a las 23:59 de Los Mochis (como la prueba de los códigos de invitación). */
export const trialEnd = (days: number, from = new Date()) => endOfDay(addDays(today(from), days));

type OrgPlan = { plan: Plan; modules: readonly Section[]; planEndsAt: Date | null };

/**
 * ¿La cuenta puede canjear un código en Mi negocio? Solo si no tiene un plan de pago vigente: sin plan, con el código de
 * un salón, en prueba o con su plan vencido. A quien ya paga, el mes se lo suma la administración en /admin/cuentas.
 */
export function canRedeemTrial(org: OrgPlan, now = new Date()): boolean {
  if (org.plan === "libre" || org.plan === "invitado" || org.plan === "prueba") return true;
  return activeModules(org, now).length === 0;
}

/**
 * Lo que cambia en la cuenta al canjear un código en Mi negocio. Un código de salón la vuelve cuenta de salón; uno de
 * planner deja el tipo que ya tenía. Si ya estaba en una prueba más larga, no se le acorta.
 */
export function redeemValues(org: OrgPlan & { kind: OrgKind }, code: { kind: TrialCodeKind; days: number }, now = new Date()) {
  const end = trialEnd(code.days, now);
  const current = org.plan === "prueba" && org.planEndsAt && org.planEndsAt.getTime() > end.getTime() ? org.planEndsAt : null;
  return {
    kind: code.kind === "venue" ? ("venue" as const) : org.kind,
    plan: "prueba" as const,
    modules: [...new Set([...(org.plan === "prueba" ? org.modules : []), ...TRIAL_CODE_MODULES])],
    planEndsAt: current ?? end,
  };
}

/** Estado de un código para la lista de la administración. */
export type TrialCodeState = "libre" | "usado" | "desactivado";
export const TRIAL_CODE_STATE_LABELS: Record<TrialCodeState, string> = { libre: "Sin usar", usado: "Usado", desactivado: "Desactivado" };
export const trialCodeState = (c: { usedAt: Date | null; disabledAt: Date | null }): TrialCodeState =>
  c.usedAt ? "usado" : c.disabledAt ? "desactivado" : "libre";

/** Mensaje de WhatsApp con el código (de usted, como el manual de ventas). */
export function trialCodeMessage(c: { code: string; kind: TrialCodeKind; days: number }, origin: string) {
  const link = `${origin}/registro?codigo=${encodeURIComponent(c.code)}`;
  const span = c.days === TRIAL_CODE_DAYS ? "un mes" : `${c.days} días`;
  const when = startsOnPublish(c.kind)
    ? `Su ${c.days === TRIAL_CODE_DAYS ? "mes" : "prueba"} empieza a contar el día que su salón quede publicado en 3D, con 5 códigos para sus clientes.`
    : `Su ${c.days === TRIAL_CODE_DAYS ? "mes" : "prueba"} empieza a contar el día que cree su cuenta.`;
  return [
    `Hola 👋 Le comparto su código para usar Plantea ${span} sin costo: ${c.code}`,
    `Cree su cuenta aquí, con su correo o con Google: ${link}`,
    when,
    "Si ya tiene cuenta en Plantea, escriba el código en Mi negocio → Tu plan.",
  ].join("\n\n");
}
