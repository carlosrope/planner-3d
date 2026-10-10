import "server-only";
import { and, asc, desc, eq, exists, gt, isNull, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import { comment, event, layout, membership, organization, shareLink, venue, venueAccess } from "./db/schema";

// Capa de acceso a datos: toda lectura o escritura verifica aquí la sesión y los permisos.

export type CurrentUser = { id: string; name: string; email: string };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  return s ? { id: s.user.id, name: s.user.name, email: s.user.email } : null;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
}

/** Negocio principal del usuario; lo crea si por alguna razón no existe. */
export async function requireOrg(user: CurrentUser) {
  const [found] = await db
    .select({ id: organization.id, name: organization.name, kind: organization.kind })
    .from(membership)
    .innerJoin(organization, eq(membership.orgId, organization.id))
    .where(eq(membership.userId, user.id))
    .orderBy(asc(membership.createdAt))
    .limit(1);
  if (found) return found;
  const [org] = await db
    .insert(organization)
    .values({ name: user.name, kind: "planner" })
    .returning({ id: organization.id, name: organization.name, kind: organization.kind });
  await db.insert(membership).values({ orgId: org.id, userId: user.id, role: "owner" });
  return org;
}

const venueVisibleTo = (orgId: string) =>
  or(
    eq(venue.isPublic, true),
    eq(venue.ownerOrgId, orgId),
    exists(
      db
        .select({ one: sql`1` })
        .from(venueAccess)
        .where(and(eq(venueAccess.venueId, venue.id), eq(venueAccess.orgId, orgId))),
    ),
  );

export async function listVenues(orgId: string) {
  return db
    .select({ id: venue.id, name: venue.name, city: venue.city, kind: venue.kind })
    .from(venue)
    .where(venueVisibleTo(orgId))
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

/** Evento, salón y sus distribuciones, solo si el usuario es miembro del negocio dueño. */
export async function getEditableEvent(eventId: string, userId: string) {
  const [row] = await db
    .select({ event, venue })
    .from(event)
    .innerJoin(venue, eq(event.venueId, venue.id))
    .innerJoin(membership, and(eq(membership.orgId, event.orgId), eq(membership.userId, userId)))
    .where(eq(event.id, eventId))
    .limit(1);
  if (!row) return null;
  const layouts = await db
    .select()
    .from(layout)
    .where(eq(layout.eventId, eventId))
    .orderBy(asc(layout.position), asc(layout.createdAt));
  return layouts.length ? { ...row, layouts } : null;
}

/** El usuario puede editar el evento (y crear distribuciones en él). */
export async function canEditEvent(eventId: string, userId: string) {
  const [row] = await db
    .select({ id: event.id })
    .from(event)
    .innerJoin(membership, and(eq(membership.orgId, event.orgId), eq(membership.userId, userId)))
    .where(eq(event.id, eventId))
    .limit(1);
  return Boolean(row);
}

/** El montaje existe y el usuario puede editarlo. */
export async function canEditLayout(layoutId: string, userId: string) {
  const [row] = await db
    .select({ id: layout.id })
    .from(layout)
    .innerJoin(event, eq(layout.eventId, event.id))
    .innerJoin(membership, and(eq(membership.orgId, event.orgId), eq(membership.userId, userId)))
    .where(eq(layout.id, layoutId))
    .limit(1);
  return Boolean(row);
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
