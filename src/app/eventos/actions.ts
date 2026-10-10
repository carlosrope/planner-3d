"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getVenueForOrg, requireOrg, requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { event, layout } from "@/lib/db/schema";
import { SALON_EVENT_KINDS, sectionOf } from "@/lib/domain";
import { starterDesign } from "@/lib/designer/starter";

export type CreateEventState = { error?: string } | null;

const common = {
  title: z.string().trim().min(2).max(120),
  venueId: z.string().min(1),
  clientNames: z.string().trim().max(160),
};
// Evento en salón: tipo, invitados y fecha. Casa: solo el modelo y el cliente.
const newEvent = z.discriminatedUnion("section", [
  z.object({
    ...common,
    section: z.literal("salones"),
    kind: z.enum(SALON_EVENT_KINDS),
    guestCount: z.coerce.number().int().min(1).max(2000),
    eventDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  }),
  z.object({ ...common, section: z.literal("casas") }),
]);

export async function createEvent(_prev: CreateEventState, formData: FormData): Promise<CreateEventState> {
  const user = await requireUser();
  const org = await requireOrg(user);
  const parsed = newEvent.safeParse({
    section: formData.get("section"),
    title: formData.get("title"),
    kind: formData.get("kind"),
    venueId: formData.get("venueId"),
    guestCount: formData.get("guestCount"),
    eventDate: formData.get("eventDate") ?? "",
    clientNames: formData.get("clientNames") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los datos: el nombre y el lugar son obligatorios (y en un salón, el tipo y los invitados)." };
  }
  const data = parsed.data;

  const found = await getVenueForOrg(org.id, data.venueId);
  if (!found || sectionOf(found.kind) !== data.section) return { error: "Ese lugar no está disponible para tu cuenta." };
  if (!found.plan) return { error: "Ese lugar todavía no tiene plano para el diseñador." };

  const kind = data.section === "salones" ? data.kind : "casa";
  const guests = data.section === "salones" ? data.guestCount : null;
  // Un salón arranca con mesas para los invitados; una casa, con el amueblado del modelo.
  const doc = starterDesign(found.plan, { kind, guests: guests ?? 0 });
  const eventId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(event)
      .values({
        orgId: org.id,
        venueId: found.id,
        kind,
        title: data.title,
        clientNames: data.clientNames || null,
        eventDate: data.section === "salones" ? data.eventDate || null : null,
        guestCount: guests,
      })
      .returning({ id: event.id });
    await tx.insert(layout).values({ eventId: created.id, name: "A", recommended: true, doc, updatedBy: user.id });
    return created.id;
  });
  redirect(`/eventos/${eventId}`);
}
