"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  adminAddVenueFiles,
  adminSetVenueCapacities,
  adminCreateTrialCodes,
  adminSetTrialCodeDisabled,
  adminMarkSuggestion,
  adminRestoreEvent,
  adminTrashVenue,
  adminDeleteVenueFile,
  adminSetVenueFileView,
  adminResolvePayment,
  adminSetVenuePlan,
  adminUpdateOrg,
  adminUpdateVenue,
  requireAdmin,
  type IntakeFile,
} from "@/lib/dal";
import type { DesignerPlan } from "@/lib/designer/types";
import { ORG_KINDS, PLANS, TIERS, VENUE_STATUSES, isSection } from "@/lib/domain";
import { isPhoto, isPlanFile, storedType } from "@/lib/uploads";
import { normalizeWhatsapp } from "@/lib/whatsapp";
import { endOfDay } from "@/lib/dates";
import { TRIAL_CODE_BATCH_MAX, TRIAL_CODE_DAYS, TRIAL_CODE_KINDS } from "@/lib/trial-codes";
import { TEMPLATES } from "@/lib/designer/starter";

// Acciones de la administración de Plantea. Todas piden requireAdmin.

const id = z.string().min(1).max(64);
const optional = (max: number) => z.string().trim().max(max).transform((s) => s || null);
const optionalNumber = (max: number) =>
  z.union([z.literal(""), z.coerce.number().min(0).max(max)]).transform((n) => (n === "" || n === 0 ? null : n));

export async function updateVenueState(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = z
    .object({ venueId: id, status: z.enum(VENUE_STATUSES), ownerOrgId: z.string().max(64), isPublic: z.string().optional() })
    .safeParse({
      venueId: formData.get("venueId"),
      status: formData.get("status"),
      ownerOrgId: formData.get("ownerOrgId") ?? "",
      isPublic: formData.get("isPublic") ?? undefined,
    });
  if (!parsed.success) return;
  const d = parsed.data;
  await adminUpdateVenue(d.venueId, { status: d.status, ownerOrgId: d.ownerOrgId || null, isPublic: d.isPublic === "on" }, admin);
  revalidate(d.venueId);
}

export async function updateVenueData(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      venueId: id,
      name: z.string().trim().min(2).max(80),
      city: z.string().trim().min(2).max(60),
      capacity: optionalNumber(5000),
      areaM2: optionalNumber(5000),
      address: optional(160),
      description: optional(600),
      contactName: optional(80),
      contactPhone: z.string().trim().max(30),
      contactEmail: optional(120),
    })
    .safeParse({
      venueId: formData.get("venueId"),
      name: formData.get("name"),
      city: formData.get("city"),
      capacity: formData.get("capacity") ?? "",
      areaM2: formData.get("areaM2") ?? "",
      address: formData.get("address") ?? "",
      description: formData.get("description") ?? "",
      contactName: formData.get("contactName") ?? "",
      contactPhone: formData.get("contactPhone") ?? "",
      contactEmail: formData.get("contactEmail") ?? "",
    });
  if (!parsed.success) return;
  const { venueId, contactPhone, capacity, ...rest } = parsed.data;
  const phone = normalizeWhatsapp(contactPhone);
  await adminUpdateVenue(venueId, { ...rest, capacity: capacity === null ? null : Math.round(capacity), contactPhone: phone === undefined ? undefined : phone }, admin);
  revalidate(venueId);
}

/** Forma mínima de un plano del diseñador para no cargar un JSON cualquiera. */
const designerPlan = z.object({
  id: z.string().min(1),
  kind: z.enum(["casa", "salon"]).optional(),
  title: z.string().min(1),
  lot: z.tuple([z.number(), z.number()]),
  bounds: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
  levels: z.array(z.object({ id: z.string().min(1), name: z.string(), walls: z.array(z.unknown()), rooms: z.array(z.unknown()) }).passthrough()).min(1).max(10),
}).passthrough();

