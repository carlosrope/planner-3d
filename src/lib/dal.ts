import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, exists, gt, gte, inArray, isNotNull, isNull, like, ne, notInArray, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import {
  auditLog,
  catalogSuggestion,
  comment,
  event,
  layout,
  membership,
  organization,
  payment,
  referralCode,
  shareLink,
  user,
  venue,
  venueAccess,
  venueFile,
  venueInquiry,
} from "./db/schema";
import type { DesignerPlan } from "./designer/types";
import {
  ALL_SECTIONS,
  activeModules,
  changedFields,
  venueStatusAction,
  type AuditAction,
  type EventStatus,
  PLAN_MODULES,
  planEndAfterPayment,
  referralQuota,
  sectionOf,
  type OrgKind,
  type PaymentPeriod,
  type Plan,
  type Section,
  type Tier,
  TRASH_DAYS,
  type VenueKind,
  type VenueStatus,
} from "./domain";
import { monthStart, newReferralCode, referralCodeCandidates, referralLeft } from "./referrals";
import { FREE_ACCOUNT, orgValuesFor } from "./invites";
import { slugify, uniqueSlug } from "./slug";

import { TOKEN_CHARS } from "./tokens";
import { monthOf } from "./dates";
import type { Suggestion } from "./suggestion";
export const newToken = (length = 20) => Array.from(randomBytes(length), (b) => TOKEN_CHARS[b % TOKEN_CHARS.length]).join("");

// Capa de acceso a datos: toda lectura o escritura verifica aquí la sesión y los permisos.

export type CurrentUser = { id: string; name: string; email: string };

/** Quién hizo un cambio que queda en el rastro: un usuario con sesión, o una descripción (p. ej. el dueño con su enlace). */
export type Actor = CurrentUser | { label: string };
type Db = typeof db;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Agrega una línea al rastro (audit_log). Va dentro de la misma transacción que el cambio cuando la hay. */
async function audit(
  conn: Db | Tx,
  actor: Actor,
  action: AuditAction,
  target: { type: "payment" | "organization" | "venue" | "setting"; id: string; label: string },
  details: Record<string, unknown> = {},
) {
  await conn.insert(auditLog).values({
    actorUserId: "id" in actor ? actor.id : null,
    actor: "id" in actor ? actor.email : actor.label,
    action,
    targetType: target.type,
    targetId: target.id,
    targetLabel: target.label,
    details,
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  return s ? { id: s.user.id, name: s.user.name, email: s.user.email } : null;
}

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar");
  return user;
}

// Administración de Plantea: los correos de ADMIN_EMAILS (separados por coma).
const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
export const isAdmin = (user: CurrentUser) => adminEmails().includes(user.email.trim().toLowerCase());

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (!isAdmin(user)) redirect("/eventos");
  return user;
}

const orgFields = {
  id: organization.id,
  name: organization.name,
  kind: organization.kind,
  modules: organization.modules,
  plan: organization.plan,
  planEndsAt: organization.planEndsAt,
  tier: organization.tier,
  referralCodeId: organization.referralCodeId,
};
export type Org = Pick<typeof organization.$inferSelect, keyof typeof orgFields>;

/** Negocio principal del usuario; lo crea si por alguna razón no existe (con acceso completo). */
export async function requireOrg(user: CurrentUser): Promise<Org> {
  const [found] = await db
    .select(orgFields)
    .from(membership)
    .innerJoin(organization, eq(membership.orgId, organization.id))
    .where(eq(membership.userId, user.id))
    .orderBy(asc(membership.createdAt))
    .limit(1);
  if (found) return isAdmin(user) ? withAdminAccess(found) : found;
  // Sin negocio (no debería pasar): se crea sin plan, nunca con el acceso completo que trae el esquema por omisión.
  const [org] = await db.insert(organization).values({ name: user.name, ...orgValuesFor(FREE_ACCOUNT) }).returning(orgFields);
  await db.insert(membership).values({ orgId: org.id, userId: user.id, role: "owner" });
  return isAdmin(user) ? withAdminAccess(org) : org;
}

/**
 * La cuenta de la administración no es un cliente: siempre tiene salones y casas, sin vencimiento y sin tope de
 * códigos, para armar demos y probar. Se corrige sola si alguien le cambia el plan.
 */
async function withAdminAccess(org: Org): Promise<Org> {
  const full = { plan: "ambos" as const, modules: [...ALL_SECTIONS], planEndsAt: null, tier: "ilimitado" as const };
  const ok = org.plan === full.plan && org.planEndsAt === null && org.tier === full.tier && ALL_SECTIONS.every((s) => org.modules.includes(s));
  if (ok) return org;
  await db.update(organization).set(full).where(eq(organization.id, org.id));
  return { ...org, ...full };
}

/** Negocios de la administración (los de los correos de ADMIN_EMAILS): no cuentan en las métricas ni en la actividad de clientes. */
export async function adminOrgIds(): Promise<string[]> {
  const emails = adminEmails();
  if (!emails.length) return [];
  const rows = await db
    .selectDistinct({ id: membership.orgId })
    .from(membership)
    .innerJoin(user, eq(user.id, membership.userId))
    .where(inArray(sql`lower(${user.email})`, emails));
  return rows.map((r) => r.id);
}

/** La cuenta tiene activo el módulo de ese tipo de lugar (contratado y con el plan vigente). */
export const moduleActive = (org: { modules: Org["modules"]; planEndsAt: Org["planEndsAt"] }, venueKind: string) =>
  activeModules(org).includes(sectionOf(venueKind));

/** Membresía del usuario en el negocio dueño del evento, con lo que hace falta para verificar el módulo. */
const memberOfEventOrg = (userId: string) =>
  and(eq(membership.orgId, event.orgId), eq(membership.userId, userId));

// Papelera: lo que tiene deletedAt no existe para nadie salvo la propia papelera.
const venueAlive = isNull(venue.deletedAt);
const eventAlive = isNull(event.deletedAt);

const published = and(eq(venue.status, "publicado"), venueAlive);

/**
 * Lugares donde el negocio puede crear proyectos: los publicados del catálogo, los suyos (en cualquier estado),
 * los que le compartieron y, si entró con un código de referido, el lugar de ese código.
 */
const venueVisibleTo = (orgId: string) =>
  and(venueAlive, or(
    and(published, eq(venue.isPublic, true)),
    eq(venue.ownerOrgId, orgId),
    sql`exists (select 1 from referral_code rc join organization o on o.referral_code_id = rc.id where o.id = ${orgId} and rc.venue_id = venue.id)`,
    and(
      published,
      exists(
        db
          .select({ one: sql`1` })
          .from(venueAccess)
          .where(and(eq(venueAccess.venueId, venue.id), eq(venueAccess.orgId, orgId))),
      ),
    ),
  ));

export async function listVenues(orgId: string, onlyVenueId?: string | null) {
  return db
    .select({ id: venue.id, slug: venue.slug, name: venue.name, city: venue.city, kind: venue.kind })
    .from(venue)
    .where(and(venueVisibleTo(orgId), isNotNull(venue.plan), onlyVenueId ? eq(venue.id, onlyVenueId) : undefined))
    .orderBy(asc(venue.name));
}

/** Cuántos eventos tiene el negocio (todos, o solo los que siguen vivos: borrador o confirmado). */
/** Eventos del negocio: los activos (borrador o confirmado) o todos; con `withTrash`, también los de la papelera. */
export async function countEvents(orgId: string, onlyActive = false, withTrash = false) {
  const [row] = await db
    .select({ n: count() })
    .from(event)
    .where(and(eq(event.orgId, orgId), withTrash ? undefined : eventAlive, onlyActive ? eventActive : undefined));
  return Number(row?.n ?? 0);
}

const eventActive = or(eq(event.status, "borrador"), eq(event.status, "confirmado"));

/**
 * Cambia el estado de un evento del negocio del usuario. En el plan Personal no se puede volver a activar uno si ya
 * hay otro activo (un evento activo a la vez).
 */
export async function setEventStatus(eventId: string, userId: string, status: EventStatus) {
  const [row] = await db
    .select({ orgId: event.orgId, plan: organization.plan })
    .from(event)
    .innerJoin(organization, eq(organization.id, event.orgId))
    .where(and(eq(event.id, eventId), eventAlive, sql`exists (select 1 from membership m where m.org_id = ${event.orgId} and m.user_id = ${userId})`))
    .limit(1);
  if (!row) return { error: "No encontrado." as const };
  if (row.plan === "personal" && (status === "borrador" || status === "confirmado")) {
    const [other] = await db
      .select({ n: count() })
      .from(event)
      .where(and(eq(event.orgId, row.orgId), eventAlive, eventActive, ne(event.id, eventId)));
    if (Number(other?.n ?? 0) > 0) return { error: "El plan Personal incluye un evento activo a la vez." as const };
  }
  await db.update(event).set({ status }).where(eq(event.id, eventId));
  return { ok: true as const };
}

