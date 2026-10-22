/**
 * Títulos, descripciones y textos para buscadores de las fichas y de las páginas de cada ciudad (22 de octubre de
 * 2026): salen solos de los datos del lugar (ciudad, aforo, aforo por montaje), sin escribir nada a mano por salón.
 * Puro: cubierto por seo-text.test.ts.
 */
import type { VenueKind } from "./domain";

/** Google corta la descripción alrededor de 155–160 caracteres. */
export const MAX_DESCRIPTION = 158;

const fit = (text: string) => (text.length <= MAX_DESCRIPTION ? text : `${text.slice(0, MAX_DESCRIPTION - 1).replace(/[\s,;:]+\S*$/, "")}…`);
const people = (n: number) => n.toLocaleString("es-MX");

/** Ficha de un lugar: «Salón X, salón de eventos en Guasave» y una descripción con su aforo. */
export function venueMeta(v: { kind: VenueKind; name: string; city: string; capacity: number | null; banquet: number | null }) {
  if (v.kind === "casa") {
    return {
      title: `${v.name}, casa en ${v.city} en 3D`,
      description: fit(`Recorre ${v.name} en ${v.city} en 3D desde el celular: amueblada o sin muebles, con sus medidas reales. Pide informes por WhatsApp.`),
    };
  }
  const size = v.banquet ? `hasta ${people(v.banquet)} invitados en banquete` : v.capacity ? `aforo de ${people(v.capacity)} personas` : null;
  return {
    title: `${v.name}, salón de eventos en ${v.city}`,
    description: fit(`${v.name} en ${v.city}${size ? `: ${size}` : ""}. Fotos, plano y recorrido en 3D desde el celular. Pide informes por WhatsApp.`),
  };
}

/** Rango de invitados en banquete entre los salones de una página (para el texto de la ciudad). */
export function banquetRange(values: (number | null | undefined)[]): { min: number; max: number } | null {
  const ok = values.filter((n): n is number => typeof n === "number" && n > 0);
  return ok.length ? { min: Math.min(...ok), max: Math.max(...ok) } : null;
}

/** Página de una ciudad: título, descripción y el párrafo de entrada (vacío si no hay lugares). */
export function cityMeta(kind: VenueKind, city: string, count: number, range: { min: number; max: number } | null) {
  if (kind === "casa") {
    const n = count === 1 ? "1 modelo de casa" : `${count} modelos de casa`;
    return {
      title: `Modelos de casa en ${city} en 3D`,
      description: fit(count ? `Recorre en 3D ${n} en ${city}: amueblados o sin muebles, con sus medidas reales. Pide informes a la desarrolladora por WhatsApp.` : `Modelos de casa en ${city} en 3D, desde el celular.`),
      intro: count ? `En ${city} hay ${n} en Plantea. Cada uno con su plano real en 2D y 3D: recórrelo desde el celular, cámbiale muebles y pisos, y pide informes directo a la desarrolladora.` : "",
    };
  }
  const n = count === 1 ? "1 salón de eventos" : `${count} salones de eventos`;
  const size = range ? (range.min === range.max ? ` En banquete, hasta ${people(range.max)} invitados.` : ` En banquete, de ${people(range.min)} a ${people(range.max)} invitados.`) : "";
  return {
    title: `Salones de eventos en ${city} en 3D`,
    description: fit(count ? `Recorre en 3D ${n} en ${city}: cuántos caben por montaje, fotos y solicitud de informes por WhatsApp.${size}` : `Salones de eventos en ${city} en 3D, desde el celular.`),
    intro: count
      ? `En ${city} hay ${n} en Plantea. Cada uno con su plano real en 2D y 3D: recórrelo desde el celular, mira cuántos caben en banquete, imperial o cóctel, y pide informes directo al salón por WhatsApp.${size}`
      : "",
  };
}