export async function uploadVenuePlan(formData: FormData): Promise<void> {
  await requireAdmin();
  const venueId = id.safeParse(formData.get("venueId"));
  const file = formData.get("plan");
  if (!venueId.success || !(file instanceof File) || file.size === 0 || file.size > 8 * 1024 * 1024) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return;
  }
  const plan = designerPlan.safeParse(parsed);
  if (!plan.success) return;
  await adminSetVenuePlan(venueId.data, plan.data as unknown as DesignerPlan);
  revalidate(venueId.data);
}

/** Fotos (hasta 8 MB cada una) o planos (hasta 12 MB) que la administración agrega a un lugar. */
export async function addFiles(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ venueId: id, kind: z.enum(["foto", "plano"]) }).safeParse({ venueId: formData.get("venueId"), kind: formData.get("kind") });
  if (!parsed.success) return;
  const { venueId, kind } = parsed.data;
  const max = kind === "foto" ? 8 * 1024 * 1024 : 12 * 1024 * 1024;
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0 && f.size <= max)
    .slice(0, 10);
  const read: IntakeFile[] = await Promise.all(
    files.map(async (f) => {
      const data = Buffer.from(await f.arrayBuffer());
      return { kind, name: f.name.slice(0, 120), mimeType: storedType(data), data };
    }),
  );
  // Por el contenido, no por el tipo que dice el navegador.
  const uploads = read.filter((f) => (kind === "foto" ? isPhoto(f.data) : isPlanFile(f.name, f.data)));
  if (!uploads.length) return;
  await adminAddVenueFiles(venueId, uploads);
  revalidate(venueId);
}

export async function deleteFile(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ venueId: id, fileId: id }).safeParse({ venueId: formData.get("venueId"), fileId: formData.get("fileId") });
  if (!parsed.success) return;
  await adminDeleteVenueFile(parsed.data.fileId);
  revalidate(parsed.data.venueId);
}

/** Foto vista de fuera o de dentro (para enseñarlas juntas en el catálogo) y si es una imagen ilustrativa. */
export async function setFileView(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z
    .object({ venueId: id, fileId: id, side: z.enum(["", "fuera", "dentro"]), illustrative: z.boolean() })
    .safeParse({ venueId: formData.get("venueId"), fileId: formData.get("fileId"), side: formData.get("side") ?? "", illustrative: formData.get("illustrative") === "on" });
  if (!parsed.success) return;
  const { venueId, fileId, side, illustrative } = parsed.data;
  await adminSetVenueFileView(venueId, fileId, side || null, illustrative);
  revalidate(venueId);
}

export async function updateOrgPlan(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      orgId: id,
      kind: z.enum(ORG_KINDS),
      plan: z.enum(PLANS),
      tier: z.enum(TIERS),
      modules: z.array(z.string()),
      planEndsAt: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
    })
    .safeParse({
      orgId: formData.get("orgId"),
      kind: formData.get("kind"),
      plan: formData.get("plan"),
      tier: formData.get("tier"),
      modules: formData.getAll("modules"),
      planEndsAt: formData.get("planEndsAt") ?? "",
    });
  if (!parsed.success) return;
  const d = parsed.data;
  await adminUpdateOrg(d.orgId, {
    kind: d.kind,
    plan: d.plan,
    tier: d.tier,
    modules: d.modules.filter(isSection),
    // Fin del día (hora de México) para que el último día cuente completo.
    planEndsAt: d.planEndsAt ? endOfDay(d.planEndsAt) : null,
  }, admin);
  revalidatePath("/admin/rastro");
  revalidatePath("/admin/cuentas");
  revalidatePath("/eventos");
  revalidatePath("/negocio");
}

