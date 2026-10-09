import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import { account, membership, organization, session, user, verification } from "./db/schema";
import { lanOrigins } from "./lan";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  // En desarrollo se permite entrar desde el iPhone por la red local.
  trustedOrigins: process.env.NODE_ENV === "production" ? [] : lanOrigins(),
  databaseHooks: {
    user: {
      create: {
        // Cada cuenta nueva arranca con su propio negocio de planner.
        after: async (created) => {
          const [org] = await db
            .insert(organization)
            .values({ name: created.name, kind: "planner" })
            .returning({ id: organization.id });
          await db.insert(membership).values({ orgId: org.id, userId: created.id, role: "owner" });
        },
      },
    },
  },
  plugins: [nextCookies()],
});