export async function getVenueForOrg(orgId: string, venueId: string) {
  const [found] = await db
    .select()
    .from(venue)
    .where(and(eq(venue.id, venueId), venueVisibleTo(orgId)))
    .limit(1);
  return found ?? null;
}

export async function listEvents(orgId: string) {
  return db
    .select({
      id: event.id,
      title: event.title,
      kind: event.kind,
      status: event.status,
      eventDate: event.eventDate,
      guestCount: event.guestCount,
      venueName: venue.name,
      venueKind: venue.kind,
    })
    .from(event)
    .innerJoin(venue, eq(event.venueId, venue.id))
    .where(and(eq(event.orgId, orgId), eventAlive, venueAlive))
    .orderBy(sql`${event.eventDate} asc nulls last`, desc(event.createdAt));
}

/** Evento, salón y sus distribuciones, solo si el usuario es miembro del negocio dueño y el módulo está activo. */
export async function getEditableEvent(eventId: string, userId: string) {
  const [row] = await db
    .select({ event, venue, org: { plan: organization.plan, modules: organization.modules, planEndsAt: organization.planEndsAt } })
    .from(event)
    .innerJoin(venue, eq(event.venueId, venue.id))
    .innerJoin(membership, memberOfEventOrg(userId))
    .innerJoin(organization, eq(organization.id, event.orgId))
    .where(and(eq(event.id, eventId), eventAlive, venueAlive))
    .limit(1);
  if (!row || !moduleActive(row.org, row.venue.kind)) return null;
  const layouts = await db
    .select()
    .from(layout)
    .where(eq(layout.eventId, eventId))
    .orderBy(asc(layout.position), asc(layout.createdAt));
  return layouts.length ? { ...row, layouts } : null;
}

/** El usuario puede editar el evento (y crear distribuciones en él): es miembro y el módulo está activo. */
export async function canEditEvent(eventId: string, userId: string) {
  const [row] = await db
    .select({ venueKind: venue.kind, modules: organization.modules, planEndsAt: organization.planEndsAt })
    .from(event)
    .innerJoin(venue, eq(event.venueId, venue.id))
    .innerJoin(membership, memberOfEventOrg(userId))
    .innerJoin(organization, eq(organization.id, event.orgId))
    .where(and(eq(event.id, eventId), eventAlive, venueAlive))
    .limit(1);
  return Boolean(row && moduleActive(row, row.venueKind));
}

/** El montaje existe y el usuario puede editarlo (miembro del negocio y módulo activo). */
/**
 * Si el usuario puede editar la distribución: "ok"; "plan" si es de su negocio pero el plan terminó (o no incluye ese
 * módulo); "none" si no existe, está en la papelera o no es de su negocio.
 */
export async function layoutAccess(layoutId: string, userId: string): Promise<"ok" | "plan" | "none"> {
  const [row] = await db
    .select({ venueKind: venue.kind, modules: organization.modules, planEndsAt: organization.planEndsAt })
    .from(layout)
    .innerJoin(event, eq(layout.eventId, event.id))
    .innerJoin(venue, eq(event.venueId, venue.id))
    .innerJoin(membership, memberOfEventOrg(userId))
    .innerJoin(organization, eq(organization.id, event.orgId))
    .where(and(eq(layout.id, layoutId), eventAlive, venueAlive))
    .limit(1);
  if (!row) return "none";
  return moduleActive(row, row.venueKind) ? "ok" : "plan";
}

export const canEditLayout = async (layoutId: string, userId: string) => (await layoutAccess(layoutId, userId)) === "ok";

/** Evento abierto con un enlace para compartir (solo lectura; no pide sesión). */
export async function getSharedEvent(token: string) {
  const [row] = await db
    .select({
      event,
      venue,
      firstLayoutId: shareLink.layoutId,
      /** Huella de la imagen de vista previa (cambia con la imagen; null si no hay): rompe el caché de WhatsApp. */
      previewVersion: sql<string | null>`substr(md5(${shareLink.preview}), 1, 8)`,
    })
    .from(shareLink)
    .innerJoin(event, eq(shareLink.eventId, event.id))
    .innerJoin(venue, eq(event.venueId, venue.id))
    .where(and(eq(shareLink.token, token), eventAlive, venueAlive, or(isNull(shareLink.expiresAt), gt(shareLink.expiresAt, new Date()))))
    .limit(1);
  if (!row) return null;
  const layouts = await db
    .select()
    .from(layout)
    .where(eq(layout.eventId, row.event.id))
    .orderBy(asc(layout.position), asc(layout.createdAt));
  return layouts.length ? { ...row, layouts } : null;
}

/** Datos de marca del negocio (para su página, el diseñador y el enlace del cliente). */
export async function getOrgBrand(orgId: string) {
  const [row] = await db
    .select({
      id: organization.id,
      name: organization.name,
      logoUrl: organization.logoUrl,
      brandColor: organization.brandColor,
      whatsapp: organization.whatsapp,
      language: organization.language,
    })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);
  return row ?? null;
}

/**
 * Marca que lleva el diseño de un negocio: la suya; si entró con código, la de quien se lo dio (el salón o la
 * planner); en el plan Personal, solo el nombre, sin logo ni color.
 */
export async function getEffectiveBrand(orgId: string) {
  const [org] = await db
    .select({ plan: organization.plan, referralCodeId: organization.referralCodeId })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);
  if (!org) return null;
  if (org.plan === "invitado" && org.referralCodeId) {
    const [code] = await db.select({ orgId: referralCode.orgId }).from(referralCode).where(eq(referralCode.id, org.referralCodeId)).limit(1);
    if (code) return getOrgBrand(code.orgId);
  }
  const own = await getOrgBrand(orgId);
  return own && org.plan === "personal" ? { ...own, logoUrl: null, brandColor: null } : own;
}

/** Imagen de vista previa de un enlace compartido (JPEG en data URL), si existe. */
export async function getSharePreview(token: string) {
  const [row] = await db
    .select({ preview: shareLink.preview })
    .from(shareLink)
    // Un evento en la papelera ya no muestra su vista previa.
    .innerJoin(event, and(eq(event.id, shareLink.eventId), eventAlive))
    .where(and(eq(shareLink.token, token), or(isNull(shareLink.expiresAt), gt(shareLink.expiresAt, new Date()))))
    .limit(1);
  return row?.preview ?? null;
}

/** Comentarios del cliente en todas las distribuciones de un evento (los más recientes primero). */
export async function listComments(eventId: string) {
  return db
    .select({
      id: comment.id,
      layoutId: comment.layoutId,
      objectId: comment.objectId,
      authorName: comment.authorName,
      body: comment.body,
      resolved: comment.resolved,
      createdAt: comment.createdAt,
    })
    .from(comment)
    .innerJoin(layout, eq(comment.layoutId, layout.id))
    .where(eq(layout.eventId, eventId))
    .orderBy(desc(comment.createdAt))
    .limit(300);
}

/** El comentario existe y el usuario puede editar su evento. */
export async function canEditComment(commentId: string, userId: string) {
  const [row] = await db
    .select({ id: comment.id })
    .from(comment)
    .innerJoin(layout, eq(comment.layoutId, layout.id))
    .innerJoin(event, eq(layout.eventId, event.id))
    .innerJoin(membership, and(eq(membership.orgId, event.orgId), eq(membership.userId, userId)))
    .where(eq(comment.id, commentId))
    .limit(1);
  return Boolean(row);
}

// ---------------------------------------------------------------------------
// Catálogo público de lugares (sin sesión)

// Subconsultas correlacionadas con nombres de tabla escritos a mano: en una consulta de una sola tabla,
// Drizzle quita el nombre de la tabla a las columnas dentro de sql`` y la referencia quedaría ambigua.

/** Portada del lugar (id del archivo) para la tarjeta y la ficha: la primera foto real y, si no hay, la vista 3D automática (render, position 1000+). */
const coverOf = sql<string | null>`(select vf.id from venue_file vf where vf.venue_id = venue.id and vf.kind in ('foto', 'render') order by vf.position asc, vf.created_at asc limit 1)`;
/** Si la portada es la vista 3D automática (para etiquetarla como tal y no hacerla pasar por foto). */
const coverIsRender = sql<boolean>`coalesce((select vf.kind = 'render' from venue_file vf where vf.venue_id = venue.id and vf.kind in ('foto', 'render') order by vf.position asc, vf.created_at asc limit 1), false)`;

const catalogFields = {
  id: venue.id,
  slug: venue.slug,
  name: venue.name,
  kind: venue.kind,
  city: venue.city,
  status: venue.status,
  isPublic: venue.isPublic,
  capacity: venue.capacity,
  areaM2: venue.areaM2,
  address: venue.address,
  description: venue.description,
  contactPhone: venue.contactPhone,
  ownerOrgId: venue.ownerOrgId,
  hasPlan: sql<boolean>`(${venue.plan} is not null)`,
  viewCount: venue.viewCount,
  cover: coverOf,
  coverIsRender,
};
export type CatalogVenue = Awaited<ReturnType<typeof listCatalog>>[number];

