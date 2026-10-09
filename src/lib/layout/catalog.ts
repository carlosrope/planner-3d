import type { Layer } from "./types";

export type Category =
  | "mesas"
  | "pista-escenario"
  | "servicio"
  | "entretenimiento"
  | "decoracion"
  | "staff";

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "mesas", label: "Mesas" },
  { id: "pista-escenario", label: "Pista y escenario" },
  { id: "servicio", label: "Servicio" },
  { id: "entretenimiento", label: "Entretenimiento" },
  { id: "decoracion", label: "Decoración" },
  { id: "staff", label: "Staff y proveedores" },
];

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

const BY_ID = new Map(CATALOG.map((item) => [item.id, item]));

export function getItem(catalogId: string): CatalogItem {
  const item = BY_ID.get(catalogId);
  if (!item) throw new Error(`Objeto de catálogo desconocido: ${catalogId}`);
  return item;
}

export function findItem(catalogId: string): CatalogItem | undefined {
  return BY_ID.get(catalogId);
}
