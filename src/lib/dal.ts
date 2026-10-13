import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, exists, gt, isNotNull, isNull, like, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import {
  comment,
  event,
  layout,
  membership,
  organization,
  payment,
  shareLink,
  user,
  venue,
  venueAccess,
  venueFile,
  venueInquiry,
} from "./db/schema";
import type { DesignerPlan } from "./designer/types";
import {
  activeModules,
  PLAN_MODULES,
  planEndAfterPayment,
  sectionOf,
  type OrgKind,
  type PaymentPeriod,
  type Plan,
  type Section,
  type VenueKind,
  type VenueStatus,
} from "./domain";
import { slugify, uniqueSlug } from "./slug";

/** Letras y dígitos que no se confunden al leerlos (sin I/l/1 ni O/0), para enlaces que se dictan. */
export const TOKEN_CHARS = "23456789abcdefghjkmnpqrstuvwxyz";
export const newToken = (length = 20) => Array.from(randomBytes(length), (b) => TOKEN_CHARS[b % TOKEN_CHARS.length]).join("");

// Capa de acceso a datos: toda lectura o escritura verifica aquí la sesión y los permisos.

export type CurrentUser = { id: string; name: string; email: string };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  return s ? { id: s.user.id, name: s.user.name, email: s.user.email } : null;
}

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar");
  return user;
}

// Administración de ProLink: los correos de ADMIN_EMAILS (separados por coma).
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
  if (found) return found;
  const [org] = await db.insert(organization).values({ name: user.name, kind: "planner" }).returning(orgFields);
  await db.insert(membership).values({ orgId: org.id, userId: user.id, role: "owner" });
  return org;
}

/** La cuenta tiene activo el módulo de ese tipo de lugar (contratado y con el plan vigente). */
export const moduleActive = (org: { modules: Org["modules"]; planEndsAt: Org["planEndsAt"] }, venueKind: string) =>
  activeModules(org).includes(sectionOf(venueKind));

/** Membresía del usuario en el negocio dueño del evento, con lo que hace falta para verificar el módulo. */
const memberOfEventOrg = (userId: string) =>
  and(eq(membership.orgId, event.orgId), eq(membership.userId, userId));

const published = eq(venue.status, "publicado");

/** Lugares donde el negocio puede crear proyectos: los publicados del catálogo, los suyos (en cualquier estado) y los que le compartieron. */
const venueVisibleTo = (orgId: string) =>
  or(
    and(published, eq(venue.isPublic, true)),
    eq(venue.ownerOrgId, orgId),
    and(
      published,
      exists(
        db
          .select({ one: sql`1` })
          .from(venueAccess)
          .where(and(eq(venueAccess.venueId, venue.id), eq(venueAccess.orgId, orgId))),
      ),
    ),
  );

export async function listVenues(orgId: string) {
  return db
    .select({ id: venue.id, slug: venue.slug, name: venue.name, city: venue.city, kind: venue.kind })
    .from(venue)
    .where(and(venueVisibleTo(orgId), isNotNull(venue.plan)))
    .orderBy(asc(venue.name));
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
    .where(eq(event.orgId, orgId))
    .orderBy(sql`${event.eventDate} asc nulls last`, desc(event.createdAt));
}

/** Evento, salón y sus distribuciones, solo si el usuario es miembro del negocio dueño y el módulo está activo. */
export async function getEditableEvent(eventId: string, userId: string) {
  const [row] = await db
    .select({ event, venue, org: { modules: organization.modules, planEndsAt: organization.planEndsAt } })
    .from(event)
    .innerJoin(venue, eq(event.venueId, venue.id))
    .innerJoin(membership, memberOfEventOrg(userId))
    .innerJoin(organization, eq(organization.id, event.orgId))
    .where(eq(event.id, eventId))
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
    .where(eq(event.id, eventId))
    .limit(1);
  return Boolean(row && moduleActive(row, row.venueKind));
}

/** El montaje existe y el usuario puede editarlo (miembro del negocio y módulo activo). */
export async function canEditLayout(layoutId: string, userId: string) {
  const [row] = await db
    .select({ venueKind: venue.kind, modules: organization.modules, planEndsAt: organization.planEndsAt })
    .from(layout)
    .innerJoin(event, eq(layout.eventId, event.id))
    .innerJoin(venue, eq(event.venueId, venue.id))
    .innerJoin(membership, memberOfEventOrg(userId))
    .innerJoin(organization, eq(organization.id, event.orgId))
    .where(eq(layout.id, layoutId))
    .limit(1);
  return Boolean(row && moduleActive(row, row.venueKind));
}

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
    .where(and(eq(shareLink.token, token), or(isNull(shareLink.expiresAt), gt(shareLink.expiresAt, new Date()))))
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
    })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);
  return row ?? null;
}