/** Lugares publicados y abiertos a todos, de un tipo; con ciudad (slug) se filtra por ella. */
export async function listCatalog(kind: VenueKind, citySlug?: string) {
  const rows = await db
    .select(catalogFields)
    .from(venue)
    .where(and(eq(venue.kind, kind), published, eq(venue.isPublic, true), isNotNull(venue.plan)))
    .orderBy(asc(venue.city), asc(venue.name));
  return citySlug ? rows.filter((v) => slugify(v.city) === citySlug) : rows;
}

/** Ciudades con lugares publicados de un tipo, con cuántos hay en cada una. */
export async function listCatalogCities(kind: VenueKind) {
  const rows = await db
    .select({ city: venue.city, total: count() })
    .from(venue)
    .where(and(eq(venue.kind, kind), published, eq(venue.isPublic, true), isNotNull(venue.plan)))
    .groupBy(venue.city)
    .orderBy(asc(venue.city));
  // "Los Mochis" y "Los mochis" son la misma ciudad: se juntan por su slug y se usa la forma más común.
  const bySlug = new Map<string, { city: string; slug: string; total: number; top: number }>();
  for (const r of rows) {
    const slug = slugify(r.city);
    const n = Number(r.total);
    const cur = bySlug.get(slug);
    if (!cur) bySlug.set(slug, { city: r.city, slug, total: n, top: n });
    else {
      cur.total += n;
      if (n > cur.top) Object.assign(cur, { city: r.city, top: n });
    }
  }
  return [...bySlug.values()].map(({ city, slug, total }) => ({ city, slug, total }));
}

const bySlugOrId = (slugOrId: string) => and(or(eq(venue.slug, slugOrId), eq(venue.id, slugOrId)), venueAlive);

const ownerBrandFields = {
  name: organization.name,
  logoUrl: organization.logoUrl,
  brandColor: organization.brandColor,
  whatsapp: organization.whatsapp,
};

/** Ficha pública de un lugar publicado (el enlace y el QR funcionan aunque no esté abierto a todas las planners). */
export async function getPublicVenue(slugOrId: string) {
  const [row] = await db
    .select({ venue: catalogFields, owner: ownerBrandFields })
    .from(venue)
    .leftJoin(organization, eq(organization.id, venue.ownerOrgId))
    .where(and(bySlugOrId(slugOrId), published))
    .limit(1);
  if (!row) return null;
  const photos = await listVenuePhotos(row.venue.id);
  return { ...row.venue, owner: row.owner?.name ? row.owner : null, photos };
}

/** Plano del diseñador de un lugar publicado, o del que se está revisando con su enlace privado. */
export async function getVenuePlanForView(slugOrId: string, reviewToken?: string | null) {
  const [row] = await db
    .select({ id: venue.id, slug: venue.slug, name: venue.name, kind: venue.kind, plan: venue.plan, contactPhone: venue.contactPhone, owner: ownerBrandFields })
    .from(venue)
    .leftJoin(organization, eq(organization.id, venue.ownerOrgId))
    .where(and(bySlugOrId(slugOrId), reviewToken ? or(published, eq(venue.reviewToken, reviewToken)) : published))
    .limit(1);
  return row?.plan ? { ...row, plan: row.plan, owner: row.owner?.name ? row.owner : null } : null;
}

/** Fotos del lugar y, al final, su portada automática (kind "render"). */
export async function listVenuePhotos(venueId: string) {
  return db
    .select({ id: venueFile.id, name: venueFile.name, kind: venueFile.kind })
    .from(venueFile)
    .where(and(eq(venueFile.venueId, venueId), sql`${venueFile.kind} in ('foto', 'render')`))
    .orderBy(asc(venueFile.position), asc(venueFile.createdAt));
}

/** Foto de un lugar (las fotos son públicas salvo en un lugar retirado). */
export async function getVenuePhoto(slugOrId: string, fileId: string) {
  const [row] = await db
    .select({ mimeType: venueFile.mimeType, data: venueFile.data })
    .from(venueFile)
    .innerJoin(venue, eq(venue.id, venueFile.venueId))
    .where(and(eq(venueFile.id, fileId), bySlugOrId(slugOrId), sql`${venueFile.kind} in ('foto', 'render')`, sql`${venue.status} <> 'retirado'`))
    .limit(1);
  return row ?? null;
}

/** Lo mínimo de un lugar en cualquier estado (página de gracias del alta, QR). */
export async function getVenueBasics(slugOrId: string) {
  const [row] = await db
    .select({ id: venue.id, slug: venue.slug, name: venue.name, kind: venue.kind, status: venue.status, hasPlan: sql<boolean>`(${venue.plan} is not null)`, cover: coverOf })
    .from(venue)
    .where(bySlugOrId(slugOrId))
    .limit(1);
  return row ?? null;
}

/** Comprueba que un enlace de revisión corresponde a ese lugar (la portada automática se guarda desde /revisar sin sesión). */
export async function venueMatchesReviewToken(venueId: string, token: string) {
  const [row] = await db
    .select({ id: venue.id })
    .from(venue)
    .where(and(eq(venue.id, venueId), eq(venue.reviewToken, token)))
    .limit(1);
  return Boolean(row);
}

export type RenderFile = { name: string; mimeType: string; data: Buffer };

/** Portada automática del lugar: la vista 3D y el plano 2D que captura el navegador al confirmarlo.
 * Reemplaza la anterior y va en position 1000+ para que las fotos reales sigan ganando. */
export async function setVenueRender(venueId: string, files: RenderFile[]) {
  return db.transaction(async (tx) => {
    const [v] = await tx.select({ slug: venue.slug }).from(venue).where(eq(venue.id, venueId)).limit(1);
    if (!v) return null;
    await tx.delete(venueFile).where(and(eq(venueFile.venueId, venueId), eq(venueFile.kind, "render")));
    const rows = await tx
      .insert(venueFile)
      .values(files.map((f, i) => ({ venueId, kind: "render" as const, name: f.name, mimeType: f.mimeType, size: f.data.length, data: f.data, position: 1000 + i })))
      .returning({ id: venueFile.id });
    return { slug: v.slug ?? venueId, ids: rows.map((r) => r.id) };
  });
}

/** Se abrió el 3D público del lugar. */
export async function bumpVenueViews(venueId: string) {
  await db.update(venue).set({ viewCount: sql`${venue.viewCount} + 1` }).where(eq(venue.id, venueId));
}

export type VenueIntake = {
  kind: VenueKind;
  name: string;
  city: string;
  address: string | null;
  capacity: number | null;
  areaM2: number | null;
  description: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  notes: string | null;
  /** El negocio dueño, si quien lo registra tiene cuenta de salón o desarrolladora. */
  ownerOrgId: string | null;
};
export type IntakeFile = { kind: "plano" | "foto"; name: string; mimeType: string; data: Buffer };

/** Alta de un lugar por su dueño: queda "en conversión" hasta que la administración arma el plano. */
/** La ciudad como ya está escrita en otro lugar (misma ciudad sin importar mayúsculas ni acentos), o limpia. */
async function canonicalCity(city: string) {
  const clean = city.trim().replace(/\s+/g, " ");
  const slug = slugify(clean);
  const rows = await db.selectDistinct({ city: venue.city }).from(venue).where(venueAlive);
  return rows.map((r) => r.city).find((c) => slugify(c) === slug) ?? clean;
}

export async function createVenueIntake(intake: VenueIntake, files: IntakeFile[]) {
  intake = { ...intake, city: await canonicalCity(intake.city) };
  const root = slugify(intake.name) || "lugar";
  const taken = await db.select({ slug: venue.slug }).from(venue).where(like(venue.slug, `${root}%`));
  const slug = uniqueSlug(intake.name, taken.map((t) => t.slug).filter((s): s is string => Boolean(s)));
  const reviewToken = newToken(24);
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(venue)
      .values({ ...intake, slug, status: "conversion", isPublic: true, reviewToken, spec: {} })
      .returning({ id: venue.id, slug: venue.slug });
    if (files.length) {
      await tx.insert(venueFile).values(
        files.map((f, position) => ({ venueId: created.id, kind: f.kind, name: f.name, mimeType: f.mimeType, size: f.data.length, data: f.data, position })),
      );
    }
    return { id: created.id, slug: created.slug ?? created.id, reviewToken };
  });
}

