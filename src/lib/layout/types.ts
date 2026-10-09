// Documento del plano: la única fuente de verdad que dibujan el 2D y el 3D.
// Unidades: metros. Ejes: x hacia la derecha, z hacia abajo (como el SVG).
// Rotación: grados, sentido horario.

export type Pt = { x: number; z: number };

export const LAYERS = [
  "mobiliario",
  "decoracion",
  "staff",
  "proveedores",
  "tecnica",
  "rutas",
  "zonas",
] as const;
export type Layer = (typeof LAYERS)[number];

export const LAYER_LABELS: Record<Layer, string> = {
  mobiliario: "Mobiliario",
  decoracion: "Decoración",
  staff: "Staff",
  proveedores: "Proveedores",
  tecnica: "Técnica",
  rutas: "Rutas",
  zonas: "Zonas",
};

export type ObjectColors = {
  mantel?: string;
  camino?: string;
  servilleta?: string;
  flor?: string;
  silla?: string;
};

export type PlacedObject = {
  id: string;
  catalogId: string;
  x: number;
  z: number;
  rotation: number;
  /** Medidas cuando el objeto es redimensionable; si no, se usan las del catálogo. */
  w?: number;
  d?: number;
  label?: string;
  seats?: number;
  colors?: ObjectColors;
  locked?: boolean;
  layer: Layer;
  /** Planta donde está (casas con varios niveles). */
  level?: string;
};

export type Guest = {
  id: string;
  name: string;
  group?: string;
  tableId: string | null;
  seat?: number;
  diet?: string;
  allergies?: string;
  notes?: string;
};

export const STAFF_ROLES = [
  "coordinador",
  "capitan",
  "mesero",
  "barman",
  "hostess",
  "seguridad",
  "valet",
  "limpieza",
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export type StaffMember = {
  id: string;
  name: string;
  role: StaffRole;
  phone?: string;
  /** Mesas que atiende (secciones de meseros). */
  tableIds: string[];
  /** Marcador en el plano, si lo tiene. */
  objectId?: string;
};

export type Vendor = {
  id: string;
  name: string;
  category: string;
  contact?: string;
  phone?: string;
  /** Horas en formato "HH:MM". */
  arrival?: string;
  setupStart?: string;
  setupEnd?: string;
  powerWatts?: number;
  notes?: string;
  objectIds: string[];
};

export type ZoneKind =
  | "cocina"
  | "servicio"
  | "carga"
  | "estacionamiento"
  | "foto"
  | "ninos"
  | "fumar"
  | "otra";

export type Zone = { id: string; name: string; kind: ZoneKind; points: Pt[] };

export type RouteKind =
  | "servicio"
  | "montaje"
  | "entrada"
  | "emergencia"
  | "invitados";

export type Route = { id: string; name: string; kind: RouteKind; points: Pt[] };

export type TimelineItem = {
  id: string;
  /** "HH:MM" */
  time: string;
  durationMin?: number;
  title: string;
  /** Ids de staff o proveedores responsables. */
  responsibleIds: string[];
  location?: { objectId?: string; zoneId?: string; point?: Pt };
  done?: boolean;
  notes?: string;
};

export type Mood = {
  mantel: string;
  flor: string;
  /** 0–100 */
  luz: number;
  ambiente: string;
};

export type LayoutSettings = {
  /** Pasillo mínimo entre respaldos de sillas, en metros. */
  minAisle: number;
};

export type LayoutDoc = {
  version: 1;
  objects: PlacedObject[];
  guests: Guest[];
  staff: StaffMember[];
  vendors: Vendor[];
  zones: Zone[];
  routes: Route[];
  timeline: TimelineItem[];
  mood: Mood;
  settings: LayoutSettings;
};

export const DEFAULT_MIN_AISLE = 1.2;

export function emptyLayout(): LayoutDoc {
  return {
    version: 1,
    objects: [],
    guests: [],
    staff: [],
    vendors: [],
    zones: [],
    routes: [],
    timeline: [],
    mood: { mantel: "#f4efe6", flor: "#f1e3e6", luz: 70, ambiente: "noche" },
    settings: { minAisle: DEFAULT_MIN_AISLE },
  };
}

// ---------------------------------------------------------------------------
// Salón (venue): se captura una sola vez y lo reutilizan todos los eventos.

export type FixedKind =
  | "column"
  | "stage"
  | "door"
  | "exit"
  | "kitchen"
  | "restroom"
  | "bar"
  | "wall"
  | "window";

export type FixedElement = {
  id: string;
  kind: FixedKind;
  label?: string;
  x: number;
  z: number;
  w: number;
  d: number;
  rotation: number;
};

export type Outlet = { id: string; x: number; z: number; label?: string };

export type VenueSpec = {
  /** Caja que contiene el piso, en metros. */
  width: number;
  depth: number;
  /** Polígono del piso útil (sentido horario o antihorario). */
  floor: Pt[];
  fixed: FixedElement[];
  outlets: Outlet[];
  /** Plantas importadas de CAD (casas). Un salón no las usa. */
  levels?: Level[];
  notes?: string;
};

export type VenueKind = "salon" | "casa";

export type VenueInfo = {
  id: string;
  name: string;
  city: string;
  kind?: VenueKind;
  spec: VenueSpec;
};

// ---------------------------------------------------------------------------
// Plantas de una casa, generadas por tools/cad-import a partir del DXF.

/** "antepecho": muro bajo de ventana; "barda": límite del lote. */
export type WallKind = "muro" | "tablaroca" | "antepecho" | "barda";
export type Wall = { id: string; kind: WallKind; points: Pt[] };

export type OpeningKind = "puerta" | "ventana" | "cancel";
/** Caja del vano; en puertas incluye el barrido de la hoja. */
export type Opening = { id: string; kind: OpeningKind; x: number; z: number; w: number; d: number };

export type CadLineLayer = "puerta" | "ventana" | "escalon" | "mueble-fijo" | "exterior";
/** Trazo del plano en formato compacto: [x0, z0, x1, z1, ...]. */
export type CadLine = { layer: CadLineLayer; pts: number[]; closed?: boolean };

export type SlabKind = "interior" | "terraza" | "cochera" | "pasillo";
export type Slab = { kind: SlabKind; points: [number, number][]; holes?: [number, number][][] };

/** `view`: punto de vista para "ver desde dentro" [cámaraX, cámaraZ, miraX, miraZ]. */
export type Room = { name: string; x: number; z: number; view?: [number, number, number, number] };

/** Escalones en orden de subida: [x0, z0, x1, z1]. */
export type Stair = { to: string; steps: [number, number, number, number][] };

export type Level = {
  id: string;
  name: string;
  /** Nivel del piso terminado, en metros. */
  elevation: number;
  /** Altura de muros. */
  height: number;
  walls: Wall[];
  openings: Opening[];
  lines: CadLine[];
  slabs: Slab[];
  rooms: Room[];
  stairs: Stair[];
};
