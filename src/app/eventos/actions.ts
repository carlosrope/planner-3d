"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { attachReferralEvent, countEvents, restoreEvent, trashEvent, getReferralOrigin, getVenueForOrg, listVenues, moduleActive, requireOrg, requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { event, layout } from "@/lib/db/schema";
import { SALON_EVENT_KINDS, isLitePlan, sectionOf } from "@/lib/domain";
import { sampleGuests, seatGuests } from "@/lib/designer/samples";
import { starterDesign, starterFurniture, type Template } from "@/lib/designer/starter";
import type { DesignDoc, DesignerPlan } from "@/lib/designer/types";

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
  if (!moduleActive(org, data.section === "casas" ? "casa" : "salon")) {
    return { error: "Tu plan no incluye esta sección o ya terminó. Escríbenos por WhatsApp para activarla." };
  }

  // Con código: un solo evento, en el lugar del código. Personal: un evento activo a la vez.
  const origin = await getReferralOrigin(org);
  if (org.plan === "invitado") {
    if (!origin) return { error: "Tu cuenta no tiene un lugar asignado. Escríbenos por WhatsApp." };
    if (origin.venueId !== data.venueId) return { error: `Tu código es para ${origin.venueName}.` };
    if ((await countEvents(org.id)) > 0) return { error: "Tu código cubre un solo evento, y ya lo tienes. Ábrelo desde la lista." };
  } else if (org.plan === "personal" && (await countEvents(org.id, true)) > 0) {
    return { error: "El plan Personal incluye un evento activo a la vez. Marca el anterior como realizado o cancelado para crear otro." };
  }

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
  if (org.referralCodeId) await attachReferralEvent(org.referralCodeId, eventId);
  redirect(`/eventos/${eventId}`);
}

/**
 * Proyectos de ejemplo para una cuenta nueva (la demo nunca empieza vacía): una boda con dos
 * propuestas e invitados ya sentados, unos XV años y una casa amueblada y sin muebles.
 */
export async function createSamples(): Promise<void> {
  const user = await requireUser();
  const org = await requireOrg(user);
  // Personal y Con código tienen un solo evento: sin ejemplos.
  if (isLitePlan(org.plan)) return;
  const places = await listVenues(org.id);
  const pick = async (kind: "salon" | "casa") => {
    const found = places.find((v) => v.kind === kind);
    return found ? await getVenueForOrg(org.id, found.id) : null;
  };
  // Solo ejemplos de los módulos activos de la cuenta.
  const [salon, casa] = await Promise.all([
    moduleActive(org, "salon") ? pick("salon") : null,
    moduleActive(org, "casa") ? pick("casa") : null,
  ]);
  const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

  const salonDoc = (plan: DesignerPlan, guests: number, kind: "boda" | "xv", template: Template): DesignDoc => {
    const furniture = starterFurniture(plan, { guests, kind, template });
    const guestList = sampleGuests(guests);
    seatGuests(furniture, guestList);
    return { v: 1, levels: { [plan.levels[0].id]: { furniture, guestList } } };
  };

  type Sample = {
    venueId: string;
    kind: "boda" | "xv" | "casa";
    title: string;
    clientNames: string | null;
    eventDate: string | null;
    guestCount: number | null;
    layouts: { name: string; note: string; recommended: boolean; doc: DesignDoc }[];
  };
  const samples: Sample[] = [];
  if (salon?.plan) {
    samples.push({
      venueId: salon.id,
      kind: "boda",
      title: "Boda Sofía y Daniel (ejemplo)",
      clientNames: "Sofía y Daniel",
      eventDate: day(120),
      guestCount: 220,
      layouts: [
        { name: "A", note: "Banquete con redondas", recommended: true, doc: salonDoc(salon.plan, 220, "boda", "redondas") },
        { name: "B", note: "Mesas imperiales", recommended: false, doc: salonDoc(salon.plan, 220, "boda", "imperial") },
      ],
    });
    samples.push({
      venueId: salon.id,
      kind: "xv",
      title: "XV años de Valeria (ejemplo)",
      clientNames: "Familia Armenta",
      eventDate: day(200),
      guestCount: 150,
      layouts: [{ name: "A", note: "Banquete con redondas", recommended: true, doc: salonDoc(salon.plan, 150, "xv", "redondas") }],
    });
  }
  if (casa?.plan) {
    const empty: DesignDoc = { v: 1, levels: Object.fromEntries(casa.plan.levels.map((l) => [l.id, { furniture: [] }])) };
    samples.push({
      venueId: casa.id,
      kind: "casa",
      title: `${casa.name} · Familia Ramírez (ejemplo)`,
      clientNames: "Familia Ramírez",
      eventDate: null,
      guestCount: null,
      layouts: [
        { name: "A", note: "Amueblada", recommended: true, doc: { v: 1, levels: {} } },
        { name: "B", note: "Sin muebles", recommended: false, doc: empty },
      ],
    });
  }

  await db.transaction(async (tx) => {
    for (const s of samples) {
      const [created] = await tx
        .insert(event)
        .values({
          orgId: org.id,
          venueId: s.venueId,
          kind: s.kind,
          title: s.title,
          clientNames: s.clientNames,
          eventDate: s.eventDate,
          guestCount: s.guestCount,
        })
        .returning({ id: event.id });
      await tx.insert(layout).values(
        s.layouts.map((l, position) => ({ eventId: created.id, ...l, position, updatedBy: user.id })),
      );
    }
  });
  revalidatePath("/eventos");
}

/** Manda un evento o proyecto a la papelera (se puede restaurar durante 30 días). */
export async function trashEventAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const eventId = z.string().min(1).max(64).safeParse(formData.get("eventId"));
  if (!eventId.success) return;
  await trashEvent(eventId.data, user.id);
  revalidatePath("/eventos");
}

/** Saca un evento de la papelera. */
export async function restoreEventAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const eventId = z.string().min(1).max(64).safeParse(formData.get("eventId"));
  if (!eventId.success) return;
  await restoreEvent(eventId.data, user.id);
  revalidatePath("/eventos");
}
