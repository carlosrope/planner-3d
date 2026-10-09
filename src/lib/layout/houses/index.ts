import { createObject, emptyHouseLayout, sequentialIds } from "../tools";
import type { DistributionSeed, LayoutDoc, Level, VenueInfo } from "../types";
import chardonnay from "./chardonnay.json";

// Casas importadas con tools/cad-import (DWG → DXF → JSON).

export const CHARDONNAY: VenueInfo = {
  id: "casa-chardonnay",
  name: "Casa Chardonnay",
  city: "Los Mochis",
  kind: "casa",
  spec: {
    width: chardonnay.width,
    depth: chardonnay.depth,
    floor: chardonnay.floor,
    fixed: [],
    outlets: [],
    levels: chardonnay.levels as unknown as Level[],
    notes: "Modelo base de 172.17 m² (sin ampliación), tomado de ARQ-05 del juego de planos.",
  },
};

/** Chardonnay amueblada como en el folleto. Ids deterministas (se prerenderiza). */
export function chardonnayDemoLayout(): LayoutDoc {
  const id = sequentialIds("c");
  const doc = emptyHouseLayout();
  const add = (level: "pb" | "pa", catalogId: string, x: number, z: number, rotation = 0, extra = {}) =>
    doc.objects.push({ ...createObject(catalogId, { x, z }, doc.objects, id), rotation, level, ...extra });

  // Planta baja
  add("pb", "comedor-6", 8.05, 5.45, 90);
  add("pb", "sofa-3", 9.3, 9.2, -90);
  add("pb", "sillon", 6.75, 8.55, 90);
  add("pb", "sillon", 6.75, 9.85, 90);
  add("pb", "mesa-centro", 8.0, 9.2, 90);
  add("pb", "tapete", 8.0, 9.2, 90, { w: 2.2, d: 1.6 });
  add("pb", "cama-matrimonial", 3.4, 12.6, 180);
  add("pb", "buro", 2.4, 13.33, 180);
  add("pb", "buro", 4.4, 13.33, 180);
  add("pb", "planta", 6.25, 7.95);

  // Planta alta
  add("pa", "cama-king", 7.4, 4.72);
  add("pa", "buro", 6.05, 3.95);
  add("pa", "buro", 8.75, 3.95);
  add("pa", "comoda", 7.4, 7.1, 180);
  add("pa", "cama-matrimonial", 2.25, 11.0, -90);
  add("pa", "buro", 1.55, 10.03, -90);
  add("pa", "ropero", 4.28, 11.2, 90, { w: 1.4 });
  add("pa", "escritorio", 2.25, 13.32, 0, { w: 1.0 });
  return doc;
}


/** Variantes de amueblado para comparar, como las pestañas A/B/C del post. */
export function chardonnayDistributions(): DistributionSeed[] {
  const id = sequentialIds("v");
  const place = (doc: LayoutDoc, level: "pb" | "pa", catalogId: string, x: number, z: number, rotation = 0, extra = {}) =>
    doc.objects.push({ ...createObject(catalogId, { x, z }, doc.objects, id), rotation, level, ...extra });

  // B: la recámara 2 se vuelve estudio con love seat para visitas.
  const study = chardonnayDemoLayout();
  study.objects = study.objects.filter(
    (o) => !(o.level === "pa" && o.x < 4.7 && o.z > 9.4 && ["cama-matrimonial", "buro"].includes(o.catalogId)),
  );
  place(study, "pa", "sofa-2", 1.73, 10.9, -90);
  place(study, "pa", "librero", 2.4, 9.6);
  place(study, "pa", "tapete", 2.7, 11.0, 90, { w: 1.6, d: 1.2 });

  // C: la sala mira hacia el comedor y el jardín, con el sofá de espaldas a la escalera.
  const garden = chardonnayDemoLayout();
  const living = new Set(["sofa-3", "sillon", "mesa-centro", "tapete"]);
  garden.objects = garden.objects.filter((o) => !(o.level === "pb" && living.has(o.catalogId)));
  place(garden, "pb", "tapete", 8.0, 9.0, 0, { w: 2.2, d: 1.6 });
  place(garden, "pb", "sofa-3", 8.0, 10.35, 180);
  place(garden, "pb", "sillon", 6.6, 8.75, 90);
  place(garden, "pb", "sillon", 9.35, 8.75, -90);
  place(garden, "pb", "mesa-centro", 8.0, 8.95);

  return [
    { id: "dist-a", name: "A", note: "Como el folleto", recommended: true, doc: chardonnayDemoLayout() },
    { id: "dist-b", name: "B", note: "Recámara 2 como estudio", recommended: false, doc: study },
    { id: "dist-c", name: "C", note: "Sala viendo al jardín", recommended: false, doc: garden },
  ];
}