/** Lugar que el dueño revisa con su enlace privado (/revisar/[token]), en cualquier estado. */
export async function getVenueForReview(token: string) {
  if (!token) return null;
  const [row] = await db
    .select({ venue: catalogFields, reviewNotes: venue.reviewNotes, owner: ownerBrandFields })
    .from(venue)
    .leftJoin(organization, eq(organization.id, venue.ownerOrgId))
    .where(and(eq(venue.reviewToken, token), venueAlive))
    .limit(1);
  if (!row) return null;
  const photos = await listVenuePhotos(row.venue.id);
  return { ...row.venue, reviewNotes: row.reviewNotes, owner: row.owner?.name ? row.owner : null, photos };
}

/** El dueño confirma su lugar: se publica (si ya tiene plano). */
export async function confirmVenueReview(token: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(venue)
      .set({ status: "publicado", publishedAt: new Date(), reviewNotes: null })
      .where(and(eq(venue.reviewToken, token), venueAlive, isNotNull(venue.plan), eq(venue.status, "revision")))
      .returning({ id: venue.id, slug: venue.slug, name: venue.name, contactName: venue.contactName });
    if (!row) return null;
    await audit(tx, { label: `Dueño con su enlace de revisión${row.contactName ? ` (${row.contactName})` : ""}` }, "lugar_publicado", { type: "venue", id: row.id, label: row.name });
    return { id: row.id, slug: row.slug };
  });
}

/** El dueño pide correcciones: vuelve a conversión con sus notas. */
export async function requestVenueCorrections(token: string, notes: string) {
  const [row] = await db
    .update(venue)
    .set({ status: "conversion", reviewNotes: notes })
    .where(and(eq(venue.reviewToken, token), venueAlive, sql`${venue.status} in ('revision', 'conversion')`))
    .returning({ id: venue.id });
  return row ?? null;
}

/** Solicitud de informes desde la ficha pública; devuelve a quién avisar por WhatsApp. */
export async function createInquiry(
  venueId: string,
  data: { name: string; phone: string; eventDate: string | null; guests: number | null; message: string },
) {
  // Tope por día (no para siempre): un bot no deja al salón sin solicitudes.
  const [{ today: sent }] = await db
    .select({ today: count() })
    .from(venueInquiry)
    .where(and(eq(venueInquiry.venueId, venueId), gte(venueInquiry.createdAt, new Date(Date.now() - 86_400_000))));
  if (sent >= 100) return null;
  const [created] = await db.insert(venueInquiry).values({ venueId, ...data }).returning({ id: venueInquiry.id });
  return created;
}

// ---------------------------------------------------------------------------
// Panel del dueño (salón o desarrolladora): sus lugares, eventos ahí, solicitudes y planners invitadas

const eventsAt = sql<number>`(select count(*) from event e where e.venue_id = venue.id and e.deleted_at is null)`;
const pendingInquiriesAt = sql<number>`(select count(*) from venue_inquiry q where q.venue_id = venue.id and q.seen_at is null)`;

export async function listOwnedVenues(orgId: string) {
  const rows = await db
    .select({ ...catalogFields, reviewNotes: venue.reviewNotes, events: eventsAt, pendingInquiries: pendingInquiriesAt, createdAt: venue.createdAt })
    .from(venue)
    .where(and(eq(venue.ownerOrgId, orgId), venueAlive, sql`${venue.status} <> 'retirado'`))
    .orderBy(asc(venue.name));
  return rows.map((r) => ({ ...r, events: Number(r.events), pendingInquiries: Number(r.pendingInquiries) }));
}

/** Mes (hora de Los Mochis) en que cae un instante. */
const monthKey = (d: Date | string) => monthOf(new Date(d));

