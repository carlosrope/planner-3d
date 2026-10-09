import { z } from "zod";
import { LAYERS, STAFF_ROLES } from "./types";

// Validación del documento del plano antes de guardarlo en el servidor.

const num = z.number().finite();
const coord = num.min(-500).max(500);
const id = z.string().min(1).max(64);
const text = (max: number) => z.string().max(max);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const time = z.string().regex(/^\d{2}:\d{2}$/);
const pt = z.object({ x: coord, z: coord });

const placedObject = z.object({
  id,
  catalogId: id,
  x: coord,
  z: coord,
  rotation: num.min(-360).max(360),
  w: num.positive().max(100).optional(),
  d: num.positive().max(100).optional(),
  label: text(40).optional(),
  seats: z.number().int().min(0).max(60).optional(),
  colors: z
    .object({
      mantel: color.optional(),
      camino: color.optional(),
      servilleta: color.optional(),
      flor: color.optional(),
      silla: color.optional(),
    })
    .optional(),
  locked: z.boolean().optional(),
  layer: z.enum(LAYERS),
  level: id.optional(),
});

const guest = z.object({
  id,
  name: text(120),
  group: text(80).optional(),
  tableId: id.nullable(),
  seat: z.number().int().min(0).max(60).optional(),
  diet: text(80).optional(),
  allergies: text(160).optional(),
  notes: text(400).optional(),
});

const staffMember = z.object({
  id,
  name: text(120),
  role: z.enum(STAFF_ROLES),
  phone: text(30).optional(),
  tableIds: z.array(id).max(200),
  objectId: id.optional(),
});

const vendor = z.object({
  id,
  name: text(120),
  category: text(60),
  contact: text(120).optional(),
  phone: text(30).optional(),
  arrival: time.optional(),
  setupStart: time.optional(),
  setupEnd: time.optional(),
  powerWatts: num.min(0).max(100000).optional(),
  notes: text(600).optional(),
  objectIds: z.array(id).max(50),
});

const zone = z.object({
  id,
  name: text(80),
  kind: z.enum(["cocina", "servicio", "carga", "estacionamiento", "foto", "ninos", "fumar", "otra"]),
  points: z.array(pt).min(3).max(64),
});

const route = z.object({
  id,
  name: text(80),
  kind: z.enum(["servicio", "montaje", "entrada", "emergencia", "invitados"]),
  points: z.array(pt).min(2).max(128),
});

const timelineItem = z.object({
  id,
  time,
  durationMin: z.number().int().min(0).max(1440).optional(),
  title: text(160),
  responsibleIds: z.array(id).max(50),
  location: z
    .object({ objectId: id.optional(), zoneId: id.optional(), point: pt.optional() })
    .optional(),
  done: z.boolean().optional(),
  notes: text(600).optional(),
});

export const layoutDocSchema = z.object({
  version: z.literal(1),
  objects: z.array(placedObject).max(600),
  guests: z.array(guest).max(1500),
  staff: z.array(staffMember).max(200),
  vendors: z.array(vendor).max(100),
  zones: z.array(zone).max(50),
  routes: z.array(route).max(50),
  timeline: z.array(timelineItem).max(200),
  mood: z.object({ mantel: color, flor: color, luz: num.min(0).max(100), ambiente: text(40) }),
  settings: z.object({ minAisle: num.min(0.5).max(3) }),
});
