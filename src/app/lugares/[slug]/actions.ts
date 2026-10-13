"use server";

import { z } from "zod";
import { createInquiry, getPublicVenue } from "@/lib/dal";
import { normalizeWhatsapp, waLink } from "@/lib/whatsapp";

export type InquiryState = { ok?: boolean; whatsapp?: string | null; error?: string } | null;

const inquiry = z.object({
  venueId: z.string().min(1).max(64),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(10).max(30),
  eventDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  guests: z.union([z.literal(""), z.coerce.number().int().min(1).max(5000)]),
  message: z.string().trim().max(400),
});

const fecha = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Solicitud de informes: se guarda para el panel del lugar y, si tiene WhatsApp, se abre con el mensaje listo. */
export async function sendInquiry(_prev: InquiryState, formData: FormData): Promise<InquiryState> {
  const parsed = inquiry.safeParse({
    venueId: formData.get("venueId"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    eventDate: formData.get("eventDate") ?? "",
    guests: formData.get("guests") ?? "",
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) return { error: "Revisa tu nombre y tu WhatsApp." };
  const d = parsed.data;
  const phone = normalizeWhatsapp(d.phone);
  if (!phone) return { error: "El WhatsApp debe tener 10 dígitos (o lada de país + número)." };
  const v = await getPublicVenue(d.venueId);
  if (!v) return { error: "Este lugar ya no está disponible." };
  const created = await createInquiry(v.id, {
    name: d.name,
    phone,
    eventDate: d.eventDate || null,
    guests: d.guests === "" ? null : d.guests,
    message: d.message,
  });
  if (!created) return { error: "No se pudo registrar la solicitud. Escríbele al lugar por WhatsApp." };
  const to = v.contactPhone ?? v.owner?.whatsapp ?? null;
  const lines = [
    `Hola, vi ${v.name} en 3D en Plantea y quiero informes.`,
    `Soy ${d.name}.`,
    d.eventDate ? `Fecha: ${fecha.format(new Date(d.eventDate))}.` : "",
    d.guests !== "" ? `Invitados: ${d.guests}.` : "",
    d.message,
  ].filter(Boolean);
  return { ok: true, whatsapp: to ? waLink(to, lines.join(" ")) : null };
}
