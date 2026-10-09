import type { Layer, VenueKind } from "./types";

export type Category =
  | "recamara"
  | "estancia"
  | "mesas"
  | "pista-escenario"
  | "servicio"
  | "entretenimiento"
  | "decoracion"
  | "staff";

/** Qué categorías aparecen según el tipo de lugar. */
export const CATEGORIES: { id: Category; label: string; scopes: VenueKind[] }[] = [
  { id: "recamara", label: "Recámara", scopes: ["casa"] },
  { id: "estancia", label: "Sala, comedor y cocina", scopes: ["casa"] },
  { id: "mesas", label: "Mesas", scopes: ["salon"] },
  { id: "pista-escenario", label: "Pista y escenario", scopes: ["salon"] },
  { id: "servicio", label: "Servicio", scopes: ["salon"] },
  { id: "entretenimiento", label: "Entretenimiento", scopes: ["salon"] },
  { id: "decoracion", label: "Decoración", scopes: ["salon", "casa"] },
  { id: "staff", label: "Staff y proveedores", scopes: ["salon"] },
];

/** Cómo se dibuja en 3D (modelos procedurales, sin archivos externos). */
export type Model3D = "table" | "bed" | "sofa" | "rug" | "plant" | "platform" | "person" | "box";

export type SeatLayout = "round" | "two-sides" | "one-side";

export type CatalogItem = {
  id: string;
  name: string;
  category: Category;
  layer: Layer;
  shape: "round" | "rect";
  /** Para objetos redondos, w = d = diámetro. */
  w: number;
  d: number;
  resizable?: boolean;
  seats?: { default: number; min: number; max: number; layout: SeatLayout };
  /** Si participa en la validación de pasillos y encimados. */
  clearance: boolean;
  /** Si recibe número automático (mesas de invitados). */
  numbered?: boolean;
  fill: string;
  /** Marcador circular con letra (staff y proveedores). */
  marker?: { glyph: string; color: string };
  /** Altura en metros, para el 3D y para saber si tapa una ventana. */
  h?: number;
  model?: Model3D;
  /** Nombre corto para el plano (muebles de casa). */
  short?: string;
};

const MESA = "#f4efe6";
const SERVICIO = "#e7efe9";
const ENTRETENIMIENTO = "#e6e9f4";
const DECORACION = "#f6e8ec";

