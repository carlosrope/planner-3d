// Carga el salón de demostración como salón público del catálogo.
// Uso: npm run db:seed
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { venue } from "../src/lib/db/schema";
import { DEMO_VENUE } from "../src/lib/layout/demo";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });
  const [existing] = await db.select({ id: venue.id }).from(venue).where(eq(venue.name, DEMO_VENUE.name));
  if (existing) {
    await db.update(venue).set({ spec: DEMO_VENUE.spec, city: DEMO_VENUE.city }).where(eq(venue.id, existing.id));
    console.log(`Actualizado: ${DEMO_VENUE.name}`);
  } else {
    await db.insert(venue).values({
      name: DEMO_VENUE.name,
      city: DEMO_VENUE.city,
      isPublic: true,
      spec: DEMO_VENUE.spec,
    });
    console.log(`Creado: ${DEMO_VENUE.name}`);
  }
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