export async function resolvePayment(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = z
    .object({ paymentId: id, status: z.enum(["confirmado", "rechazado"]), note: z.string().trim().max(200) })
    .safeParse({ paymentId: formData.get("paymentId"), status: formData.get("status"), note: formData.get("note") ?? "" });
  if (!parsed.success) return;
  await adminResolvePayment(parsed.data.paymentId, parsed.data.status, parsed.data.note || null, admin);
  revalidatePath("/admin/rastro");
  revalidatePath("/admin/pagos");
  revalidatePath("/admin/cuentas");
  revalidatePath("/eventos");
  revalidatePath("/negocio");
}

/** Manda un lugar a la papelera (30 días) o lo saca de ella. */
export async function trashVenue(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = z.object({ venueId: id, restore: z.string().optional() }).safeParse({ venueId: formData.get("venueId"), restore: formData.get("restore") ?? undefined });
  if (!parsed.success) return;
  await adminTrashVenue(parsed.data.venueId, parsed.data.restore !== "1", admin);
  revalidate(parsed.data.venueId);
  revalidatePath("/admin/papelera");
}

/** Saca de la papelera el evento de cualquier cuenta. */
export async function restoreEventAdmin(formData: FormData): Promise<void> {
  await requireAdmin();
  const eventId = id.safeParse(formData.get("eventId"));
  if (!eventId.success) return;
  await adminRestoreEvent(eventId.data);
  revalidatePath("/admin/papelera");
  revalidatePath("/eventos");
}

function revalidate(venueId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/lugares");
  revalidatePath("/admin/rastro");
  revalidatePath(`/admin/lugares/${venueId}`);
  revalidatePath("/salones", "layout");
  revalidatePath("/casas", "layout");
  revalidatePath("/lugares", "layout");
}

/** Marca una sugerencia del catálogo como agregada (o la regresa a pendiente). */
export async function markSuggestion(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ id, done: z.enum(["1", "0"]) }).safeParse({ id: formData.get("id"), done: formData.get("done") });
  if (!parsed.success) return;
  await adminMarkSuggestion(parsed.data.id, parsed.data.done === "1");
  revalidatePath("/admin/sugerencias");
}

/** Genera de 1 a 50 códigos de mes gratis; la lista los muestra arriba, marcados como nuevos. */
export async function createTrialCodes(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      count: z.coerce.number().int().min(1).max(TRIAL_CODE_BATCH_MAX),
      kind: z.enum(TRIAL_CODE_KINDS),
      days: z.coerce.number().int().min(1).max(365),
      note: optional(120),
    })
    .safeParse({
      count: formData.get("count") || 1,
      kind: formData.get("kind"),
      days: formData.get("days") || TRIAL_CODE_DAYS,
      note: formData.get("note") ?? "",
    });
  if (!parsed.success) return;
  const rows = await adminCreateTrialCodes(parsed.data, admin);
  revalidatePath("/admin/rastro");
  redirect(`/admin/codigos?nuevos=${rows.length}`);
}

export async function toggleTrialCode(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = z.object({ codeId: id, disabled: z.enum(["1", "0"]) }).safeParse({ codeId: formData.get("codeId"), disabled: formData.get("disabled") });
  if (!parsed.success) return;
  await adminSetTrialCodeDisabled(parsed.data.codeId, parsed.data.disabled === "1", admin);
  revalidatePath("/admin/codigos");
  revalidatePath("/admin/rastro");
}

/** Aforo por montaje que corrige la administración (vacío = el calculado del plano). */
export async function updateVenueCapacities(formData: FormData): Promise<void> {
  await requireAdmin();
  const venueId = id.safeParse(formData.get("venueId"));
  if (!venueId.success) return;
  const manual: Record<string, number> = {};
  for (const t of TEMPLATES) {
    const n = z.coerce.number().int().min(0).max(5000).safeParse(formData.get(t) || 0);
    if (n.success && n.data > 0) manual[t] = n.data;
  }
  await adminSetVenueCapacities(venueId.data, manual);
  revalidate(venueId.data);
}