export const CATALOG: CatalogItem[] = [
  // Mesas
  {
    id: "mesa-redonda-150",
    name: "Mesa redonda 1.50 m",
    category: "mesas",
    layer: "mobiliario",
    shape: "round",
    w: 1.5,
    d: 1.5,
    seats: { default: 8, min: 4, max: 10, layout: "round" },
    clearance: true,
    numbered: true,
    fill: MESA,
  },
  {
    id: "mesa-redonda-180",
    name: "Mesa redonda 1.80 m",
    category: "mesas",
    layer: "mobiliario",
    shape: "round",
    w: 1.8,
    d: 1.8,
    seats: { default: 10, min: 6, max: 12, layout: "round" },
    clearance: true,
    numbered: true,
    fill: MESA,
  },
  {
    id: "mesa-imperial",
    name: "Mesa imperial",
    category: "mesas",
    layer: "mobiliario",
    shape: "rect",
    w: 2.4,
    d: 1.0,
    resizable: true,
    seats: { default: 8, min: 2, max: 40, layout: "two-sides" },
    clearance: true,
    numbered: true,
    fill: MESA,
  },
  {
    id: "mesa-novios",
    name: "Mesa de novios",
    category: "mesas",
    layer: "mobiliario",
    shape: "rect",
    w: 3.0,
    d: 0.9,
    resizable: true,
    seats: { default: 2, min: 1, max: 12, layout: "one-side" },
    clearance: true,
    fill: "#fbf3df",
  },
  {
    id: "mesa-honor-xv",
    name: "Mesa de honor (XV)",
    category: "mesas",
    layer: "mobiliario",
    shape: "rect",
    w: 3.6,
    d: 0.9,
    resizable: true,
    seats: { default: 6, min: 1, max: 14, layout: "one-side" },
    clearance: true,
    fill: "#fbf3df",
  },
  {
    id: "periquera",
    name: "Periquera",
    category: "mesas",
    layer: "mobiliario",
    shape: "round",
    w: 0.7,
    d: 0.7,
    seats: { default: 4, min: 0, max: 6, layout: "round" },
    clearance: true,
    fill: MESA,
  },
  {
    id: "sala-lounge",
    name: "Sala lounge",
    category: "mesas",
    layer: "mobiliario",
    shape: "rect",
    w: 2.6,
    d: 2.0,
    clearance: true,
    fill: "#efe9df",
  },

  // Pista y escenario
  {
    id: "pista",
    name: "Pista de baile",
    category: "pista-escenario",
    layer: "mobiliario",
    shape: "rect",
    w: 6,
    d: 6,
    resizable: true,
    clearance: true,
    fill: "#ece8f3",
  },
  {
    id: "escenario",
    name: "Escenario / tarima",
    category: "pista-escenario",
    layer: "mobiliario",
    shape: "rect",
    w: 8,
    d: 4,
    resizable: true,
    clearance: true,
    fill: "#e2ddd5",
  },
  {
    id: "area-banda",
    name: "Área de banda",
    category: "pista-escenario",
    layer: "mobiliario",
    shape: "rect",
    w: 7,
    d: 4,
    resizable: true,
    clearance: true,
    fill: "#e2ddd5",
  },

  // Servicio
  {
    id: "barra",
    name: "Barra",
    category: "servicio",
    layer: "mobiliario",
    shape: "rect",
    w: 3.6,
    d: 1.0,
    resizable: true,
    clearance: true,
    fill: SERVICIO,
  },
  {
    id: "mesa-dulces",
    name: "Mesa de dulces",
    category: "servicio",
    layer: "mobiliario",
    shape: "rect",
    w: 3.0,
    d: 0.8,
    resizable: true,
    clearance: true,
    fill: SERVICIO,
  },
  {
    id: "mesa-pastel",
    name: "Mesa de pastel",
    category: "servicio",
    layer: "mobiliario",
    shape: "round",
    w: 1.2,
    d: 1.2,
    clearance: true,
    fill: SERVICIO,
  },
  {
    id: "buffet",
    name: "Buffet",
    category: "servicio",
    layer: "mobiliario",
    shape: "rect",
    w: 4.0,
    d: 0.9,
    resizable: true,
    clearance: true,
    fill: SERVICIO,
  },
  {
    id: "estacion-cafe",
    name: "Estación de café",
    category: "servicio",
    layer: "mobiliario",
    shape: "rect",
    w: 1.8,
    d: 0.7,
    clearance: true,
    fill: SERVICIO,
  },

  // Entretenimiento
  {
    id: "cabina-dj",
    name: "Cabina DJ",
    category: "entretenimiento",
    layer: "mobiliario",
    shape: "rect",
    w: 2.0,
    d: 1.0,
    clearance: true,
    fill: ENTRETENIMIENTO,
  },
  {
    id: "pantalla-led",
    name: "Pantalla LED",
    category: "entretenimiento",
    layer: "mobiliario",
    shape: "rect",
    w: 3.5,
    d: 0.4,
    resizable: true,
    clearance: true,
    fill: ENTRETENIMIENTO,
  },
  {
    id: "photo-booth",
    name: "Photo booth",
    category: "entretenimiento",
    layer: "mobiliario",
    shape: "rect",
    w: 2.5,
    d: 2.5,
    clearance: true,
    fill: ENTRETENIMIENTO,
  },
  {
    id: "plataforma-360",
    name: "Plataforma 360",
    category: "entretenimiento",
    layer: "mobiliario",
    shape: "round",
    w: 1.2,
    d: 1.2,
    clearance: true,
    fill: ENTRETENIMIENTO,
  },

  // Casa: recámara
  ...(
    [
      ["cama-individual", "Cama individual", 1.0, 1.9],
      ["cama-matrimonial", "Cama matrimonial", 1.4, 1.9],
      ["cama-queen", "Cama queen", 1.55, 2.0],
      ["cama-king", "Cama king", 1.95, 2.0],
    ] as const
  ).map(
    ([id, name, w, d]): CatalogItem => ({
      id,
      name,
      category: "recamara",
      layer: "mobiliario",
      shape: "rect",
      w,
      d,
      clearance: true,
      fill: "#eadfcf",
      h: 0.55,
      model: "bed",
    }),
  ),
  { id: "buro", name: "Buró", category: "recamara", layer: "mobiliario", shape: "rect", w: 0.5, d: 0.4, clearance: true, fill: "#d8c4a8", h: 0.55 },
  { id: "ropero", name: "Ropero / clóset", category: "recamara", layer: "mobiliario", shape: "rect", w: 1.2, d: 0.6, resizable: true, clearance: true, fill: "#d8c4a8", h: 2.0 },
  { id: "comoda", name: "Cómoda", category: "recamara", layer: "mobiliario", shape: "rect", w: 1.2, d: 0.5, resizable: true, clearance: true, fill: "#e8e2d8", h: 0.9 },
  { id: "escritorio", name: "Escritorio", category: "recamara", layer: "mobiliario", shape: "rect", w: 1.2, d: 0.6, resizable: true, seats: { default: 1, min: 0, max: 2, layout: "one-side" }, clearance: true, fill: "#f2efe9", h: 0.75, model: "table" },
  { id: "librero", name: "Librero", category: "recamara", layer: "mobiliario", shape: "rect", w: 0.9, d: 0.35, resizable: true, clearance: true, fill: "#e8e2d8", h: 1.9 },
  { id: "cuna", name: "Cuna", category: "recamara", layer: "mobiliario", shape: "rect", w: 0.7, d: 1.3, clearance: true, fill: "#f4efe6", h: 0.95 },

  // Casa: sala, comedor y cocina
  { id: "sofa-3", name: "Sofá 3 plazas", category: "estancia", layer: "mobiliario", shape: "rect", w: 2.1, d: 0.9, resizable: true, clearance: true, fill: "#c9c2b6", h: 0.85, model: "sofa" },
  { id: "sofa-2", name: "Love seat", category: "estancia", layer: "mobiliario", shape: "rect", w: 1.5, d: 0.9, clearance: true, fill: "#c9c2b6", h: 0.85, model: "sofa" },
  { id: "sillon", name: "Sillón", category: "estancia", layer: "mobiliario", shape: "rect", w: 0.85, d: 0.85, clearance: true, fill: "#b8ad9c", h: 0.85, model: "sofa" },
  { id: "mesa-centro", name: "Mesa de centro", category: "estancia", layer: "mobiliario", shape: "rect", w: 1.1, d: 0.6, clearance: true, fill: "#bfa58a", h: 0.45 },
  { id: "mueble-tv", name: "Mueble de TV", category: "estancia", layer: "mobiliario", shape: "rect", w: 1.8, d: 0.45, resizable: true, clearance: true, fill: "#bfa58a", h: 0.6 },
  { id: "comedor-4", name: "Comedor 4 personas", category: "estancia", layer: "mobiliario", shape: "rect", w: 1.2, d: 0.8, seats: { default: 4, min: 2, max: 6, layout: "two-sides" }, clearance: true, fill: "#d6c2a5", h: 0.76, model: "table" },
  { id: "comedor-6", name: "Comedor 6 personas", category: "estancia", layer: "mobiliario", shape: "rect", w: 1.8, d: 0.9, seats: { default: 6, min: 4, max: 8, layout: "two-sides" }, clearance: true, fill: "#d6c2a5", h: 0.76, model: "table" },
  { id: "comedor-redondo", name: "Comedor redondo", category: "estancia", layer: "mobiliario", shape: "round", w: 1.1, d: 1.1, seats: { default: 4, min: 2, max: 6, layout: "round" }, clearance: true, fill: "#d6c2a5", h: 0.76, model: "table" },
  { id: "refrigerador", name: "Refrigerador", category: "estancia", layer: "mobiliario", shape: "rect", w: 0.9, d: 0.75, clearance: true, fill: "#e5e7eb", h: 1.8 },
  { id: "lavadora", name: "Lavadora / secadora", category: "estancia", layer: "mobiliario", shape: "rect", w: 0.65, d: 0.65, clearance: true, fill: "#f3f4f6", h: 0.95 },
  { id: "tapete", name: "Tapete", category: "estancia", layer: "decoracion", shape: "rect", w: 2.0, d: 1.4, resizable: true, clearance: false, fill: "#d9cbb8", h: 0.01, model: "rug" },
  { id: "planta", name: "Planta", category: "estancia", layer: "decoracion", shape: "round", w: 0.5, d: 0.5, clearance: false, fill: "#9db48a", h: 1.2, model: "plant" },

  // Decoración (no participa en pasillos: suele ir junto a las mesas)
  {
    id: "candelabro-piso",
    name: "Candelabro de piso",
    category: "decoracion",
    layer: "decoracion",
    shape: "round",
    w: 0.6,
    d: 0.6,
    clearance: false,
    fill: DECORACION,
  },
  {
    id: "pedestal-floral",
    name: "Pedestal floral",
    category: "decoracion",
    layer: "decoracion",
    shape: "round",
    w: 0.6,
    d: 0.6,
    clearance: false,
    fill: DECORACION,
  },
  {
    id: "arco-floral",
    name: "Arco floral",
    category: "decoracion",
    layer: "decoracion",
    shape: "rect",
    w: 2.6,
    d: 0.6,
    resizable: true,
    clearance: false,
    fill: DECORACION,
  },
  {
    id: "trono-xv",
    name: "Trono de quinceañera",
    category: "decoracion",
    layer: "decoracion",
    shape: "rect",
    w: 1.4,
    d: 1.2,
    clearance: false,
    fill: DECORACION,
  },
  {
    id: "letras-gigantes",
    name: "Letras gigantes",
    category: "decoracion",
    layer: "decoracion",
    shape: "rect",
    w: 3.0,
    d: 0.5,
    resizable: true,
    clearance: false,
    fill: DECORACION,
  },

  // Staff y proveedores (marcadores)
  ...(
    [
      ["staff-coordinador", "Coordinador(a)", "CO", "#db2777"],
      ["staff-capitan", "Capitán de meseros", "C", "#7c3aed"],
      ["staff-mesero", "Mesero", "M", "#2563eb"],
      ["staff-barman", "Barman", "B", "#0891b2"],
      ["staff-hostess", "Hostess", "H", "#ea580c"],
      ["staff-seguridad", "Seguridad", "S", "#475569"],
    ] as const
  ).map(
    ([id, name, glyph, color]): CatalogItem => ({
      id,
      name,
      category: "staff",
      layer: "staff",
      shape: "round",
      w: 0.6,
      d: 0.6,
      clearance: false,
      fill: color,
      marker: { glyph, color },
    }),
  ),
  {
    id: "proveedor",
    name: "Proveedor",
    category: "staff",
    layer: "proveedores",
    shape: "round",
    w: 0.6,
    d: 0.6,
    clearance: false,
    fill: "#16a34a",
    marker: { glyph: "P", color: "#16a34a" },
  },
];

