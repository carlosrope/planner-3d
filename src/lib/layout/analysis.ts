import { findItem, type CatalogItem } from "./catalog";
import {
  boundingRadius,
  closestPoints,
  footprint,
  pointInPolygon,
  rectPolygon,
  seatCount,
  type Closest,
} from "./geometry";
import type { FixedElement, FixedKind, LayoutDoc, PlacedObject, Pt, VenueSpec } from "./types";

export type IssueLevel = "error" | "warning";
export type Issue = { id: string; level: IssueLevel; objectIds: string[]; message: string };

/** Elementos fijos del salón contra los que no se puede encimar nada. */
const BLOCKING: FixedKind[] = ["column", "stage", "bar", "wall", "kitchen", "restroom"];
/** Espacio libre que se exige frente a puertas y salidas, en metros. */
export const ACCESS_CLEARANCE = 1.5;
/** Pista, escenario y área de banda pueden tocarse entre sí y con objetos sin sillas. */
const PLATFORMS = new Set(["pista", "escenario", "area-banda"]);

const FIXED_LABELS: Record<FixedKind, string> = {
  column: "una columna",
  stage: "el escenario fijo",
  door: "una puerta",
  exit: "una salida de emergencia",
  kitchen: "la cocina",
  restroom: "los baños",
  bar: "la barra fija",
  wall: "un muro",
  window: "una ventana",
};

export type Shape = {
  obj: PlacedObject;
  item: CatalogItem;
  poly: Pt[];
  radius: number;
  seats: number;
};

export function shapeOf(obj: PlacedObject): Shape | null {
  const item = findItem(obj.catalogId);
  if (!item || !item.clearance) return null;
  const poly = footprint(obj, item);
  return { obj, item, poly, radius: boundingRadius(poly, obj), seats: seatCount(obj, item) };
}

export function fixedPolygon(f: FixedElement): Pt[] {
  return rectPolygon(f.x, f.z, f.w, f.d, f.rotation);
}

/** Zona que debe quedar libre frente a una puerta o salida. */
export function accessZone(f: FixedElement): Pt[] {
  return rectPolygon(f.x, f.z, f.w + 0.4, ACCESS_CLEARANCE * 2, f.rotation);
}

export function objectLabel(obj: PlacedObject, item = findItem(obj.catalogId)) {
  if (!item) return "Objeto";
  if (item.numbered && obj.label) return `Mesa ${obj.label}`;
  return obj.label || item.name;
}

function fixedLabel(f: FixedElement) {
  return f.label ? f.label.toLowerCase() : FIXED_LABELS[f.kind];
}

type PairVerdict = { overlap: boolean; aisle: boolean };

function pairRules(a: Shape, b: Shape): PairVerdict | null {
  const seated = a.seats > 0 || b.seats > 0;
  const platform = PLATFORMS.has(a.item.id) || PLATFORMS.has(b.item.id);
  if (!seated) return platform ? null : { overlap: true, aisle: false };
  return { overlap: true, aisle: true };
}

