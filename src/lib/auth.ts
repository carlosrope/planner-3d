import "server-only";
import { betterAuth } from "better-auth";
import { APIError, addOAuthServerContext, createAuthMiddleware, getOAuthState } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { account, membership, organization, referralCode, session, user, venue, verification } from "./db/schema";
import { activeModules, sectionOf } from "./domain";
import { FREE_ACCOUNT, FULL_ACCESS, orgValuesFor, parseInvites, referralInvite, type Invite } from "./invites";
import { referralCodeCandidates } from "./referrals";
import { lanOrigins } from "./lan";
import { passwordResetEmail, sendEmail } from "./email";
import { googleEnabled } from "./google";

/** plantea.com.mx, www y la dirección de Railway; AUTH_TRUSTED_ORIGINS (separados por coma) agrega otros. */
const publicOrigins = () => [
  "https://plantea.com.mx",
  "https://www.plantea.com.mx",
  "https://planner-3d-production.up.railway.app",
  ...(process.env.AUTH_TRUSTED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean),
];

const invites = parseInvites(process.env.SIGNUP_CODES, process.env.SIGNUP_CODE);

/** Código de referido sin usar, de un lugar que sigue en el catálogo y de un negocio con el plan vigente. */
async function referralFor(raw: string): Promise<Invite | null> {
  const codes = referralCodeCandidates(raw);
  if (!codes.length) return null;
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
    .where(inArray(referralCode.code, codes))
    .limit(1);
  if (!row || row.usedAt || row.venueStatus === "retirado") return null;
  if (!activeModules(row).includes(sectionOf(row.venueKind))) return null;
  return referralInvite(row);
}
const inviteRequired = invites.size > 0;
/**
 * La invitación de un registro: con código, la de ese código (de SIGNUP_CODES o de referido; null si no sirve, para avisarle);
 * sin código, una cuenta sin plan (en producción) o acceso completo (en desarrollo sin códigos definidos).
 */
const inviteFor = async (raw: string): Promise<Invite | null> =>
  raw ? (invites.get(raw) ?? (await referralFor(raw))) : inviteRequired || process.env.NODE_ENV === "production" ? FREE_ACCOUNT : FULL_ACCESS;
/** Invitación de cada registro en curso, por correo, para crearle su negocio al terminar. */
const pendingInvites = new Map<string, Invite>();

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  // Continuar con Google (GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Railway). Quien entra con Google por primera vez
  // queda con cuenta sin plan; si viene de Crear cuenta con un código, se valida antes de ir a Google.
  socialProviders: googleEnabled()
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!.trim(),
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
          prompt: "select_account",
          // Cuentas nuevas solo desde Crear cuenta (requestSignUp); Entrar con Google solo abre las que ya existen.
          disableImplicitSignUp: true,
          // Sin la entrada directa con un token de Google: todas pasan por la redirección, donde viaja el código.
          disableIdTokenSignIn: true,
        },
      }
    : {},
  // Quien ya tiene cuenta con correo y entra con Google del mismo correo queda en la misma cuenta.
  account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
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
    // Con Google, el código se valida al pedir crear la cuenta y viaja en el estado de OAuth (no lo puede cambiar el
    // navegador); al volver de Google, databaseHooks.user.create lo vuelve a validar.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/social") {
        const raw = ctx.headers?.get("x-invite-code")?.trim() ?? "";
        if (!raw) return;
        if (!(await inviteFor(raw))) {
          throw new APIError("FORBIDDEN", { message: "Código de invitación inválido.", code: "INVALID_INVITE_CODE" });
        }
        await addOAuthServerContext({ inviteCode: raw });
        return;
      }
      if (ctx.path !== "/sign-up/email") return;
      const raw = ctx.headers?.get("x-invite-code")?.trim() ?? "";
      const invite = await inviteFor(raw);
      if (!invite) {
        throw new APIError("FORBIDDEN", { message: "Código de invitación inválido.", code: "INVALID_INVITE_CODE" });
      }
      const email = String((ctx.body as { email?: unknown } | undefined)?.email ?? "").trim().toLowerCase();
      if (email) pendingInvites.set(email, invite);
    }),
  },
  // En desarrollo se permite entrar desde el iPhone por la red local.
  // Dominios desde los que se puede entrar: el principal (BETTER_AUTH_URL) y los demás de Plantea, para que el
  // inicio de sesión funcione igual en plantea.com.mx y en la dirección de Railway (enlaces y QR viejos).
  trustedOrigins: process.env.NODE_ENV === "production" ? publicOrigins() : lanOrigins(),
  databaseHooks: {
    user: {
      create: {
        // Cuenta nueva desde Google: con el código que se validó al pedirla, o sin plan si llegó sin código.
        before: async (created) => {
          const state = await getOAuthState();
          if (!state) return;
          const raw = typeof state.serverContext?.inviteCode === "string" ? state.serverContext.inviteCode : "";
          // Si el código dejó de servir mientras estaba en Google, la cuenta nace sin plan en lugar de perderse.
          const invite = (await inviteFor(raw)) ?? FREE_ACCOUNT;
          pendingInvites.set(created.email.trim().toLowerCase(), invite);
        },
        // Cada cuenta nueva arranca con su propio negocio, con los módulos y el plan de su invitación. Si por algún
        // camino no hay invitación, nace sin plan (nunca con acceso completo).
        after: async (created) => {
          const email = created.email.trim().toLowerCase();
          const invite = pendingInvites.get(email) ?? FREE_ACCOUNT;
          pendingInvites.delete(email);
          await db.transaction(async (tx) => {
            // El código de referido se aparta primero: si dos personas se registran a la vez con el mismo, solo
            // una se lo queda; la otra entra sin plan (y puede pedir otro código).
            const claimed = invite.referral
              ? await tx
                  .update(referralCode)
                  .set({ usedAt: new Date() })
                  .where(and(eq(referralCode.id, invite.referral.codeId), isNull(referralCode.usedAt)))
                  .returning({ id: referralCode.id })
              : [];
            const final = invite.referral && !claimed.length ? FREE_ACCOUNT : invite;
            const [org] = await tx
              .insert(organization)
              .values({ name: created.name, ...orgValuesFor(final) })
              .returning({ id: organization.id });
            await tx.insert(membership).values({ orgId: org.id, userId: created.id, role: "owner" });
            if (claimed.length) await tx.update(referralCode).set({ usedByOrgId: org.id }).where(eq(referralCode.id, claimed[0].id));
          });
        },
      },
    },
  },
  plugins: [nextCookies()],
});
