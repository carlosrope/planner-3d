// Formato del diseñador (src/designer/disenador.html): milímetros, x a la derecha, y hacia abajo,
// rotación en grados (sentido horario). Lo generan tools/cad-import/to_designer.py (casas)
// y tools/designer/salon_demo.py (salón de demostración).

export type Rect = [number, number, number, number];

/** "b" de carga · "n" se puede quitar · "e" barda · "low" muro bajo. */
export type DesignerWall = [number, number, number, number, "b" | "n" | "e" | "low"];

export type DesignerRoom = {
  id: string;
  name: string;
  poly: [number, number][];
  mat: string;
  at?: [number, number];
  counted?: boolean;
  outdoor?: boolean;
  void?: boolean;
};

/** Mueble inicial de una planta: [tipo, nombre, cx, cy, ancho, fondo, rotación, color, extra]. */
export type FurnitureTuple = [string, string, number, number, number, number, number?, string?, Record<string, unknown>?];

export type DesignerLevel = {
  id: string;
  name: string;
  height: number;
  walls: DesignerWall[];
  wins: number[][];
  doors: unknown[];
  slides: unknown[];
  rooms: DesignerRoom[];
  dims: unknown[];
  entry: unknown;
  walk?: { from: [number, number]; to: [number, number] } | null;
  /** Escalera: escalones [x0,y0,x1,y1] en orden de subida y altura de cada uno (m). Sube a la planta siguiente. */
  stairs?: { steps: Rect[]; rise?: number }[];
  stairLines?: unknown[];
  furniture: FurnitureTuple[];
};

/** Dónde va un elemento fijo del montaje inicial de un salón. */
export type SetupSpot = { cx: number; cy: number; w?: number; d?: number; rot?: number };

export type DesignerPlan = {
  id: string;
  kind?: "casa" | "salon";
  title: string;
  subtitle?: string;
  lot: [number, number];
  bounds: { x: number; y: number; w: number; h: number };
  levels: DesignerLevel[];
  /** Invitados de la demostración (en un evento vienen del evento). */
  guests?: number;
  /** Solo salones: zona libre para mesas y lugares de los fijos (starter.ts). */
  setup?: {
    tables: Rect;
    stage?: SetupSpot;
    dance?: SetupSpot;
    head?: SetupSpot;
    dj?: SetupSpot;
    bar?: SetupSpot;
    dessert?: SetupSpot;
    cake?: SetupSpot;
  };
};

/** Un mueble en el estado del diseñador. `seats`, `table` y `chair` son de mesas de evento. */
export type Furniture = {
  id: string;
  type: string;
  name: string;
  cx: number;
  cy: number;
  w: number;
  d: number;
  rot: number;
  color: string;
  seats?: number;
  table?: number;
  chair?: string;
  /** Staff: rol del marcador y mesas que atiende. */
  role?: string;
  tables?: string[];
  /** Proveedor: tipo, contacto, horarios (HH:MM), corriente (W), puerta de carga, notas y sus piezas. */
  kind?: string;
  contact?: string;
  phone?: string;
  arrive?: string;
  setupFrom?: string;
  setupTo?: string;
  power?: number;
  load?: string;
  notes?: string;
  items?: string[];
};

/** Estado de una planta tal como lo guarda el diseñador. */
export type LevelState = {
  furniture: Furniture[];
  rooms?: Record<string, { name: string; mat: string }>;
  demolished?: string[];
  measures?: unknown[];
  /** Salones: lista de invitados de esta distribución (table = id de la mesa). */
  guestList?: { id: string; name: string; group?: string; diet?: string; table?: string }[];
};

/** Una distribución completa: una entrada por planta (las que faltan usan el amueblado inicial). */
export type DesignDoc = { v: 1; levels: Record<string, LevelState> };

export const emptyDesign = (): DesignDoc => ({ v: 1, levels: {} });

/**
 * El enlace del cliente no lleva proveedores (sus teléfonos, horarios y notas son de la planner) ni la dieta o
 * alergias de cada invitado: quien tenga el enlace ve quién se sienta en cada mesa, nada más.
 */
export function withoutVendors(doc: unknown): unknown {
  const d = doc as DesignDoc | null;
  if (!d || typeof d !== "object" || !d.levels) return doc;
  const levels = Object.fromEntries(
    Object.entries(d.levels).map(([k, l]) => [
      k,
      {
        ...l,
        furniture: (l.furniture ?? []).filter((f) => f.type !== "vendor"),
        ...(l.guestList ? { guestList: l.guestList.map((g) => ({ id: g.id, name: g.name, group: g.group, table: g.table })) } : {}),
      },
    ]),
  );
  return { ...d, levels };
}

/** Ficha de una casa en venta (proyecto de la sección Casas). Precio en pesos. */
export type PropertyDetails = {
  price?: number;
  landM2?: number;
  builtM2?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  location?: string;
  description?: string;
};
