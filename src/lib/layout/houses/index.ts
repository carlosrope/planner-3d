import { createObject, emptyHouseLayout, sequentialIds } from "../tools";
import type { LayoutDoc, Level, VenueInfo } from "../types";
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

