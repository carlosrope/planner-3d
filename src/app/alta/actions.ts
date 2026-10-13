"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createVenueIntake, getCurrentUser, requireOrg, type IntakeFile } from "@/lib/dal";
import { isOwnerKind } from "@/lib/domain";
import { normalizeWhatsapp } from "@/lib/whatsapp";

export type AltaState = { error?: string } | null;

const MAX_PLAN_BYTES = 12 * 1024 * 1024;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PLAN_TYPES = /^(application\/(pdf|acad|x-acad|dxf|x-dxf|dwg|x-dwg|octet-stream)|image\/)/;

const intake = z.object({
  kind: z.enum(["salon", "casa"]),
  name: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(60),
  address: z.string().trim().max(160),
  capacity: z.union([z.literal(""), z.coerce.number().int().min(10).max(5000)]),
  areaM2: z.union([z.literal(""), z.coerce.number().min(20).max(5000)]),
  description: z.string().trim().max(600),
  notes: z.string().trim().max(600),
  contactName: z.string().trim().min(2).max(80),
  contactPhone: z.string().trim().min(10).max(30),
  contactEmail: z.union([z.literal(""), z.string().trim().email().max(120)]),
  agreement: z.literal("on"),
});

const files = (formData: FormData, key: string) => formData.getAll(key).filter((f): f is File => f instanceof File && f.size > 0);

/** Alta pública de un salón o modelo: valida, guarda plano y fotos en la base y manda a la página de gracias. */
export async function submitVenue(_prev: AltaState, formData: FormData): Promise<AltaState> {
  const parsed = intake.safeParse({
    kind: formData.get("kind"),
    name: formData.get("name"),
    city: formData.get("city"),
    address: formData.get("address") ?? "",
    capacity: formData.get("capacity") ?? "",
    areaM2: formData.get("areaM2") ?? "",
    description: formData.get("description") ?? "",
    notes: formData.get("notes") ?? "",
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    contactEmail: formData.get("contactEmail") ?? "",
    agreement: formData.get("agreement"),
  });
  if (!parsed.success) return { error: "Revisa los datos: nombre, ciudad, tu nombre, tu WhatsApp y la autorización son obligatorios." };
  const d = parsed.data;
  const phone = normalizeWhatsapp(d.contactPhone);
  if (!phone) return { error: "El WhatsApp debe tener 10 dígitos (o lada de país + número)." };

  const plans = files(formData, "planos").slice(0, 3);
  const photos = files(formData, "fotos").slice(0, 8);
  if (!plans.length) return { error: "Falta el plano: CAD, PDF o una foto del croquis con medidas." };
  if (plans.some((f) => f.size > MAX_PLAN_BYTES)) return { error: "Cada archivo del plano puede pesar hasta 12 MB." };
  if (plans.some((f) => f.type && !PLAN_TYPES.test(f.type) && !/\.(dwg|dxf|pdf)$/i.test(f.name))) {
    return { error: "El plano debe ser DWG, DXF, PDF o una imagen." };
  }
  if (photos.some((f) => f.size > MAX_PHOTO_BYTES || !f.type.startsWith("image/"))) {
    return { error: "Las fotos deben ser imágenes de menos de 2 MB (se reducen solas en el navegador)." };
  }

  const user = await getCurrentUser();
  const org = user ? await requireOrg(user) : null;
  const ownerOrgId = org && isOwnerKind(org.kind) ? org.id : null;

  const read = async (f: File, kind: IntakeFile["kind"]): Promise<IntakeFile> => ({
    kind,
    name: f.name.slice(0, 120),
    mimeType: f.type || "application/octet-stream",
    data: Buffer.from(await f.arrayBuffer()),
  });
  const uploads = [...(await Promise.all(plans.map((f) => read(f, "plano")))), ...(await Promise.all(photos.map((f) => read(f, "foto"))))];

  const created = await createVenueIntake(
    {
      kind: d.kind,
      name: d.name,
      city: d.city,
      address: d.address || null,
      capacity: d.kind === "salon" && d.capacity !== "" ? d.capacity : null,
      areaM2: d.kind === "casa" && d.areaM2 !== "" ? d.areaM2 : null,
      description: d.description || null,
      contactName: d.contactName,
      contactPhone: phone,
      contactEmail: d.contactEmail || null,
      notes: d.notes || null,
      ownerOrgId,
    },
    uploads,
  );
  redirect(`/alta/gracias?lugar=${encodeURIComponent(created.slug)}`);
}
