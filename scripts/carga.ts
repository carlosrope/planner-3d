// Prueba de carga local: N personas editando su evento a la vez (como los clientes con código) más
// visitantes anónimos en el catálogo y la demo. Mide latencias y errores contra un servidor de
// producción local (`npm run build && npx next start -p 3001`), usando la base de .env.local.
//
// Uso: BETTER_AUTH_URL=http://localhost:3001 npx next start -p 3001   (en otra terminal)
//      npx tsx --env-file=.env.local scripts/carga.ts [usuarios=100] [segundos=60] [origen=http://localhost:3001]
// Crea cuentas carga-<n>@planner3d.test con su evento en el Salón Demostración y las borra al final.
import { eq, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { event, layout, membership, organization, user, venue } from "../src/lib/db/schema";
import { starterDesign } from "../src/lib/designer/starter";
import type { DesignDoc } from "../src/lib/designer/types";

const USERS = Number(process.argv[2] ?? 100);
const SECONDS = Number(process.argv[3] ?? 60);
const ORIGIN = process.argv[4] ?? "http://localhost:3001";
const VISITORS = Math.round(USERS / 5);
const PASSWORD = "Carga-2026-prueba";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const db = drizzle({ client: pool });

type Sample = { kind: string; ms: number; status: number };
const samples: Sample[] = [];
const errors = new Map<string, number>();

async function timed(kind: string, fn: () => Promise<Response>) {
  const t0 = performance.now();
  try {
    const r = await fn();
    await r.arrayBuffer();
    samples.push({ kind, ms: performance.now() - t0, status: r.status });
    return r;
  } catch (e) {
    samples.push({ kind, ms: performance.now() - t0, status: 0 });
    errors.set(String(e), (errors.get(String(e)) ?? 0) + 1);
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Vu = { email: string; cookie: string; eventId: string; layoutId: string; revision: number; doc: DesignDoc };

/** Crea la cuenta por la API de Better Auth (como lo haría el navegador) y su evento directo en la base. */
async function prepare(n: number, plan: NonNullable<typeof venue.$inferSelect.plan>, venueId: string): Promise<Vu> {
  const email = `carga-${n}@planner3d.test`;
  const r = await fetch(`${ORIGIN}/api/auth/sign-up/email`, {
    method: "POST",
    // Cada cuenta "viene" de otra IP: el límite de peticiones de Better Auth es por IP (así será en producción).
    headers: { "content-type": "application/json", origin: ORIGIN, "x-forwarded-for": `10.${(n >> 8) & 255}.${n & 255}.1` },
    body: JSON.stringify({ name: `Carga ${n}`, email, password: PASSWORD }),
  });
  if (!r.ok) throw new Error(`sign-up ${email}: ${r.status} ${await r.text()}`);
  const cookie = r.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  const [m] = await db.select({ orgId: membership.orgId }).from(membership).where(eq(membership.userId, u.id));
  const doc = starterDesign(plan, { kind: "boda", guests: 150 + (n % 10) * 10 });
  const [ev] = await db
    .insert(event)
    .values({ orgId: m.orgId, venueId, kind: "boda", title: `Boda de carga ${n}`, guestCount: 180, eventDate: "2026-12-05" })
    .returning({ id: event.id });
  const [ly] = await db.insert(layout).values({ eventId: ev.id, name: "A", recommended: true, doc, updatedBy: u.id }).returning({ id: layout.id });
  return { email, cookie, eventId: ev.id, layoutId: ly.id, revision: 1, doc };
}

/** Una persona: abre su diseñador y guarda un cambio cada 1–2 s (host.js guarda 0.7 s después de cada movimiento). */
async function editor(vu: Vu, until: number) {
  await timed("abrir diseñador", () => fetch(`${ORIGIN}/eventos/${vu.eventId}`, { headers: { cookie: vu.cookie }, redirect: "manual" }));
  while (Date.now() < until) {
    const levelId = Object.keys(vu.doc.levels)[0];
    const level = vu.doc.levels[levelId];
    const f = level.furniture[Math.floor(Math.random() * level.furniture.length)];
    if (f) {
      f.cx += Math.round((Math.random() - 0.5) * 400);
      f.cy += Math.round((Math.random() - 0.5) * 400);
    }
    const r = await timed("guardar", () =>
      fetch(`${ORIGIN}/api/layouts/${vu.layoutId}`, {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: vu.cookie },
        body: JSON.stringify({ doc: vu.doc, revision: vu.revision }),
      }),
    );
    if (r?.ok) vu.revision += 1;
    await sleep(1000 + Math.random() * 1000);
  }
}

/** Un visitante: catálogo, ficha y 3D público, y la demo, cada 2–3 s. */
async function visitor(until: number) {
  const pages = ["/salones", "/lugares/salon-las-palmas", "/lugares/salon-las-palmas/3d", "/disenador/salon-demo"];
  while (Date.now() < until) {
    const p = pages[Math.floor(Math.random() * pages.length)];
    await timed(`visitante ${p}`, () => fetch(`${ORIGIN}${p}`, { redirect: "manual" }));
    await sleep(2000 + Math.random() * 1000);
  }
}

function report() {
  const kinds = [...new Set(samples.map((s) => s.kind))];
  const pct = (xs: number[], p: number) => xs[Math.min(xs.length - 1, Math.floor(xs.length * p))] ?? 0;
  console.log(`\n${USERS} personas editando + ${VISITORS} visitantes durante ${SECONDS} s contra ${ORIGIN}\n`);
  console.log("Petición".padEnd(36), "n".padStart(6), "ok".padStart(6), "p50".padStart(8), "p95".padStart(8), "máx".padStart(8));
  for (const k of kinds) {
    const xs = samples.filter((s) => s.kind === k);
    const ms = xs.map((s) => s.ms).sort((a, b) => a - b);
    const ok = xs.filter((s) => s.status >= 200 && s.status < 400).length;
    console.log(k.padEnd(36), String(xs.length).padStart(6), String(ok).padStart(6), `${pct(ms, 0.5).toFixed(0)} ms`.padStart(8), `${pct(ms, 0.95).toFixed(0)} ms`.padStart(8), `${ms[ms.length - 1].toFixed(0)} ms`.padStart(8));
  }
  const bad = samples.filter((s) => !(s.status >= 200 && s.status < 400));
  console.log(`\nTotal: ${samples.length} peticiones, ${(samples.length / SECONDS).toFixed(1)} por segundo; fallidas: ${bad.length}`);
  const byStatus = new Map<number, number>();
  for (const b of bad) byStatus.set(b.status, (byStatus.get(b.status) ?? 0) + 1);
  for (const [st, n] of byStatus) console.log(`  estado ${st || "sin respuesta"}: ${n}`);
  for (const [e, n] of errors) console.log(`  ${n}× ${e}`);
}

async function cleanup() {
  const orgs = await db
    .select({ orgId: membership.orgId })
    .from(membership)
    .innerJoin(user, eq(user.id, membership.userId))
    .where(like(user.email, "carga-%@planner3d.test"));
  for (const o of orgs) await db.delete(organization).where(eq(organization.id, o.orgId));
  await db.delete(user).where(like(user.email, "carga-%@planner3d.test"));
}

async function main() {
  const [salon] = await db.select({ id: venue.id, plan: venue.plan }).from(venue).where(eq(venue.name, "Salón Demostración"));
  if (!salon?.plan) throw new Error("Falta el Salón Demostración en la base (npm run db:seed).");
  await cleanup();
  console.log(`Preparando ${USERS} cuentas…`);
  const vus: Vu[] = [];
  for (let i = 0; i < USERS; i += 10) {
    vus.push(...(await Promise.all(Array.from({ length: Math.min(10, USERS - i) }, (_, k) => prepare(i + k + 1, salon.plan!, salon.id)))));
  }
  samples.length = 0;
  console.log(`Cargando durante ${SECONDS} s…`);
  const until = Date.now() + SECONDS * 1000;
  // Las personas entran escalonadas en los primeros 10 s, como en la vida real.
  await Promise.all([
    ...vus.map((vu, i) => sleep((i / USERS) * 10_000).then(() => editor(vu, until))),
    ...Array.from({ length: VISITORS }, (_, i) => sleep((i / VISITORS) * 10_000).then(() => visitor(until))),
  ]);
  report();
  await cleanup();
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(user).where(like(user.email, "carga-%@planner3d.test"));
  console.log(`\nCuentas de prueba borradas (quedan ${n}).`);
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await cleanup().catch(() => {});
  await pool.end();
  process.exit(1);
});
