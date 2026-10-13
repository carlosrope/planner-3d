import "server-only";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import { account, membership, organization, session, user, verification } from "./db/schema";
import { FULL_ACCESS, orgValuesFor, parseInvites, type Invite } from "./invites";
import { lanOrigins } from "./lan";

const invites = parseInvites(process.env.SIGNUP_CODES, process.env.SIGNUP_CODE);
const inviteRequired = invites.size > 0;
/** Invitación de cada registro en curso, por correo, para crearle su negocio al terminar. */
const pendingInvites = new Map<string, Invite>();

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  hooks: {
    // Con SIGNUP_CODES o SIGNUP_CODE definidos, crear cuenta pide un código de invitación; el código decide
    // el tipo de negocio, el plan, los módulos y, en una prueba, cuándo vence.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email" || !inviteRequired) return;
      const invite = invites.get(ctx.headers?.get("x-invite-code")?.trim() ?? "");
      if (!invite) {
        throw new APIError("FORBIDDEN", { message: "Código de invitación inválido.", code: "INVALID_INVITE_CODE" });
      }
      const email = String((ctx.body as { email?: unknown } | undefined)?.email ?? "").trim().toLowerCase();
      if (email) pendingInvites.set(email, invite);
    }),
  },
  // En desarrollo se permite entrar desde el iPhone por la red local.
  trustedOrigins: process.env.NODE_ENV === "production" ? [] : lanOrigins(),
  databaseHooks: {
    user: {
      create: {
        // Cada cuenta nueva arranca con su propio negocio, con los módulos y el plan de su invitación.
        after: async (created) => {
          const email = created.email.trim().toLowerCase();
          const invite = pendingInvites.get(email) ?? FULL_ACCESS;
          pendingInvites.delete(email);
          const [org] = await db
            .insert(organization)
            .values({ name: created.name, ...orgValuesFor(invite) })
            .returning({ id: organization.id });
          await db.insert(membership).values({ orgId: org.id, userId: created.id, role: "owner" });
        },
      },
    },
  },
  plugins: [nextCookies()],
});
