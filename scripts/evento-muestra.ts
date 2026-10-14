// Evento de muestra para enseñarle a un salón cómo queda su espacio con una fiesta montada: un
// cumpleaños de 40 personas con mesas redondas, invitados ficticios ya sentados por grupo y una
// segunda distribución en imperial. Se crea en la cuenta dueña del salón.
//
// Uso: npx tsx --env-file=.env.local scripts/evento-muestra.ts "<lugar: slug o nombre>" "<correo de la cuenta>" [invitados=40] [título]
// Ejemplo: npx tsx --env-file=.env.local scripts/evento-muestra.ts salon-las-palmas modulos@planner3d.test
import { and, eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { event, layout, membership, user, venue } from "../src/lib/db/schema";
import { seatGuests, type Guest } from "../src/lib/designer/samples";
import { starterFurniture, type Template } from "../src/lib/designer/starter";
import type { DesignDoc, DesignerPlan } from "../src/lib/designer/types";

const [lugar, correo, invitadosArg, tituloArg] = process.argv.slice(2);
if (!lugar || !correo) {
  console.error('Uso: evento-muestra.ts "<lugar>" "<correo>" [invitados] [título]');
  process.exit(1);
}
const GUESTS = Number(invitadosArg ?? 40);
const TITLE = tituloArg ?? `Cumpleaños de Mariana (muestra) · ${GUESTS} invitados`;

// Invitados de un cumpleaños: familia, amigos y trabajo, con un par de dietas. Nombres ficticios.
const FIRST = ["Ana", "Luis", "María", "José", "Carmen", "Jorge", "Lucía", "Pedro", "Sofía", "Miguel", "Elena", "Raúl", "Paola", "Héctor", "Diana", "Iván", "Fernanda", "Ricardo", "Valeria", "Andrés"];
const LAST = ["Robles", "Castro", "Medina", "Soto", "Valdez", "Leyva", "Camacho", "Félix", "Quintero", "Beltrán"];
const GROUPS: [string, number][] = [["Familia de Mariana", 0.3], ["Familia de Daniel", 0.2], ["Amigas de la prepa", 0.2], ["Compañeros del trabajo", 0.2], ["Vecinos", 0.1]];
function birthdayGuests(n: number): Guest[] {
  const out: Guest[] = [];
  let g = 0;
  for (const [group, share] of GROUPS) {
    const size = g === GROUPS.length - 1 ? n - out.length : Math.round(n * share);
    for (let i = 0; i < size && out.length < n; i++) {
      const k = out.length;
      out.push({ id: `g${k + 1}`, name: `${FIRST[(k * 7 + g) % FIRST.length]} ${LAST[(k * 3 + g) % LAST.length]}`, group, ...(k % 11 === 5 ? { diet: k % 2 ? "vegetariano" : "sin gluten" } : {}) });
    }
    g++;
  }
  return out;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const db = drizzle({ client: pool });

async function main() {
  const [place] = await db
    .select({ id: venue.id, name: venue.name, plan: venue.plan })
    .from(venue)
    .where(or(eq(venue.slug, lugar), eq(venue.name, lugar)))
    .limit(1);
  if (!place?.plan) throw new Error(`No existe el lugar "${lugar}" o todavía no tiene plano para el diseñador.`);
  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, correo.toLowerCase())).limit(1);
  if (!u) throw new Error(`No existe la cuenta ${correo}.`);
  const [m] = await db.select({ orgId: membership.orgId }).from(membership).where(and(eq(membership.userId, u.id))).limit(1);
  if (!m) throw new Error(`${correo} no tiene negocio.`);

  const plan = place.plan as DesignerPlan;
  const levelId = plan.levels[0].id;
  const guests = birthdayGuests(GUESTS);
  const doc = (template: Template): DesignDoc => {
    const furniture = starterFurniture(plan, { guests: GUESTS, kind: "otro", template });
    const list = guests.map((x) => ({ ...x, table: undefined }));
    seatGuests(furniture, list);
    return { v: 1, levels: { [levelId]: { furniture, guestList: list } } };
  };
  const date = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10);
  const id = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(event)
      .values({ orgId: m.orgId, venueId: place.id, kind: "otro", title: TITLE, clientNames: "Mariana y familia", eventDate: date, guestCount: GUESTS })
      .returning({ id: event.id });
    await tx.insert(layout).values([
      { eventId: created.id, name: "A", note: "Mesas redondas con pista", recommended: true, position: 0, doc: doc("redondas"), updatedBy: u.id },
      { eventId: created.id, name: "B", note: "Una mesa imperial larga", recommended: false, position: 1, doc: doc("imperial"), updatedBy: u.id },
    ]);
    return created.id;
  });
  console.log(`Evento de muestra creado en ${place.name}: /eventos/${id} (${GUESTS} invitados, fecha ${date}, distribuciones A y B).`);
  await pool.end();
}

main().catch(async (error) => {
  console.error(error.message ?? error);
  await pool.end();
  process.exit(1);
});
