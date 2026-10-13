"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  adminAddVenueFiles,
  adminDeleteVenueFile,
  adminResolvePayment,
  adminSetVenuePlan,
  adminUpdateOrg,
  adminUpdateVenue,
  requireAdmin,
  type IntakeFile,
} from "@/lib/dal";
import type { DesignerPlan } from "@/lib/designer/types";
import { ORG_KINDS, PLANS, TIERS, VENUE_STATUSES, isSection } from "@/lib/domain";
import { normalizeWhatsapp } from "@/lib/whatsapp";

// Acciones de la administración de ProLink. Todas piden requireAdmin.

const id = z.string().min(1).max(64);
const optional = (max: number) => z.string().trim().max(max).transform((s) => s || null);
const optionalNumber = (max: number) =>
  z.union([z.literal(""), z.coerce.number().min(0).max(max)]).transform((n) => (n === "" || n === 0 ? null : n));

export async function updateVenueState(formData: FormData): Promise<void> {
  await requireAdmin();
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
  await adminUpdateVenue(d.venueId, { status: d.status, ownerOrgId: d.ownerOrgId || null, isPublic: d.isPublic === "on" });
  revalidate(d.venueId);
}

export async function updateVenueData(formData: FormData): Promise<void> {
  await requireAdmin();
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
  await adminUpdateVenue(venueId, { ...rest, capacity: capacity === null ? null : Math.round(capacity), contactPhone: phone === undefined ? undefined : phone });
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

/** Fotos (hasta 3 MB cada una) o planos (hasta 12 MB) que ProLink agrega a un lugar. */
export async function addFiles(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ venueId: id, kind: z.enum(["foto", "plano"]) }).safeParse({ venueId: formData.get("venueId"), kind: formData.get("kind") });
  if (!parsed.success) return;
  const { venueId, kind } = parsed.data;
  const max = kind === "foto" ? 3 * 1024 * 1024 : 12 * 1024 * 1024;
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0 && f.size <= max && (kind === "plano" || f.type.startsWith("image/")))
    .slice(0, 10);
  const uploads: IntakeFile[] = await Promise.all(
    files.map(async (f) => ({ kind, name: f.name.slice(0, 120), mimeType: f.type || "application/octet-stream", data: Buffer.from(await f.arrayBuffer()) })),
  );
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

export async function updateOrgPlan(formData: FormData): Promise<void> {
  await requireAdmin();
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
    planEndsAt: d.planEndsAt ? new Date(`${d.planEndsAt}T23:59:59-07:00`) : null,
  });
  revalidatePath("/admin/cuentas");
  revalidatePath("/eventos");
  revalidatePath("/negocio");
}

export async function resolvePayment(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z
    .object({ paymentId: id, status: z.enum(["confirmado", "rechazado"]), note: z.string().trim().max(200) })
    .safeParse({ paymentId: formData.get("paymentId"), status: formData.get("status"), note: formData.get("note") ?? "" });
  if (!parsed.success) return;
  await adminResolvePayment(parsed.data.paymentId, parsed.data.status, parsed.data.note || null);
  revalidatePath("/admin/pagos");
  revalidatePath("/admin/cuentas");
  revalidatePath("/eventos");
  revalidatePath("/negocio");
}

function revalidate(venueId: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/lugares/${venueId}`);
  revalidatePath("/salones", "layout");
  revalidatePath("/casas", "layout");
  revalidatePath("/lugares", "layout");
}
