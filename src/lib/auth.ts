import "server-only";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import { and, eq, isNull } from "drizzle-orm";
import { account, membership, organization, referralCode, session, user, venue, verification } from "./db/schema";
import { activeModules, sectionOf } from "./domain";
import { FULL_ACCESS, orgValuesFor, parseInvites, referralInvite, type Invite } from "./invites";
import { normalizeReferralCode } from "./referrals";
import { lanOrigins } from "./lan";
import { passwordResetEmail, sendEmail } from "./email";

const invites = parseInvites(process.env.SIGNUP_CODES, process.env.SIGNUP_CODE);

/** Código de referido sin usar, de un lugar que sigue en el catálogo y de un negocio con el plan vigente. */
async function referralFor(raw: string): Promise<Invite | null> {
  const code = normalizeReferralCode(raw);
  if (!code) return null;
  const [row] = await db
    .select({
      id: referralCode.id,
      eventDate: referralCode.eventDate,
      usedAt: referralCode.usedAt,
      venueKind: venue.kind,
      venueStatus: venue.status,
      modules: organization.modules,
      planEndsAt: organization.planEndsAt,
    })
    .from(referralCode)
    .innerJoin(venue, eq(venue.id, referralCode.venueId))
    .innerJoin(organization, eq(organization.id, referralCode.orgId))
    .where(eq(referralCode.code, code))
    .limit(1);
  if (!row || row.usedAt || row.venueStatus === "retirado") return null;
  if (!activeModules(row).includes(sectionOf(row.venueKind))) return null;
  return referralInvite(row);
}
const inviteRequired = invites.size > 0;
/** Invitación de cada registro en curso, por correo, para crearle su negocio al terminar. */
const pendingInvites = new Map<string, Invite>();

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // "Olvidé mi contraseña": el enlace llega por correo (Resend) y dura una hora; en local se imprime en consola.
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(passwordResetEmail(user.email, user.name, url));
    },
    // Al cambiarla se cierran las demás sesiones abiertas.
    revokeSessionsOnPasswordReset: true,
  },
  // Límite de intentos por IP (Better Auth ya trae uno; aquí quedan explícitos los valores). En memoria: basta con
  // un solo servidor en Railway; se reinicia al desplegar. Activo en producción, o en local con AUTH_RATE_LIMIT=1.
  rateLimit: {
    enabled: process.env.NODE_ENV === "production" || process.env.AUTH_RATE_LIMIT === "1",
    window: 60,
    max: 100,
    customRules: {
      // 10 intentos de entrar cada 15 minutos por IP.
      "/sign-in/email": { window: 15 * 60, max: 10 },
      "/sign-up/email": { window: 60 * 60, max: 10 },
      "/request-password-reset": { window: 60 * 60, max: 5 },
      "/reset-password": { window: 15 * 60, max: 10 },
    },
  },
  hooks: {
    // Con SIGNUP_CODES o SIGNUP_CODE definidos, crear cuenta pide un código de invitación; el código decide
    // el tipo de negocio, el plan, los módulos y, en una prueba, cuándo vence.
    // Un código de referido (de un salón o una planner) también abre cuenta, con o sin SIGNUP_CODES.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const raw = ctx.headers?.get("x-invite-code")?.trim() ?? "";
      const invite = invites.get(raw) ?? (raw ? await referralFor(raw) : null) ?? (inviteRequired ? null : FULL_ACCESS);
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
          if (invite.referral) {
            await db
              .update(referralCode)
              .set({ usedByOrgId: org.id, usedAt: new Date() })
              .where(and(eq(referralCode.id, invite.referral.codeId), isNull(referralCode.usedAt)));
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
});
