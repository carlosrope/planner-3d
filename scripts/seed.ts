// Carga el salón de demostración y la casa Chardonnay como lugares públicos del catálogo.
// Uso: npm run db:seed
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { venue } from "../src/lib/db/schema";
import { DEMO_VENUE } from "../src/lib/layout/demo";
import { CHARDONNAY } from "../src/lib/layout/houses";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });
  for (const v of [DEMO_VENUE, CHARDONNAY]) {
    const [existing] = await db.select({ id: venue.id }).from(venue).where(eq(venue.name, v.name));
    if (existing) {
      await db.update(venue).set({ spec: v.spec, city: v.city }).where(eq(venue.id, existing.id));
      console.log(`Actualizado: ${v.name}`);
    } else {
      await db.insert(venue).values({ name: v.name, city: v.city, isPublic: true, spec: v.spec });
      console.log(`Creado: ${v.name}`);
    }
  }
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
