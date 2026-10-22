import { z } from "zod";

// Validación de una distribución del diseñador antes de guardarla.

const num = z.number().finite();
const mm = num.min(-200_000).max(200_000);
// Los identificadores y claves viajan dentro del HTML del diseñador (atributos y SVG): solo letras, números, guion y
// guion bajo, para que nunca traigan comillas ni < > (un id como a"><img onerror=…> sería código en la página).
const SAFE = /^[A-Za-z0-9_-]+$/;
const id = z.string().min(1).max(64).regex(SAFE);
const code = (max: number) => z.string().max(max).regex(/^[A-Za-z0-9_-]*$/);
const point = z.object({ x: mm, y: mm });
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const hhmm = z.union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)]);

const furniture = z.object({
  id,
  type: z.string().min(1).max(40).regex(SAFE),
  name: z.string().max(80),
  cx: mm,
  cy: mm,
  w: num.positive().max(100_000),
  d: num.positive().max(100_000),
  rot: num.min(-720).max(720),
  color,
  seats: z.number().int().min(0).max(80).optional(),
  table: num.positive().max(100_000).optional(),
  chair: color.optional(),
  /** Staff: rol del marcador y mesas que atiende (meseros y capitanes). */
  role: code(20).optional(),
  tables: z.array(id).max(300).optional(),
  /** Proveedor: tipo, contacto, horarios (HH:MM), corriente (W), puerta de carga, notas y sus piezas. */
  kind: code(20).optional(),
  contact: z.string().max(60).optional(),
  phone: z.string().max(20).optional(),
  arrive: hhmm.optional(),
  setupFrom: hhmm.optional(),
  setupTo: hhmm.optional(),
  power: z.number().int().min(0).max(100_000).optional(),
  load: z.string().max(80).optional(),
  notes: z.string().max(400).optional(),
  items: z.array(id).max(300).optional(),
});

const guest = z.object({
  id,
  name: z.string().min(1).max(80),
  group: z.string().max(60).optional(),
  diet: z.string().max(80).optional(),
  table: id.optional(),
});

const levelState = z.object({
  furniture: z.array(furniture).max(3000),
  rooms: z.record(id, z.object({ name: z.string().max(80), mat: z.string().min(1).max(40).regex(SAFE) })).optional(),
  demolished: z.array(z.string().min(1).max(16).regex(SAFE)).max(500).optional(),
  measures: z.array(z.object({ a: point, b: point })).max(500).optional(),
  /** Salones: lista de invitados de esta distribución (table = id de la mesa). */
  guestList: z.array(guest).max(3000).optional(),
});

export const designDocSchema = z.object({
  v: z.literal(1),
  levels: z.record(id, levelState).refine((l) => Object.keys(l).length <= 10),
});

export const propertyDetailsSchema = z.object({
  price: z.number().int().min(0).max(1_000_000_000).optional(),
  landM2: z.number().min(0).max(100_000).optional(),
  builtM2: z.number().min(0).max(100_000).optional(),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().min(0).max(50).optional(),
  parking: z.number().int().min(0).max(50).optional(),
  location: z.string().trim().max(120).optional(),
  description: z.string().trim().max(600).optional(),
});
