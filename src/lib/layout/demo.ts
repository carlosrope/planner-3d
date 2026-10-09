import { createObject, fillArea, sequentialIds, starterLayout, uid } from "./tools";
import { emptyLayout, type DistributionSeed, type LayoutDoc, type VenueInfo, type VenueSpec } from "./types";

/**
 * Salón ficticio de 30 × 45 m para desarrollo y demostraciones, hasta tener
 * las medidas reales del salón #1.
 */
export const DEMO_VENUE_SPEC: VenueSpec = {
  width: 30,
  depth: 45,
  // Una esquina recortada para probar polígonos que no son rectángulos.
  floor: [
    { x: 0, z: 0 },
    { x: 30, z: 0 },
    { x: 30, z: 45 },
    { x: 4, z: 45 },
    { x: 0, z: 41 },
  ],
  fixed: [
    { id: "col-1", kind: "column", x: 10, z: 15, w: 0.6, d: 0.6, rotation: 0 },
    { id: "col-2", kind: "column", x: 20, z: 15, w: 0.6, d: 0.6, rotation: 0 },
    { id: "col-3", kind: "column", x: 10, z: 30, w: 0.6, d: 0.6, rotation: 0 },
    { id: "col-4", kind: "column", x: 20, z: 30, w: 0.6, d: 0.6, rotation: 0 },
    { id: "escenario", kind: "stage", label: "Escenario fijo", x: 15, z: 2.5, w: 12, d: 4, rotation: 0 },
    { id: "barra", kind: "bar", label: "Barra fija", x: 22, z: 44.2, w: 7, d: 1.2, rotation: 0 },
    { id: "acceso", kind: "door", label: "Acceso principal", x: 12, z: 45, w: 3, d: 0.3, rotation: 0 },
    { id: "cocina", kind: "door", label: "Puerta a cocina", x: 30, z: 38, w: 2, d: 0.3, rotation: 90 },
    { id: "banos", kind: "door", label: "Baños", x: 0, z: 34, w: 1.6, d: 0.3, rotation: 90 },
    { id: "salida-1", kind: "exit", label: "Salida de emergencia", x: 0, z: 20, w: 2, d: 0.3, rotation: 90 },
    { id: "salida-2", kind: "exit", label: "Salida de emergencia", x: 30, z: 10, w: 2, d: 0.3, rotation: 90 },
  ],
  outlets: [
    { id: "c1", x: 0.15, z: 8 },
    { id: "c2", x: 0.15, z: 28 },
    { id: "c3", x: 29.85, z: 22 },
    { id: "c4", x: 29.85, z: 32 },
    { id: "c5", x: 9, z: 0.15 },
    { id: "c6", x: 21, z: 0.15 },
    { id: "c7", x: 20, z: 44.85 },
  ],
};

export const DEMO_VENUE: VenueInfo = {
  id: "demo",
  name: "Salón Demostración",
  city: "Los Mochis",
  spec: DEMO_VENUE_SPEC,
};

/** Boda de 240 invitados en el salón de demostración. Ids deterministas. */
export function demoLayout(): LayoutDoc {
  const id = sequentialIds("d");
  const doc = starterLayout(DEMO_VENUE_SPEC, { kind: "boda", guests: 240, id });
  const add = (catalogId: string, x: number, z: number, rotation = 0) =>
    doc.objects.push({ ...createObject(catalogId, { x, z }, doc.objects, id), rotation });
  add("cabina-dj", 15, 5.6);
  add("mesa-dulces", 5, 43.4);
  add("candelabro-piso", 10.6, 18.6);
  add("candelabro-piso", 19.4, 18.6);
  add("candelabro-piso", 10.6, 27.4);
  add("candelabro-piso", 19.4, 27.4);
  add("staff-capitan", 26.5, 38);
  add("staff-mesero", 26.5, 36.8);
  add("staff-coordinador", 13.5, 41.5);
  return doc;
}

/** Distribuciones de demostración del salón: banquete con redondas o con imperiales. */
export function demoDistributions(): DistributionSeed[] {
  const imperial = starterLayout(DEMO_VENUE_SPEC, {
    kind: "boda",
    guests: 240,
    id: sequentialIds("i"),
    table: "mesa-imperial",
  });
  return [
    { id: "dist-a", name: "A", note: "Banquete con redondas", recommended: true, doc: demoLayout() },
    { id: "dist-b", name: "B", note: "Mesas imperiales", recommended: false, doc: imperial },
  ];
}

/** Prueba de rendimiento: unas 60 mesas de 10 (≈600 sillas) en el salón de demostración. */
export function stressLayout(): LayoutDoc {
  const doc = emptyLayout();
  doc.objects = fillArea(doc, DEMO_VENUE_SPEC, "mesa-redonda-180", { aisle: 0.75, max: 60, id: uid });
  return doc;
}