/** Un lugar del negocio con todo lo que muestra su panel. */
export async function getOwnedVenue(orgId: string, slugOrId: string) {
  const [found] = await db
    .select({
      ...catalogFields,
      reviewNotes: venue.reviewNotes,
      reviewToken: venue.reviewToken,
      contactName: venue.contactName,
      contactEmail: venue.contactEmail,
      notes: venue.notes,
      publishedAt: venue.publishedAt,
      createdAt: venue.createdAt,
    })
    .from(venue)
    .where(and(bySlugOrId(slugOrId), eq(venue.ownerOrgId, orgId)))
    .limit(1);
  if (!found) return null;
  // Reporte de 6 meses (el actual y 5 atrás), por mes de Los Mochis.
  const [y, mo] = monthOf(new Date()).split("-").map(Number);
  const monthKeys = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(y, mo - 1 - 5 + i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const [photos, files, events, inquiries, access] = await Promise.all([
    listVenuePhotos(found.id),
    db
      .select({ id: venueFile.id, kind: venueFile.kind, name: venueFile.name, size: venueFile.size })
      .from(venueFile)
      .where(eq(venueFile.venueId, found.id))
      .orderBy(asc(venueFile.kind), asc(venueFile.position)),
    db
      .select({
        id: event.id,
        kind: event.kind,
        eventDate: event.eventDate,
        guestCount: event.guestCount,
        status: event.status,
        createdAt: event.createdAt,
        orgName: organization.name,
        mine: sql<boolean>`(${event.orgId} = ${orgId})`,
      })
      .from(event)
      .innerJoin(organization, eq(organization.id, event.orgId))
      .where(and(eq(event.venueId, found.id), eventAlive))
      .orderBy(sql`${event.eventDate} desc nulls last`, desc(event.createdAt))
      .limit(100),
    db
      .select()
      .from(venueInquiry)
      .where(eq(venueInquiry.venueId, found.id))
      .orderBy(desc(venueInquiry.createdAt))
      .limit(100),
    db
      .select({ orgId: venueAccess.orgId, orgName: organization.name, since: venueAccess.createdAt })
      .from(venueAccess)
      .innerJoin(organization, eq(organization.id, venueAccess.orgId))
      .where(eq(venueAccess.venueId, found.id))
      .orderBy(asc(organization.name)),
  ]);
  // Reporte de los últimos 6 meses: eventos planeados ahí y solicitudes recibidas, por mes.
  const months = monthKeys.map((month) => ({ month, events: 0, inquiries: 0 }));
  const at = new Map(months.map((m) => [m.month, m]));
  for (const e of events) {
    const m = at.get(monthKey(e.createdAt));
    if (m) m.events += 1;
  }
  for (const q of inquiries) {
    const m = at.get(monthKey(q.createdAt));
    if (m) m.inquiries += 1;
  }
  return { ...found, photos, files, events, inquiries, access, months };
}

export async function markInquiriesSeen(orgId: string, venueId: string) {
  await db
    .update(venueInquiry)
    .set({ seenAt: new Date() })
    .where(
      and(
        eq(venueInquiry.venueId, venueId),
        isNull(venueInquiry.seenAt),
        exists(db.select({ one: sql`1` }).from(venue).where(and(eq(venue.id, venueId), eq(venue.ownerOrgId, orgId)))),
      ),
    );
}

/** El dueño invita a una planner (por el correo de su cuenta) a usar su lugar; devuelve el negocio invitado. */
export async function grantVenueAccess(orgId: string, venueId: string, email: string) {
  const [owned] = await db.select({ id: venue.id }).from(venue).where(and(eq(venue.id, venueId), eq(venue.ownerOrgId, orgId))).limit(1);
  if (!owned) return { error: "Ese lugar no es tuyo." as const };
  const [target] = await db
    .select({ orgId: membership.orgId, orgName: organization.name })
    .from(user)
    .innerJoin(membership, eq(membership.userId, user.id))
    .innerJoin(organization, eq(organization.id, membership.orgId))
    .where(eq(user.email, email.trim().toLowerCase()))
    .orderBy(asc(membership.createdAt))
    .limit(1);
  if (!target) return { error: "No hay ninguna cuenta con ese correo. Pídele que se registre primero." as const };
  if (target.orgId === orgId) return { error: "Ese correo es de tu propio negocio." as const };
  await db.insert(venueAccess).values({ venueId, orgId: target.orgId }).onConflictDoNothing();
  return { orgName: target.orgName };
}

export async function revokeVenueAccess(orgId: string, venueId: string, grantedOrgId: string) {
  const [owned] = await db.select({ id: venue.id }).from(venue).where(and(eq(venue.id, venueId), eq(venue.ownerOrgId, orgId))).limit(1);
  if (!owned) return false;
  await db.delete(venueAccess).where(and(eq(venueAccess.venueId, venueId), eq(venueAccess.orgId, grantedOrgId)));
  return true;
}

/** Plano del dueño (CAD, PDF o croquis) de su propio lugar, para que lo descargue o lo revise. */
export async function getOwnedVenueFile(orgId: string, fileId: string) {
  const [row] = await db
    .select({ name: venueFile.name, mimeType: venueFile.mimeType, data: venueFile.data })
    .from(venueFile)
    .innerJoin(venue, eq(venue.id, venueFile.venueId))
    .where(and(eq(venueFile.id, fileId), eq(venue.ownerOrgId, orgId)))
    .limit(1);
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Plan y pagos de la cuenta

export async function listPayments(orgId: string) {
  return db
    .select({
      id: payment.id,
      plan: payment.plan,
      period: payment.period,
      amount: payment.amount,
      status: payment.status,
      note: payment.note,
      createdAt: payment.createdAt,
      resolvedAt: payment.resolvedAt,
    })
    .from(payment)
    .where(eq(payment.orgId, orgId))
    .orderBy(desc(payment.createdAt))
    .limit(50);
}

export async function createPayment(
  orgId: string,
  data: { plan: Plan; tier: Tier; period: PaymentPeriod; amount: number; receipt: { name: string; mimeType: string; data: Buffer } },
) {
  const [{ pending }] = await db
    .select({ pending: count() })
    .from(payment)
    .where(and(eq(payment.orgId, orgId), eq(payment.status, "pendiente")));
  if (pending >= 3) return null;
  const [created] = await db
    .insert(payment)
    .values({
      orgId,
      plan: data.plan,
      tier: data.tier,
      period: data.period,
      amount: data.amount,
      receiptName: data.receipt.name,
      receiptType: data.receipt.mimeType,
      receipt: data.receipt.data,
    })
    .returning({ id: payment.id });
  return created;
}

// ---------------------------------------------------------------------------
// Códigos de referido

const referralFields = {
  id: referralCode.id,
  code: referralCode.code,
  venueId: referralCode.venueId,
  venueName: venue.name,
  venueSlug: venue.slug,
  guestName: referralCode.guestName,
  eventDate: referralCode.eventDate,
  usedAt: referralCode.usedAt,
  eventId: referralCode.eventId,
  createdAt: referralCode.createdAt,
};

/** Códigos que dio el negocio (todos, o solo los de un lugar), los más recientes primero. */
export async function listReferralCodes(orgId: string, venueId?: string) {
  return db
    .select(referralFields)
    .from(referralCode)
    .innerJoin(venue, eq(venue.id, referralCode.venueId))
    .where(and(eq(referralCode.orgId, orgId), venueId ? eq(referralCode.venueId, venueId) : undefined))
    .orderBy(desc(referralCode.createdAt))
    .limit(200);
}

/** Cuántos códigos puede dar todavía este mes (null = sin tope) y cuántos ya dio. */
export async function referralAllowance(org: Pick<Org, "id" | "kind" | "plan" | "tier" | "planEndsAt" | "modules">) {
  const quota = activeModules(org).length ? referralQuota(org) : 0;
  const [row] = await db
    .select({ n: count() })
    .from(referralCode)
    .where(and(eq(referralCode.orgId, org.id), gt(referralCode.createdAt, monthStart())));
  const used = Number(row?.n ?? 0);
  return { quota, used, left: referralLeft(quota, used) };
}

/** Genera un código para un cliente en un lugar que el negocio puede usar; respeta el tope del mes. */
export async function createReferralCode(org: Org, venueId: string, guestName: string, eventDate: string | null) {
  // Un código a la vez por negocio: dos clics al mismo tiempo no rebasan el tope del mes.
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"referral:" + org.id}))`);
    return createReferralCodeLocked(tx, org, venueId, guestName, eventDate);
  });
}

async function createReferralCodeLocked(tx: Tx, org: Org, venueId: string, guestName: string, eventDate: string | null) {
  const quota = activeModules(org).length ? referralQuota(org) : 0;
  const [given] = await tx
    .select({ n: count() })
    .from(referralCode)
    .where(and(eq(referralCode.orgId, org.id), gt(referralCode.createdAt, monthStart())));
  if (referralLeft(quota, Number(given?.n ?? 0)) === 0) return { error: "Ya diste todos los códigos de este mes." as const };
  const [place] = await tx
    .select({ id: venue.id, name: venue.name })
    .from(venue)
    .where(and(eq(venue.id, venueId), venueVisibleTo(org.id), isNotNull(venue.plan)))
    .limit(1);
  if (!place) return { error: "Ese lugar no está disponible para tu cuenta." as const };
  // Si el código generado ya existe (muy raro), se intenta otra vez.
  for (let i = 0; i < 5; i++) {
    const code = newReferralCode(place.name, (n) => new Uint8Array(randomBytes(n)));
    const [created] = await tx
      .insert(referralCode)
      .values({ code, orgId: org.id, venueId: place.id, guestName, eventDate })
      .onConflictDoNothing({ target: referralCode.code })
      .returning({ id: referralCode.id, code: referralCode.code });
    if (created) return { code: created.code };
  }
  return { error: "No se pudo generar el código. Intenta de nuevo." as const };
}

/** Un código sin usar, con su lugar y quién lo dio; null si no existe, ya se usó o el plan de quien lo dio terminó. */
export async function getReferralInvite(raw: string) {
  const codes = referralCodeCandidates(raw);
  if (!codes.length) return null;
  const [row] = await db
    .select({
      id: referralCode.id,
      code: referralCode.code,
      guestName: referralCode.guestName,
      eventDate: referralCode.eventDate,
      usedAt: referralCode.usedAt,
      venue: { id: venue.id, slug: venue.slug, name: venue.name, kind: venue.kind, status: venue.status },
      issuer: { id: organization.id, name: organization.name, kind: organization.kind, modules: organization.modules, planEndsAt: organization.planEndsAt },
    })
    .from(referralCode)
    .innerJoin(venue, eq(venue.id, referralCode.venueId))
    .innerJoin(organization, eq(organization.id, referralCode.orgId))
    .where(inArray(referralCode.code, codes))
    .limit(1);
  if (!row || row.usedAt || row.venue.status === "retirado") return null;
  if (!activeModules(row.issuer).includes(sectionOf(row.venue.kind))) return null;
  return row;
}

/** Marca el código como usado por la cuenta que acaba de crearse. */
export async function redeemReferralCode(codeId: string, orgId: string) {
  await db
    .update(referralCode)
    .set({ usedByOrgId: orgId, usedAt: new Date() })
    .where(and(eq(referralCode.id, codeId), isNull(referralCode.usedAt)));
}

/** El lugar y quien dio el código con el que entró la cuenta (plan "Con código"). */
export async function getReferralOrigin(org: Pick<Org, "plan" | "referralCodeId">) {
  if (org.plan !== "invitado" || !org.referralCodeId) return null;
  const [row] = await db
    .select({ venueId: venue.id, venueName: venue.name, venueSlug: venue.slug, venueKind: venue.kind, issuerName: organization.name, eventId: referralCode.eventId })
    .from(referralCode)
    .innerJoin(venue, eq(venue.id, referralCode.venueId))
    .innerJoin(organization, eq(organization.id, referralCode.orgId))
    .where(eq(referralCode.id, org.referralCodeId))
    .limit(1);
  return row ?? null;
}

/** Liga el evento que armó el cliente a su código. */
export async function attachReferralEvent(codeId: string, eventId: string) {
  await db.update(referralCode).set({ eventId }).where(and(eq(referralCode.id, codeId), isNull(referralCode.eventId)));
}

// ---------------------------------------------------------------------------
// Administración de Plantea (solo ADMIN_EMAILS; las páginas llaman antes a requireAdmin)

const ownerName = organization.name;

export async function adminListVenues() {
  const rows = await db
    .select({
      ...catalogFields,
      contactName: venue.contactName,
      reviewToken: venue.reviewToken,
      reviewNotes: venue.reviewNotes,
      ownerName,
      events: eventsAt,
      createdAt: venue.createdAt,
    })
    .from(venue)
    .leftJoin(organization, eq(organization.id, venue.ownerOrgId))
    .where(venueAlive)
    .orderBy(
      sql`case ${venue.status} when 'conversion' then 0 when 'revision' then 1 when 'publicado' then 2 else 3 end`,
      desc(venue.createdAt),
    );
  return rows.map((r) => ({ ...r, events: Number(r.events) }));
}

export async function adminGetVenue(id: string) {
  const [found] = await db
    .select({
      ...catalogFields,
      contactName: venue.contactName,
      contactEmail: venue.contactEmail,
      notes: venue.notes,
      reviewToken: venue.reviewToken,
      reviewNotes: venue.reviewNotes,
      publishedAt: venue.publishedAt,
      createdAt: venue.createdAt,
      deletedAt: venue.deletedAt,
      ownerName,
    })
    .from(venue)
    .leftJoin(organization, eq(organization.id, venue.ownerOrgId))
    .where(eq(venue.id, id))
    .limit(1);
  if (!found) return null;
  const files = await db
    .select({ id: venueFile.id, kind: venueFile.kind, name: venueFile.name, size: venueFile.size, mimeType: venueFile.mimeType })
    .from(venueFile)
    .where(eq(venueFile.venueId, id))
    .orderBy(asc(venueFile.kind), asc(venueFile.position));
  return { ...found, files };
}

export type AdminVenuePatch = Partial<{
  name: string;
  city: string;
  status: VenueStatus;
  isPublic: boolean;
  ownerOrgId: string | null;
  capacity: number | null;
  areaM2: number | null;
  address: string | null;
  description: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
}>;

/** Cambios de la administración a un lugar; al publicar se marca la fecha y al pasar a revisión se asegura el enlace del dueño. */
export async function adminUpdateVenue(id: string, patch: AdminVenuePatch, actor: Actor) {
  if (patch.city) patch = { ...patch, city: await canonicalCity(patch.city) };
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select({ name: venue.name, status: venue.status, isPublic: venue.isPublic, ownerOrgId: venue.ownerOrgId, hasPlan: isNotNull(venue.plan) })
      .from(venue)
      .where(eq(venue.id, id))
      .limit(1);
    if (!before) return null;
    // Sin plano no se publica: la ficha saldría y el 3D daría 404.
    if (patch.status === "publicado" && !before.hasPlan) patch = { ...patch, status: before.status };
    const extra: Partial<typeof venue.$inferInsert> = {};
    if (patch.status === "publicado" && before.status !== "publicado") extra.publishedAt = new Date();
    if (patch.status === "revision" || patch.status === "publicado") extra.reviewToken = sql`coalesce(${venue.reviewToken}, ${newToken(24)})` as unknown as string;
    const [row] = await tx
      .update(venue)
      .set({ ...patch, ...extra })
      .where(eq(venue.id, id))
      .returning({ id: venue.id, reviewToken: venue.reviewToken });
    // Al rastro: el estado, si se abre o cierra a todas las planners y el dueño (no los datos de la ficha).
    const changes = changedFields(before, { status: patch.status, isPublic: patch.isPublic, ownerOrgId: patch.ownerOrgId });
    if (Object.keys(changes).length) {
      await audit(tx, actor, changes.status ? venueStatusAction(patch.status!) : "lugar_estado", { type: "venue", id, label: patch.name ?? before.name }, changes);
    }
    return row ?? null;
  });
}

/** La administración carga el plano del diseñador (JSON de tools/cad-import): el lugar pasa a "por confirmar". */
export async function adminSetVenuePlan(id: string, plan: DesignerPlan) {
  const [row] = await db
    .update(venue)
    .set({
      plan,
      // Sin tipo en el JSON se queda el que tenía (una casa no pasa a salón).
      kind: plan.kind === "casa" ? "casa" : plan.kind === "salon" ? "salon" : sql`${venue.kind}`,
      // Publicado y retirado se quedan como están; lo demás pasa a "por confirmar".
      status: sql`case when ${venue.status} in ('publicado', 'retirado') then ${venue.status} else 'revision' end` as unknown as VenueStatus,
      reviewToken: sql`coalesce(${venue.reviewToken}, ${newToken(24)})` as unknown as string,
      version: sql`${venue.version} + 1`,
    })
    .where(eq(venue.id, id))
    .returning({ id: venue.id, slug: venue.slug, status: venue.status, reviewToken: venue.reviewToken });
  // La portada automática era del plano anterior: se borra para que se vuelva a capturar.
  if (row) await db.delete(venueFile).where(and(eq(venueFile.venueId, id), eq(venueFile.kind, "render")));
  return row ?? null;
}

export async function adminGetVenueFile(fileId: string) {
  const [row] = await db
    .select({ name: venueFile.name, mimeType: venueFile.mimeType, data: venueFile.data })
    .from(venueFile)
    .where(eq(venueFile.id, fileId))
    .limit(1);
  return row ?? null;
}

export async function adminDeleteVenueFile(fileId: string) {
  await db.delete(venueFile).where(eq(venueFile.id, fileId));
}

/** La administración agrega fotos o planos a un lugar (los que llegan por WhatsApp, o de los lugares de demostración). */
export async function adminAddVenueFiles(venueId: string, files: IntakeFile[]) {
  if (!files.length) return;
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${venueFile.position}), -1) + 1` })
    .from(venueFile)
    .where(eq(venueFile.venueId, venueId));
  await db.insert(venueFile).values(
    files.map((f, i) => ({ venueId, kind: f.kind, name: f.name, mimeType: f.mimeType, size: f.data.length, data: f.data, position: Number(next) + i })),
  );
}

