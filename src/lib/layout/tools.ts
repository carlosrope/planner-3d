import type { EventKind } from "@/lib/domain";
import { accessZone, fixedPolygon, shapeOf } from "./analysis";
import { getItem } from "./catalog";
import { bounds, closestPoints, edgeDistance, footprint, pointInPolygon } from "./geometry";
import { emptyLayout, type LayoutDoc, type PlacedObject, type Pt, type VenueSpec } from "./types";

export type IdFn = (prefix: string) => string;

/**
 * Id aleatorio. No usa crypto.randomUUID porque no existe fuera de un contexto
 * seguro (por ejemplo, al abrir el servidor de desarrollo desde el iPhone por Wi-Fi).
 */
export const uid: IdFn = (prefix) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Ids deterministas, para datos de demostración que se prerenderizan. */
export function sequentialIds(seed: string): IdFn {
  let n = 0;
  return (prefix) => `${prefix}-${seed}${++n}`;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Distancia mínima entre sillas y muros al llenar áreas automáticamente. */
const WALL_CLEARANCE = 0.6;

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Siguiente letra libre para una distribución nueva: A, B, C… y luego A2, B2… */
export function nextDistributionName(names: string[]) {
  // Cuenta la última palabra: "Opción A" ocupa la A.
  const taken = new Set(names.map((n) => (n.trim().split(/\s+/).pop() ?? "").toUpperCase()));
  for (let round = 1; ; round++) {
    for (const letter of LETTERS) {
      const name = round === 1 ? letter : `${letter}${round}`;
      if (!taken.has(name)) return name;
    }
  }
}

export function nextTableLabel(objects: PlacedObject[]) {
  let max = 0;
  for (const o of objects) {
    const n = Number(o.label);
    if (getItem(o.catalogId).numbered && Number.isInteger(n)) max = Math.max(max, n);
  }
  return String(max + 1);
}

export function createObject(
  catalogId: string,
  at: Pt,
  objects: PlacedObject[],
  id: IdFn = uid,
): PlacedObject {
  const item = getItem(catalogId);
  return {
    id: id("o"),
    catalogId,
    x: round2(at.x),
    z: round2(at.z),
    rotation: 0,
    layer: item.layer,
    ...(item.numbered ? { label: nextTableLabel(objects) } : {}),
    ...(item.seats ? { seats: item.seats.default } : {}),
  };
}

export function duplicateObject(o: PlacedObject, objects: PlacedObject[], minAisle: number, id: IdFn = uid) {
  const b = bounds(footprint(o));
  const copy: PlacedObject = {
    ...o,
    id: id("o"),
    x: round2(o.x + (b.maxX - b.minX) + minAisle),
    locked: false,
    colors: o.colors ? { ...o.colors } : undefined,
  };
  if (getItem(o.catalogId).numbered) copy.label = nextTableLabel(objects);
  return copy;
}

/** Numera las mesas por filas, en zigzag, de arriba hacia abajo. */
export function autoNumber(objects: PlacedObject[]): PlacedObject[] {
  const tables = objects.filter((o) => getItem(o.catalogId).numbered).sort((a, b) => a.z - b.z);
  const rows: PlacedObject[][] = [];
  for (const t of tables) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row[0].z - t.z) < 1.5) row.push(t);
    else rows.push([t]);
  }
  const labels = new Map<string, string>();
  let n = 0;
  rows.forEach((row, i) => {
    row.sort((a, b) => (i % 2 === 0 ? a.x - b.x : b.x - a.x));
    for (const t of row) labels.set(t.id, String(++n));
  });
  return objects.map((o) => (labels.has(o.id) ? { ...o, label: labels.get(o.id) } : o));
}

export type FillOptions = {
  aisle: number;
  /** Área a llenar; por defecto todo el salón. */
  area?: { minX: number; minZ: number; maxX: number; maxZ: number };
  max?: number;
  /** Si se da, se eligen primero los lugares más cercanos a este punto. */
  prefer?: Pt;
  id?: IdFn;
};

/**
 * Acomoda mesas en cuadrícula dentro de un área, respetando pasillos, muros,
 * columnas, puertas y lo que ya está en el plano. Devuelve solo las mesas nuevas.
 */
