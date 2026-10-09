import "server-only";
import { and, asc, desc, eq, exists, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import { event, layout, membership, organization, venue, venueAccess } from "./db/schema";

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
    .select({ id: venue.id, name: venue.name, city: venue.city })
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
    })
    .from(event)
    .innerJoin(venue, eq(event.venueId, venue.id))
    .where(eq(event.orgId, orgId))
    .orderBy(sql`${event.eventDate} asc nulls last`, desc(event.createdAt));
}

/** Evento, salón y primer montaje, solo si el usuario es miembro del negocio dueño. */
export async function getEditableEvent(eventId: string, userId: string) {
  const [row] = await db
    .select({ event, venue })
    .from(event)
    .innerJoin(venue, eq(event.venueId, venue.id))
    .innerJoin(membership, and(eq(membership.orgId, event.orgId), eq(membership.userId, userId)))
    .where(eq(event.id, eventId))
    .limit(1);
  if (!row) return null;
  const [first] = await db
    .select()
    .from(layout)
    .where(eq(layout.eventId, eventId))
    .orderBy(asc(layout.createdAt))
    .limit(1);
  return first ? { ...row, layout: first } : null;
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
