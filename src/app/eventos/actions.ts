"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getVenueForOrg, requireOrg, requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { event, layout } from "@/lib/db/schema";
import { EVENT_KINDS } from "@/lib/domain";
import { emptyHouseLayout, starterLayout } from "@/lib/layout/tools";

export type CreateEventState = { error?: string } | null;

const newEvent = z.object({
  title: z.string().trim().min(2).max(120),
  kind: z.enum(EVENT_KINDS),
  venueId: z.string().min(1),
  guestCount: z.coerce.number().int().min(1).max(2000),
  eventDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  clientNames: z.string().trim().max(160),
});

export async function createEvent(_prev: CreateEventState, formData: FormData): Promise<CreateEventState> {
  const user = await requireUser();
  const org = await requireOrg(user);
  const parsed = newEvent.safeParse({
    title: formData.get("title"),
    kind: formData.get("kind"),
    venueId: formData.get("venueId"),
    guestCount: formData.get("guestCount"),
    eventDate: formData.get("eventDate") ?? "",
    clientNames: formData.get("clientNames") ?? "",
  });
  if (!parsed.success) return { error: "Revisa los datos: nombre, tipo, salón e invitados son obligatorios." };
  const data = parsed.data;

  const found = await getVenueForOrg(org.id, data.venueId);
  if (!found) return { error: "Ese salón no está disponible para tu cuenta." };

  // Una casa (plantas importadas de CAD) arranca vacía para amueblarla; un salón, con mesas.
  const doc = found.spec.levels?.length
    ? emptyHouseLayout()
    : starterLayout(found.spec, { kind: data.kind, guests: data.guestCount });
  const eventId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(event)
      .values({
        orgId: org.id,
        venueId: found.id,
        kind: data.kind,
        title: data.title,
        clientNames: data.clientNames || null,
        eventDate: data.eventDate || null,
        guestCount: data.guestCount,
      })
      .returning({ id: event.id });
    await tx.insert(layout).values({ eventId: created.id, doc, updatedBy: user.id });
    return created.id;
  });
  redirect(`/eventos/${eventId}`);
}
