import { getItem, type CatalogItem } from "./catalog";
import type { PlacedObject, Pt } from "./types";

export const CHAIR_SIZE = 0.45;
/** Del borde de la mesa al centro de la silla. */
export const CHAIR_OFFSET = 0.3;
/** Del borde de la mesa al respaldo de la silla: la zona que ocupan los invitados sentados. */
export const CHAIR_ZONE = CHAIR_OFFSET + CHAIR_SIZE / 2 + 0.05;

const CIRCLE_SEGMENTS = 20;

type Placement = { x: number; z: number; rotation: number };

export function dims(o: PlacedObject, item: CatalogItem = getItem(o.catalogId)) {
  return { w: o.w ?? item.w, d: o.d ?? item.d };
}

export function seatCount(o: PlacedObject, item: CatalogItem = getItem(o.catalogId)) {
  return item.seats ? (o.seats ?? item.seats.default) : 0;
}

export function rotatePt(p: Pt, deg: number): Pt {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c - p.z * s, z: p.x * s + p.z * c };
}

export function toWorld(o: Placement, p: Pt): Pt {
  const r = rotatePt(p, o.rotation);
  return { x: o.x + r.x, z: o.z + r.z };
}

export function toLocal(o: Placement, p: Pt): Pt {
  return rotatePt({ x: p.x - o.x, z: p.z - o.z }, -o.rotation);
}

export function snap(value: number, step: number) {
  return Math.round(value / step) * step;
}

/** Normaliza a (-180, 180]. */
export function normalizeAngle(deg: number) {
  let a = deg % 360;
  if (a <= -180) a += 360;
  if (a > 180) a -= 360;
  return a;
}

/** Silla en coordenadas locales; `angle` es hacia dónde mira (grados). */
export type Chair = { x: number; z: number; angle: number };

export function chairsLocal(o: PlacedObject, item: CatalogItem = getItem(o.catalogId)): Chair[] {
  const n = seatCount(o, item);
  if (!n || !item.seats) return [];
  const { w, d } = dims(o, item);

  if (item.seats.layout === "round") {
    const r = w / 2 + CHAIR_OFFSET;
    return Array.from({ length: n }, (_, i) => {
      const a = -90 + (i * 360) / n;
      const rad = (a * Math.PI) / 180;
      return { x: r * Math.cos(rad), z: r * Math.sin(rad), angle: a + 180 };
    });
  }

  const row = (count: number, z: number, angle: number): Chair[] => {
    const step = w / count;
    return Array.from({ length: count }, (_, i) => ({ x: -w / 2 + step * (i + 0.5), z, angle }));
  };
  const back = -(d / 2 + CHAIR_OFFSET);
  if (item.seats.layout === "one-side") return row(n, back, 90);
  const top = Math.ceil(n / 2);
  const bottom = n - top;
  return [...row(top, back, 90), ...(bottom ? row(bottom, d / 2 + CHAIR_OFFSET, -90) : [])];
}

function circle(r: number): Pt[] {
  return Array.from({ length: CIRCLE_SEGMENTS }, (_, i) => {
    const a = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
    return { x: r * Math.cos(a), z: r * Math.sin(a) };
  });
}

function rect(left: number, top: number, right: number, bottom: number): Pt[] {
  return [
    { x: left, z: top },
    { x: right, z: top },
    { x: right, z: bottom },
    { x: left, z: bottom },
  ];
}

/** Superficie que ocupa el objeto incluyendo las sillas con gente sentada. */
export function footprintLocal(o: PlacedObject, item: CatalogItem = getItem(o.catalogId)): Pt[] {
  const { w, d } = dims(o, item);
  const n = seatCount(o, item);
  if (item.shape === "round") return circle(w / 2 + (n ? CHAIR_ZONE : 0));
  let top = -d / 2;
  let bottom = d / 2;
  if (n && item.seats) {
    top -= CHAIR_ZONE;
    if (item.seats.layout === "two-sides" && n > 1) bottom += CHAIR_ZONE;
  }
  return rect(-w / 2, top, w / 2, bottom);
}

export function footprint(o: PlacedObject, item: CatalogItem = getItem(o.catalogId)): Pt[] {
  return footprintLocal(o, item).map((p) => toWorld(o, p));
}

export function rectPolygon(cx: number, cz: number, w: number, d: number, rotation: number): Pt[] {
  return rect(-w / 2, -d / 2, w / 2, d / 2).map((p) => toWorld({ x: cx, z: cz, rotation }, p));
}

export function boundingRadius(poly: Pt[], center: Pt) {
  let r = 0;
  for (const p of poly) r = Math.max(r, Math.hypot(p.x - center.x, p.z - center.z));
  return r;
}

export function bounds(poly: Pt[]) {
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const p of poly) {
    minX = Math.min(minX, p.x);
    minZ = Math.min(minZ, p.z);
    maxX = Math.max(maxX, p.x);
    maxZ = Math.max(maxZ, p.z);
  }
  return { minX, minZ, maxX, maxZ };
}

export function pointInPolygon(p: Pt, poly: Pt[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function closestOnSegment(p: Pt, a: Pt, b: Pt): Pt {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  if (len2 === 0) return a;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2));
  return { x: a.x + t * dx, z: a.z + t * dz };
}

function cross(o: Pt, a: Pt, b: Pt) {
  return (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
}

function segmentsIntersect(a: Pt, b: Pt, c: Pt, d: Pt) {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Distancia mínima entre los bordes de dos polígonos, aunque uno esté dentro del otro. */
export function edgeDistance(A: Pt[], B: Pt[]) {
  let best = Infinity;
  const scan = (P: Pt[], Q: Pt[]) => {
    for (const p of P) {
      for (let j = 0; j < Q.length; j++) {
        const q = closestOnSegment(p, Q[j], Q[(j + 1) % Q.length]);
        best = Math.min(best, Math.hypot(p.x - q.x, p.z - q.z));
      }
    }
  };
  scan(A, B);
  scan(B, A);
  return best;
}

export type Closest = { dist: number; a: Pt; b: Pt; overlap: boolean };

/** Distancia mínima entre dos polígonos y los puntos donde se da. */
export function closestPoints(A: Pt[], B: Pt[]): Closest {
  for (let i = 0; i < A.length; i++) {
    const a1 = A[i];
    const a2 = A[(i + 1) % A.length];
    for (let j = 0; j < B.length; j++) {
      if (segmentsIntersect(a1, a2, B[j], B[(j + 1) % B.length])) {
        return { dist: 0, a: a1, b: a1, overlap: true };
      }
    }
  }
  if (pointInPolygon(A[0], B)) return { dist: 0, a: A[0], b: A[0], overlap: true };
  if (pointInPolygon(B[0], A)) return { dist: 0, a: B[0], b: B[0], overlap: true };

  let best: Closest = { dist: Infinity, a: A[0], b: B[0], overlap: false };
  const scan = (P: Pt[], Q: Pt[], swap: boolean) => {
    for (const p of P) {
      for (let j = 0; j < Q.length; j++) {
        const q = closestOnSegment(p, Q[j], Q[(j + 1) % Q.length]);
        const dist = Math.hypot(p.x - q.x, p.z - q.z);
        if (dist < best.dist) best = { dist, a: swap ? q : p, b: swap ? p : q, overlap: false };
      }
    }
  };
  scan(A, B, false);
  scan(B, A, true);
  return best;
}
