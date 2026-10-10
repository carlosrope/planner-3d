import { z } from "zod";

// Validación de una distribución del diseñador antes de guardarla.

const num = z.number().finite();
const mm = num.min(-200_000).max(200_000);
const id = z.string().min(1).max(64);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const furniture = z.object({
  id,
  type: z.string().min(1).max(40),
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
  rooms: z.record(id, z.object({ name: z.string().max(80), mat: z.string().max(40) })).optional(),
  demolished: z.array(z.string().max(16)).max(500).optional(),
  measures: z.array(z.unknown()).max(500).optional(),
  /** Salones: lista de invitados de esta distribución (table = id de la mesa). */
  guestList: z.array(guest).max(3000).optional(),
});

export const designDocSchema = z.object({
  v: z.literal(1),
  levels: z.record(id, levelState).refine((l) => Object.keys(l).length <= 10),
});
