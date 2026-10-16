/**
 * Sugerencia del catálogo: lo que alguien buscó en el diseñador y no encontró. Llega por correo a Plantea sin pedirle
 * datos a la persona (solo lo que buscó y las opciones que marcó). Puro: cubierto por suggestion.test.ts.
 */
import { z } from "zod";

export const SUGGESTION_KINDS = ["Mueble", "Decoración", "Servicio o show", "Equipo (audio, luz, pantallas)", "Otro"] as const;

export const suggestionSchema = z.object({
  termino: z.string().trim().min(1).max(80),
  categoria: z.enum(SUGGESTION_KINDS).catch("Otro"),
  uso: z.string().trim().max(120).catch(""),
  lugar: z.string().trim().max(120).catch(""),
  tipoEvento: z.string().trim().max(60).catch(""),
  pagina: z.string().trim().max(200).catch(""),
});
export type Suggestion = z.infer<typeof suggestionSchema>;

/** Texto del correo que recibe Plantea. */
export function suggestionEmail(s: Suggestion) {
  const lines = [
    `Alguien buscó en el catálogo del diseñador y no lo encontró.`,
    ``,
    `Buscó: ${s.termino}`,
    `Qué es: ${s.categoria}`,
    s.uso ? `Para qué lo usaría: ${s.uso}` : null,
    s.tipoEvento ? `Tipo de evento abierto: ${s.tipoEvento}` : null,
    s.lugar ? `Lugar: ${s.lugar}` : null,
    s.pagina ? `Página: ${s.pagina}` : null,
    ``,
    `No se pidieron datos de la persona. Si se agrega, aparecerá en el catálogo para todos.`,
  ].filter((l): l is string => l !== null);
  return { subject: `Sugerencia para el catálogo: ${s.termino}`, text: lines.join("\n") };
}

/** Límite sencillo por IP para que nadie llene el correo (en memoria; basta con un solo servidor). */
export function makeLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string, now = Date.now()) => {
    const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (list.length >= max) {
      hits.set(key, list);
      return false;
    }
    list.push(now);
    hits.set(key, list);
    return true;
  };
}
