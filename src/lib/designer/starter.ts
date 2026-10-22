import catalog from "@/designer/eventos/catalogo.json";
import type { EventKind } from "../domain";
import type { DesignDoc, DesignerPlan, Furniture, FurnitureTuple, Rect, SetupSpot } from "./types";

// Montaje inicial de un salón: los fijos (escenario, pista, DJ, barra, dulces, pastel y la
// mesa principal según el tipo de evento) y mesas redondas de 10 alrededor de la pista
// hasta sentar a todos los invitados.

/** Pieza del catálogo de eventos (src/designer/eventos/catalogo.json). */
export type CatalogItem = {
  type: string;
  name: string;
  nameEn: string;
  w: number;
  d: number;
  color: string;
  seats?: number;
  table?: number;
  role?: string;
  /** Proveedores: tipo (dj, banquete, pastel…). */
  kind?: string;
};
export const EVENT_CATALOG = catalog as { cat: string; catEn: string; items: CatalogItem[] }[];
const ITEMS = EVENT_CATALOG.flatMap((c) => c.items);
const item = (name: string) => {
  const found = ITEMS.find((i) => i.name === name);
  if (!found) throw new Error(`No está en el catálogo: ${name}`);
  return found;
};

/** En cóctel (de pie): una periquera por cada 6 invitados. Lo usa también el aforo por montaje (capacity.ts). */
export const GUESTS_PER_PERIQUERA = 6;
/** Pasillo entre respaldos de sillas de mesas vecinas. */
const AISLE = 700;
/** Distancia libre alrededor de los fijos y las columnas. */
const CLEAR = 600;

type Box = Rect;
const boxOf = (f: Pick<Furniture, "cx" | "cy" | "w" | "d" | "rot">): Box => {
  const turned = Math.round(f.rot / 90) % 2 !== 0;
  const hw = (turned ? f.d : f.w) / 2;
  const hh = (turned ? f.w : f.d) / 2;
  return [f.cx - hw, f.cy - hh, f.cx + hw, f.cy + hh];
};
const grow = ([x0, y0, x1, y1]: Box, m: number): Box => [x0 - m, y0 - m, x1 + m, y1 + m];
const hits = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const inside = (a: Box, z: Box) => a[0] >= z[0] && a[1] >= z[1] && a[2] <= z[2] && a[3] <= z[3];

/** Plantillas de montaje: qué piezas llenan la zona de mesas. */
export const TEMPLATES = ["redondas", "imperial", "coctel", "auditorio", "escuela"] as const;
export type Template = (typeof TEMPLATES)[number];
export const TEMPLATE_LABELS: Record<Template, string> = {
  redondas: "Banquete con mesas redondas",
  imperial: "Mesas imperiales",
  coctel: "Cóctel con periqueras y salas lounge",
  auditorio: "Auditorio con filas de sillas",
  escuela: "Escuela con mesas frente al escenario",
};

/**
 * Receta de cada tipo de evento: qué va en cada lugar fijo del salón (setup) y qué se agrega.
 * null = ese lugar se queda vacío. Las piezas son nombres del catálogo.
 */
type Recipe = {
  head?: string;
  stage: string | null;
  dance: string | null;
  dj: string | null;
  bar: string | null;
  dessert: boolean;
  cake: boolean;
  candelabra: boolean;
  /** Sobre el escenario (podio, pantalla). */
  onStage?: string[];
  /** Se acomodan en la zona de mesas, en el primer lugar libre junto al foco. */
  extras?: { name: string; far?: boolean }[];
  template: Template;
};
const PARTY = { stage: "Escenario / tarima", dance: "Pista de baile", dj: "Cabina DJ", bar: "Barra", dessert: true, cake: true, candelabra: false, template: "redondas" } as const;
export const RECIPES: Record<EventKind, Recipe> = {
  boda: { ...PARTY, head: "Mesa de novios", candelabra: true },
  xv: { ...PARTY, head: "Mesa de honor XV", candelabra: true },
  cumpleanos: { ...PARTY },
  bautizo: { ...PARTY, stage: null, dance: null, dj: "Mesa de regalos", bar: "Barra de snacks y bebidas" },
  graduacion: { ...PARTY, head: "Mesa de presídium", dessert: false, cake: false },
  infantil: { ...PARTY, stage: "Show de payasitas", dance: "Área infantil", bar: "Barra de snacks y bebidas", extras: [{ name: "Show de botargas" }] },
  corporativo: {
    ...PARTY,
    dance: null,
    dj: null,
    bar: "Estación de café",
    dessert: false,
    cake: false,
    onStage: ["Podio", "Pantalla LED"],
    extras: [{ name: "Mesa de registro", far: true }],
    template: "auditorio",
  },
  posada: { ...PARTY, cake: false },
  casa: { ...PARTY },
  otro: { ...PARTY },
};

