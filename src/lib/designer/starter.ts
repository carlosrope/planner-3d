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
};
export const EVENT_CATALOG = catalog as { cat: string; catEn: string; items: CatalogItem[] }[];
const ITEMS = EVENT_CATALOG.flatMap((c) => c.items);
const item = (name: string) => {
  const found = ITEMS.find((i) => i.name === name);
  if (!found) throw new Error(`No está en el catálogo: ${name}`);
  return found;
};

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
export const TEMPLATES = ["redondas", "imperial", "coctel"] as const;
export type Template = (typeof TEMPLATES)[number];
export const TEMPLATE_LABELS: Record<Template, string> = {
  redondas: "Banquete con mesas redondas",
  imperial: "Mesas imperiales",
  coctel: "Cóctel con periqueras y salas lounge",
};

type Fill = { name: string; count: number; gapX: number; gapY: number; numbered: boolean };

export function starterFurniture(
  plan: DesignerPlan,
  opts: { guests: number; kind: EventKind; template?: Template },
): Furniture[] {
  const setup = plan.setup;
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

  place("Escenario / tarima", setup.stage);
  place("Pista de baile", setup.dance);
  place("Cabina DJ", setup.dj);
  place("Barra", setup.bar);
  place("Mesa de dulces", setup.dessert);
  place("Mesa de pastel", setup.cake);
  if (opts.kind === "boda") place("Mesa de novios", setup.head);
  if (opts.kind === "xv") {
    place("Mesa de honor XV", setup.head);
    // El trono va junto a la mesa de honor, del lado derecho.
    if (setup.head) place("Trono de quinceañera", { cx: setup.head.cx + 2900, cy: setup.head.cy });
  }
  if (setup.dance) {
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
  const focus = setup.dance ?? setup.stage ?? { cx: (zone[0] + zone[2]) / 2, cy: zone[1] };
  let tableNo = 0;
  const fill = ({ name, count, gapX, gapY, numbered }: Fill) => {
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
        spots.push({ cx, cy, dist: Math.hypot(cx - focus.cx, cy - focus.cy) });
      }
    }
    spots.sort((a, b) => a.dist - b.dist);
    for (const s of spots.slice(0, Math.max(0, count))) {
      const f: Furniture = {
        id: `s${++n}`,
        type: it.type,
        name: numbered ? `Mesa ${++tableNo}` : it.name,
        cx: s.cx,
        cy: s.cy,
        w: it.w,
        d: it.d,
        rot: 0,
        color: it.color,
        ...(it.seats ? { seats: it.seats, table: it.table } : {}),
      };
      out.push(f);
      blocked.push(grow(boxOf(f), Math.min(gapX, gapY) / 2));
    }
  };

  const headSeats = out.reduce((a, f) => a + (f.seats ?? 0), 0);
  const guests = Math.max(0, opts.guests - headSeats);
  const template = opts.template ?? "redondas";
  if (template === "coctel") {
    // De pie: una periquera por cada 6 invitados y una sala lounge por cada 60 (máximo 4).
    fill({ name: "Sala lounge", count: Math.min(4, Math.ceil(guests / 60)), gapX: 1500, gapY: 1500, numbered: false });
    fill({ name: "Periquera", count: Math.ceil(guests / 6), gapX: 1700, gapY: 1700, numbered: false });
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