export function fillArea(
  doc: LayoutDoc,
  venue: VenueSpec,
  catalogId: string,
  opts: FillOptions,
): PlacedObject[] {
  const id = opts.id ?? uid;
  const probe = createObject(catalogId, { x: 0, z: 0 }, doc.objects, id);
  const fb = bounds(footprint(probe));
  const fw = fb.maxX - fb.minX;
  const fd = fb.maxZ - fb.minZ;
  const stepX = fw + opts.aisle;
  const stepZ = fd + opts.aisle;
  const fb2 = bounds(venue.floor);
  const area = opts.area ?? {
    minX: fb2.minX + WALL_CLEARANCE,
    minZ: fb2.minZ + WALL_CLEARANCE,
    maxX: fb2.maxX - WALL_CLEARANCE,
    maxZ: fb2.maxZ - WALL_CLEARANCE,
  };
  const cols = Math.floor((area.maxX - area.minX - fw) / stepX) + 1;
  const rows = Math.floor((area.maxZ - area.minZ - fd) / stepZ) + 1;
  if (cols < 1 || rows < 1) return [];
  // Centra la cuadrícula dentro del área.
  const x0 = area.minX + (area.maxX - area.minX - (cols - 1) * stepX) / 2;
  const z0 = area.minZ + (area.maxZ - area.minZ - (rows - 1) * stepZ) / 2;

  const obstacles = doc.objects
    .map(shapeOf)
    .filter((s) => s !== null)
    .map((s) => s.poly);
  const blocked = venue.fixed.flatMap((f) =>
    f.kind === "door" || f.kind === "exit"
      ? [accessZone(f)]
      : f.kind === "window"
        ? []
        : [fixedPolygon(f)],
  );

  const candidates: PlacedObject[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cand = { ...probe, x: round2(x0 + c * stepX), z: round2(z0 + r * stepZ) };
      const poly = footprint(cand);
      if (poly.some((p) => !pointInPolygon(p, venue.floor))) continue;
      if (edgeDistance(poly, venue.floor) < WALL_CLEARANCE) continue;
      if (blocked.some((b) => closestPoints(poly, b).overlap)) continue;
      if (obstacles.some((o) => {
        const cp = closestPoints(poly, o);
        return cp.overlap || cp.dist < opts.aisle;
      })) continue;
      candidates.push(cand);
    }
  }
  if (opts.prefer) {
    const p = opts.prefer;
    candidates.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
  }
  const chosen = candidates.slice(0, opts.max ?? candidates.length);
  const start = Number(nextTableLabel(doc.objects));
  return chosen.map((o, i) => ({
    ...o,
    id: id("o"),
    ...(getItem(catalogId).numbered ? { label: String(start + i) } : {}),
  }));
}

export function floorCenter(venue: VenueSpec): Pt {
  const b = bounds(venue.floor);
  return { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 };
}

/** Paso libre mínimo entre muebles en una casa (el de salones es de 1.20 m). */
export const HOUSE_MIN_AISLE = 0.6;

/** Plano vacío para una casa. */
export function emptyHouseLayout(): LayoutDoc {
  const doc = emptyLayout();
  doc.settings.minAisle = HOUSE_MIN_AISLE;
  return doc;
}

/** Montaje inicial de un evento: pista, mesa principal y mesas para los invitados. */
export function starterLayout(
  venue: VenueSpec,
  opts: { kind: EventKind; guests: number; id?: IdFn; table?: string },
): LayoutDoc {
  const id = opts.id ?? uid;
  const doc = emptyLayout();
  const c = floorCenter(venue);
  const size = opts.guests > 200 ? 8 : 6;

  const pista = { ...createObject("pista", c, doc.objects, id), w: size, d: size };
  doc.objects.push(pista);

  const head = opts.kind === "boda" ? "mesa-novios" : opts.kind === "xv" ? "mesa-honor-xv" : null;
  if (head) {
    doc.objects.push(createObject(head, { x: c.x, z: c.z - size / 2 - 2.2 }, doc.objects, id));
  }

  const table = opts.table ?? "mesa-redonda-180";
  const perTable = getItem(table).seats?.default ?? 10;
  const tables = Math.max(1, Math.ceil(opts.guests / perTable));
  doc.objects.push(
    ...fillArea(doc, venue, table, {
      aisle: doc.settings.minAisle,
      max: tables,
      prefer: c,
      id,
    }),
  );
  doc.objects = autoNumber(doc.objects);
  return doc;
}
