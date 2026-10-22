import type { EventKind } from "../domain";
import { GUESTS_PER_PERIQUERA, starterFurniture, type Template } from "./starter";
import type { DesignerPlan } from "./types";

/**
 * Aforo por montaje de un salón (cuántos caben en banquete, imperial, cóctel, auditorio y escuela): se calcula con el
 * mismo motor del montaje inicial del diseñador, sobre el plano real, pidiéndole más invitados de los que caben y
 * contando los lugares que sí acomodó (con pista, escenario, barra y mesa principal donde el tipo de evento los lleva).
 * Al enseñarse se redondea hacia abajo a decenas y nunca pasa del aforo que declaró el salón (Protección Civil).
 */

/** Cada montaje con el tipo de evento con que se arma (qué fijos lleva) y cómo se nombra en la ficha. */
export const CAPACITY_SETUPS: { template: Template; kind: EventKind; label: string; short: string }[] = [
  { template: "redondas", kind: "boda", label: "Banquete con mesas redondas de 10", short: "Banquete" },
  { template: "imperial", kind: "boda", label: "Mesas imperiales", short: "Imperial" },
  { template: "coctel", kind: "cumpleanos", label: "Cóctel, de pie", short: "Cóctel" },
  { template: "auditorio", kind: "corporativo", label: "Auditorio con filas de sillas", short: "Auditorio" },
  { template: "escuela", kind: "corporativo", label: "Escuela con mesas frente al escenario", short: "Escuela" },
];

export type SetupCapacities = Record<Template, number>;

/** Más invitados de los que caben en cualquier salón: el motor llena todos los lugares libres. */
const MORE_THAN_FITS = 5000;

/** Cuántos caben en cada montaje (sin redondear ni topar); null si el plano no es de un salón o no trae sus lugares fijos. */
export function setupCapacities(plan: DesignerPlan): SetupCapacities | null {
  if (plan.kind !== "salon" || !plan.setup) return null;
  const out = {} as SetupCapacities;
  for (const s of CAPACITY_SETUPS) {
    const pieces = starterFurniture(plan, { guests: MORE_THAN_FITS, kind: s.kind, template: s.template });
    out[s.template] =
      s.template === "coctel"
        ? pieces.filter((p) => p.name === "Periquera").length * GUESTS_PER_PERIQUERA
        : pieces.reduce((sum, p) => sum + (p.seats ?? 0), 0);
  }
  return out;
}

export type ShownCapacity = { template: Template; label: string; short: string; value: number; capped: boolean; manual: boolean };

/**
 * Lo que se enseña: el valor que puso la administración o el calculado (redondeado hacia abajo a decenas), topado
 * en el aforo del salón. Sin ninguno de los dos, ese montaje no sale.
 */
export function shownCapacities(
  auto: Partial<SetupCapacities> | null | undefined,
  manual: Partial<SetupCapacities> | null | undefined,
  aforo: number | null | undefined,
): ShownCapacity[] {
  const out: ShownCapacity[] = [];
  for (const s of CAPACITY_SETUPS) {
    const fixed = manual?.[s.template];
    const computed = auto?.[s.template];
    const base = fixed && fixed > 0 ? fixed : computed && computed > 0 ? Math.floor(computed / 10) * 10 : 0;
    if (base <= 0) continue;
    const capped = Boolean(aforo && aforo > 0 && base > aforo);
    out.push({ template: s.template, label: s.label, short: s.short, value: capped ? aforo! : base, capped, manual: Boolean(fixed && fixed > 0) });
  }
  return out;
}

/** Lo que dice la tarjeta del catálogo: el banquete si se sabe; si no, el aforo declarado. */
export function capacityFact(shown: ShownCapacity[], aforo: number | null | undefined): string | null {
  const banquet = shown.find((c) => c.template === "redondas");
  if (banquet) return `Banquete: hasta ${banquet.value}`;
  return aforo ? `${aforo} personas` : null;
}