/** Imagen de vista previa de un enlace compartido (JPEG en data URL), si existe. */
export async function getSharePreview(token: string) {
  const [row] = await db
    .select({ preview: shareLink.preview })
    .from(shareLink)
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

/** Primera foto del lugar (id del archivo), para la tarjeta y la ficha. */
const coverOf = sql<string | null>`(select vf.id from venue_file vf where vf.venue_id = venue.id and vf.kind = 'foto' order by vf.position asc, vf.created_at asc limit 1)`;

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
  return rows.map((r) => ({ city: r.city, slug: slugify(r.city), total: Number(r.total) }));
}

const bySlugOrId = (slugOrId: string) => or(eq(venue.slug, slugOrId), eq(venue.id, slugOrId));

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

export async function listVenuePhotos(venueId: string) {
  return db
    .select({ id: venueFile.id, name: venueFile.name })
    .from(venueFile)
    .where(and(eq(venueFile.venueId, venueId), eq(venueFile.kind, "foto")))
    .orderBy(asc(venueFile.position), asc(venueFile.createdAt));
}

/** Foto de un lugar (las fotos son públicas salvo en un lugar retirado). */
export async function getVenuePhoto(slugOrId: string, fileId: string) {
  const [row] = await db
    .select({ mimeType: venueFile.mimeType, data: venueFile.data })
    .from(venueFile)
    .innerJoin(venue, eq(venue.id, venueFile.venueId))
    .where(and(eq(venueFile.id, fileId), bySlugOrId(slugOrId), eq(venueFile.kind, "foto"), sql`${venue.status} <> 'retirado'`))
    .limit(1);
  return row ?? null;
}

