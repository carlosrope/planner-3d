import type { Furniture } from "./types";

// Invitados ficticios para los proyectos de ejemplo y el mismo acomodo por grupos que usa el
// diseñador ("Acomodar automáticamente" en src/designer/eventos/eventos.js).

export type Guest = { id: string; name: string; group?: string; diet?: string; table?: string };

const FIRST = [
  "Ana", "Luis", "María", "José", "Carmen", "Jorge", "Lucía", "Pedro", "Sofía", "Miguel", "Elena", "Raúl", "Paola",
  "Héctor", "Diana", "Iván", "Fernanda", "Ricardo", "Valeria", "Andrés", "Gabriela", "Óscar", "Mónica", "Javier",
];
const LAST = [
  "Robles", "Castro", "Medina", "Iturbe", "Soto", "Valdez", "Leyva", "Camacho", "Félix", "Quintero", "Beltrán",
  "Zazueta", "Armenta", "Gastélum", "López", "Rubio", "Cota", "Inzunza", "Bojórquez", "Ochoa", "Verdugo", "Lugo",
];
const DIETS = ["vegetariano", "sin gluten", "alergia a nuez", "vegano"];

/** `count` invitados en familias de 4 a 10, con algunas dietas. Determinista. */
export function sampleGuests(count: number, prefix = "g"): Guest[] {
  const out: Guest[] = [];
  let f = 0;
  while (out.length < count) {
    const last = LAST[f % LAST.length];
    const group = f < LAST.length ? `Familia ${last}` : `Familia ${last} ${Math.floor(f / LAST.length) + 1}`;
    const size = Math.min(4 + ((f * 7) % 7), count - out.length);
    for (let i = 0; i < size; i++) {
      const n = out.length;
      out.push({
        id: `${prefix}${n + 1}`,
        name: `${FIRST[(n * 5 + f) % FIRST.length]} ${last}`,
        group,
        ...(n % 13 === 4 ? { diet: DIETS[n % DIETS.length] } : {}),
      });
    }
    f++;
  }
  return out;
}

const SEATED = ["rtable", "itable", "headtable"];
const tableNo = (f: Furniture) => Number(/^Mesa (\d+)$/.exec(f.name)?.[1] ?? 9999);

/** Sienta a quien no tiene mesa: cada grupo junto en la primera mesa numerada donde quepa. Devuelve cuántos no cupieron. */
export function seatGuests(furniture: Furniture[], guests: Guest[]): number {
  const tables = furniture
    .filter((f) => SEATED.includes(f.type) && /^Mesa \d+$/.test(f.name))
    .sort((a, b) => tableNo(a) - tableNo(b));
  const ids = new Set(furniture.map((f) => f.id));
  const free = new Map(tables.map((f) => [f.id, (f.seats ?? 0) - guests.filter((g) => g.table === f.id).length]));
  const groups = new Map<string, Guest[]>();
  for (const g of guests) {
    if (g.table && ids.has(g.table)) continue;
    const k = g.group || `·${g.id}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(g);
  }
  let left = 0;
  for (const members of groups.values()) {
    const rest = members.slice();
    while (rest.length) {
      const table =
        tables.find((f) => free.get(f.id)! >= rest.length) ??
        tables.reduce<Furniture | null>((a, f) => (free.get(f.id)! > (a ? free.get(a.id)! : 0) ? f : a), null);
      if (!table) {
        left += rest.length;
        break;
      }
      const n = Math.min(free.get(table.id)!, rest.length);
      rest.splice(0, n).forEach((g) => {
        g.table = table.id;
      });
      free.set(table.id, free.get(table.id)! - n);
    }
  }
  return left;
}