/** Todas las cuentas con sus correos, plan y uso. */
export async function adminListOrgs() {
  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      kind: organization.kind,
      plan: organization.plan,
      modules: organization.modules,
      planEndsAt: organization.planEndsAt,
      whatsapp: organization.whatsapp,
      createdAt: organization.createdAt,
      emails: sql<string>`(select coalesce(string_agg(u.email, ', ' order by m.created_at), '') from membership m join "user" u on u.id = m.user_id where m.org_id = organization.id)`,
      tier: organization.tier,
      referralCodeId: organization.referralCodeId,
      events: sql<number>`(select count(*) from event e where e.org_id = organization.id)`,
      referrals: sql<number>`(select count(*) from referral_code rc where rc.org_id = organization.id)`,
      venues: sql<number>`(select count(*) from venue v where v.owner_org_id = organization.id)`,
      pendingPayments: sql<number>`(select count(*) from payment p where p.org_id = organization.id and p.status = 'pendiente')`,
    })
    .from(organization)
    .orderBy(desc(organization.createdAt));
  return rows.map((r) => ({ ...r, events: Number(r.events), venues: Number(r.venues), pendingPayments: Number(r.pendingPayments), referrals: Number(r.referrals) }));
}

export async function adminUpdateOrg(
  orgId: string,
  patch: { kind: OrgKind; plan: Plan; modules: Section[]; planEndsAt: Date | null; tier: Tier },
  actor: Actor,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select({ name: organization.name, kind: organization.kind, plan: organization.plan, modules: organization.modules, planEndsAt: organization.planEndsAt, tier: organization.tier })
      .from(organization)
      .where(eq(organization.id, orgId))
      .limit(1);
    if (!before) return null;
    const [row] = await tx.update(organization).set(patch).where(eq(organization.id, orgId)).returning({ id: organization.id });
    const changes = changedFields(before, patch);
    if (Object.keys(changes).length) await audit(tx, actor, "plan_cambiado", { type: "organization", id: orgId, label: before.name }, changes);
    return row ?? null;
  });
}

export async function adminListPayments() {
  return db
    .select({
      id: payment.id,
      orgId: payment.orgId,
      orgName: organization.name,
      plan: payment.plan,
      tier: payment.tier,
      period: payment.period,
      amount: payment.amount,
      status: payment.status,
      note: payment.note,
      receiptName: payment.receiptName,
      createdAt: payment.createdAt,
      resolvedAt: payment.resolvedAt,
      planEndsAt: organization.planEndsAt,
    })
    .from(payment)
    .innerJoin(organization, eq(organization.id, payment.orgId))
    .orderBy(sql`case ${payment.status} when 'pendiente' then 0 else 1 end`, desc(payment.createdAt))
    .limit(200);
}

export async function adminGetReceipt(paymentId: string) {
  const [row] = await db
    .select({ name: payment.receiptName, mimeType: payment.receiptType, data: payment.receipt })
    .from(payment)
    .where(eq(payment.id, paymentId))
    .limit(1);
  return row ?? null;
}

/** Confirmar un pago activa el plan (y lo alarga un mes o un año); rechazarlo solo deja la nota. */
export async function adminResolvePayment(paymentId: string, status: "confirmado" | "rechazado", note: string | null, actor: Actor) {
  return db.transaction(async (tx) => {
    const [p] = await tx
      .update(payment)
      .set({ status, note, resolvedAt: new Date() })
      .where(and(eq(payment.id, paymentId), eq(payment.status, "pendiente")))
      .returning({ orgId: payment.orgId, plan: payment.plan, tier: payment.tier, period: payment.period, amount: payment.amount });
    if (!p) return null;
    const [org] = await tx
      .select({ name: organization.name, plan: organization.plan, planEndsAt: organization.planEndsAt })
      .from(organization)
      .where(eq(organization.id, p.orgId))
      .limit(1);
    const details: Record<string, unknown> = { monto: p.amount, plan: p.plan, nivel: p.tier, periodo: p.period, nota: note, negocio: org?.name };
    if (status === "confirmado") {
      const planEndsAt = planEndAfterPayment(org?.planEndsAt ?? null, p.period);
      await tx
        .update(organization)
        .set({
          plan: p.plan,
          modules: p.plan === "prueba" || p.plan === "invitado" || p.plan === "libre" ? undefined : [...PLAN_MODULES[p.plan]],
          // El nivel que pagó (Pro o Ilimitado): con Ilimitado, los códigos no tienen tope.
          tier: p.tier,
          planEndsAt,
        })
        .where(eq(organization.id, p.orgId));
      details.planAntes = org?.plan;
      details.finAntes = org?.planEndsAt?.toISOString() ?? null;
      details.finDespues = planEndsAt.toISOString();
    }
    await audit(tx, actor, status === "confirmado" ? "pago_confirmado" : "pago_rechazado", { type: "payment", id: paymentId, label: org?.name ?? p.orgId }, details);
    return p;
  });
}

