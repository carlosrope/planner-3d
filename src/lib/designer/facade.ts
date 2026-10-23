import { z } from "zod";

// Fachada y entorno del 3D de un lugar: los captura la administración al modelarlo, mirando su foto de «por fuera».
// Van dentro del plano (plan.facade) y el diseñador los lee (tools/designer/adapt.py, «Fachada real»). Si un campo
// falta, el diseñador usa lo de siempre (color claro, calle del lado de la flecha de entrada, estacionamiento a la
// derecha en los salones).

export const FACADE_MATERIALS = [
  "aplanado",
  "rugoso",
  "piedra",
  "ladrillo",
  "concreto",
] as const;
export const FACADE_MATERIAL_LABELS: Record<
  (typeof FACADE_MATERIALS)[number],
  string
> = {
  aplanado: "Aplanado liso",
  rugoso: "Aplanado rugoso",
  piedra: "Piedra",
  ladrillo: "Ladrillo",
  concreto: "Concreto aparente",
};

/** Lado del plano donde está la calle: «auto» = el de la flecha de entrada. */
export const FACADE_STREETS = ["auto", "S", "N", "E", "W"] as const;
export const FACADE_STREET_LABELS: Record<
  (typeof FACADE_STREETS)[number],
  string
> = {
  auto: "Donde indica la flecha de entrada",
  S: "Abajo del plano",
  N: "Arriba del plano",
  E: "A la derecha del plano",
  W: "A la izquierda del plano",
};

export const FACADE_AROUND = ["ciudad", "casas", "campo"] as const;
export const FACADE_AROUND_LABELS: Record<
  (typeof FACADE_AROUND)[number],
  string
> = {
  ciudad: "Calle con locales y edificios",
  casas: "Calle de casas",
  campo: "Campo abierto (sin vecinos)",
};

/** Estacionamiento visto desde la calle (solo salones). */
export const FACADE_PARKING = ["derecha", "izquierda", "no"] as const;
export const FACADE_PARKING_LABELS: Record<
  (typeof FACADE_PARKING)[number],
  string
> = {
  derecha: "A la derecha del salón",
  izquierda: "A la izquierda del salón",
  no: "No tiene",
};

export const FACADE_TREES = ["mixto", "palmeras", "arboles"] as const;
export const FACADE_TREE_LABELS: Record<(typeof FACADE_TREES)[number], string> =
  {
    mixto: "Palmeras y árboles",
    palmeras: "Sobre todo palmeras",
    arboles: "Sobre todo árboles de sombra",
  };

/** Colores frecuentes de fachada en Sinaloa, para elegir rápido (también se puede escribir cualquiera). */
export const FACADE_COLORS = [
  { hex: "#f2eee6", name: "Blanco hueso" },
  { hex: "#eadfcd", name: "Crema" },
  { hex: "#e3cfa8", name: "Arena" },
  { hex: "#d9b38c", name: "Durazno" },
  { hex: "#c9805a", name: "Terracota" },
  { hex: "#cfd6d3", name: "Gris verde" },
  { hex: "#b9b6b0", name: "Gris cemento" },
  { hex: "#8c6b52", name: "Café" },
] as const;

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
export const facadeSchema = z.object({
  color: hex.optional(),
  material: z.enum(FACADE_MATERIALS).optional(),
  /** Zoclo: la franja de abajo de los muros. */
  plinth: hex.optional(),
  street: z.enum(FACADE_STREETS).optional(),
  around: z.enum(FACADE_AROUND).optional(),
  parking: z.enum(FACADE_PARKING).optional(),
  trees: z.enum(FACADE_TREES).optional(),
  /** Letrero del toldo: vacío = el nombre del lugar; «-» = sin letrero. */
  sign: z.string().trim().max(40).optional(),
});
export type Facade = z.infer<typeof facadeSchema>;

/** Lee el formulario de la administración. Los campos vacíos o en «auto» no se guardan; si no queda nada, null. */
export function facadeFromForm(form: FormData): Facade | null {
  const raw: Record<string, string> = {};
  for (const k of [
    "color",
    "material",
    "plinth",
    "street",
    "around",
    "parking",
    "trees",
    "sign",
  ] as const) {
    let v = String(form.get(k) ?? "").trim();
    if (k === "color" && v === "otro")
      v = String(form.get("colorOtro") ?? "").trim(); // «Otro» con el selector de color
    if (v && v !== "auto")
      raw[k] = k === "color" || k === "plinth" ? v.toLowerCase() : v;
  }
  const parsed = facadeSchema.safeParse(raw);
  if (!parsed.success) return null;
  return Object.keys(parsed.data).length ? parsed.data : null;
}