/** Lo mínimo de un lugar en cualquier estado (página de gracias del alta, QR). */
export async function getVenueBasics(slugOrId: string) {
  const [row] = await db
    .select({ id: venue.id, slug: venue.slug, name: venue.name, kind: venue.kind, status: venue.status, hasPlan: sql<boolean>`(${venue.plan} is not null)` })
    .from(venue)
    .where(bySlugOrId(slugOrId))
    .limit(1);
  return row ?? null;
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

/** Alta de un lugar por su dueño: queda "en conversión" hasta que ProLink arma el plano. */
export async function createVenueIntake(intake: VenueIntake, files: IntakeFile[]) {
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
    .where(eq(venue.reviewToken, token))
    .limit(1);
  if (!row) return null;
  const photos = await listVenuePhotos(row.venue.id);
  return { ...row.venue, reviewNotes: row.reviewNotes, owner: row.owner?.name ? row.owner : null, photos };
}

/** El dueño confirma su lugar: se publica (si ya tiene plano). */
export async function confirmVenueReview(token: string) {
  const [row] = await db
    .update(venue)
    .set({ status: "publicado", publishedAt: new Date(), reviewNotes: null })
    .where(and(eq(venue.reviewToken, token), isNotNull(venue.plan), sql`${venue.status} in ('revision', 'conversion')`))
    .returning({ id: venue.id, slug: venue.slug });
  return row ?? null;
}

/** El dueño pide correcciones: vuelve a conversión con sus notas. */
export async function requestVenueCorrections(token: string, notes: string) {
  const [row] = await db
    .update(venue)
    .set({ status: "conversion", reviewNotes: notes })
    .where(and(eq(venue.reviewToken, token), sql`${venue.status} in ('revision', 'conversion')`))
    .returning({ id: venue.id });
  return row ?? null;
}

/** Solicitud de informes desde la ficha pública; devuelve a quién avisar por WhatsApp. */
export async function createInquiry(
  venueId: string,
  data: { name: string; phone: string; eventDate: string | null; guests: number | null; message: string },
) {
  const [{ total }] = await db.select({ total: count() }).from(venueInquiry).where(eq(venueInquiry.venueId, venueId));
  if (total >= 2000) return null;
  const [created] = await db.insert(venueInquiry).values({ venueId, ...data }).returning({ id: venueInquiry.id });
  return created;
}

// ---------------------------------------------------------------------------
// Panel del dueño (salón o desarrolladora): sus lugares, eventos ahí, solicitudes y planners invitadas

const eventsAt = sql<number>`(select count(*) from event e where e.venue_id = venue.id)`;
const pendingInquiriesAt = sql<number>`(select count(*) from venue_inquiry q where q.venue_id = venue.id and q.seen_at is null)`;

export async function listOwnedVenues(orgId: string) {
  const rows = await db
    .select({ ...catalogFields, reviewNotes: venue.reviewNotes, events: eventsAt, pendingInquiries: pendingInquiriesAt, createdAt: venue.createdAt })
    .from(venue)
    .where(and(eq(venue.ownerOrgId, orgId), sql`${venue.status} <> 'retirado'`))
    .orderBy(asc(venue.name));
  return rows.map((r) => ({ ...r, events: Number(r.events), pendingInquiries: Number(r.pendingInquiries) }));
}

const monthKey = (d: Date | string) => {
  const date = new Date(d);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

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
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 5, 1);
  since.setUTCHours(0, 0, 0, 0);
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
      .where(eq(event.venueId, found.id))
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
  const months: { month: string; events: number; inquiries: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(since);
    d.setUTCMonth(d.getUTCMonth() + i);
    months.push({ month: monthKey(d), events: 0, inquiries: 0 });
  }
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
  data: { plan: Plan; period: PaymentPeriod; amount: number; receipt: { name: string; mimeType: string; data: Buffer } },
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
// Administración de ProLink (solo ADMIN_EMAILS; las páginas llaman antes a requireAdmin)

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

/** Cambios de ProLink a un lugar; al publicar se marca la fecha y al pasar a revisión se asegura el enlace del dueño. */
export async function adminUpdateVenue(id: string, patch: AdminVenuePatch) {
  const extra: Partial<typeof venue.$inferInsert> = {};
  if (patch.status === "publicado") extra.publishedAt = new Date();
  if (patch.status === "revision" || patch.status === "publicado") extra.reviewToken = sql`coalesce(${venue.reviewToken}, ${newToken(24)})` as unknown as string;
  const [row] = await db
    .update(venue)
    .set({ ...patch, ...extra })
    .where(eq(venue.id, id))
    .returning({ id: venue.id, reviewToken: venue.reviewToken });
  return row ?? null;
}

/** ProLink carga el plano del diseñador (JSON de tools/cad-import): el lugar pasa a "por confirmar". */
export async function adminSetVenuePlan(id: string, plan: DesignerPlan) {
  const [row] = await db
    .update(venue)
    .set({
      plan,
      kind: plan.kind === "casa" ? "casa" : "salon",
      status: sql`case when ${venue.status} = 'publicado' then 'publicado' else 'revision' end` as unknown as VenueStatus,
      reviewToken: sql`coalesce(${venue.reviewToken}, ${newToken(24)})` as unknown as string,
      version: sql`${venue.version} + 1`,
    })
    .where(eq(venue.id, id))
    .returning({ id: venue.id, slug: venue.slug, status: venue.status, reviewToken: venue.reviewToken });
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

/** ProLink agrega fotos o planos a un lugar (los que llegan por WhatsApp, o de los lugares de demostración). */
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
      events: sql<number>`(select count(*) from event e where e.org_id = organization.id)`,
      venues: sql<number>`(select count(*) from venue v where v.owner_org_id = organization.id)`,
      pendingPayments: sql<number>`(select count(*) from payment p where p.org_id = organization.id and p.status = 'pendiente')`,
    })
    .from(organization)
    .orderBy(desc(organization.createdAt));
  return rows.map((r) => ({ ...r, events: Number(r.events), venues: Number(r.venues), pendingPayments: Number(r.pendingPayments) }));
}

export async function adminUpdateOrg(
  orgId: string,
  patch: { kind: OrgKind; plan: Plan; modules: Section[]; planEndsAt: Date | null },
) {
  const [row] = await db.update(organization).set(patch).where(eq(organization.id, orgId)).returning({ id: organization.id });
  return row ?? null;
}

export async function adminListPayments() {
  return db
    .select({
      id: payment.id,
      orgId: payment.orgId,
      orgName: organization.name,
      plan: payment.plan,
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
export async function adminResolvePayment(paymentId: string, status: "confirmado" | "rechazado", note: string | null) {
  return db.transaction(async (tx) => {
    const [p] = await tx
      .update(payment)
      .set({ status, note, resolvedAt: new Date() })
      .where(and(eq(payment.id, paymentId), eq(payment.status, "pendiente")))
      .returning({ orgId: payment.orgId, plan: payment.plan, period: payment.period });
    if (!p) return null;
    if (status === "confirmado") {
      const [org] = await tx.select({ planEndsAt: organization.planEndsAt }).from(organization).where(eq(organization.id, p.orgId)).limit(1);
      await tx
        .update(organization)
        .set({
          plan: p.plan,
          modules: p.plan === "prueba" ? undefined : [...PLAN_MODULES[p.plan]],
          planEndsAt: planEndAfterPayment(org?.planEndsAt ?? null, p.period),
        })
        .where(eq(organization.id, p.orgId));
    }
    return p;
  });
}