/** Alturas y modelos 3D de los objetos de eventos. */
const EVENT_3D: Record<string, { h: number; model?: Model3D }> = {
  "mesa-redonda-150": { h: 0.76, model: "table" },
  "mesa-redonda-180": { h: 0.76, model: "table" },
  "mesa-imperial": { h: 0.76, model: "table" },
  "mesa-novios": { h: 0.76, model: "table" },
  "mesa-honor-xv": { h: 0.76, model: "table" },
  periquera: { h: 1.1, model: "table" },
  "sala-lounge": { h: 0.8, model: "sofa" },
  pista: { h: 0.03, model: "platform" },
  escenario: { h: 0.6, model: "platform" },
  "area-banda": { h: 0.05, model: "platform" },
  barra: { h: 1.1 },
  "mesa-dulces": { h: 0.9 },
  "mesa-pastel": { h: 0.9 },
  buffet: { h: 0.9 },
  "estacion-cafe": { h: 0.9 },
  "cabina-dj": { h: 1.1 },
  "pantalla-led": { h: 2.6 },
  "photo-booth": { h: 2.2 },
  "plataforma-360": { h: 0.25, model: "platform" },
  "candelabro-piso": { h: 1.8, model: "plant" },
  "pedestal-floral": { h: 1.2, model: "plant" },
  "arco-floral": { h: 2.4 },
  "trono-xv": { h: 1.5 },
  "letras-gigantes": { h: 1.2 },
};
const SHORT: Record<string, string> = {
  "cama-individual": "Cama",
  "cama-matrimonial": "Cama",
  "cama-queen": "Cama queen",
  "cama-king": "Cama king",
  buro: "Buró",
  ropero: "Ropero",
  comoda: "Cómoda",
  escritorio: "Escritorio",
  librero: "Librero",
  cuna: "Cuna",
  "sofa-3": "Sofá",
  "sofa-2": "Love seat",
  sillon: "Sillón",
  "mesa-centro": "Mesa",
  "mueble-tv": "TV",
  "comedor-4": "Comedor",
  "comedor-6": "Comedor",
  "comedor-redondo": "Comedor",
  refrigerador: "Refri",
  lavadora: "Lavadora",
};

for (const item of CATALOG) {
  if (SHORT[item.id]) item.short = SHORT[item.id];
  const extra = EVENT_3D[item.id];
  if (extra) Object.assign(item, { h: item.h ?? extra.h, model: item.model ?? extra.model });
  if (item.marker) Object.assign(item, { h: 1.7, model: "person" as const });
}

export function categoriesFor(kind: VenueKind) {
  return CATEGORIES.filter((c) => c.scopes.includes(kind));
}

const BY_ID = new Map(CATALOG.map((item) => [item.id, item]));

export function getItem(catalogId: string): CatalogItem {
  const item = BY_ID.get(catalogId);
  if (!item) throw new Error(`Objeto de catálogo desconocido: ${catalogId}`);
  return item;
}

export function findItem(catalogId: string): CatalogItem | undefined {
  return BY_ID.get(catalogId);
}