// ---------------------------------------------------------------------------
// Papelera (borrado suave): eventos y lugares se ocultan con deletedAt y se borran de verdad a los 30 días.

const trashCutoff = () => new Date(Date.now() - TRASH_DAYS * 86_400_000);

/** Borra de verdad lo que lleva más de 30 días en la papelera (se llama al abrir una papelera). */
export async function purgeTrash() {
  const cutoff = trashCutoff();
  await db.delete(event).where(and(isNotNull(event.deletedAt), sql`${event.deletedAt} < ${cutoff}`));
  // Un lugar solo se borra si ya no le queda ningún evento (la llave de event.venue_id es restrict).
  await db
    .delete(venue)
    .where(and(isNotNull(venue.deletedAt), sql`${venue.deletedAt} < ${cutoff}`, sql`not exists (select 1 from event e where e.venue_id = venue.id)`));
}

/** El miembro de un negocio manda su evento a la papelera. */
export async function trashEvent(eventId: string, userId: string) {
  const [row] = await db
    .update(event)
    .set({ deletedAt: new Date() })
    .where(and(eq(event.id, eventId), eventAlive, sql`exists (select 1 from membership m where m.org_id = event.org_id and m.user_id = ${userId})`))
    .returning({ id: event.id, title: event.title });
  return row ?? null;
}

/** Saca un evento de la papelera (solo el negocio dueño). */
export async function restoreEvent(eventId: string, userId: string) {
  // Los planes de un solo evento no se brincan con la papelera: Con código, si ya tiene otro; Personal, si ya tiene otro activo.
  const [target] = await db
    .select({ orgId: event.orgId, plan: organization.plan, status: event.status })
    .from(event)
    .innerJoin(organization, eq(organization.id, event.orgId))
    .where(eq(event.id, eventId))
    .limit(1);
  if (target?.plan === "invitado" && (await countEvents(target.orgId)) > 0) return null;
  if (target?.plan === "personal" && (target.status === "borrador" || target.status === "confirmado") && (await countEvents(target.orgId, true)) > 0) return null;
  const [row] = await db
    .update(event)
    .set({ deletedAt: null })
    .where(and(eq(event.id, eventId), isNotNull(event.deletedAt), sql`exists (select 1 from membership m where m.org_id = event.org_id and m.user_id = ${userId})`))
    .returning({ id: event.id });
  return row ?? null;
}

/** Eventos del negocio en la papelera (más recientes primero). */
export async function listTrashedEvents(orgId: string) {
  await purgeTrash();
  return db
    .select({ id: event.id, title: event.title, venueName: venue.name, deletedAt: event.deletedAt })
    .from(event)
    .innerJoin(venue, eq(event.venueId, venue.id))
    .where(and(eq(event.orgId, orgId), isNotNull(event.deletedAt)))
    .orderBy(desc(event.deletedAt));
}

/** La administración manda un lugar a la papelera o lo saca de ella. */
export async function adminTrashVenue(id: string, trashed: boolean, actor: Actor) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(venue)
      .set({ deletedAt: trashed ? new Date() : null })
      .where(and(eq(venue.id, id), trashed ? venueAlive : isNotNull(venue.deletedAt)))
      .returning({ id: venue.id, name: venue.name });
    if (row) await audit(tx, actor, trashed ? "lugar_papelera" : "lugar_restaurado", { type: "venue", id, label: row.name });
    return row ?? null;
  });
}

/** Rastro para /admin/rastro: lo más reciente primero. */
export async function adminListAudit(limit = 300) {
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
}

/** La administración saca de la papelera el evento de cualquier negocio. */
export async function adminRestoreEvent(eventId: string) {
  const [row] = await db.update(event).set({ deletedAt: null }).where(and(eq(event.id, eventId), isNotNull(event.deletedAt))).returning({ id: event.id });
  return row ?? null;
}

/** Papelera completa para /admin: lugares y eventos de todas las cuentas. */
export async function adminListTrash() {
  await purgeTrash();
  const [venues, events] = await Promise.all([
    db
      .select({ id: venue.id, name: venue.name, city: venue.city, kind: venue.kind, deletedAt: venue.deletedAt })
      .from(venue)
      .where(isNotNull(venue.deletedAt))
      .orderBy(desc(venue.deletedAt)),
    db
      .select({ id: event.id, title: event.title, orgName: organization.name, venueName: venue.name, deletedAt: event.deletedAt })
      .from(event)
      .innerJoin(organization, eq(organization.id, event.orgId))
      .innerJoin(venue, eq(venue.id, event.venueId))
      .where(isNotNull(event.deletedAt))
      .orderBy(desc(event.deletedAt)),
  ]);
  return { venues, events };
}

// ---------------------------------------------------------------------------
// Actividad de las cuentas (/admin/actividad)

/** Una persona abrió el enlace de solo vista (la ruta ya descartó los robots de vista previa). */
export async function bumpShareView(token: string) {
  await db
    .update(shareLink)
    .set({ viewCount: sql`${shareLink.viewCount} + 1`, lastViewedAt: new Date() })
    .where(eq(shareLink.token, token));
}

/** Por cuenta: último inicio de sesión, eventos propios (sin los de ejemplo), última edición, enlaces y vistas. */
const notAdminOrg = (ids: string[]) => (ids.length ? notInArray(organization.id, ids) : undefined);

export async function adminListActivity() {
  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      kind: organization.kind,
      plan: organization.plan,
      planEndsAt: organization.planEndsAt,
      createdAt: organization.createdAt,
      emails: sql<string>`(select coalesce(string_agg(u.email, ', ' order by m.created_at), '') from membership m join "user" u on u.id = m.user_id where m.org_id = organization.id)`,
      lastLogin: sql<Date | null>`(select max(s.created_at) from session s join membership m on m.user_id = s.user_id where m.org_id = organization.id)`,
      ownEvents: sql<number>`(select count(*) from event e where e.org_id = organization.id and e.deleted_at is null and e.title not like '%(ejemplo)%' and e.title not like '%(muestra)%')`,
      sampleEvents: sql<number>`(select count(*) from event e where e.org_id = organization.id and e.deleted_at is null and (e.title like '%(ejemplo)%' or e.title like '%(muestra)%'))`,
      lastEdit: sql<Date | null>`(select max(l.updated_at) from layout l join event e on e.id = l.event_id where e.org_id = organization.id and e.deleted_at is null)`,
      shares: sql<number>`(select count(*) from share_link sl join event e on e.id = sl.event_id where e.org_id = organization.id and e.deleted_at is null)`,
      shareViews: sql<number>`(select coalesce(sum(sl.view_count), 0) from share_link sl join event e on e.id = sl.event_id where e.org_id = organization.id and e.deleted_at is null)`,
      lastShareView: sql<Date | null>`(select max(sl.last_viewed_at) from share_link sl join event e on e.id = sl.event_id where e.org_id = organization.id and e.deleted_at is null)`,
      comments: sql<number>`(select count(*) from comment c join layout l on l.id = c.layout_id join event e on e.id = l.event_id where e.org_id = organization.id and e.deleted_at is null)`,
    })
    .from(organization)
    .where(notAdminOrg(await adminOrgIds()))
    .orderBy(desc(organization.createdAt));
  const date = (v: Date | string | null) => (v ? new Date(v) : null);
  return rows.map((r) => ({
    ...r,
    lastLogin: date(r.lastLogin),
    lastEdit: date(r.lastEdit),
    lastShareView: date(r.lastShareView),
    ownEvents: Number(r.ownEvents),
    sampleEvents: Number(r.sampleEvents),
    shares: Number(r.shares),
    shareViews: Number(r.shareViews),
    comments: Number(r.comments),
  }));
}

/**
 * Piloto de salones fundadores (/admin/piloto): cada salón cuyo dueño está en plan de prueba, con lo que pasó en su
 * mes: solicitudes, códigos dados y usados, eventos que armaron sus clientes con esos códigos y las visitas de sus
 * familias. Las subconsultas llevan los nombres de tabla escritos a mano (venue.id, organization.id).
 */