type Fill = { name: string; count: number; gapX: number; gapY: number; numbered: boolean; rot?: number; toward?: { cx: number; cy: number }; far?: boolean };

export function starterFurniture(
  plan: DesignerPlan,
  opts: { guests: number; kind: EventKind; template?: Template },
): Furniture[] {
  const setup = plan.setup;
  const recipe = RECIPES[opts.kind] ?? RECIPES.otro;
  if (!setup) return [];
  let n = 0;
  const out: Furniture[] = [];
  const place = (name: string, spot: SetupSpot | undefined, extra: Partial<Furniture> = {}) => {
    if (!spot) return;
    const it = item(name);
    out.push({
      id: `s${++n}`,
      type: it.type,
      name: it.name,
      cx: spot.cx,
      cy: spot.cy,
      w: spot.w ?? it.w,
      d: spot.d ?? it.d,
      rot: spot.rot ?? 0,
      color: it.color,
      ...(it.seats ? { seats: it.seats, table: it.table } : {}),
      ...extra,
    });
  };

  // Lo que no es el escenario ni la pista toma su propia medida del catálogo (el lugar fijo solo da el centro).
  const at = (spot: SetupSpot | undefined, name: string, keep: string) => (spot && name !== keep ? { cx: spot.cx, cy: spot.cy, rot: spot.rot } : spot);
  if (recipe.stage) place(recipe.stage, at(setup.stage, recipe.stage, "Escenario / tarima"));
  if (recipe.stage === "Escenario / tarima" && setup.stage && recipe.onStage) {
    const sd = setup.stage.d ?? item("Escenario / tarima").d;
    // Podio al frente del escenario; pantalla al fondo.
    for (const name of recipe.onStage) {
      const dy = name === "Pantalla LED" ? -sd / 2 + 400 : sd / 2 - 700;
      place(name, { cx: setup.stage.cx, cy: setup.stage.cy + dy });
    }
  }
  if (recipe.dance) place(recipe.dance, at(setup.dance, recipe.dance, "Pista de baile"));
  if (recipe.dj) place(recipe.dj, at(setup.dj, recipe.dj, "Cabina DJ"));
  if (recipe.bar) place(recipe.bar, at(setup.bar, recipe.bar, "Barra"));
  if (recipe.dessert) place("Mesa de dulces", setup.dessert);
  if (recipe.cake) place("Mesa de pastel", setup.cake);
  if (recipe.head) place(recipe.head, at(setup.head, recipe.head, "Mesa de novios"));
  if (opts.kind === "xv" && setup.head) {
    // El trono va junto a la mesa de honor, del lado derecho.
    place("Trono de quinceañera", { cx: setup.head.cx + 2900, cy: setup.head.cy });
  }
  if (setup.dance && recipe.candelabra && recipe.dance === "Pista de baile") {
    const { cx, cy } = setup.dance;
    const hw = (setup.dance.w ?? 6000) / 2 + 500;
    const hh = (setup.dance.d ?? 6000) / 2 + 500;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) place("Candelabro de piso", { cx: cx + sx * hw, cy: cy + sy * hh });
  }

  // Lugares libres: rejilla dentro de la zona de mesas, sin tocar fijos, columnas ni lo ya puesto.
  const zone = setup.tables;
  const blocked = out.filter((f) => f.type !== "candelabra").map((f) => grow(boxOf(f), CLEAR));
  for (const w of plan.levels[0]?.walls ?? []) {
    const b: Box = [w[0], w[1], w[2], w[3]];
    if (hits(b, zone)) blocked.push(grow(b, CLEAR));
  }
  const center = { cx: (zone[0] + zone[2]) / 2, cy: (zone[1] + zone[3]) / 2 };
  const focus = setup.dance ?? setup.stage ?? { cx: center.cx, cy: zone[1] };
  // Filas y mesas escuela miran al escenario (o a la pista): +y es el frente de la pieza.
  const stageFocus = setup.stage ?? setup.dance ?? focus;
  const facing = stageFocus.cy < center.cy ? 180 : 0;
  let tableNo = 0;
  const fill = ({ name, count, gapX, gapY, numbered, rot = 0, toward = focus, far = false }: Fill) => {
    const it = item(name);
    const px = it.w + gapX;
    const py = it.d + gapY;
    const cols = Math.floor((zone[2] - zone[0] - it.w) / px) + 1;
    const rows = Math.floor((zone[3] - zone[1] - it.d) / py) + 1;
    const x0 = (zone[0] + zone[2]) / 2 - ((cols - 1) * px) / 2;
    const y0 = (zone[1] + zone[3]) / 2 - ((rows - 1) * py) / 2;
    const spots: { cx: number; cy: number; dist: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = Math.round(x0 + c * px);
        const cy = Math.round(y0 + r * py);
        const b = boxOf({ cx, cy, w: it.w, d: it.d, rot: 0 });
        if (!inside(b, zone) || blocked.some((o) => hits(b, o))) continue;
        spots.push({ cx, cy, dist: Math.hypot(cx - toward.cx, cy - toward.cy) });
      }
    }
    // far: lo más lejos del foco (la mesa de registro va hacia la entrada, no junto al escenario).
    spots.sort((a, b) => (far ? b.dist - a.dist : a.dist - b.dist));
    for (const s of spots.slice(0, Math.max(0, count))) {
      const f: Furniture = {
        id: `s${++n}`,
        type: it.type,
        name: numbered ? `Mesa ${++tableNo}` : it.name,
        cx: s.cx,
        cy: s.cy,
        w: it.w,
        d: it.d,
        rot,
        color: it.color,
        ...(it.seats ? { seats: it.seats, table: it.table } : {}),
      };
      out.push(f);
      blocked.push(grow(boxOf(f), Math.min(gapX, gapY) / 2));
    }
  };

  // Extras de la receta (show de botargas, mesa de registro…): un lugar libre cada uno, antes que las mesas.
  for (const x of recipe.extras ?? []) fill({ name: x.name, count: 1, gapX: CLEAR, gapY: CLEAR, numbered: false, far: x.far, toward: x.far ? stageFocus : focus });

  const headSeats = out.reduce((a, f) => a + (f.seats ?? 0), 0);
  const guests = Math.max(0, opts.guests - headSeats);
  const template = opts.template ?? recipe.template;
  if (template === "auditorio") {
    const row = item("Fila de 8 sillas");
    fill({ name: row.name, count: Math.ceil(guests / (row.seats ?? 8)), gapX: 1200, gapY: 350, numbered: false, rot: facing, toward: stageFocus });
  } else if (template === "escuela") {
    const desk = item("Mesa escuela 1.80 m");
    fill({ name: desk.name, count: Math.ceil(guests / (desk.seats ?? 3)), gapX: 500, gapY: 450, numbered: true, rot: facing, toward: stageFocus });
  } else if (template === "coctel") {
    // De pie: una periquera por cada 6 invitados y una sala lounge por cada 60 (máximo 4).
    fill({ name: "Sala lounge", count: Math.min(4, Math.ceil(guests / 60)), gapX: 1500, gapY: 1500, numbered: false });
    fill({ name: "Periquera", count: Math.ceil(guests / GUESTS_PER_PERIQUERA), gapX: 1700, gapY: 1700, numbered: false });
  } else {
    const name = template === "imperial" ? "Mesa imperial 4.80 m" : "Mesa redonda 1.80 m";
    const seats = item(name).seats ?? 10;
    fill({
      name,
      count: Math.ceil(guests / seats),
      gapX: template === "imperial" ? 1200 : AISLE,
      gapY: template === "imperial" ? 900 : AISLE,
      numbered: true,
    });
  }
  return out;
}

/** Distribución inicial de un evento: salones con montaje; casas con el amueblado del modelo. */
export function starterDesign(
  plan: DesignerPlan,
  opts: { guests: number; kind: EventKind; template?: Template },
): DesignDoc {
  if (plan.kind !== "salon") return { v: 1, levels: {} };
  const level = plan.levels[0];
  return { v: 1, levels: { [level.id]: { furniture: starterFurniture(plan, opts) } } };
}

/**
 * El plano con el montaje inicial como amueblado por omisión de la planta del salón: lo usa el
 * diseñador cuando una distribución todavía no tiene nada guardado.
 */
export function withStarter(plan: DesignerPlan, opts: { guests: number; kind: EventKind }): DesignerPlan {
  if (plan.kind !== "salon") return plan;
  const [first, ...rest] = plan.levels;
  const furniture = starterFurniture(plan, opts).map(
    (f): FurnitureTuple => [f.type, f.name, f.cx, f.cy, f.w, f.d, f.rot, f.color, { seats: f.seats, table: f.table }],
  );
  return { ...plan, guests: opts.guests, levels: [{ ...first, furniture }, ...rest] };
}