export function analyzeLayout(
  doc: LayoutDoc,
  venue: VenueSpec,
  opts: { onlyId?: string } = {},
): Issue[] {
  const issues: Issue[] = [];
  const minAisle = doc.settings.minAisle;
  const shapes = doc.objects.map(shapeOf).filter((s): s is Shape => s !== null);
  const targets = opts.onlyId ? shapes.filter((s) => s.obj.id === opts.onlyId) : shapes;

  for (const s of targets) {
    const name = objectLabel(s.obj, s.item);
    if (s.poly.some((p) => !pointInPolygon(p, venue.floor))) {
      issues.push({
        id: `fuera:${s.obj.id}`,
        level: "error",
        objectIds: [s.obj.id],
        message: `${name} queda fuera del área útil del salón`,
      });
    }
    for (const f of venue.fixed) {
      if (BLOCKING.includes(f.kind) && closestPoints(s.poly, fixedPolygon(f)).overlap) {
        issues.push({
          id: `fijo:${s.obj.id}:${f.id}`,
          level: "error",
          objectIds: [s.obj.id],
          message: `${name} choca con ${fixedLabel(f)}`,
        });
      }
      if ((f.kind === "door" || f.kind === "exit") && closestPoints(s.poly, accessZone(f)).overlap) {
        issues.push({
          id: `acceso:${s.obj.id}:${f.id}`,
          level: f.kind === "exit" ? "error" : "warning",
          objectIds: [s.obj.id],
          message: `${name} bloquea ${fixedLabel(f)}`,
        });
      }
    }
  }

  for (const a of targets) {
    for (const b of shapes) {
      if (a === b) continue;
      // Sin filtro, cada par se revisa una sola vez.
      if (!opts.onlyId && a.obj.id > b.obj.id) continue;
      const rules = pairRules(a, b);
      if (!rules) continue;
      const gap = Math.hypot(a.obj.x - b.obj.x, a.obj.z - b.obj.z) - a.radius - b.radius;
      if (gap > minAisle) continue;
      const c = closestPoints(a.poly, b.poly);
      const ids = [a.obj.id, b.obj.id];
      const pairId = [...ids].sort().join(":");
      const names = `${objectLabel(a.obj, a.item)} y ${objectLabel(b.obj, b.item)}`;
      if (c.overlap && rules.overlap) {
        issues.push({ id: `encima:${pairId}`, level: "error", objectIds: ids, message: `${names} se enciman` });
      } else if (!c.overlap && rules.aisle && c.dist < minAisle - 1e-6) {
        issues.push({
          id: `pasillo:${pairId}`,
          level: "warning",
          objectIds: ids,
          message: `Pasillo de ${c.dist.toFixed(2)} m entre ${names} (mínimo ${minAisle.toFixed(2)} m)`,
        });
      }
    }
  }
  return issues;
}

/** Nivel más grave de aviso por objeto (para pintarlo en el plano). */
export function issueLevels(issues: Issue[]) {
  const levels = new Map<string, IssueLevel>();
  for (const issue of issues) {
    for (const id of issue.objectIds) {
      if (levels.get(id) !== "error") levels.set(id, issue.level);
    }
  }
  return levels;
}

export type Neighbor = Closest & { id: string };

/** Los vecinos más cercanos de un objeto, para mostrar medidas mientras se arrastra. */
export function nearestNeighbors(doc: LayoutDoc, venue: VenueSpec, target: PlacedObject, count = 2): Neighbor[] {
  const own = shapeOf(target);
  if (!own) return [];
  const found: Neighbor[] = [];
  for (const obj of doc.objects) {
    if (obj.id === target.id) continue;
    const s = shapeOf(obj);
    if (!s) continue;
    const gap = Math.hypot(obj.x - target.x, obj.z - target.z) - own.radius - s.radius;
    if (gap > 4) continue;
    found.push({ id: obj.id, ...closestPoints(own.poly, s.poly) });
  }
  for (const f of venue.fixed) {
    if (!BLOCKING.includes(f.kind)) continue;
    const c = closestPoints(own.poly, fixedPolygon(f));
    if (c.dist <= 4) found.push({ id: `fijo:${f.id}`, ...c });
  }
  return found.sort((a, b) => a.dist - b.dist).slice(0, count);
}

export type LayoutStats = {
  tables: number;
  seats: number;
  guests: number;
  seated: number;
  inventory: { catalogId: string; name: string; count: number }[];
};

export function layoutStats(doc: LayoutDoc): LayoutStats {
  let tables = 0;
  let seats = 0;
  const counts = new Map<string, number>();
  for (const obj of doc.objects) {
    const item = findItem(obj.catalogId);
    if (!item) continue;
    counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
    const n = seatCount(obj, item);
    if (n > 0 && item.category === "mesas") {
      tables++;
      seats += n;
    }
  }
  const inventory = [...counts.entries()]
    .map(([catalogId, count]) => ({ catalogId, name: findItem(catalogId)!.name, count }))
    .sort((a, b) => b.count - a.count);
  return {
    tables,
    seats,
    guests: doc.guests.length,
    seated: doc.guests.filter((g) => g.tableId).length,
    inventory,
  };
}