export async function adminListPilot() {
  // Eventos que armaron en este salón las cuentas que entraron con uno de sus códigos.
  const fromClient = sql.raw(
    "event e where e.venue_id = venue.id and e.deleted_at is null and e.org_id in (select rc.used_by_org_id from referral_code rc where rc.venue_id = venue.id and rc.used_by_org_id is not null)",
  );
  const rows = await db
    .select({
      venueId: venue.id,
      name: venue.name,
      city: venue.city,
      slug: venue.slug,
      status: venue.status,
      publishedAt: venue.publishedAt,
      opens: venue.viewCount,
      orgId: organization.id,
      orgName: organization.name,
      planEndsAt: organization.planEndsAt,
      emails: sql<string>`(select coalesce(string_agg(u.email, ', ' order by m.created_at), '') from membership m join "user" u on u.id = m.user_id where m.org_id = organization.id)`,
      lastLogin: sql<Date | null>`(select max(s.created_at) from session s join membership m on m.user_id = s.user_id where m.org_id = organization.id)`,
      inquiries: sql<number>`(select count(*) from venue_inquiry vi where vi.venue_id = venue.id)`,
      inquiriesUnseen: sql<number>`(select count(*) from venue_inquiry vi where vi.venue_id = venue.id and vi.seen_at is null)`,
      lastInquiry: sql<Date | null>`(select max(vi.created_at) from venue_inquiry vi where vi.venue_id = venue.id)`,
      codesGiven: sql<number>`(select count(*) from referral_code rc where rc.venue_id = venue.id)`,
      codesThisMonth: sql<number>`(select count(*) from referral_code rc where rc.venue_id = venue.id and rc.created_at > ${monthStart().toISOString()})`,
      codesUsed: sql<number>`(select count(*) from referral_code rc where rc.venue_id = venue.id and rc.used_by_org_id is not null)`,
      ownerEvents: sql<number>`(select count(*) from event e where e.venue_id = venue.id and e.org_id = organization.id and e.deleted_at is null and e.title not like '%(ejemplo)%' and e.title not like '%(muestra)%')`,
      clientEvents: sql<number>`(select count(*) from ${fromClient})`,
      clientEdit: sql<Date | null>`(select max(l.updated_at) from layout l, ${fromClient} and e.id = l.event_id)`,
      clientShares: sql<number>`(select count(*) from share_link sl, ${fromClient} and e.id = sl.event_id)`,
      clientViews: sql<number>`(select coalesce(sum(sl.view_count), 0) from share_link sl, ${fromClient} and e.id = sl.event_id)`,
      clientLastView: sql<Date | null>`(select max(sl.last_viewed_at) from share_link sl, ${fromClient} and e.id = sl.event_id)`,
      clientComments: sql<number>`(select count(*) from comment c join layout l on l.id = c.layout_id, ${fromClient} and e.id = l.event_id)`,
    })
    .from(venue)
    .innerJoin(organization, eq(organization.id, venue.ownerOrgId))
    .where(and(eq(organization.plan, "prueba"), venueAlive))
    .orderBy(asc(venue.city), asc(venue.name));
  const date = (v: Date | string | null) => (v ? new Date(v) : null);
  const n = (v: number | string) => Number(v);
  return rows.map((r) => ({
    ...r,
    lastLogin: date(r.lastLogin),
    lastInquiry: date(r.lastInquiry),
    clientEdit: date(r.clientEdit),
    clientLastView: date(r.clientLastView),
    inquiries: n(r.inquiries),
    inquiriesUnseen: n(r.inquiriesUnseen),
    codesGiven: n(r.codesGiven),
    codesThisMonth: n(r.codesThisMonth),
    codesUsed: n(r.codesUsed),
    ownerEvents: n(r.ownerEvents),
    clientEvents: n(r.clientEvents),
    clientShares: n(r.clientShares),
    clientViews: n(r.clientViews),
    clientComments: n(r.clientComments),
  }));
}

/** Datos del resumen de /admin, sin las cuentas de la administración. Los cálculos van en admin-dashboard.ts. */
export async function adminDashboard() {
  const adminIds = await adminOrgIds();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const month = monthStart();
  const notAdminEvent = adminIds.length ? notInArray(event.orgId, adminIds) : undefined;
  const n = (v: number | string | null | undefined) => Number(v ?? 0);
  const [venues, orgs, payments, money, suggestions, recent, codesGiven, codesUsed, inquiries, linksViewed, events, pilot] = await Promise.all([
    db
      .select({ id: venue.id, name: venue.name, slug: venue.slug, status: venue.status, createdAt: venue.createdAt, updatedAt: venue.updatedAt, ownerOrgId: venue.ownerOrgId })
      .from(venue)
      .where(venueAlive),
    db
      .select({
        id: organization.id,
        name: organization.name,
        plan: organization.plan,
        planEndsAt: organization.planEndsAt,
        createdAt: organization.createdAt,
        paid: sql<boolean>`exists (select 1 from payment p where p.org_id = organization.id and p.status = 'confirmado')`,
      })
      .from(organization)
      .where(notAdminOrg(adminIds)),
    db
      .select({ id: payment.id, orgName: organization.name, amount: payment.amount, createdAt: payment.createdAt })
      .from(payment)
      .innerJoin(organization, eq(organization.id, payment.orgId))
      .where(eq(payment.status, "pendiente"))
      .orderBy(asc(payment.createdAt)),
    db
      .select({
        month: sql<number>`coalesce(sum(case when ${payment.resolvedAt} >= ${month.toISOString()} then ${payment.amount} else 0 end), 0)`,
        total: sql<number>`coalesce(sum(${payment.amount}), 0)`,
      })
      .from(payment)
      .where(and(eq(payment.status, "confirmado"), adminIds.length ? notInArray(payment.orgId, adminIds) : undefined)),
    db.select({ n: count() }).from(catalogSuggestion).where(isNull(catalogSuggestion.doneAt)),
    adminListAudit(8),
    db.select({ n: count() }).from(referralCode).where(gte(referralCode.createdAt, weekAgo)),
    db.select({ n: count() }).from(referralCode).where(gte(referralCode.usedAt, weekAgo)),
    db.select({ n: count() }).from(venueInquiry).where(gte(venueInquiry.createdAt, weekAgo)),
    db.select({ n: count() }).from(shareLink).where(gte(shareLink.lastViewedAt, weekAgo)),
    db
      .select({ n: count() })
      .from(event)
      .where(and(gte(event.createdAt, weekAgo), eventAlive, notAdminEvent, sql`${event.title} not like '%(ejemplo)%' and ${event.title} not like '%(muestra)%'`)),
    adminListPilot(),
  ]);
  return {
    venues,
    orgs: orgs.map((o) => ({ ...o, paid: Boolean(o.paid) })),
    payments,
    collectedMonth: n(money[0]?.month),
    collectedTotal: n(money[0]?.total),
    suggestionsOpen: n(suggestions[0]?.n),
    recent,
    week: {
      codesGiven: n(codesGiven[0]?.n),
      codesUsed: n(codesUsed[0]?.n),
      inquiries: n(inquiries[0]?.n),
      linksViewed: n(linksViewed[0]?.n),
      events: n(events[0]?.n),
      newAccounts: orgs.filter((o) => o.createdAt >= weekAgo).length,
    },
    pilot,
  };
}

/** Si a la persona ya se le abrió la guía del diseñador en algún proyecto (se guarda en su cuenta, no en el navegador). */
export async function hasSeenGuide(userId: string) {
  const [row] = await db.select({ at: user.guideSeenAt }).from(user).where(eq(user.id, userId)).limit(1);
  return !!row?.at;
}

/** Marca la guía como vista para la persona; la primera fecha se conserva. */
export async function markGuideSeen(userId: string) {
  await db.update(user).set({ guideSeenAt: new Date() }).where(and(eq(user.id, userId), isNull(user.guideSeenAt)));
}

/** Mensaje propio del negocio para mandar los códigos (null = el sugerido). */
export async function getReferralTemplate(orgId: string) {
  const [row] = await db.select({ t: organization.referralMessage }).from(organization).where(eq(organization.id, orgId)).limit(1);
  return row?.t ?? null;
}

/** Guarda el mensaje de los códigos de un negocio del que el usuario es miembro (null = volver al sugerido). */
export async function setReferralTemplate(orgId: string, userId: string, template: string | null) {
  await db
    .update(organization)
    .set({ referralMessage: template })
    .where(and(eq(organization.id, orgId), sql`exists (select 1 from membership m where m.org_id = ${orgId} and m.user_id = ${userId})`));
}

// ---------------------------------------------------------------------------
// Sugerencias del catálogo (sin cuenta: llegan del diseñador; se ven en /admin/sugerencias)

export async function createSuggestion(s: Suggestion) {
  const [row] = await db
    .insert(catalogSuggestion)
    .values({ term: s.termino, category: s.categoria, use: s.uso, eventKind: s.tipoEvento, venue: s.lugar, page: s.pagina })
    .returning({ id: catalogSuggestion.id });
  return row.id;
}

export async function markSuggestionEmailed(id: string, ok: boolean, error?: string) {
  await db.update(catalogSuggestion).set({ emailed: ok, emailError: ok ? null : (error ?? "sin detalle").slice(0, 200) }).where(eq(catalogSuggestion.id, id));
}

export async function adminListSuggestions() {
  return db.select().from(catalogSuggestion).orderBy(sql`${catalogSuggestion.doneAt} is not null`, desc(catalogSuggestion.createdAt)).limit(300);
}

export async function adminMarkSuggestion(id: string, done: boolean) {
  await db.update(catalogSuggestion).set({ doneAt: done ? new Date() : null }).where(eq(catalogSuggestion.id, id));
}
