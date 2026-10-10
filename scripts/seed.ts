// Carga el salón de demostración y la casa Chardonnay como lugares públicos del catálogo.
// Uso: npm run db:seed
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { venue } from "../src/lib/db/schema";
import type { DesignerPlan } from "../src/lib/designer/types";

// Plano del diseñador de cada lugar (generado por tools/designer y tools/cad-import).
const plan = (file: string) => JSON.parse(readFileSync(new URL(`../src/designer/${file}`, import.meta.url), "utf8")) as DesignerPlan;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });
  // Para agregar un lugar: su plano en src/designer/ (salones/ o casas/) y una línea aquí.
  const places = [
    { name: "Salón Demostración", city: "Los Mochis", kind: "salon" as const, plan: plan("salones/salon-demo.json") },
    { name: "Casa Chardonnay", city: "Los Mochis", kind: "casa" as const, plan: plan("casas/chardonnay.json") },
  ];
  for (const v of places) {
    const [existing] = await db.select({ id: venue.id }).from(venue).where(eq(venue.name, v.name));
    if (existing) {
      await db.update(venue).set({ kind: v.kind, plan: v.plan, city: v.city }).where(eq(venue.id, existing.id));
      console.log(`Actualizado: ${v.name}`);
    } else {
      // spec ya no se usa (era del editor anterior); la columna es obligatoria
      await db.insert(venue).values({ name: v.name, kind: v.kind, city: v.city, isPublic: true, spec: {}, plan: v.plan });
      console.log(`Creado: ${v.name}`);
    }
  }
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
